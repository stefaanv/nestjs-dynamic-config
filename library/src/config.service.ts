import { Inject, Injectable, LoggerService } from '@nestjs/common'
import { watch, FSWatcher } from 'chokidar'
import { DynamicConfigOptions } from './config.options.interface'
import { TypedEventEmitter } from './TypedEventEmitter.class'
import { crush, get } from 'radash'
import { FileLoadService } from './file-loader.service'
import { ensureError } from './helpers'
import * as dotenv from 'dotenv'

export const DYNAMIC_CONFIG_OPTIONS = 'DYNAMIC_CONFIG_OPTIONS'

const WAIT_TIME_RELOAD = 100
type LocalEventTypes = {
  reloaded: []
}

export type ConfigFileTypes = 'js' | 'json' | 'other'

//TODO git commit opvragen (productionCommitEnvVareName optie voor productie)
//TODO validatie toevoegen
//TODO rapporteren wat juist gewijzigd is in event
@Injectable()
export class ConfigService extends TypedEventEmitter<LocalEventTypes> {
  private readonly _logger: LoggerService
  private readonly _watcher: FSWatcher
  private _config: unknown
  private _packageInfo: Record<string, any>
  private _appName = '<unknown>'
  private _version = '<unknown>'

  get appName() {
    return this._appName
  }
  get version() {
    return this._version
  }
  get packageInfo() {
    return this._packageInfo
  }
  get config() {
    return this._config
  }

  constructor(
    @Inject(DYNAMIC_CONFIG_OPTIONS) private readonly options: DynamicConfigOptions,
    private readonly _fileLoader: FileLoadService,
  ) {
    super()
    this._logger = options.logger

    // load the .env file
    try {
      const env = this._fileLoader.loadEnvFile()
      const parsed = dotenv.parse(env)
      dotenv.populate(process.env, parsed)
    } catch (err) {
      this.logError(ensureError(err))
    }

    // load the package.json file
    try {
      const pkgContent = this._fileLoader.loadPkgFile()
      const pkg = JSON.parse(pkgContent)
      this._packageInfo = crush(pkg as object)
      this._appName = pkg['name']
      this._version = pkg['version']
    } catch (err) {
      this._packageInfo = {}
      this._logger?.error(ensureError(err).message)
    }

    // throw error on unsupported config file type
    if (this._fileLoader.configFileType == 'other') {
      const error = new Error(`Configuration file must be .js or .json type`)
      if (options.onLoadErrorCallback) {
        options.onLoadErrorCallback(error)
      } else {
        this._logger?.fatal(error.message)
        process.exit(1)
      }
    }

    // Initial load the config file and start the file watcher
    this.loadConfig(true)
    this._watcher = watch(options.configFile).on('change', () => {
      this.loadConfig()
    })
  }

  private loadConfigInternal() {
    try {
      const fileContent = this._fileLoader.loadConfigFile()
      // console.log(fileContent)
      this._config = this.evalConfigFile(fileContent)
      // console.log(this._config)
    } catch (err) {
      if (this.options.onLoadErrorCallback) {
        this.options.onLoadErrorCallback(err)
      } else {
        this._logger?.fatal(ensureError(err).message)
        process.exit(1)
      }
    }
  }

  private loadConfig(initial = false) {
    // load or reload the config file
    try {
      if (initial) {
        this.loadConfigInternal()
      } else {
        setTimeout(() => {
          this.loadConfigInternal()
          if (!this.options.noLogOnReload) this._logger?.log(`Config file reloaded`)
          this.emit('reloaded')
        }, WAIT_TIME_RELOAD)
      }
    } catch (err) {
      if (this.options.onLoadErrorCallback) {
        this.options.onLoadErrorCallback(err)
      } else {
        this._logger?.fatal(ensureError(err).message)
        process.exit(1)
      }
    }
  }

  evalConfigFile(content: string): object {
    if (!content) return {}
    try {
      const envKeys = Array.from(content.matchAll(/{{ENV_(\w*)}}/g), a => a[1])
      const pkgKeys = Array.from(content.matchAll(/{{pkg.(\w*)}}/g), a => a[1])

      let cnt = content
      if (envKeys.length > 0) {
        for (const key of envKeys) {
          const longKey = `{{ENV_${key}}}`
          const value = process.env[key] ?? longKey //TODO! ontbreken van waarde rapporteren
          cnt = cnt.replaceAll(longKey, value)
        }
      }

      if (this.packageInfo && pkgKeys.length > 0) {
        for (const key of pkgKeys) {
          const longKey = `{{pkg.${key}}}`
          const value = this._packageInfo[key] ?? longKey //TODO! ontbreken van waarde rapporteren
          cnt = cnt.replaceAll(longKey, value)
        }
      }
      // console.log(cnt)

      return this._fileLoader.configFileType === 'js' ? eval(cnt) : JSON.parse(cnt)
    } catch (err) {
      const error = ensureError(err)
      if (this.options.onLoadErrorCallback) {
        this.options.onLoadErrorCallback(error)
      } else {
        this._logger?.fatal(`Error while loading configuration file: ${error.message}`)
        process.exit(1)
      }
    }
  }

  closeFileWatcher() {
    this._watcher.unwatch('*')
    this._watcher.close()
  }

  get<T = string>(keys: string[] | string): T | undefined
  get<T = string>(keys: string[] | string, defaultValue: T): T
  get<T = string>(keys: string[] | string, defaultValue?: T): T {
    const key = typeof keys === 'string' ? keys : keys.join('.')
    if (!this._config) return defaultValue
    const result = get(this._config, key) ?? defaultValue
    return result as T
  }

  getOrFail<T = string>(keys: string[] | string): T {
    const key = typeof keys === 'string' ? keys : keys.join('.')
    if (!this.get(keys)) throw new Error(`key ${key} not found in the configuration`)
    return this.get(keys)
  }

  createProxy<T = string>(keys: string[] | string): () => T | undefined
  createProxy<T = string>(keys: string[] | string, defaultValue: T): () => T
  createProxy<T = string>(keys: string[] | string, defaultValue?: T): () => T {
    return () => this.get<T>(keys, defaultValue)
  }

  private logFatal(error: unknown) {
    const e = ensureError(error)
    if (this.options.onLoadErrorCallback) {
      this.options.onLoadErrorCallback(e)
    } else {
      this._logger?.fatal(`Error while loading configuration file: ${e.message}`)
      process.exit(1)
    }
  }

  private logError(error: unknown) {
    const e = ensureError(error)
    this._logger?.fatal(`Error while loading configuration file: ${e.message}`)
  }
}

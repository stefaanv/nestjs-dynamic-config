import { Inject, Injectable, LoggerService } from '@nestjs/common'
import { watch, FSWatcher } from 'chokidar'
import { DynamicConfigOptions } from './config.options.interface'
import { TypedEventEmitter } from './TypedEventEmitter.class'
import { crush, get, isEmpty } from 'radash'
import { FileLoadService } from './file-loader.service'
import { ensureError } from './helpers'
import * as dotenv from 'dotenv'

export const DYNAMIC_CONFIG_OPTIONS = 'DYNAMIC_CONFIG_OPTIONS'

const WAIT_TIME_RELOAD = 100
type LocalEventTypes = {
  reloaded: []
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export type ConfigFileTypes = 'js' | 'json' | 'other'

const RELOADED_MSG = `Config file reloaded`
const MISSING_ENV_VAR_MSG = ` is not a defined environment variable`
const MISSING_PKG_INFO_MSG = ` is not defined in package.json`
const UNSUPPORTED_FILE_TYPE_MSG =
  'Unsupported config file type - only .js and JSON files are supported'
//TODO git commit opvragen (productionCommitEnvVareName optie voor productie)
//TODO validatie toevoegen
//TODO rapporteren wat juist gewijzigd is in event
@Injectable()
export class ConfigService extends TypedEventEmitter<LocalEventTypes> {
  private readonly _logger: LoggerService
  private readonly _watcher: FSWatcher
  private _config: object = {}
  private _packageInfo: Record<string, any> = {}
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

    // Initial load the config file and start the file watcher
    this.loadConfigFile(true)

    if (!this._fileLoader.isFake) {
      this._watcher = watch(options.configFile).on('change', () => {
        this.loadConfigFile() //TODO! dit zal wrschnlk nog moeten veranderen
      })
    }
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

  public async forceReload(initial = true) {
    this.loadConfigFile(initial)
  }

  private async loadConfigFile(initial = false) {
    // load the .env file
    this.loadEnvFile()

    // load the package.json file
    this.loadPkgFile()

    // load or reload the config file
    if (this._fileLoader.configFileType === 'other') {
      this.handleFatalError(new Error(UNSUPPORTED_FILE_TYPE_MSG))
      return
    }
    try {
      if (!initial && !this._fileLoader.isFake) {
        await sleep(WAIT_TIME_RELOAD)
      }
      this._config = this.parseConfigFile()

      if (!initial) {
        // reload messaging
        if (!this.options.noLogOnReload) this._logger?.log(RELOADED_MSG)
        this.emit('reloaded')
      }
    } catch (error) {
      this.handleFatalError(error)
    }
  }

  private handleFatalError(error: Error) {
    if (this.options.onLoadErrorCallback) {
      this.options.onLoadErrorCallback(error)
    } else {
      this._logger?.fatal(error.message)
      this._fileLoader.exit(1)
    }
  }

  private parseConfigFile(): object {
    let [error, content] = this._fileLoader.loadConfigFile()
    if (error) {
      // error while loading the config file, report this
      this.handleFatalError(error)
      return
    }
    try {
      const envKeys = Array.from(content.matchAll(/{{ENV_(\w*)}}/g), a => a[1])
      const pkgKeys = Array.from(content.matchAll(/{{pkg.(\w*)}}/g), a => a[1])

      if (envKeys.length > 0) {
        for (const key of envKeys) {
          const longKey = `{{ENV_${key}}}`
          const value = process.env[key]
          if (!value) {
            this._logger?.debug(key + MISSING_ENV_VAR_MSG)
          } else {
            content = content.replaceAll(longKey, value)
          }
        }
      }

      if (!isEmpty(this.packageInfo)) {
        for (const key of pkgKeys) {
          const longKey = `{{pkg.${key}}}`
          const value = this._packageInfo[key]
          if (!value) {
            this._logger?.debug(key + MISSING_PKG_INFO_MSG)
          } else {
            content = content.replaceAll(longKey, value)
          }
        }
      }

      return this._fileLoader.configFileType === 'js' ? eval(content) : JSON.parse(content)
    } catch (error) {
      this.handleFatalError(error)
    }
  }

  private loadPkgFile() {
    const pkgContent = this._fileLoader.loadSupportFile('pkg')
    if (isEmpty(pkgContent)) {
      this._packageInfo = {}
      return
    }
    try {
      const pkg = JSON.parse(pkgContent)
      this._packageInfo = crush(pkg as object)
      this._appName = pkg['name']
      this._version = pkg['version']
    } catch (err) {
      const msg = `Unable to parse package.json: ${ensureError(err).message}`
      this._packageInfo = {}
      this._logger?.debug(msg)
    }
  }

  private loadEnvFile() {
    const envContent = this._fileLoader.loadSupportFile('env')
    if (!envContent) return // stop execution, only global env-vars will be loaded
    try {
      const parsed = dotenv.parse(envContent)
      dotenv.populate(process.env, parsed)
    } catch (err) {
      const msg = `Unable to parse the .env file: ${ensureError(err).message}`
      this._logger?.debug(msg)
    }
  }

  closeFileWatcher() {
    if (!this._fileLoader.isFake) {
      this._watcher.unwatch('*')
      this._watcher.close()
    }
  }
}

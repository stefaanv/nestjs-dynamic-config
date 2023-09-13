import { Inject, Injectable, LoggerService } from '@nestjs/common'
import { watch, FSWatcher } from 'chokidar'
import { DynamicConfigOptions } from './config.options.interface'
import { TypedEventEmitter } from './TypedEventEmitter.class'
import { crush, tryit } from 'radash'
import { FileLoadService } from './file-loader.service'
import { ensureError } from './helpers'
import * as dotenv from 'dotenv'

export const DYNAMIC_CONFIG_OPTIONS = 'DYNAMIC_CONFIG_OPTIONS'

const WAIT_TIME_RELOAD = 100
type LocalEventTypes = {
  reloaded: []
}

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
  private _cfgFileType: 'js' | 'json' | 'other'

  get appName() {
    return this._appName
  }
  get version() {
    return this._version
  }
  get packageInfo() {
    return this._packageInfo
  }

  constructor(
    @Inject(DYNAMIC_CONFIG_OPTIONS) private readonly options: DynamicConfigOptions,
    private readonly _fileLoader: FileLoadService,
  ) {
    super()
    this._logger = options.logger

    // load the .env file
    const [error1, env] = this._fileLoader.loadEnvFile(this.options)
    if (error1) {
      this.logError(error1)
    } else {
      const parsed = dotenv.parse(env)
      dotenv.populate(process.env, parsed)
    }

    // load the package.json file
    const [error2, pkgContent] = this._fileLoader.loadPkgFile(options)
    const [error3, pkg] = tryit(JSON.parse.bind(JSON))(pkgContent)
    if (error2 || error3) {
      const error = error2 ?? error3
      this._logger?.error(error.message)
      this._packageInfo = {}
    } else {
      this._packageInfo = crush(pkg as object)
      this._appName = pkg['name']
      this._version = pkg['version']
    }

    // check configFile type
    const configFile = options.configFile
    this._cfgFileType = configFile.endsWith('.js')
      ? 'js'
      : configFile.endsWith('.json')
      ? 'json'
      : 'other'

    if (this._cfgFileType == 'other') {
      const error = new Error(`Configuration file must be .js or .json type`)
      if (options.onLoadErrorCallback) {
        options.onLoadErrorCallback(error)
      } else {
        this._logger?.fatal(error.message)
        process.exit(1)
      }
    }

    // Initial load the config file and start the file watcher
    this.loadConfig(configFile, true)
    this._watcher = watch(options.configFile).on('change', () => {
      this.loadConfig(configFile)
      this.emit('reloaded')
    })
  }

  private loadConfig(configFile: string, initial = false) {
    // load or reload the config file
    const [error, fileContent] = this._fileLoader.loadConfigFile(configFile)
    if (error) {
      if (this.options.onLoadErrorCallback) {
        this.options.onLoadErrorCallback(error)
      } else {
        this._logger?.fatal(error.message)
        process.exit(1)
      }
    }
    if (initial) {
      this.evalConfigFile(fileContent)
    } else {
      setTimeout(() => {
        this.evalConfigFile(fileContent)
        if (!this.options.noLogOnReload) this._logger?.log(`Config file reloaded`)
      }, WAIT_TIME_RELOAD)
    }
  }

  evalConfigFile(content: string) {
    try {
      if (content) {
        const match = content.match(/{{ENV_(\w*)}}/g)
        console.log(match)
      } // content = Object.keys(process.env).reduce((cnt, key) => {
      //   if (!cnt) {
      //     console.log(cnt)
      //     return ''
      //   }
      //   return cnt.replaceAll('{{ENV_' + key + '}}', process.env[key])
      // }, content)
      // if (this._packageInfo) {
      //   content = Object.keys(this._packageInfo).reduce(
      //     (cnt, key) => cnt.replaceAll('{{pkg.' + key + '}}', this._packageInfo[key]),
      //     content,
      //   )
      // }
      this._config = this._cfgFileType === 'js' ? eval(content) : JSON.parse(content)
    } catch (err) {
      console.log(err)
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
    return this._config?.[key] ?? defaultValue
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

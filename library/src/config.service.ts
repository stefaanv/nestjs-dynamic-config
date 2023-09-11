import { Inject, Injectable, Logger } from '@nestjs/common'
import { watch } from 'chokidar'
import { DynamicConfigOptions } from './config.options.interface'
import { TypedEventEmitter } from './TypedEventEmitter.class'
import { crush } from 'radash'
import { FileLoadService } from './file-loader.service'
import { ensureError } from './helpers'

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
  private readonly _logger: Logger
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
    private readonly _log: Logger,
  ) {
    super()

    // load the .env file
    const error1 = this._fileLoader.loadEnvFile(this.options)
    if (error1) this.logError(error1)

    // load the package.json file
    const [error2, pkg] = this._fileLoader.loadPkgFile(options)
    if (error2) {
      this._log.error(error2.message)
    } else {
      this._packageInfo = crush(pkg)
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
        this._log.fatal(error.message)
        process.exit(1)
      }
    }

    // Initial load the config file and start the file watcher
    this.loadConfig(configFile, true)
    watch(options.configFile).on('change', () => {
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
        this._log.fatal(error.message)
        process.exit(1)
      }
    }
    if (initial) {
      this.evalConfigFile(fileContent)
    } else {
      setTimeout(() => {
        this.evalConfigFile(fileContent)
        if (!this.options.noLogOnReload) this._logger.log(`Config file reloaded`)
      }, WAIT_TIME_RELOAD)
    }
  }

  evalConfigFile(content: string) {
    try {
      content = Object.keys(process.env).reduce(
        (cnt, key) => cnt.replaceAll('{{ENV_' + key + '}}', process.env[key]),
        content,
      )
      if (this._packageInfo) {
        content = Object.keys(this._packageInfo).reduce(
          (cnt, key) => cnt.replaceAll('{{pkg.' + key + '}}', this._packageInfo[key]),
          content,
        )
      }
      this._config = this._cfgFileType === 'js' ? eval(content) : JSON.parse(content)
    } catch (err) {
      const error = ensureError(err)
      if (this.options.onLoadErrorCallback) {
        this.options.onLoadErrorCallback(error)
      } else {
        this._logger.fatal(`Error while loading configuration file: ${error.message}`)
        process.exit(1)
      }
    }
  }

  get<T = string>(keys: string[] | string): T | undefined
  get<T = string>(keys: string[] | string, defaultValue: T): T
  get<T = string>(keys: string[] | string, defaultValue?: T): T {
    const key = typeof keys === 'string' ? keys : keys.join('.')
    return this._config[key] ?? defaultValue
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
      this._logger.fatal(`Error while loading configuration file: ${e.message}`)
      process.exit(1)
    }
  }

  private logError(error: unknown) {
    const e = ensureError(error)
    this._logger.fatal(`Error while loading configuration file: ${e.message}`)
  }
}

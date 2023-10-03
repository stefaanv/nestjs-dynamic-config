import { ConsoleLogger, Inject, Injectable, LoggerService } from '@nestjs/common'
import { watch, FSWatcher } from 'chokidar'
import { DynamicConfigOptions } from './config.options.interface'
import { TypedEventEmitter } from './TypedEventEmitter.class'
import { assign, crush, get, isEmpty } from 'radash'
import { FileLoadService } from './file-loader.service'
import { ensureError } from './helpers'
import * as dotenv from 'dotenv'

export const DYNAMIC_CONFIG_OPTIONS = 'DYNAMIC_CONFIG_OPTIONS'

const WAIT_TIME_RELOAD = 100
type LocalEventTypes = {
  reloaded: []
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const RELOADED_MSG = `Config file reloaded`
const MISSING_ENV_VAR_MSG = ` is not a defined environment variable`
const MISSING_PKG_INFO_MSG = ` is not defined in package.json`
const UNSUPPORTED_FILE_TYPE_MSG =
  'Unsupported config file type - only .js and JSON files are supported'
const FACTORY_WITHOUT_CONTENT =
  'One of the factories you provided in the `load` option returned `undefined`'

global.registerAs = (namespace: string, x: () => object) => ({ [namespace]: x() })

@Injectable()
export class ConfigService extends TypedEventEmitter<LocalEventTypes> {
  private readonly _logger: LoggerService
  private readonly _watcher: FSWatcher
  private _config: object = {}
  private _packageInfo: Record<string, any> = {}
  private _appName = '<unknown>'
  private _version = '<unknown>'
  private _consoleLogger = new ConsoleLogger()

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
    @Inject(DYNAMIC_CONFIG_OPTIONS) private readonly _options: DynamicConfigOptions,
    private readonly _fileLoader: FileLoadService,
  ) {
    super()
    this._logger = _options.logger

    // Initial load the config file and start the file watcher
    this.loadAllConfiguration(true)

    if (this._fileLoader.configFileHasAcceptableType) {
      this._watcher = watch(_options.configFile).on('change', () => {
        this.loadAllConfiguration()
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
    this.loadAllConfiguration(initial)
  }

  /**
   * loads in order
   * - one or more .env files
   * - package.json
   * - All configuration providers (config file PLUS options.load factories)
   *
   * emit 'reloaded' event if configured
   * handle errors
   *
   * @param initial set to true ONLY if this is the initial load
   * @returns void, the configuration is stored in this._config
   */
  private async loadAllConfiguration(initial = false) {
    // load the .env file
    if (!this._options.ignoreEnvFile) this.loadEnvFile()

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
      // this.parseAllConfigProviders() handles errors locally !
      this._config = this.parseAllConfigProviders()

      if (!initial) {
        // send reload message if so configured
        if (!this._options.noLogOnReload) this._logger?.log(RELOADED_MSG)
        this.emit('reloaded')
      }
    } catch (error) {
      this.handleFatalError(error)
    }
  }

  /**
   * calls this._options.onLoadErrorCallback() if defined
   * exits the program with error message otherwise
   */
  private handleFatalError(error: Error) {
    if (this._options.onLoadErrorCallback) {
      this._options.onLoadErrorCallback(error)
    } else {
      try {
        this._logger?.fatal(error.message)
      } catch (e) {}
      this._fileLoader.exit(error)
    }
  }

  /**
   * substitutes `package.json`, `.env.*` and environment variables in string content
   * @returns the same string with variables substituted where nessary
   */
  private substitute(content: string): string {
    const envKeys = Array.from(content.matchAll(/{{ENV_(\w*)}}/g), a => a[1])
    const pkgKeys = Array.from(content.matchAll(/{{pkg.(\w*)}}/g), a => a[1])

    if (envKeys.length > 0) {
      for (const key of envKeys) {
        const longKey = `{{ENV_${key}}}`
        const value = process.env[key]
        if (!value) this.logDebug(key + MISSING_ENV_VAR_MSG)
        else content = content.replaceAll(longKey, value)
      }
    }

    if (!isEmpty(this.packageInfo)) {
      for (const key of pkgKeys) {
        const longKey = `{{pkg.${key}}}`
        const value = this._packageInfo[key]
        if (!value) this.logDebug(key + MISSING_PKG_INFO_MSG)
        else content = content.replaceAll(longKey, value)
      }
    }
    return content
  }

  /**
   * parses all configuration providers in this order
   * - options.load factories
   * - configuration file
   * validates the content (if validation is provided in the options)
   *
   * Handles errors locally
   * @returns object with parsed content
   */
  private parseAllConfigProviders(): object {
    // load the content from `options.load` factories
    let loadedContent: object | undefined = undefined
    if (this._options.load) {
      try {
        loadedContent = JSON.parse(
          this.substitute(
            JSON.stringify(
              this._options.load?.reduce((accu, factory) => {
                const content = factory()
                if (!content) throw new Error(FACTORY_WITHOUT_CONTENT)
                return assign(accu, factory())
              }, {}),
            ),
          ),
        )
      } catch (error) {
        this.handleFatalError(error)
      }
    }

    // load the content provided in the configuration file
    let configFileContent: object = {}
    if (this._fileLoader.configFileType !== 'none') {
      const [error, content] = this._fileLoader.loadConfigFile()
      if (!error) {
        const substd = this.substitute(content)
        configFileContent =
          this._fileLoader.configFileType === 'js' ? eval(substd)() : JSON.parse(substd)
      } else {
        this.handleFatalError(error)
      }
    }

    const content = assign(configFileContent, loadedContent)

    if (this._options.validationSchema) {
      const validationResult = this._options.validationSchema.validate(
        content,
        this._options.validationOptions,
      )
      if (validationResult.error) {
        if (this._options.validationCallback) {
          this._options.validationCallback(validationResult.error)
        } else {
          this.handleFatalError(validationResult.error)
        }
      } else {
        return validationResult.value
      }
    }

    return content
  }

  private loadPkgFile() {
    const pkgContent = this._fileLoader.loadPkgFile()
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
      this.logDebug(msg)
    }
  }

  private loadEnvFile() {
    const envContents = this._fileLoader.loadEnvFiles()
    if (envContents.length === 0) return // stop execution, only global env-vars will be loaded
    for (const envContent of envContents) {
      try {
        const parsed = dotenv.parse(envContent)
        dotenv.populate(process.env, parsed)
      } catch (err) {
        this.logDebug(`Unable to parse the .env file: ${err.message}`)
      }
    }
  }

  closeFileWatcher() {
    if (!this._fileLoader.isFake) {
      this._watcher.unwatch('*')
      this._watcher.close()
    }
  }

  logDebug(msg: string) {
    if (this._options.debug) {
      if (this._options.logger?.debug) {
        this._options.logger.debug(msg)
      } else {
        this._consoleLogger.debug(msg)
      }
    }
  }
}

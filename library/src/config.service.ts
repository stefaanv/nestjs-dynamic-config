import { Inject, Injectable } from '@nestjs/common'
import * as dotenv from 'dotenv'
import { watch } from 'chokidar'
import { DynamicConfigOptions } from './config.options.interface'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { ConsoleLogger, LoggerService } from '@nestjs/common'
import { TypedEventEmitter } from './TypedEventEmitter.class'
import { crush } from 'radash'

const NODE_ENV = process.env.NODE_ENV || 'development'
const ENV_PATHS = [`${NODE_ENV}.env`, '.env', `../${NODE_ENV}.env`, '../.env']
const PKG_PATHS = ['package.json', '../package.json']
const WAIT_TIME_RELOAD = 100
type LocalEventTypes = {
  reloaded: []
}

//TODO git commit opvragen (productionCommitEnvVareName optie voor productie)

@Injectable()
export class ConfigService extends TypedEventEmitter<LocalEventTypes> {
  private readonly _logger: LoggerService
  private _config: unknown
  private _packageInfo: Record<string, any>
  public appName = '<unknown>'
  public version = '<unknown>'

  constructor(@Inject('DYNAMIC_CONFIG_OPTIONS') private readonly options: DynamicConfigOptions) {
    super()
    this._logger = options.logger ?? new ConsoleLogger()
    this.loadEnvFile(options)
    this._packageInfo = this.loadPackage(options)
    if (!this.checkFileType(options.configFile)) {
      throw new Error(`Configuration file must be .js or .json type`)
    }

    this.reloadConfig(true)
    watch(options.configFile).on('change', () => {
      this.reloadConfig()
      this.emit('reloaded')
    })
  }

  private reloadConfig(initial = false) {
    //TODO report changed (option)
    // load or reload the config file
    if (initial) {
      this.evalConfigFile()
    } else {
      setTimeout(() => {
        this.evalConfigFile()
        if (!this.options.noLogOnReload) this._logger.log(`Config file reloaded`)
      }, WAIT_TIME_RELOAD)
    }
  }

  checkFileType(fullPath: string) {
    return fullPath.endsWith('.js') || fullPath.endsWith('.json')
  }

  evalConfigFile() {
    try {
      const cfgFile = this.options.configFile
      let content = Object.keys(process.env).reduce(
        (cnt, key) => cnt.replaceAll('{{ENV_' + key + '}}', process.env[key]),
        readFileSync(cfgFile, { encoding: 'utf-8' }),
      )
      if (this._packageInfo) {
        content = Object.keys(this._packageInfo).reduce(
          (cnt, key) => cnt.replaceAll('{{pkg.' + key + '}}', this._packageInfo[key]),
          content,
        )
      }
      this._config = cfgFile.endsWith('.js') ? eval(content) : JSON.parse(content)
    } catch (error) {
      const err = error instanceof Error ? new Error(error.message) : error
      if (this.options.onLoadErrorCallback) {
        this.options.onLoadErrorCallback(error)
      } else {
        this._logger.error(`Error while loading configuration file: ${err.message}`, error)
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

  private loadEnvFile(options: DynamicConfigOptions) {
    if (options.rootFolder) {
      const folder = options.rootFolder
      const envFile = ENV_PATHS.map(f => resolve(folder, f)).filter(fp => existsSync(fp))[0]
      if (envFile) {
        dotenv.config({ debug: true, path: envFile })
        const envKeys = Object.keys(dotenv.parse(readFileSync(envFile)))
        this.logDebug(`Found keys [${envKeys.join(', ')}] in the .env file`)
      } else {
        this.logDebug(`No valid .env file found in "${folder}"`)
      }
    } else {
      this.logDebug('No "envFolder" provided')
    }
  }

  private loadPackage(options: DynamicConfigOptions): Record<string, any> | undefined {
    try {
      const folder = options.rootFolder
      const envFiles = PKG_PATHS.map(f => resolve(folder, f)).filter(fp => existsSync(fp))
      console.log('envFiles', envFiles)
      if (envFiles.length > 0) {
        const pkgContent = readFileSync(envFiles[0], 'utf8')
        const pkg = JSON.parse(pkgContent)
        this.appName = pkg['name']
        this.version = pkg['version']
        return crush(pkg)
      }
      return undefined
    } catch (error) {
      console.error(error)
      return undefined
    }
  }

  private logDebug(msg: string) {
    if (this.options.debug) this._logger.debug(msg)
  }
}

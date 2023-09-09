import { Inject, Injectable } from '@nestjs/common'
import * as dotenv from 'dotenv'
import { watch } from 'chokidar'
import { DynamicConfigOptions } from './config.options.interface'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { ConsoleLogger, LoggerService } from '@nestjs/common'
import { TypedEventEmitter } from './TypedEventEmitter.class'

const NODE_ENV = process.env.NODE_ENV || 'development'
const ENV_PATHS = [`${NODE_ENV}.env`, '.env', `../${NODE_ENV}.env`, '../.env']
const WAIT_TIME_RELOAD = 100
type LocalEventTypes = {
  reloaded: []
}

interface GetOptions {
  failOnNotFound?: boolean
}
@Injectable()
export class ConfigService extends TypedEventEmitter<LocalEventTypes> {
  private readonly _logger: LoggerService
  private _config: unknown
  private readonly _envConfig: { [key: string]: string }
  //TODO event sturen
  //TODO proxi functie

  constructor(@Inject('DYNAMIC_CONFIG_OPTIONS') private readonly options: DynamicConfigOptions) {
    super()
    this._logger = options.logger ?? new ConsoleLogger()
    this.loadEnvFile(options)
    if (!this.jsFileType(options.configFile)) {
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

  jsFileType(fullPath: string) {
    return fullPath.endsWith('.js') || fullPath.endsWith('.json')
  }

  evalConfigFile() {
    try {
      const cfgFile = this.options.configFile
      const content = readFileSync(cfgFile, { encoding: 'utf-8' })
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

  get<T>(keys: string[] | string, options?: GetOptions): T | undefined
  get<T>(keys: string[] | string, defaultValue: T, options?: GetOptions): T
  get<T>(keys: string[] | string, defaultValue?: T, options?: GetOptions): T {
    const key = typeof keys === 'string' ? keys : keys.join('.')
    return this._config[key] ?? defaultValue
  }

  getOrFail<T>(keys: string[] | string): T {
    const key = typeof keys === 'string' ? keys : keys.join('.')
    if (!this.get(keys)) throw new Error(`key ${key} not found in the configuration`)
    return this.get(keys)
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

  private logDebug(msg: string) {
    if (this.options.debug) this._logger.debug(msg)
  }
}

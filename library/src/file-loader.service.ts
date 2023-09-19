import { Inject, Injectable, LoggerService } from '@nestjs/common'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { DynamicConfigOptions } from './config.options.interface'
import { first } from 'radash'
import { ConfigFileTypes, DYNAMIC_CONFIG_OPTIONS } from './config.service'
import { ensureError } from './helpers'

const ENCODING = 'utf8'
const NODE_ENV = process.env.NODE_ENV || 'development'

export interface FakeContent {
  fake: true
  envContent?: string
  pkgContent?: string
  configContent: string | Error | undefined
  configFileType: ConfigFileTypes
}

@Injectable()
export class FileLoadService {
  private readonly _fakeContent: FakeContent | undefined
  private readonly _options: DynamicConfigOptions | undefined
  public exit: (exitCode: number) => {} = process.exit

  constructor(
    @Inject('DYNAMIC_CONFIG_OPTIONS')
    private readonly optionsOrFakeContent: DynamicConfigOptions | FakeContent,
  ) {
    if ('fake' in optionsOrFakeContent) {
      this._fakeContent = optionsOrFakeContent
      this._options = undefined
    } else {
      this._fakeContent = undefined
      this._options = optionsOrFakeContent
    }
  }

  loadSupportFile(file: 'pkg' | 'env'): string | undefined {
    if (this._fakeContent) {
      return this._fakeContent[file === 'pkg' ? 'pkgContent' : 'envContent']
    }
    const rootFolder = this._options.rootFolder
    if (!rootFolder) {
      const msg = `No rootfolder provided, .env and package.json files will not be parsed`
      this.logDebug(msg) // don't throw error, this could be intentional
      return undefined // stop execution if no rootfolder was provided
    }
    const paths =
      file === 'pkg'
        ? ['package.json', '../package.json']
        : [`${NODE_ENV}.env`, '.env', `../${NODE_ENV}.env`, '../.env']
    const fullPath = this.getFirstExisting(rootFolder, paths)
    if (!fullPath) {
      const fileName = file === 'env' ? '.env' : 'package.json'
      this.logDebug(`No valid ${fileName} file found in "${rootFolder}"`) // don't throw error, this could be intentional
      return undefined // stop execution if no .env file was found
    }
    return readFileSync(fullPath, ENCODING)
  }

  loadConfigFile(): [Error, undefined] | [undefined, string] {
    if (this._fakeContent) {
      if (this._fakeContent.configContent instanceof Error) throw this._fakeContent.configContent
      if (this._fakeContent.configContent) {
        return [undefined, this._fakeContent.configContent]
      } else {
        return [new Error(`Unable to load config file`), undefined]
      }
    }
    const file = this._options.configFile
    try {
      return [undefined, readFileSync(file, ENCODING)]
    } catch (error) {
      const msg = `Unable to read config file ${file}: ${ensureError(error).message}`
      return [new Error(msg), undefined]
    }
  }

  get configFileType(): ConfigFileTypes {
    if (this._fakeContent) return this._fakeContent.configFileType
    const path = this._options.configFile
    const isJs = path.endsWith('.js')
    const isJson = path.endsWith('.json')
    return isJs ? 'js' : isJson ? 'json' : 'other'
  }

  get isFake(): boolean {
    return this._fakeContent !== undefined
  }

  get fakeContent(): FakeContent {
    return this._fakeContent
  }

  private getFirstExisting(baseFolder: string, paths: string[]): string | undefined {
    const existingFiles = paths.map(f => resolve(baseFolder, f)).filter(fp => existsSync(fp))
    if (existingFiles.length < 1) return undefined
    return first(existingFiles)
  }

  logDebug(msg: string) {
    if (!this._fakeContent && this._options.debug && this._options.logger) {
      this._options.logger?.debug(msg)
    }
  }
}

import { Inject, Injectable } from '@nestjs/common'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { DynamicConfigOptions } from './config.options.interface'
import { first, isArray } from 'radash'
import { ConfigFileTypes } from './config.service'
import { ensureError } from './helpers'
import { path as discoveredRootFolder } from 'app-root-path'

const ENCODING = 'utf8'

export interface FakeContent {
  fake: true
  envContent?: string
  pkgContent?: string
  configContent?: string | Error
  configFileType: ConfigFileTypes
}

@Injectable()
export class FileLoadService {
  private readonly _fakeContent: FakeContent | undefined
  private readonly _options: DynamicConfigOptions | undefined
  private readonly _rootFolder: string = discoveredRootFolder
  public exit: (exitCode: number) => {} = process.exit

  constructor(
    @Inject('DYNAMIC_CONFIG_OPTIONS')
    optionsOrFakeContent: DynamicConfigOptions | FakeContent,
  ) {
    if ('fake' in optionsOrFakeContent) {
      this._fakeContent = optionsOrFakeContent
      this._options = undefined
    } else {
      const options = optionsOrFakeContent
      this._fakeContent = undefined
      this._options = options
      this._rootFolder = options.rootFolder
        ? options.rootFolder
        : discoveredRootFolder.endsWith('library')
        ? discoveredRootFolder.replace('library', 'test')
        : discoveredRootFolder
      this.logDebug(`rootfolder = "${this._rootFolder}"`)
    }
  }

  loadEnvFiles(): string[] {
    if (this._fakeContent) return [this._fakeContent.envContent]

    const envFileNames = this._options.envFilePath
      ? isArray(this._options.envFilePath)
        ? this._options.envFilePath
        : [this._options.envFilePath]
      : [`.${process.env.NODE_ENV}.env`, '.env']
    const existingFiles = envFileNames.filter(fn => existsSync(resolve(this._rootFolder, fn)))
    this.logDebug(`.env files ${existingFiles.join(', ')} found an parsed`)
    if (existingFiles.length === 0) {
      this.logDebug(`No .env file found in "${this._rootFolder}"`) // don't throw error, this could be intentional
      return [] // stop execution if no .env file was found
    }
    return existingFiles.map(fn => readFileSync(resolve(this._rootFolder, fn), ENCODING))
  }

  loadPkgFile(): string | undefined {
    if (this._fakeContent) return this._fakeContent.pkgContent

    const fullPath = resolve(this._rootFolder, 'package.json')
    if (!existsSync(fullPath)) {
      this.logDebug(`No "package.json" file found in "${this._rootFolder}"`) // don't throw error, this could be intentional
      return undefined // stop execution if no package file was found
    }
    this.logDebug(`"package.json" file found and parsed`) // don't throw error, this could be intentional
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
    if (!path) return 'none'
    if (path.endsWith('.js')) return 'js'
    if (path.endsWith('.json')) return 'json'
    return 'other'
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

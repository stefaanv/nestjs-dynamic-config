import { Inject, Injectable } from '@nestjs/common'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { DynamicConfigOptions } from './config.options.interface'
import { first } from 'radash'
import { ConfigFileTypes, DYNAMIC_CONFIG_OPTIONS } from './config.service'

const ENCODING = 'utf8'
const NODE_ENV = process.env.NODE_ENV || 'development'

export interface FakeContent {
  fake: true
  envContent: string
  pkgContent: string
  configContent: string
  configFileType: ConfigFileTypes
}

@Injectable()
export class FileLoadService {
  constructor(
    @Inject('FAKE_LOADER')
    private readonly options: DynamicConfigOptions | FakeContent,
  ) {}

  loadEnvFile(): string {
    if ('fake' in this.options) {
      if (!this.options.envContent) throw new Error('file not found')
      return this.options.envContent
    }
    const rootFolder = this.options.rootFolder
    if (!rootFolder) throw new Error('No "rootFolder" provided')
    // try to find the .env file
    const paths = [`${NODE_ENV}.env`, '.env', `../${NODE_ENV}.env`, '../.env']
    const envFile = this.getFirstExisting(this.options.rootFolder, paths)
    if (!envFile) throw new Error(`No valid .env file found in "${rootFolder}"`)
    const envContent = readFileSync(envFile, ENCODING)
    return envContent
  }

  loadPkgFile(): string {
    if ('fake' in this.options) {
      if (!this.options.pkgContent) throw new Error('file not found')
      return this.options.pkgContent
    }
    const folder = this.options.rootFolder
    const pkgFile = this.getFirstExisting(folder, ['package.json', '../package.json'])
    if (!pkgFile) throw new Error(`package.json file not found`)
    const pkgContent = readFileSync(pkgFile, ENCODING)
    return pkgContent
  }

  loadConfigFile(): string {
    if ('fake' in this.options) {
      if (!this.options.configContent) throw new Error('file not found')
      return this.options.configContent
    }
    return readFileSync(this.options.configFile, ENCODING)
  }

  get configFileType(): ConfigFileTypes {
    if ('fake' in this.options) return this.options.configFileType
    const path = this.options.configFile
    const isJs = path.endsWith('.js')
    const isJson = path.endsWith('.json')
    return isJs ? 'js' : isJson ? 'json' : 'other'
  }

  private getFirstExisting(baseFolder: string, paths: string[]): string | undefined {
    const existingFiles = paths.map(f => resolve(baseFolder, f)).filter(fp => existsSync(fp))
    if (existingFiles.length < 1) return undefined
    return first(existingFiles)
  }
}

import { Injectable } from '@nestjs/common'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { DynamicConfigOptions } from './config.options.interface'
import * as dotenv from 'dotenv'
import { first } from 'radash'
import { ensureError } from './helpers'

const ENCODING = 'utf8'
const NODE_ENV = process.env.NODE_ENV || 'development'

@Injectable()
export class FileLoadService {
  loadEnvFile(options: DynamicConfigOptions): Error | undefined {
    const rootFolder = options.rootFolder
    if (!rootFolder) return new Error('No "rootFolder" provided')
    // try to find the .env file
    const envFile = this.getFirstExisting(options.rootFolder, [
      `${NODE_ENV}.env`,
      '.env',
      `../${NODE_ENV}.env`,
      '../.env',
    ])
    if (!envFile) return new Error(`No valid .env file found in "${rootFolder}"`)
    dotenv.config({ debug: true, path: envFile })
    return undefined
  }

  loadPkgFile(options: DynamicConfigOptions): [Error, undefined] | [undefined, object] {
    try {
      const folder = options.rootFolder
      const pkgFile = this.getFirstExisting(folder, ['package.json', '../package.json'])
      if (!pkgFile) return [new Error(`package.json file not found`), undefined]
      const pkgContent = readFileSync(pkgFile, ENCODING)
      return [undefined, JSON.parse(pkgContent)]
    } catch (error) {
      return [ensureError(error), undefined]
    }
  }

  loadConfigFile(path: string): [Error, undefined] | [undefined, string] {
    try {
      return [undefined, readFileSync(path, ENCODING)]
    } catch (error) {
      return [ensureError(error), undefined]
    }
  }

  getFirstExisting(baseFolder: string, paths: string[]): string | undefined {
    const existingFiles = paths.map(f => resolve(baseFolder, f)).filter(fp => existsSync(fp))
    if (existingFiles.length < 1) return undefined
    return first(existingFiles)
  }
}

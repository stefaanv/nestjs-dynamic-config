import { Injectable } from '@nestjs/common'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { DynamicConfigOptions } from './config.options.interface'
import * as dotenv from 'dotenv'
import { first } from 'radash'

const ENCODING = 'utf8'
const NODE_ENV = process.env.NODE_ENV || 'development'

@Injectable()
export class FileLoadService {
  loadEnvFile(options: DynamicConfigOptions): [string, undefined] | [undefined, string] {
    const rootFolder = options.rootFolder
    if (!rootFolder) return ['No "rootFolder" provided', undefined]
    // try to find the .env file
    const envFile = this.getFirstExisting(options.rootFolder, [
      `${NODE_ENV}.env`,
      '.env',
      `../${NODE_ENV}.env`,
      '../.env',
    ])
    if (!envFile) return [`No valid .env file found in "${rootFolder}"`, undefined]
    dotenv.config({ debug: true, path: envFile })
    return [undefined, readFileSync(envFile, ENCODING)]
  }

  getFirstExisting(baseFolder: string, paths: string[]): string | undefined {
    const existingFiles = paths.map(f => resolve(baseFolder, f)).filter(fp => existsSync(fp))
    if (existingFiles.length < 1) return undefined
    return first(existingFiles)
  }
}

import { ModuleMocker, MockFunctionMetadata } from 'jest-mock'
import { ConfigService, DYNAMIC_CONFIG_OPTIONS } from './config.service'
import { Test } from '@nestjs/testing'
import { Logger, LoggerService } from '@nestjs/common'
import { DynamicConfigOptions } from './config.options.interface'
import { FileLoadService } from './file-loader.service'

const moduleMocker = new ModuleMocker(global)

describe('ConfigService', () => {
  let nullLogger: LoggerService = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  }
  let options: DynamicConfigOptions = { configFile: 'test.js' }
  let loader: FileLoadService = {
    getFirstExisting: () => undefined,
    loadConfigFile: () => [undefined, ''],
    loadEnvFile: () => [undefined, ''],
    loadPkgFile: () => [
      undefined,
      {
        name: 'app-name',
        author: 'Stefaan Vandevelde',
        version: 'x.y.z',
      },
    ],
  }
  let service: ConfigService

  describe('read basic package info', () => {
    const service = new ConfigService(options, loader, nullLogger)
    it('empty', async () => {
      expect(service.appName).toBe('app-name')
      expect(service.version).toBe('x.y.z')
      expect(service.packageInfo['author']).toBe('Stefaan Vandevelde')
    })
    service.closeFileWatcher()
  })

  describe('no package info if the package.json file cannot be loaded', () => {
    loader.loadPkgFile = () => [new Error(), undefined]
    const service = new ConfigService(options, loader, nullLogger)
    it('empty', async () => {
      expect(service.appName).toBe('<unknown>')
      expect(service.version).toBe('<unknown>')
      expect(service.packageInfo['author']).toBeUndefined()
    })
    service.closeFileWatcher()
  })

  describe('Load basic .env file', () => {
    loader.loadEnvFile = () => [undefined, 'TEST=test']
    const service = new ConfigService(options, loader, nullLogger)
    it('empty', async () => {
      expect(process.env.TEST).toBe('test')
      expect(process.env.UNKNOWN_KEY).toBeUndefined()
    })
    service.closeFileWatcher()
  })
})

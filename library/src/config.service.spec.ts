import { ModuleMocker } from 'jest-mock'
import { ConfigService } from './config.service'
import { Test } from '@nestjs/testing'
import { LoggerService } from '@nestjs/common'
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
  let options: DynamicConfigOptions = { configFile: 'test.js', logger: nullLogger }
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
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(service.appName).toBe('app-name')
      expect(service.version).toBe('x.y.z')
      expect(service.packageInfo['author']).toBe('Stefaan Vandevelde')
    })
    service.closeFileWatcher()
  })

  describe('no package info if the package.json file cannot be loaded', () => {
    loader.loadPkgFile = () => [new Error(), undefined]
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(service.appName).toBe('<unknown>')
      expect(service.version).toBe('<unknown>')
      expect(service.packageInfo['author']).toBeUndefined()
    })
    service.closeFileWatcher()
  })

  describe('Load basic .env file', () => {
    loader.loadEnvFile = () => [undefined, 'TEST=test']
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(process.env.TEST).toBe('test')
      expect(process.env.UNKNOWN_KEY).toBeUndefined()
    })
    service.closeFileWatcher()
  })

  describe('Basic config', () => {
    ;(function () {
      return {
        devName: '{{ENV_DEV}}',
        appName: '{{pkg.name}}',
      }
    })()
    loader.loadConfigFile = () => [undefined, `(() => ({ps: 'string', pn:10, pb: true}))()`]
    options.configFile = 'xxx.js'
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(service.get<string>('ps')).toBe('string')
      expect(service.get<number>('pn')).toBe(10)
      expect(service.get<number>('pb')).toBeTruthy()
    })
    service.closeFileWatcher()
  })
})

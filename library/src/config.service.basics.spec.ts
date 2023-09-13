import { ModuleMocker } from 'jest-mock'
import { ConfigService } from './config.service'
import { DynamicConfigOptions } from './config.options.interface'
import { FileLoadService } from './file-loader.service'

const moduleMocker = new ModuleMocker(global)

describe('ConfigService', () => {
  let options: DynamicConfigOptions = {
    configFile: 'test.js',
  }
  let config = `(() => ({ps: 'string', pn:10, pb: true}))()`
  let pkg = `{ "name": "app", "author": "developer", "version": "1.2.30" }`
  let env = 'KEY=VALUE'
  let loader: FileLoadService = {
    getFirstExisting: () => undefined,
    loadConfigFile: () => [undefined, config],
    loadEnvFile: () => [undefined, env],
    loadPkgFile: () => [undefined, pkg],
  }
  let service: ConfigService

  describe('read basic package info', () => {
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(service.appName).toBe('app')
      expect(service.version).toBe('1.2.30')
      expect(service.packageInfo['author']).toBe('developer')
      expect(service.packageInfo['unknown-key']).toBeUndefined()
    })
    service.closeFileWatcher()
  })

  describe('package.json file cannot be loaded', () => {
    loader.loadPkgFile = () => [new Error(), undefined]
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(service.appName).toBe('<unknown>')
      expect(service.version).toBe('<unknown>')
      expect(service.packageInfo['author']).toBeUndefined()
      expect(service.packageInfo['unknown-key']).toBeUndefined()
    })
    service.closeFileWatcher()
  })

  describe('Load basic .env file', () => {
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(process.env.KEY).toBe('VALUE')
      expect(process.env.UNKNOWN_KEY).toBeUndefined()
    })
    service.closeFileWatcher()
  })

  describe('.env file cannot be loaded', () => {
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(process.env.KEY).toBe('VALUE')
      expect(process.env.UNKNOWN_KEY).toBeUndefined()
    })
    service.closeFileWatcher()
  })

  describe('Basic config', () => {
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(service.get<string>('ps')).toBe('string')
      expect(service.get<number>('pn')).toBe(10)
      expect(service.get<number>('pb')).toBeTruthy()
      expect(service.get('unknownKey')).toBeUndefined()
      expect(service.get('unknownKey', 'x')).toBe('x')
      expect(service.get<number>('unknownKey', 10)).toBe(10)
    })
    service.closeFileWatcher()
  })

  describe('Config file missing', () => {
    const mockFn = jest.fn()
    loader.loadConfigFile = () => [new Error(), undefined]
    options.onLoadErrorCallback = mockFn
    const service = new ConfigService(options, loader)
    it('must be correct', async () => {
      expect(mockFn).toHaveBeenCalled()
      expect(service.get<string>('ps')).toBeUndefined()
      expect(service.get('unknownKey', 'x')).toBe('x')
      expect(service.get<number>('unknownKey', 10)).toBe(10)
    })
    service.closeFileWatcher()
  })
})

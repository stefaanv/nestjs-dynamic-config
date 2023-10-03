import { ConfigService } from '../config.service'
import { DynamicConfigOptions } from '../config.options.interface'
import { FakeContent, FileLoadService } from '../file-loader.service'

describe('Basics', () => {
  let options: DynamicConfigOptions
  let fakeContent: FakeContent
  let loader: FileLoadService
  let service: ConfigService

  beforeEach(() => {
    delete process.env.KEY
    options = { configFile: '' } as DynamicConfigOptions
    fakeContent = {
      fake: true,
      envContent: 'KEY=VALUE',
      pkgContent: `{ "name": "app", "author": "developer", "version": "1.2.30" }`,
      configContent: `exports.default = () => ({ps: 'string', pn:10, pb: true})`,
      configFileType: 'js',
    }
    loader = new FileLoadService(fakeContent)
  })

  afterEach(() => {
    service?.closeFileWatcher()
  })

  it('read basic package info', async () => {
    service = new ConfigService(options, loader)
    expect(service.appName).toBe('app')
    expect(service.version).toBe('1.2.30')
    expect(service.packageInfo['author']).toBe('developer')
    expect(service.packageInfo['unknown-key']).toBeUndefined()
  })

  it('package.json file cannot be loaded', async () => {
    loader.fakeContent.pkgContent = undefined
    service = new ConfigService(options, loader)
    expect(service.appName).toBe('<unknown>')
    expect(service.version).toBe('<unknown>')
    expect(service.packageInfo['author']).toBeUndefined()
    expect(service.packageInfo['unknown-key']).toBeUndefined()
  })

  it('Load basic .env file', async () => {
    service = new ConfigService(options, loader)
    expect(process.env.KEY).toBe('VALUE')
    expect(process.env.UNKNOWN_KEY).toBeUndefined()
  })

  it('.env file cannot be loaded', async () => {
    loader.fakeContent.envContent = undefined
    service = new ConfigService(options, loader)
    expect(process.env.KEY).toBeUndefined()
    expect(process.env.UNKNOWN_KEY).toBeUndefined()
  })

  it('Basic config, no substitution', async () => {
    service = new ConfigService(options, loader)
    expect(service.get<string>('ps')).toBe('string')
    expect(service.get<number>('pn')).toBe(10)
    expect(service.get<number>('pb')).toBeTruthy()
    expect(service.get('unknownKey')).toBeUndefined()
    expect(service.get('unknownKey', 'x')).toBe('x')
    expect(service.get<number>('unknownKey', 10)).toBe(10)
  })

  it('Basic config from JSON file', async () => {
    fakeContent.configContent = '{"ps": "string", "pn":10, "pb": true}'
    fakeContent.configFileType = 'json'
    service = new ConfigService(options, loader)
    expect(service.get<string>('ps')).toBe('string')
    expect(service.get<number>('pn')).toBe(10)
    expect(service.get<number>('pb')).toBeTruthy()
    expect(service.get('unknownKey')).toBeUndefined()
    expect(service.get('unknownKey', 'x')).toBe('x')
    expect(service.get<number>('unknownKey', 10)).toBe(10)
  })

  it('Basic config with multiple levels', async () => {
    fakeContent.configContent = `exports.default = () => ({l1:{l2:{l3:'L3'}, l2b:'L2B'}})`
    fakeContent.configFileType = 'js'
    service = new ConfigService(options, loader)
    expect(service.get<string>('l1.l2b')).toBe('L2B')
    expect(service.get<number>(['l1', 'l2b'])).toBe('L2B')
    expect(service.get('l1.l2')).toStrictEqual({ l3: 'L3' })
  })

  it('Config file missing', async () => {
    const mockFn = jest.fn()
    fakeContent.configContent = undefined
    let loader = new FileLoadService(fakeContent)
    options.onLoadErrorCallback = mockFn
    const service = new ConfigService(options, loader)
    expect(mockFn).toHaveBeenCalled()
    expect(service.get<string>('ps')).toBeUndefined()
    expect(service.get('unknownKey', 'x')).toBe('x')
    expect(service.get<number>('unknownKey', 10)).toBe(10)
  })
})

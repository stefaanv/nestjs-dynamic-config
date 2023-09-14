import { ConfigService } from './config.service'
import { DynamicConfigOptions } from './config.options.interface'
import { FakeContent, FileLoadService } from './file-loader.service'

describe('Basics', () => {
  let options: DynamicConfigOptions
  let fakeContent: FakeContent
  let loader: FileLoadService
  let service: ConfigService

  beforeEach(() => {
    // console.log('BeforeEach')
    options = { configFile: '' } as DynamicConfigOptions
    fakeContent = {
      fake: true,
      envContent: 'KEY=VALUE',
      pkgContent: `{ "name": "app", "author": "developer", "version": "1.2.30" }`,
      configContent: `(() => ({ps: 'string', pn:10, pb: true}))()`,
      configFileType: 'js',
    }
    loader = new FileLoadService(fakeContent)
    service = new ConfigService(options, loader)
  })

  afterEach(() => {
    service.closeFileWatcher()
    console.log('after')
  })

  it('read basic package info', async () => {
    expect(service.appName).toBe('app')
    expect(service.version).toBe('1.2.30')
    expect(service.packageInfo['author']).toBe('developer')
    expect(service.packageInfo['unknown-key']).toBeUndefined()
    service.closeFileWatcher()
  })

  it('package.json file cannot be loaded', async () => {
    delete process.env.VALUE
    fakeContent.pkgContent = undefined
    loader = new FileLoadService(fakeContent)
    service = new ConfigService(options, loader)
    expect(service.appName).toBe('<unknown>')
    expect(service.version).toBe('<unknown>')
    expect(service.packageInfo['author']).toBeUndefined()
    expect(service.packageInfo['unknown-key']).toBeUndefined()
    service.closeFileWatcher()
  })
  it('Load basic .env file', async () => {
    expect(process.env.KEY).toBe('VALUE')
    expect(process.env.UNKNOWN_KEY).toBeUndefined()
    service.closeFileWatcher()
  })
  /* 

  describe('.env file cannot be loaded', () => {
    delete process.env.KEY
    fakeContent.envContent = undefined
    let loader = new FileLoadService(fakeContent)
    const service = new ConfigService(options, loader)
    it('all keys must return undefined', async () => {
      expect(process.env.KEY).toBeUndefined()
      expect(process.env.UNKNOWN_KEY).toBeUndefined()
    })
    service.closeFileWatcher()
  })
  describe('Basic config', () => {
    const service = new ConfigService(options, loader)
    it('must be as defined', async () => {
      expect(service.get<string>('ps')).toBe('string')
      expect(service.get<number>('pn')).toBe(10)
      expect(service.get<number>('pb')).toBeTruthy()
      expect(service.get('unknownKey')).toBeUndefined()
      expect(service.get('unknownKey', 'x')).toBe('x')
      expect(service.get<number>('unknownKey', 10)).toBe(10)
    })
    service.closeFileWatcher()
  })

  describe('Basic config from JSON file', () => {
    fakeContent.configContent = '{"ps": "string", "pn":10, "pb": true}'
    fakeContent.configFileType = 'json'
    let loader = new FileLoadService(fakeContent)
    const service = new ConfigService(options, loader)
    it('must be as defined', async () => {
      expect(service.get<string>('ps')).toBe('string')
      expect(service.get<number>('pn')).toBe(10)
      expect(service.get<number>('pb')).toBeTruthy()
      expect(service.get('unknownKey')).toBeUndefined()
      expect(service.get('unknownKey', 'x')).toBe('x')
      expect(service.get<number>('unknownKey', 10)).toBe(10)
    })
    service.closeFileWatcher()
  })

  describe('Multiple levels', () => {
    fakeContent.configContent = `(() => ({l1:{l2:{l3:'L3'}, l2b:'L2B'}}))()`
    fakeContent.configFileType = 'js'
    let loader = new FileLoadService(fakeContent)
    const service = new ConfigService(options, loader)
    it('dotted key notation', async () => {
      expect(service.get<string>('l1.l2b')).toBe('L2B')
    })
    it('array of keys', async () => {
      expect(service.get<number>(['l1', 'l2b'])).toBe('L2B')
    })
    it('dotted keys to object', async () => {
      expect(service.get('l1.l2')).toStrictEqual({ l3: 'L3' })
    })
    service.closeFileWatcher()
  })

  describe('Config file missing', () => {
    const mockFn = jest.fn()
    fakeContent.configContent = undefined
    let loader = new FileLoadService(fakeContent)
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
  */
})

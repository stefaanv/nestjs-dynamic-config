import { ConfigService } from '../config.service'
import { DynamicConfigOptions } from '../config.options.interface'
import { FakeContent, FileLoadService } from '../file-loader.service'

describe('Reload events', () => {
  let options: DynamicConfigOptions
  let fakeContent: FakeContent
  let loader: FileLoadService
  let service: ConfigService

  beforeEach(() => {
    delete process.env.KEY
    options = { configFile: '' }
    fakeContent = {
      fake: true,
      envContent: 'KEY=VALUE',
      pkgContent: `{ "name": "app", "author": "developer", "version": "1.2.30" }`,
      configContent: `(() => ({s: 'string', n:100}))()`,
      configFileType: 'js',
    }
    loader = new FileLoadService(fakeContent)
  })

  afterEach(() => {
    service?.closeFileWatcher()
  })

  it('"reloaded" event fired after reload', async () => {
    service = new ConfigService(options, loader)
    const reloaded = jest.fn()
    service.on('reloaded', reloaded)
    service.forceReload(false)
    expect(reloaded).toHaveBeenCalled()
  })

  it('Content altered after reload', async () => {
    service = new ConfigService(options, loader)
    const proxy = service.createProxy<number>('n')
    expect(service.get('s')).toBe('string')
    expect(service.get<number>('n')).toBe(100)
    expect(proxy()).toBe(100)
    // prepare reload
    fakeContent.configContent = `(() => ({s: 'test', n:36}))()`
    const reloaded = jest.fn()
    service.on('reloaded', reloaded)
    service.forceReload(false)
    expect(reloaded).toHaveBeenCalled()
    expect(service.get('s')).toBe('test')
    expect(service.get<number>('n')).toBe(36)
    expect(proxy()).toBe(36)
  })

  it('JSON Content altered after reload', async () => {
    fakeContent.configContent = `{"s":"string", "n":100}`
    fakeContent.configFileType = 'json'
    service = new ConfigService(options, loader)
    expect(service.get('s')).toBe('string')
    expect(service.get<number>('n')).toBe(100)
    // prepare reload
    fakeContent.configContent = `{"s":"test", "n":36}`
    const reloaded = jest.fn()
    service.on('reloaded', reloaded)
    service.forceReload(false)
    expect(reloaded).toHaveBeenCalled()
    expect(service.get('s')).toBe('test')
    expect(service.get<number>('n')).toBe(36)
  })
})

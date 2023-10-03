import { ConfigService } from '../config.service'
import { DynamicConfigOptions } from '../config.options.interface'
import { FakeContent, FileLoadService } from '../file-loader.service'

describe('Basics', () => {
  let options: DynamicConfigOptions
  let fakeContent: FakeContent
  let loader: FileLoadService
  let service: ConfigService
  let toLoad: object

  beforeEach(() => {
    delete process.env.KEY
    options = { configFile: '', load: [() => ({ test: 'xyz' })] } as DynamicConfigOptions
    fakeContent = {
      fake: true,
      envContent: 'KEY=VALUE',
      configFileType: 'none',
    }
    loader = new FileLoadService(fakeContent)
  })

  afterEach(() => {
    service?.closeFileWatcher()
  })

  it('read basic loaded info', async () => {
    service = new ConfigService(options, loader)
    expect(service.get('test')).toBe('xyz')
  })

  it('read multiple loaded info', async () => {
    options.load = [() => ({ test1: 'answ1' }), () => ({ test2: 25 }), () => ({ test3: true })]
    service = new ConfigService(options, loader)
    expect(service.get('test1')).toBe('answ1')
    expect(service.get<number>('test2')).toBe(25)
    expect(service.get<boolean>('test3')).toBe(true)
  })

  it('read complex loaded info', async () => {
    options.load = [() => ({ test: { test: 'testtest' } })]
    service = new ConfigService(options, loader)
    expect(service.get('test.test')).toBe('testtest')
    expect(service.get('test')).toEqual({ test: 'testtest' })
  })

  it('read substituted loaded info', async () => {
    options.load = [() => ({ test: '{{ENV_KEY}}' })]
    service = new ConfigService(options, loader)
    expect(service.get('test')).toBe('VALUE')
  })

  it('must exit if load return not info', async () => {
    options.load = [() => undefined]
    const fatal = jest.fn()
    options.onLoadErrorCallback = fatal
    service = new ConfigService(options, loader)
    service.get('test')
    expect(fatal).toHaveBeenCalledTimes(1)
  })
})

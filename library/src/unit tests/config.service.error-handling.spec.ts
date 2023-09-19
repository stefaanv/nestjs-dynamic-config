import { ConfigService } from './config.service'
import { DynamicConfigOptions } from './config.options.interface'
import { FakeContent, FileLoadService } from './file-loader.service'

describe('Error handling', () => {
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
      configContent: `(() => ({env: '{{ENV_KEY}}', appName:'{{pkg.name}}'}))()`,
      configFileType: 'js',
    }
    loader = new FileLoadService(fakeContent)
  })

  afterEach(() => {
    service?.closeFileWatcher()
  })

  it('exit program on wrong config file type', async () => {
    fakeContent.configFileType = 'other'
    loader = new FileLoadService(fakeContent)
    const exit = jest.fn()
    loader.exit = exit
    service = new ConfigService(options, loader)
    expect(exit).toHaveBeenCalled()
  })

  it('call onLoadErrorCalBack on wrong config file type', async () => {
    fakeContent.configFileType = 'other'
    loader = new FileLoadService(fakeContent)
    const exit = jest.fn()
    loader.exit = exit
    const cb = jest.fn()
    options.onLoadErrorCallback = cb
    service = new ConfigService(options, loader)
    expect(exit).not.toHaveBeenCalled()
    expect(cb).toHaveBeenCalled()
  })

  it('Unparsable .js file', async () => {
    fakeContent.configFileType = 'js'
    fakeContent.configContent = 'blabla'
    loader = new FileLoadService(fakeContent)
    const exit = jest.fn()
    loader.exit = exit
    service = new ConfigService(options, loader)
    expect(exit).toHaveBeenCalled()
  })

  it('Unparsable .js file with onLoadErrorCalBack', async () => {
    fakeContent.configFileType = 'js'
    fakeContent.configContent = 'blabla'
    loader = new FileLoadService(fakeContent)
    const exit = jest.fn()
    loader.exit = exit
    const cb = jest.fn()
    options.onLoadErrorCallback = cb
    service = new ConfigService(options, loader)
    expect(exit).not.toHaveBeenCalled()
    expect(cb).toHaveBeenCalled()
  })

  it('Unparsable .json file with onLoadErrorCalBack', async () => {
    fakeContent.configFileType = 'js'
    fakeContent.configContent = '{ "test":"xxx",}'
    loader = new FileLoadService(fakeContent)
    const cb = jest.fn()
    options.onLoadErrorCallback = cb
    service = new ConfigService(options, loader)
    expect(cb).toHaveBeenCalled()
  })
})

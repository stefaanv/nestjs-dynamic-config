import { ConfigService } from '../config.service'
import { DynamicConfigOptions } from '../config.options.interface'
import { FakeContent, FileLoadService } from '../file-loader.service'
import { LoggerService } from '@nestjs/common'

describe('Substitution', () => {
  let options: DynamicConfigOptions
  let fakeContent: FakeContent
  let loader: FileLoadService
  let service: ConfigService
  let log: (msg: string) => void
  let debug: (msg: string) => void
  let warn: (msg: string) => void
  let error: (msg: string) => void
  let logger: LoggerService

  beforeEach(() => {
    delete process.env.KEY
    options = { configFile: '' }
    fakeContent = {
      fake: true,
      envContent: 'KEY=VALUE',
      pkgContent: `{ "name": "app", "author": "developer", "version": "1.2.30" }`,
      configContent: `(() => ({s: 'string', n:10, b: true}))()`,
      configFileType: 'js',
    }
    log = jest.fn()
    debug = jest.fn()
    warn = jest.fn()
    error = jest.fn()
    logger = { debug, log, warn, error }
    loader = new FileLoadService(fakeContent)
  })

  afterEach(() => {
    service?.closeFileWatcher()
  })

  it('logging on reload', async () => {
    options.logger = logger
    service = new ConfigService(options, loader)
    service.forceReload(false)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(`Config file reloaded`)
  })

  it('No logging on reload if logging is disabled', async () => {
    options.logger = logger
    options.noLogOnReload = true
    service = new ConfigService(options, loader)
    service.forceReload(false)
    expect(log).not.toHaveBeenCalled()
  })

  it('No logging on reload if logging is enabled but no logger is defined', async () => {
    options.logger = undefined
    options.noLogOnReload = false
    service = new ConfigService(options, loader)
    service.forceReload(false)
    expect(log).not.toHaveBeenCalled()
  })

  it('substitution of unknown pkg key', async () => {
    options.logger = logger
    options.noLogOnReload = true
    fakeContent.pkgContent = `{ "name": "test"}`
    fakeContent.configContent = `{ "s": "{{pkg.unknown}}", "n": 10, "b": true }`
    fakeContent.configFileType = `json`
    loader = new FileLoadService(fakeContent)
    service = new ConfigService(options, loader)
    expect(debug).toHaveBeenCalledTimes(1)
    expect(debug).toHaveBeenCalledWith(`unknown is not defined in package.json`)
  })

  it('substitution of unknown pkg key - no logger', async () => {
    options.logger = undefined
    fakeContent.pkgContent = `{ "name": "test"}`
    fakeContent.configContent = `{ "s": "{{pkg.unknown}}", "n": 10, "b": true }`
    fakeContent.configFileType = `json`
    loader = new FileLoadService(fakeContent)
    service = new ConfigService(options, loader)
    expect(debug).not.toHaveBeenCalled()
  })
})

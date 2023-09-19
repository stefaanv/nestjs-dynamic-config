import { ConfigService } from '../config.service'
import { DynamicConfigOptions } from '../config.options.interface'
import { FakeContent, FileLoadService } from '../file-loader.service'
import * as Joi from 'Joi'

describe('Validation', () => {
  let options: DynamicConfigOptions
  let fakeContent: FakeContent
  let loader: FileLoadService
  let service: ConfigService
  let cb: jest.Mock<(error: Joi.ValidationError) => {}>

  beforeEach(() => {
    delete process.env.KEY
    cb = jest.fn()
    options = { configFile: '', validationCallback: cb }
    fakeContent = {
      fake: true,
      configContent: `{"test":"test"}`,
      configFileType: 'json',
    }
    loader = new FileLoadService(fakeContent)
  })

  afterEach(() => {
    service?.closeFileWatcher()
  })

  it('Simple validation succeeds', async () => {
    options.validationSchema = Joi.object({
      test: Joi.string().valid('a', 'b', 'test', 'c').default('development'),
    })
    service = new ConfigService(options, loader)
    expect(cb).toHaveBeenCalledTimes(0)
    expect(service.get('test')).toBe('test')
  })

  it('Undefined value substituted with default', async () => {
    options.validationSchema = Joi.object({
      test2: Joi.string().default('a'),
      test: Joi.string(),
    })
    service = new ConfigService(options, loader)
    expect(cb).toHaveBeenCalledTimes(0)
    expect(service.get('test2')).toBe('a')
  })

  it('Simple validation fails', async () => {
    options.validationSchema = Joi.object({
      test: Joi.string().valid('a', 'b', 'c').default('a'),
    })
    service = new ConfigService(options, loader)
    expect(cb).toHaveBeenCalledTimes(1)
    const error = cb.mock.calls[0][0]
    expect(error).toBeInstanceOf(Joi.ValidationError)
    expect(error.message).toBe(`"test" must be one of [a, b, c]`)
  })

  it('validation failure without callback crahses the program', async () => {
    options.validationSchema = Joi.object({
      test: Joi.string().valid('a', 'b', 'c').default('a'),
    })
    options.validationCallback = undefined
    const exit = jest.fn()
    loader.exit = exit
    service = new ConfigService(options, loader)
    expect(exit).toBeCalled()
  })

  it('Use of validationOptions (allowUnkown)', async () => {
    options.validationSchema = Joi.object({
      other: Joi.string(),
    })
    options.validationOptions = { allowUnknown: true }
    service = new ConfigService(options, loader)
    expect(cb).toHaveBeenCalledTimes(0)
    expect(service.get('test')).toBe('test')
    // reference
    options.validationOptions = { allowUnknown: false }
    service = new ConfigService(options, loader)
    expect(cb).toHaveBeenCalledTimes(1)
  })
})

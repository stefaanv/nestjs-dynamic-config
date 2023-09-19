import { ConfigService } from './config.service'
import { DynamicConfigOptions } from './config.options.interface'
import { FakeContent, FileLoadService } from './file-loader.service'

describe('Substitution', () => {
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

  it('read substituted values', async () => {
    service = new ConfigService(options, loader)
    expect(service.get('env')).toBe('VALUE')
    expect(service.get('appName')).toBe('app')
  })
})
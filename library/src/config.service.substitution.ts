import { ConfigService } from './config.service'
import { DynamicConfigOptions } from './config.options.interface'
import { FakeContent, FileLoadService } from './file-loader.service'

describe('Substitution', () => {
  let options: DynamicConfigOptions = {
    configFile: 'test.js',
  }
  let fakeContent: FakeContent = {
    fake: true,
    envContent: 'KEY=VALUE',
    pkgContent: `{ "name": "app", "author": "developer", "version": "1.2.30" }`,
    configContent: `(() => ({env: '{{ENV_KEY}}', appName:'{{pkg.name}}'}))()`,
    configFileType: 'js',
  }
  let loader = new FileLoadService(fakeContent)

  describe('read substituted values', () => {
    const service = new ConfigService(options, loader)
    it('env must equal "VALUE"', async () => {
      expect(service.get('env')).toBe('VALUE')
    })
    it('appName must equal "app"', async () => {
      expect(service.get('appName')).toBe('app')
    })
    service.closeFileWatcher()
  })
})

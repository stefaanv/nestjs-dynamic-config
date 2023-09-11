import { ModuleMocker, MockFunctionMetadata } from 'jest-mock'
import { ConfigService, DYNAMIC_CONFIG_OPTIONS } from './config.service'
import { Test } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { DynamicConfigOptions } from './config.options.interface'

const moduleMocker = new ModuleMocker(global)

describe('ConfigService', () => {
  let service: ConfigService

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ConfigService],
    })
      .useMocker(token => {
        if (token === Logger) {
          return { findAll: jest.fn() }
        }
        if (token === DYNAMIC_CONFIG_OPTIONS) {
          return { configFile: 'test.js' } as DynamicConfigOptions
        }
      })
      .compile()

    service = moduleRef.get(ConfigService)
  })

  describe('empty', () => {
    const waar = true
    it('empty', async () => {
      expect(waar).toBeTruthy()
    })
  })
})

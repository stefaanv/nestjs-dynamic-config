import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from './config.service'
import { DynamicConfigOptions } from './config.options.interface'

@Module({})
export class ConfigModule {
  static register(options: DynamicConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: 'DYNAMIC_CONFIG_OPTIONS',
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
    }
  }
}

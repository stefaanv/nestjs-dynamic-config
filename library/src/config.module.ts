import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from './config.service'
import { DynamicConfigOptions } from './config.options.interface'
import { FileLoadService } from './file-loader.service'

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
        FileLoadService,
        ConfigService,
      ],
      exports: [ConfigService],
    }
  }
}

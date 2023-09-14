import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService, DYNAMIC_CONFIG_OPTIONS } from './config.service'
import { DynamicConfigOptions } from './config.options.interface'
import { FileLoadService } from './file-loader.service'

@Module({})
export class ConfigModule {
  static register(options: DynamicConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: DYNAMIC_CONFIG_OPTIONS,
          useValue: options,
        },
        //TODO! waarom werkt die niet met DYNAMIC_CONFIG_OPTIONS ???
        {
          provide: 'FAKE_LOADER',
          useValue: options,
        },
        FileLoadService,
        ConfigService,
      ],
      exports: [ConfigService],
    }
  }
}

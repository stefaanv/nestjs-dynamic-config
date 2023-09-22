import { ConsoleLogger, Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { ConfigModule } from '@itanium.be/nestjs-dynamic-config'
import namespacedConfig from '../config.namespaced.js'
import { AppService } from './app.service'

@Module({
  imports: [
    ConfigModule.register({
      configFile: 'config.js',
      load: [namespacedConfig],
      debug: true,
      logger: new ConsoleLogger(),
    }),
  ],
  providers: [AppService],
  controllers: [AppController],
})
export class AppModule {}

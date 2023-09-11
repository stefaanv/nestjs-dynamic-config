import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule, ConfigService } from '@itanium.eu/nestjs-dynamic-config'
import * as path from 'path'

@Module({
  imports: [
    ConfigModule.register({
      rootFolder: __dirname,
      configFile: path.resolve(__dirname, '..', 'config.js'),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

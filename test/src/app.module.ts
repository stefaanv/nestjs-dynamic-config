import { Module, Global } from '@nestjs/common'
import { AppController } from './app.controller'
import { ConfigModule } from '@itanium.eu/nestjs-dynamic-config'

@Global()
@Module({
  imports: [
    ConfigModule.register({
      rootFolder: __dirname,
      configFile: 'config.js',
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}

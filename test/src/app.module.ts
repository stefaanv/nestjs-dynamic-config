import { Module, ConsoleLogger, Global, Scope } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@itanium.eu/nestjs-dynamic-config'

@Global()
@Module({
  imports: [
    ConfigModule.register({
      rootFolder: __dirname,
      configFile: 'config.js',
    }),
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: 'LoggerService', useClass: ConsoleLogger, scope: Scope.DEFAULT },
  ],
  exports: ['LoggerService'],
})
export class AppModule {}

import { Module, ConsoleLogger, Global, Scope, Logger } from '@nestjs/common'
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
  ],
  controllers: [AppController],
  providers: [AppService, { provide: 'Logger', useClass: ConsoleLogger, scope: Scope.DEFAULT }],
  exports: ['Logger'],
})
export class AppModule {}

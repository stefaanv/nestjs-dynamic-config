import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@itanium.eu/nestjs-dynamic-config'

@Controller()
export class AppController {
  private readonly devNameProxy: () => string
  constructor(private readonly config: ConfigService) {
    const test = config.get('devName')
    this.devNameProxy = config.createProxy('devName')
    console.log('appname', config.appName)
    console.log('key', config.get('key'))
    this.config.on('reloaded', () => {
      console.log('devName', this.devNameProxy())
      console.log('name', this.config.get<string>('appName'))
      console.log('key', config.get('key'))
    })
  }

  @Get()
  getHello(): string {
    return this.config.get('devName')
  }
}

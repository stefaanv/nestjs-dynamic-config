import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@itanium.be/nestjs-dynamic-config'

@Controller()
export class AppController {
  private readonly nameProxy: () => string

  constructor(private readonly config: ConfigService) {
    this.nameProxy = config.createProxy('name')
    config.on('reloaded', () => console.log(`The configuration changed`))
  }

  @Get('name')
  getName() {
    return this.nameProxy()
  }

  @Get('db')
  getDb() {
    return this.config.get('database')
  }
}

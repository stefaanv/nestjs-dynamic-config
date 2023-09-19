import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@itanium.eu/nestjs-dynamic-config'

@Controller()
export class AppController {
  private readonly nameProxy: () => string

  constructor(private readonly config: ConfigService) {
    this.nameProxy = config.createProxy('name')
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

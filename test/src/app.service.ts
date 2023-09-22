import { ConfigService } from '@itanium.be/nestjs-dynamic-config'
import { Injectable } from '@nestjs/common'

interface DatabaseConfig {
  host: string
  user: string
}

@Injectable()
export class AppService {
  constructor(private readonly _config: ConfigService) {}

  public getConfigCollection() {
    return {
      basic: {
        database: this._config.get<DatabaseConfig>('database'),
        substitutedFromEnv: this._config.get('appName'),
        substitutedFromPkj: this._config.get('version'),
      },
    }
  }
}

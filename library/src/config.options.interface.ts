import { LoggerService } from '@nestjs/common'

export interface DynamicConfigOptions {
  /** Full path to the (*.js or *.json) configuration file */
  configFile: string
  /** Absolute path to the folder of the .env file */
  rootFolder?: string
  /** set to `true` to get debugging info */
  debug?: boolean
  /** logger used for debugging info */
  logger?: LoggerService
  /**
   * will be called if reading the configuration file fails
   * default behaviour is that the error is logged with severity
   * 'error' and the application is stopped */
  onLoadErrorCallback?: (error: Error) => void
  /**
   * overrides the default logging behaviour when the configration
   * file is reloaded, which is that a message is logged in 'info'
   * severity
   */
  noLogOnReload?: boolean
  /** */
  resultTuples?: boolean
}

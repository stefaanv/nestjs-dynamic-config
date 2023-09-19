import { LoggerService } from '@nestjs/common'
import { Schema, ValidationError, ValidationOptions } from 'Joi'

export interface DynamicConfigOptions {
  /** **Full** path to the (*.js or *.json) configuration file */
  configFile: string

  /** Absolute path to the root folder where the `.env` and `package.json` files reside */
  rootFolder?: string

  /** if `true`, debugging info will be sent to the logger service */
  debug?: boolean

  /**
   * logger used for debugging info
   * leave empty for no loggin at all
   */
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

  /**
   * Joi validation schema that will be used to validate the configuration object
   * Set to `undefined` (default) not to use validation
   */
  validationSchema?: Schema

  /**
   * Callback function to return the validation result to the user code
   * If set to `undefined` (default) then any validation errors will cause a fatal error
   */
  validationCallback?: (error: ValidationError) => {}
  validationOptions?: ValidationOptions
}

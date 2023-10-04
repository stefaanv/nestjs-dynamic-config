# nestjs-dynamic-config

Drop-in dynamic configuration module for [Nest](https://github.com/nestjs/nest) with automatic reload on file update and environment variable substitution

## Install

```bash
npm install -s  @itanium.be/nestjs-dynamic-config
```

## Usage

create a [new Nestjs app](https://docs.nestjs.com/first-steps)

### Create a `.js` or `.json` configuration file

```js
// <project root>/config.js
exports.default = () => ({
  name: "some-name",
  length: 100,
  database: {
    host: "myHost",
    user: "root",
  },
  environment: '{{ENV_NODE_ENV}}',
  app_name: '{{pkg.name}}',
});
```

**Remark**: In this case the configuration file is located in the project's root.  In real life you'll probably want your config file to be located in a specific folder so that - when you're deploying in docker containers - you can link to the host filesystem

### Define the module in your project's app module

```ts
@Module({
  imports: [
    ConfigModule.register({
      configFile: "config.js",
    }),
  ],
  controllers: [
    /* your controllers */
  ],
  providers: [
    /* your providers */
  ],
})
export class AppModule {}
```
The configuration file location is resolved relative to the project root.  You can add path information to the `configFile` option.  
There's plenty more options that can be passed in the `register` function, most of them work the same like in the original [@nestjs/config](https://docs.nestjs.com/techniques/configuration) module.

### Use the configuration module in your code
Change the `app.controller.ts` code to

```ts
@Controller()
export class AppController {
  private readonly nameProxy: () => string;

  constructor(private readonly config: ConfigService) {
    this.nameProxy = config.createProxy("name");
  }

  @Get("name")
  getName() {
    return this.nameProxy();
  }

  @Get("db")
  getDb() {
    return this.config.get("database");
  }

  @Get("all")
  getAll() {
    return this.config.config;
  }
}
```

Run your app and call the API endpoints using your favorite browser.  Change the `name` property in the config file and reload the browser.

- <http://localhost:3000/name>
- <http://localhost:3000/db>
- <http://localhost:3000/all>

This code demonstrates

- dynamic configuration updating
- different ways to consume the configuration
- environment variable substitution

#### Proxies

The `this.nameProxy` is a proxy to the "name" *configuration element*.  When the `name` configuration element in the config file changes,  the change is immediately reflected without the need to restart the nest app.

A proxy is created with `config.createProxy(configElementName)`.  A second `default` argument can be passed to `createProxy`.  When the configuration element is not found and a default value was defined then the default value will be returned from the proxy.

A generic parameter can be passed to the `createProxy` function .  f.i. `config.createProxy<number>(['wellKnown'.'numbers'.'pi'])`.  If the generic parameter is omitted, `string` is assumed.

#### .get&lt;T&gt;(name, default) function

The `configService.get(configElementName)` can also be used to extract configuration elements.  Beware that the information will not be automatically refreshed in this case.  Next to the feature of [the original](https://docs.nestjs.com/techniques/configuration#using-the-configservice), the `.get()` can also be called with an array of strings that make a path into the configuration object.  These statements are equivalent
```ts
  config.get<object>('database')['port'];
  config.get<{ port: number }>('database').port;
  config.get<number>('database.host');
  config.get(['database', 3306]); // generic type inferred from `default` value
```

### Variable substitution

Configuration elements defined as `{{ENV_xxx}}` or `{{pkg.xxx}}` will be substituted either from environment variables or from the `package.json` file.
For instance, `{{ENV_NODE_ENV}}` will be substituted with the value of `process.env.NODE_ENV`, `{{pkg.version}}` will be substituted with the package version.
`.env` file are loaded with the help of the [dotenv package](https://www.npmjs.com/package/dotenv).  All the usual naming rules apply for the filenames.  Multiple files can be loaded.

### Debugging
This module will try it's best to collect all the needed information.  It will make a educated guess about where the root folder of your project is located and what `.env` files exist.  This process can fail depending on your project setup.  If you experience problems, activate debugging by adding the below options in the `.register()` function

```ts
{
  ...
  debug: true,
  logger: new ConsoleLogger(),
}
```
> Hint: `Consolelogger` is imported from `'@nestjs/common'`

### Validation
A [Joi](https://joi.dev/api) validation object can be passed to sanitize the configuration.  These properties are available

- `validationSchema` Joi object
- `validationOptions` validation options
- `validationCallback` function to be called in case of validation errors

Add this code to your `app.module.ts`

```ts
const validationSchema = Joi.object({
  other: Joi.string().default('my other string'),
});

@Module({
  imports: [
    ConfigModule.register({
      ...
      validationSchema,
      validationOptions: { allowUnknown: true },
      validationCallback: (error: Joi.ValidationError) => console.log(error),
    })],
...
})
```

> Hint: `Joi` is imported from the `'Joi'` module

Restart the Nestjs app and reload the browser.  `"other": "my other string"` will be in the displayed configuration even though it 's not in the configuration file.  
That's because it is defined in the validation schema with a default value.

If you comment out the line with `validationOptions`, an error message will be printed because the configuration file contains (many) elements that are not defined in the validationSchema.

If you also comment out the line where the `validationCallback` is defined, the program will deliberately crash because it's configuration is not valid.

### Crashing your program
This module will purposefully crash your program if the configuration file is not found, when it is not a `*.js` or `*.json` file or when validation fails.  This is considered the best option because having your program run with missing or invalid configuration will usually be even worse.

To prevent this, you can

- set `validationCallback` when you use validation - the validation errors will be sent to the callback instead of printed to the screen (and crashing the program)
- set `onLoadErrorCallback` - this callback will be called with the error thrown when attempting to load the configuration file and the program will not crash.

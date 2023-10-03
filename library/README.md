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
**Remark**: In this case the configuration file is locationed in the project's root.  In real life you'll probably want your config file to be located in a specific folder that - when you're deploying in docker containers - you can link to the host filesystem

### Define the module in your project's app module

```ts
@Global()
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
There's plenty more options that can be passed next to the `configFile`, most of the options work the same like in the original [@nestjs/config](https://docs.nestjs.com/techniques/configuration) module to provide drop-in compatibility.

### Use the configuration module in your code
Change the `app.controller.ts` code to this

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

Run your app and call the API endpoints using your favorite browser.

- <http://localhost:3000/name>
- <http://localhost:3000/db>
- <http://localhost:3000/all>

This code demonstrates

- dynamic configuration updating
- different ways to consume the configuration
- environment variable substitution:

#### Proxies

The `this.nameProxy` is a proxy to the "name" *configuration element* created in the constructor.  When you change the name attribute in the config file and refresh your browser, you'll notice that the change is immediately reflected whithout restarting the nest app.  Because the `this.nameProxy` method is a function, it will always have the latest value from the configuration file when called as `this.nameProxy()`.
A proxy is create with `config.createProxy(configElementName)`

#### .get&lt;T&gt;() function

The `configService.get(configElementName)` can also be used to extract configuration elements.  Beware that the information will not be automatically refreshed in this case.  Next to the feature of [the original](https://docs.nestjs.com/techniques/configuration#using-the-configservice), the `.get()` can also be called with an array of strings that make a path into the object.  These statements are equivalent
```ts
  config.get<object>('database')['host'];
  config.get<{ host: string }>('database').host;
  config.get<string>('database.host');
  config.get<string>(['database', 'host']);
```

### Variable substitution

Configuration elements defined as `{{ENV_xxx}}` or `{{pkg.xxx}}` will be substituted either from environment variables or content from the `package.json` file.
For instance, `{{ENV_NODE_ENV}}` will be substituted with the content of `process.env.NODE_ENV`, `{{pkg.version}}` will be substituted with the package version.
`.env` file are loaded with the help of the [dotenv package](https://www.npmjs.com/package/dotenv).  All the usual naming rules apply to the filename.  Multiple files can be loaded.

### Debugging
This module will try it's best to collect all the needed information.  A.o. it will make a educated guess about where the root folder of your project is located and what `.env` files there are.  This can fail depending on your project setup.  When you experience problems, activate debugging by adding the below options in the `.register()` function

```ts
{
  ...
  debug: true,
  logger: new ConsoleLogger(),
}
```
> Hint: the `Consolelogger` can be imported from `'@nestjs/common'`

### Validation
A [Joi](https://joi.dev/api) validation object can be passed to sanitize the configuration.  The options object provides there properties

- `validationSchema` Joi object
- `validationOptions` validation options
-

# nestjs-dynamic-config

Dynamic configuration module for [Nest](https://github.com/nestjs/nest) with automatic reload on config file update

## Install

```bash
npm install -s  @itanium.eu/nestjs-dynamic-config
```

## Usage

- create a [new NestJS app](<https://docs.nestjs.com/first-steps>)

- create a `.js` or `.json` configuration file (f.i. in the root folder of the nest project)

```js
// <project root>/config.js
(
  () => ({
    name: 'some-name', 
    length: 100,
    database: {
      host: 'myHost',
      user: 'root'
    }
  })
)()
```

- set up this module in your project's app module

```ts
@Global()
@Module({
  imports: [
    ConfigModule.register({
      rootFolder: join(__dirname, '..'), // or `rootFolder: __dirname `
      configFile: 'config.js',
    }),
  ],
  controllers: [/* your controllers */],
  providers: [ /* your providers */ ],
})
export class AppModule {}
```

Use the configuration module in your code
```ts
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
```
Run your app and call the API endpoints using your favorite  browser.

Change the configuration file and refresh the browser,

the information is immediately refreshed from the updated file wihout restarting the nest app !

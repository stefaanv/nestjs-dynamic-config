# nestjs-dynamic-config

Dynamic configuration module for [Nest](https://github.com/nestjs/nest) with automatic reload on file update and environment variable substitution

## Install

```
npm install -s  @itanium.eu/nestjs-dynamic-config
```

## Usage
Create a `.js` or `.json` configuration file (here in the root folder of the project)
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

Define the module in your project's app module
```ts
@Global()
@Module({
  imports: [
    ConfigModule.register({
      rootFolder: join(__dirname, '..'),
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
Call the API endpoints using your favorite app or browser.

Change the configuration file and refresh the browser/app,

the information is immediately refreshed from the updated file !

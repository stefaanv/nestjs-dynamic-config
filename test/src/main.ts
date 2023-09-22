import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AppService } from './app.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const service = app.get(AppService)
  console.log(`=-=-= a collection of your configuration =-=-=`)
  console.log(service.getConfigCollection())
  await app.listen(3000)
}
bootstrap()

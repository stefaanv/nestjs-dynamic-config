import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}
bootstrap()

function bootstrap2() {
  const text = 'dsfagksj{{ENV_TEST}}dhfgak{{ENV_PIPO}}jsdh'
  const regex = /{{ENV_(\w*)}}/g
  const a = Array.from(text.matchAll(regex), a => a[1])
}

import 'reflect-metadata'
import 'dotenv/config'

import { NestFactory } from '@nestjs/core'

import { QueryAppModule } from './query-app.module'
import { getSettings } from '../../config/settings'

async function bootstrap (): Promise<void> {
  const app = await NestFactory.create(QueryAppModule, { cors: false })
  const settings = getSettings()
  await app.listen(settings.queryServicePort, settings.queryServiceHost)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})

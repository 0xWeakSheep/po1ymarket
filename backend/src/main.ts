import 'reflect-metadata'
import 'dotenv/config'

import path from 'node:path'
import { fork, type ChildProcess } from 'node:child_process'

import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

let queryChild: ChildProcess | undefined

async function bootstrap (): Promise<void> {
  queryChild = startQueryChild()

  const app = await NestFactory.create(AppModule)
  /** 允许的浏览器来源（页面 origin），不是后端自己的地址。逗号分隔多个。未设置或非空字符串时用 true（开发便利）。 */
  const corsRaw = process.env.PO1MARKET_CORS_ORIGIN?.trim()
  const corsOrigin =
    corsRaw !== undefined && corsRaw !== ''
      ? corsRaw.split(',').map((o) => o.trim())
      : true
  app.enableCors({ origin: corsOrigin })
  //默认3001避免与前端冲突
  const port = Number(process.env.PORT ?? 3001)

  attachShutdown(app)
  await app.listen(port)
}

function startQueryChild (): ChildProcess | undefined {
  if (process.env.PO1MARKET_DISABLE_QUERY_CHILD === 'true') {
    return undefined
  }

  const queryMainPath = path.join(__dirname, 'apps', 'query', 'main.js')
  const child = fork(queryMainPath, {
    env: {
      ...process.env
    },
    stdio: 'inherit'
  })

  child.on('exit', (code, signal) => {
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      return
    }

    console.error(`query service exited unexpectedly (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
    process.exit(code ?? 1)
  })

  return child
}

function attachShutdown (app: { close: () => Promise<void> }): void {
  const shutdown = async (signal: string): Promise<void> => {
    try {
      queryChild?.kill(signal as NodeJS.Signals)
      await app.close()
    } finally {
      process.exit(0)
    }
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
}

bootstrap().catch((err) => {
  console.error(err)
  queryChild?.kill('SIGTERM')
  process.exit(1)
})

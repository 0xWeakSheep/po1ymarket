import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import type { Collection, Db, Document, MongoClient } from 'mongodb'
import { MongoClient as NativeMongoClient } from 'mongodb'

import { REQUEST_CACHE_COLLECTION, SETTINGS } from '../../common/constants'
import type { Settings } from '../../config/settings'
import type { CacheScope } from './cache-key'

export type CacheRecord = {
  scope: CacheScope
  key: string
  payload: Record<string, unknown>
  response: unknown
  createdAt: Date
  expiresAt: Date
}

@Injectable()
export class RequestCacheRepository implements OnModuleDestroy {
  readonly enabled: boolean

  private readonly logger = new Logger(RequestCacheRepository.name)
  private client?: MongoClient
  private db?: Db
  private collection?: Collection<CacheRecord & Document>
  private connectPromise?: Promise<Collection<CacheRecord & Document> | null>

  constructor (@Inject(SETTINGS) private readonly settings: Settings) {
    this.enabled = Boolean(this.settings.mongoUri)
  }

  async getFresh<T> (scope: CacheScope, key: string): Promise<T | null> {
    const collection = await this.getCollection()
    if (!collection) {
      return null
    }

    const entry = await collection.findOne({
      scope,
      key,
      expiresAt: { $gt: new Date() }
    })

    return (entry?.response as T | undefined) ?? null
  }

  async save (
    scope: CacheScope,
    key: string,
    payload: Record<string, unknown>,
    response: unknown,
    ttlSeconds: number
  ): Promise<void> {
    const collection = await this.getCollection()
    if (!collection) {
      return
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)

    await collection.updateOne(
      { scope, key },
      {
        $set: {
          payload,
          response,
          createdAt: now,
          expiresAt
        },
        $setOnInsert: {
          scope,
          key
        }
      },
      { upsert: true }
    )
  }

  async onModuleDestroy (): Promise<void> {
    await this.client?.close()
  }

  private async getCollection (): Promise<Collection<CacheRecord & Document> | null> {
    if (!this.enabled) {
      return null
    }

    if (this.collection) {
      return this.collection
    }

    if (!this.connectPromise) {
      this.connectPromise = this.connect()
    }

    return await this.connectPromise
  }

  private async connect (): Promise<Collection<CacheRecord & Document> | null> {
    try {
      this.client = new NativeMongoClient(this.settings.mongoUri as string)
      await this.client.connect()
      this.db = this.client.db(this.settings.mongoDbName)
      this.collection = this.db.collection<CacheRecord & Document>(REQUEST_CACHE_COLLECTION)
      await this.collection.createIndex({ scope: 1, key: 1 }, { unique: true })
      await this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      return this.collection
    } catch (error) {
      this.logger.error('Mongo cache is unavailable; infra cache will be bypassed.', error)
      return null
    }
  }
}

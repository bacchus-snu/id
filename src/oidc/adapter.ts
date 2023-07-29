import Redis from 'ioredis'
// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { Adapter, AdapterPayload } from 'oidc-provider'

import Model from '../model/model'
import {NoSuchEntryError} from '../model/errors'

const grantable = new Set([
  'AccessToken',
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode',
  'BackchannelAuthenticationRequest',
])

const consumable = new Set([
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode',
  'BackchannelAuthenticationRequest',
])

function grantKeyFor(id: string) {
  return `grant:${id}`
}

function userCodeKeyFor(userCode: string) {
  return `userCode:${userCode}`
}

function uidKeyFor(uid: string) {
  return `uid:${uid}`
}

export default function AdapterFactory(redisUrl: string, model: Model) {
  const client = new Redis(redisUrl, { keyPrefix: 'oidc:' })

  return class implements Adapter {
    constructor(public name: string) {
    }

    async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<undefined | void> {
      if (this.name === 'Client') {
        return
      }

      const key = this.key(id)

      const multi = client.multi()
      if (consumable.has(this.name)) {
        multi['hmset'](key, { payload: JSON.stringify(payload) })
      } else {
        multi['set'](key, JSON.stringify(payload))
      }

      if (expiresIn) {
        multi.expire(key, expiresIn)
      }

      if (grantable.has(this.name) && payload.grantId) {
        const grantKey = grantKeyFor(payload.grantId)
        multi.rpush(grantKey, key)
        // if you're seeing grant key lists growing out of acceptable proportions consider using LTRIM
        // here to trim the list to an appropriate length
        const ttl = await client.ttl(grantKey)
        if (expiresIn > ttl) {
          multi.expire(grantKey, expiresIn)
        }
      }

      if (payload.userCode) {
        const userCodeKey = userCodeKeyFor(payload.userCode)
        multi.set(userCodeKey, id)
        multi.expire(userCodeKey, expiresIn)
      }

      if (payload.uid) {
        const uidKey = uidKeyFor(payload.uid)
        multi.set(uidKey, id)
        multi.expire(uidKey, expiresIn)
      }

      await multi.exec()
    }

    async find(id: string): Promise<AdapterPayload | undefined | void> {
      if (this.name === 'Client') {
        try {
          return model.pgDo(async tr => {
            const client = await tr.query('select client_id, client_secret, client_name from oauth_client where client_id = $1', [id])
            const redirectUri = await tr.query('select redirect_uri from oauth_client_redirect_uris where client_id = $1', [id])
            if (client.rows.length !== 1) {
              throw new NoSuchEntryError()
            }

            return {
              client_id: client.rows[0].client_id,
              client_secret: client.rows[0].client_secret,
              client_name: client.rows[0].client_name,
              redirect_uris: redirectUri.rows.map(row => row.redirect_uri),
            }
          })
        } catch (e) {
          if (e instanceof NoSuchEntryError) {
            return undefined
          }
          throw e
        }
      }

      const data = consumable.has(this.name)
      ? await client.hgetall(this.key(id))
      : await client.get(this.key(id))

      if (!data) {
        return undefined
      }

      if (typeof data === 'string') {
        return JSON.parse(data)
      }

      const { payload, ...rest } = data
      return {
        ...rest,
        ...JSON.parse(payload),
      }
    }

    async findByUid(uid: string): Promise<AdapterPayload | undefined | void> {
      const id = await client.get(uidKeyFor(uid))
      if (id == null) {
        return undefined
      }
      return this.find(id)
    }

    async findByUserCode(userCode: string): Promise<AdapterPayload | undefined | void> {
      const id = await client.get(userCodeKeyFor(userCode))
      if (id == null) {
        return undefined
      }
      return this.find(id)
    }

    async destroy(id: string): Promise<undefined | void> {
      if (this.name === 'Client') {
        return
      }

      const key = this.key(id)
      await client.del(key)
    }

    async revokeByGrantId(grantId: string): Promise<undefined | void> {
      const multi = client.multi()
      const tokens = await client.lrange(grantKeyFor(grantId), 0, -1)
      tokens.forEach(token => multi.del(token))
      multi.del(grantKeyFor(grantId))
      await multi.exec()
    }

    async consume(id: string): Promise<undefined | void> {
      if (this.name === 'Client') {
        return
      }

      await client.hset(this.key(id), 'consumed', Math.floor(Date.now() / 1000))
    }

    key(id: string): string {
      return `${this.name}:${id}`
    }
  }
}

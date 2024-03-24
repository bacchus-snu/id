import { Redis } from 'ioredis';
import type { Adapter, AdapterPayload } from 'oidc-provider';

const grantable = new Set([
  'AccessToken',
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode',
  'BackchannelAuthenticationRequest',
]);

const consumable = new Set([
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode',
  'BackchannelAuthenticationRequest',
]);

function grantKeyFor(id: string) {
  return `grant:${id}`;
}

function userCodeKeyFor(userCode: string) {
  return `userCode:${userCode}`;
}

function uidKeyFor(uid: string) {
  return `uid:${uid}`;
}

class RedisAdapter implements Adapter {
  client: Redis;

  constructor(public name: string, redisURL: string) {
    this.client = new Redis(redisURL, { keyPrefix: 'oidc:' });
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<undefined | void> {
    const key = this.key(id);

    const multi = this.client.multi();
    if (consumable.has(this.name)) {
      multi['hmset'](key, { payload: JSON.stringify(payload) });
    } else {
      multi['set'](key, JSON.stringify(payload));
    }

    if (expiresIn) {
      multi.expire(key, expiresIn);
    }

    if (grantable.has(this.name) && payload.grantId) {
      const grantKey = grantKeyFor(payload.grantId);
      multi.rpush(grantKey, key);
      // if you're seeing grant key lists growing out of acceptable proportions consider using LTRIM
      // here to trim the list to an appropriate length
      const ttl = await this.client.ttl(grantKey);
      if (expiresIn > ttl) {
        multi.expire(grantKey, expiresIn);
      }
    }

    if (payload.userCode) {
      const userCodeKey = userCodeKeyFor(payload.userCode);
      multi.set(userCodeKey, id);
      multi.expire(userCodeKey, expiresIn);
    }

    if (payload.uid) {
      const uidKey = uidKeyFor(payload.uid);
      multi.set(uidKey, id);
      multi.expire(uidKey, expiresIn);
    }

    await multi.exec();
  }

  async find(id: string): Promise<AdapterPayload | undefined | void> {
    const data = consumable.has(this.name)
      ? await this.client.hgetall(this.key(id))
      : await this.client.get(this.key(id));

    if (!data) {
      return undefined;
    }

    if (typeof data === 'string') {
      return JSON.parse(data);
    }

    const { payload, ...rest } = data;
    return {
      ...rest,
      ...JSON.parse(payload),
    };
  }

  async findByUid(uid: string): Promise<AdapterPayload | undefined | void> {
    const id = await this.client.get(uidKeyFor(uid));
    if (id == null) {
      return undefined;
    }
    return this.find(id);
  }

  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined | void> {
    const id = await this.client.get(userCodeKeyFor(userCode));
    if (id == null) {
      return undefined;
    }
    return this.find(id);
  }

  async destroy(id: string): Promise<undefined | void> {
    const key = this.key(id);
    await this.client.del(key);
  }

  async revokeByGrantId(grantId: string): Promise<undefined | void> {
    const multi = this.client.multi();
    const tokens = await this.client.lrange(grantKeyFor(grantId), 0, -1);
    tokens.forEach(token => multi.del(token));
    multi.del(grantKeyFor(grantId));
    await multi.exec();
  }

  async consume(id: string): Promise<undefined | void> {
    await this.client.hset(this.key(id), 'consumed', Math.floor(Date.now() / 1000));
  }

  key(id: string): string {
    return `${this.name}:${id}`;
  }
}

export default function adapterFactory(redisURL: string) {
  return (name: string) => new RedisAdapter(name, redisURL);
}

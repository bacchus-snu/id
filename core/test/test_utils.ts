import Model from '../src/model/model'
import { PoolClient } from 'pg'
import * as uuid from 'uuid/v4'

export async function createEmailAddress(c: PoolClient, model: Model): Promise<number> {
  return await model.emailAddresses.create(c, uuid(), uuid())
}

export async function createUser(c: PoolClient, model: Model): Promise<number> {
  const emailIdx = await createEmailAddress(c, model)

  return await model.users.create(c, uuid(), uuid(), uuid(), emailIdx, '/bin/bash', 'en')
}

export async function createGroup(c: PoolClient, model: Model): Promise<number> {
  const name = {
    ko: uuid(),
    en: uuid(),
  }

  const description = {
    ko: uuid(),
    en: uuid(),
  }

  return await model.groups.create(c, name, description)
}

export async function createPermission(c: PoolClient, model: Model): Promise<number> {
  const name = {
    ko: uuid(),
    en: uuid(),
  }

  const description = {
    ko: uuid(),
    en: uuid(),
  }
  return await model.permissions.create(c, name, description)
}

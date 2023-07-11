import Model from '../src/model/model'
import Transaction from '../src/model/transaction'
import { v4 as uuid } from 'uuid'

export async function createEmailAddress(tr: Transaction, model: Model): Promise<number> {
  return await model.emailAddresses.create(tr, uuid(), uuid())
}

export async function createUser(tr: Transaction, model: Model): Promise<number> {
  const userIdx = await model.users.create(tr, uuid(), uuid(), uuid(), '/bin/bash', 'en')
  return userIdx
}

export async function createGroup(tr: Transaction, model: Model): Promise<number> {
  const name = {
    ko: uuid(),
    en: uuid(),
  }

  const description = {
    ko: uuid(),
    en: uuid(),
  }

  const identifier = uuid()

  return await model.groups.create(tr, name, description, identifier)
}

export async function createGroupRelation(tr: Transaction, model: Model, supergroupIdx: number, subgroupIdx: number) {
  return await model.groups.addGroupRelation(tr, supergroupIdx, subgroupIdx)
}

export async function createPermission(tr: Transaction, model: Model): Promise<number> {
  const name = {
    ko: uuid(),
    en: uuid(),
  }

  const description = {
    ko: uuid(),
    en: uuid(),
  }
  return await model.permissions.create(tr, name, description)
}

export function delay(timeInMilliseconds: number) {
  return new Promise(resolve => {
    setTimeout(resolve, timeInMilliseconds)
  })
}

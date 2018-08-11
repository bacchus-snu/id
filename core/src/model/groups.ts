import Model from './model'
import { Translation } from './translation'
import { PoolClient } from 'pg'
import { NoSuchEntryError } from './errors'

export default class Groups {
  constructor(private readonly model: Model) {
  }

  public async create(client: PoolClient, name: Translation, description: Translation): Promise<number> {
  }
}

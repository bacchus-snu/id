import Model from './model'
import { PoolClient } from 'pg'

export default class Hosts {
  constructor(private readonly model: Model) {
  }

}

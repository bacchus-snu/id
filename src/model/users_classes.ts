import { Client } from './utils';

interface Pair {
  userId: number;
  classId: number;
  expireAfter?: Date;
  accepted: boolean;
  applicationText?: string;
}

class PairModel implements Pair {

}

export function insert(client: Client, pair: Pair): Promise<void> {

}

export function byPair(client: Client, userId: number, classId: number): Promise<PairModel> {

}

export function list(client: Client, length?: number, after?: number, condition?: Pair):
  Promise<Array<PairModel>> {

}

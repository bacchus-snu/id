import { Client } from './utils';

interface Class {
  ownerId: number;
  primaryContactAddressId: number;
  expireAfter?: Date;
  accepted: boolean;
  applicationText?: string;
  enrollAuto: boolean;
}

interface StoredClass extends Class {
  classId: number;
  enrollSecret?: string;
}

class ClassModel implements StoredClass {

}

export function insert(client: Client, value: Class): Promise<void> {

}

export function byClassId(client: Client, classId: number): Promise<ClassModel> {

}

export function list(client: Client, length?: number, after?: number, condition?: StoredClass):
  Promise<Array<ClassModel>> {
  return null;
}

export function num(client: Client, condition?: StoredClass): Promise<number> {
  return null;
}

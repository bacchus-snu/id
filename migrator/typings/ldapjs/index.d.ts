declare module '@phc/format' {
  export interface PHCObject {
    id: string
    params: object
    salt: Buffer
    hash: Buffer
  }

  export function serialize(phc: PHCObject): string
  export function deserialize(str: string): PHCObject
}
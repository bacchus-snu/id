/// <reference types="node" />

declare module '@phc/format' {
  export interface PHCObject {
    id: string
    params?: Record<string, string>
    salt: Buffer
    hash: Buffer
  }

  export function serialize(phc: PHCObject): string
  export function deserialize(str: string): PHCObject
}

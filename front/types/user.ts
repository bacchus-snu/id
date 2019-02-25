export interface User {
  user_idx: number
  username: string | null
  name: string
  shell: string
  uid: number | null
}

export interface EmailAddress {
  local: string
  domain: string
}

export interface UserGroup {
  user_idx: number
  group_idx: number
}

export const userFields = [
  'user_idx',
  'username',
  'name',
  'shell',
  'uid',
]

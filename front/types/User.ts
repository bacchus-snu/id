export interface User {
  user_idx: number
  username: string | null
  name: string
  shell: string
  uid: number | null
}

export const userFields = [
  'user_idx',
  'username',
  'name',
  'shell',
  'uid',
]

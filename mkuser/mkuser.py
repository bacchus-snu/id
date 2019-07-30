#!/usr/bin/env python3

import sys
from random import SystemRandom
from argon2 import PasswordHasher

def gen_password(n=16):
    charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return ''.join(SystemRandom().choice(charset) for _ in range(n))

def main():
    if len(sys.argv) < 3:
        print('usage: {} [gid] [starting uid]'.format(sys.argv[0]))
        sys.exit(1)

    gid = int(sys.argv[1])
    minuid = int(sys.argv[2])

    print('-- PLEASE REVIEW THE QUERY BEFORE EXECUTING IT')
    print('BEGIN;')

    for username in sys.stdin:
        username = username.rstrip()
        password = gen_password()

        hasher = PasswordHasher()
        password_hash = hasher.hash(password)

        print('--', username, password)
        print('''
WITH added_user AS (
    INSERT INTO users (username, password_digest, name, uid, shell, preferred_language)
    VALUES ('{0}', '{1}', '{0}', '{2}', '/bin/bash', 'ko') RETURNING idx
) INSERT INTO user_memberships (user_idx, group_idx) SELECT idx, {3} FROM added_user;
'''.format(username, password_hash, minuid, gid))
        minuid += 1

    print('COMMIT;')
    print('-- PLEASE REVIEW THE QUERY BEFORE EXECUTING IT')

if __name__ == '__main__':
    main()

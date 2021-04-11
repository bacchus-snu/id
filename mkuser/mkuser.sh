#!/bin/bash
set -euo pipefail

rand() {
  openssl rand -base64 12
}

argonhash() {
  echo -n $1 | argon2 $(rand) -id -e -t 2 -k 102400 -p 8 -l 16
}

if [ $# -ne 2 ]; then
  echo "usage: $0 [gid] [starting uid]"
  exit 1
fi

gid=$1
uid=$2

if [ $gid -le 0 -o $uid -le 0 ]; then
  echo "usage: $0 [gid] [starting uid]"
  exit 1
fi

echo '-- PLEASE REVIEW THE QUERY BEFORE EXECUTING IT'
echo 'BEGIN;'

IFS=$'\n'
while read -r username; do
  pw="$(rand)"
  pwhash="$(argonhash $pw)"
  echo "-- $username $pw"
  echo """WITH added_user AS (
    INSERT INTO users (username, password_digest, name, uid, shell, preferred_language)
    VALUES ('$username', '$pwhash', '$username', '$uid', '/bin/bash', 'ko') RETURNING idx
  ) INSERT INTO user_memberships (user_idx, group_idx) SELECT idx, $gid FROM added_user;"""
  uid=$(( uid + 1 ))
done

echo 'COMMIT;'
echo '-- PLEASE REVIEW THE QUERY BEFORE EXECUTING IT'

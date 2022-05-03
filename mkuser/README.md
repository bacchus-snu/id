# mkuser
임시 계정 만드는 스크립트.

## Dependencies
- `openssl`
- `argon2`

## Usage
```
# Create 10 users, insert into group ID 99, assign UIDs starting from 9999(9999, 10000, ... , 10008)
$ echo examuser{01..10} | tr ' ' '\n' | ./mkuser 99 9999
-- PLEASE REVIEW THE QUERY BEFORE EXECUTING IT
begin;

with added_user as (
  insert into users (username, password_digest, name, uid, shell, preferred_language) values
--  examuser01 9EO0JAlohWloOAUH
    ('examuser01', '$argon2id$v=19$m=65536,t=3,p=8$UHdjNEo3bGxuS1NwUk9JSw$hBmSW646e5e1MrraZBxmhg', 'examuser01', '9999', '/bin/bash', 'ko')
--  examuser02 yGzMeZ4dVyc98in+
  , ('examuser02', '$argon2id$v=19$m=65536,t=3,p=8$OHFsNitWdmxaNVZnaUxsNg$KT9dbHihXaBHOwt3t8CBMg', 'examuser02', '10000', '/bin/bash', 'ko')
--  examuser03 +G0y8/WbQkX3IiKD
  , ('examuser03', '$argon2id$v=19$m=65536,t=3,p=8$RCttTVlxUEVKaWZsN1Q1cg$+ASfCst6B054SJbgXJFJPQ', 'examuser03', '10001', '/bin/bash', 'ko')
--  examuser04 R47AYtgXGFrUfJk+
  , ('examuser04', '$argon2id$v=19$m=65536,t=3,p=8$cmJwUkFGWkgraVNsTStFbA$l8MMNH2VZ5rFUXAEy8lzGA', 'examuser04', '10002', '/bin/bash', 'ko')
--  examuser05 YlEtuIpNbUcDc6BR
  , ('examuser05', '$argon2id$v=19$m=65536,t=3,p=8$M2IvYmF0N0lsZUpicUZHVQ$y/oWQFvHn8LqJwexXWF6qQ', 'examuser05', '10003', '/bin/bash', 'ko')
--  examuser06 qaO3iTXq6Ri5nwtO
  , ('examuser06', '$argon2id$v=19$m=65536,t=3,p=8$dVNDOWdPZ0IrZnBzN2VNNg$G3SouMODwXVPlJEalvt1mQ', 'examuser06', '10004', '/bin/bash', 'ko')
--  examuser07 fHsPvkoIpvLLfStU
  , ('examuser07', '$argon2id$v=19$m=65536,t=3,p=8$eDRmYXFlR0lnMExtcWoxOA$jS503/UIVli8/sp7xCQOLQ', 'examuser07', '10005', '/bin/bash', 'ko')
--  examuser08 ZQK5UUt9SsDbfr3u
  , ('examuser08', '$argon2id$v=19$m=65536,t=3,p=8$VlpBaTRiVjUwM2VIREI3VQ$jzeoZ5rqEaQQx7KkWD7iEw', 'examuser08', '10006', '/bin/bash', 'ko')
--  examuser09 aZSmKstqgWFdyJ5O
  , ('examuser09', '$argon2id$v=19$m=65536,t=3,p=8$akZjN2FWakgvM3d5TTZFSw$ofXLtye0TNtzyj4jTlT8Pg', 'examuser09', '10007', '/bin/bash', 'ko')
--  examuser10 YGIcbPULNURkjiDq
  , ('examuser10', '$argon2id$v=19$m=65536,t=3,p=8$dC83cTZiOVRzOU0xanp2Ng$yetT9FXT8rTrmoGMarqwEw', 'examuser10', '10008', '/bin/bash', 'ko')
  returning idx
)
insert into user_memberships (user_idx, group_idx)
  select idx, 99 from added_user;

commit;
-- PLEASE REVIEW THE QUERY BEFORE EXECUTING IT
```

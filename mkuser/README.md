# mkuser
임시 계정 만드는 스크립트.

## Usage
```
# Create 10 users, insert into group ID 99, assign UIDs starting from 9999(9999, 10000, ... , 10008)
$ echo examuser{01..10} | tr ' ' '\n' | ./mkuser.py 99  9999
-- PLEASE REVIEW THE QUERY BEFORE EXECUTING IT
BEGIN;
-- examuser01 on8cSN616ytb3aHC

WITH added_user AS (
    INSERT INTO users (username, password_digest, name, uid, shell, preferred_language)
    VALUES ('examuser01', '$argon2id$v=19$m=102400,t=2,p=8$GcIiKsqsKQmadn6VP533wA$O2Ca2LSgNZ9Xy6Eyrc8aYA', 'examuser01', '9999', '/bin/bash', 'ko') RETURNING idx
) INSERT INTO user_memberships (user_idx, group_idx) SELECT idx, 99 FROM added_user;

-- examuser02 ucUcLPPlyZDakqSx

WITH added_user AS (
    INSERT INTO users (username, password_digest, name, uid, shell, preferred_language)
    VALUES ('examuser02', '$argon2id$v=19$m=102400,t=2,p=8$iT+ZzuILiSr78C0fv0Uy7A$mYowqio2GqMF/mRtnykAQw', 'examuser02', '10000', '/bin/bash', 'ko') RETURNING idx
) INSERT INTO user_memberships (user_idx, group_idx) SELECT idx, 99 FROM added_user;

[...]

-- examuser09 ow2UxDRKIOhsC1UZ

WITH added_user AS (
    INSERT INTO users (username, password_digest, name, uid, shell, preferred_language)
    VALUES ('examuser09', '$argon2id$v=19$m=102400,t=2,p=8$IzUOPSURXyMz023vB0vAVw$GI5Cv+4PtsGQLTGI7e/4vg', 'examuser09', '10007', '/bin/bash', 'ko') RETURNING idx
) INSERT INTO user_memberships (user_idx, group_idx) SELECT idx, 99 FROM added_user;

-- examuser10 ETyj8jvjUOYi4uUC

WITH added_user AS (
    INSERT INTO users (username, password_digest, name, uid, shell, preferred_language)
    VALUES ('examuser10', '$argon2id$v=19$m=102400,t=2,p=8$AJhyWqE06ILfOle30GNckQ$JeJt+rANakjC5iCmrgEgLw', 'examuser10', '10008', '/bin/bash', 'ko') RETURNING idx
) INSERT INTO user_memberships (user_idx, group_idx) SELECT idx, 99 FROM added_user;

COMMIT;
-- PLEASE REVIEW THE QUERY BEFORE EXECUTING IT
```

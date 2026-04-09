-- Migration: Add find_username_tokens table
-- Separate rate limiting for find-username emails from password change tokens

BEGIN;

CREATE TABLE IF NOT EXISTS find_username_tokens (
  idx serial primary key,
  user_idx integer unique not null references users(idx) on delete cascade,
  token text unique not null check (token <> ''),
  expires timestamp with time zone not null,
  resend_count integer not null default 0
);

COMMIT;

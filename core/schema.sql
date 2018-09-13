drop table if exists shells cascade;
drop table if exists users cascade;
drop table if exists email_addresses cascade;
drop table if exists email_verification_tokens cascade;
drop table if exists password_change_tokens cascade;
drop table if exists student_numbers cascade;
drop table if exists reserved_usernames cascade;
drop table if exists groups cascade;
drop table if exists group_relations cascade;
drop table if exists group_reachable_cache cascade;
drop table if exists user_memberships cascade;
drop table if exists permissions cascade;
drop table if exists permission_requirements cascade;
drop table if exists pending_user_memberships cascade;
drop table if exists hosts cascade;
drop table if exists host_groups cascade;
drop type if exists language cascade;

-- Allowed shells to use
create table shells (
  shell text primary key check (shell <> '')
);

insert into shells (shell) values ('/bin/bash');

-- Language
create type language as enum ('ko', 'en');

-- Users (accounts)
create table users (
  idx serial primary key,

  -- Account credentials
  -- An username being null means the username is being changed
  username text unique check (username <> ''),
  password_digest text,

  -- Real name
  name text not null check (name <> ''),

  -- posixAccount
  uid integer unique not null,
  shell text not null references shells(shell),

  -- Language preference
  preferred_language language not null,

  -- Timestamps
  created_at timestamp with time zone default NOW(),
  last_login_at timestamp with time zone,

  -- Activated
  activated boolean not null default true

);

-- Email addresses
create table email_addresses (
  idx serial primary key,
  -- An user_id being null means unverified email address
  owner_idx integer references users(idx) on delete cascade,
  address_local text not null check (address_local <> ''),
  address_domain text not null check (address_domain <> '')
);
create unique index email_addresses_lower_idx on email_addresses (LOWER(address_local), LOWER(address_domain));

-- Verification token
create table email_verification_tokens (
  idx serial primary key,
  email_idx integer unique not null references email_addresses(idx) on delete cascade,
  token text unique not null check (token <> ''),
  expires timestamp with time zone not null,
  resend_count integer not null default 0
);

-- Password change token.
create table password_change_tokens (
  idx serial primary key,
  user_idx integer unique not null references users(idx) on delete cascade,
  token text unique not null check (token <> ''),
  expires timestamp with time zone not null,
  resend_count integer not null default 0
);

-- SNU IDs
create table student_numbers (
  idx serial primary key,
  student_number text unique not null check (student_number <> ''),
  owner_idx integer not null references users(idx) on delete cascade
);

-- Reserved usernames
create table reserved_usernames (
  idx serial primary key,
  reserved_username text unique not null check (reserved_username <> ''),
  owner_idx integer references users(idx) on delete set null
);

create table groups (
  idx serial primary key,
  owner_user_idx integer references users(idx) on delete set null,
  owner_group_idx integer references groups(idx) on delete set null,
  name_ko text not null check (name_ko <> ''),
  name_en text not null check (name_en <> ''),
  description_ko text not null check (description_ko <> ''),
  description_en text not null check (description_en <> '')
);

-- OR relationship for groups.
create table group_relations (
  idx serial primary key,
  supergroup_idx integer not null references groups(idx) on delete cascade,
  subgroup_idx integer not null references groups(idx) on delete cascade,
  unique (supergroup_idx, subgroup_idx)
);

-- Cache for reachable group relation for a group
create table group_reachable_cache (
  supergroup_idx integer not null references groups(idx) on delete cascade,
  subgroup_idx integer not null references groups(idx) on delete cascade,
  unique (supergroup_idx, subgroup_idx)
);

create table user_memberships (
  idx serial primary key,
  user_idx integer not null references users(idx) on delete cascade,
  group_idx integer not null references groups(idx) on delete cascade,
  unique (user_idx, group_idx)
);

create table permissions (
  idx serial primary key,
  name_ko text not null check (name_ko <> ''),
  name_en text not null check (name_en <> ''),
  description_ko text not null check (description_ko <> ''),
  description_en text not null check (description_en <> '')
);

create table permission_requirements (
  idx serial primary key,
  group_idx integer not null references groups(idx) on delete cascade,
  permission_idx integer not null references permissions(idx) on delete cascade,
  unique (group_idx, permission_idx)
);

create table pending_user_memberships (
  idx serial primary key,
  user_idx integer not null references users(idx) on delete cascade,
  group_idx integer not null references groups(idx) on delete cascade,
  created_at timestamp with time zone not null,
  unique (user_idx, group_idx)
);

create table host_groups (
  idx serial primary key,
  name text not null check (name <> ''),
  required_permission integer references permissions(idx) on delete cascade
);

create table hosts (
  idx serial primary key,
  name text not null check (name <> ''),
  host inet unique not null check (text(host) <> ''),
  host_group integer references host_groups(idx)
);

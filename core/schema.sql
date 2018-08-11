drop table if exists shells cascade;
drop table if exists users cascade;
drop table if exists email_addresses cascade;
drop table if exists snuid cascade;
drop table if exists reserved_usernames cascade;

-- Allowed shells to use
create table shells (
  shell text primary key check (shell <> '')
);

insert into shells (shell) values ('/bin/bash');

-- Users (accounts)
create table users (
  user_idx serial primary key,

  -- Account credentials
  -- An username being null means the username is being changed
  username text unique check (username <> ''),
  password_digest text,

  -- Real name
  name text not null check (name <> ''),

  -- posixAccount
  uid integer unique,
  shell text not null references shells(shell)

  -- primary_email_address_idx integer not null unique references email_addresses(email_address_idx)
);

-- Email addresses
create table email_addresses (
  email_address_idx serial primary key,
  -- An user_id being null means unverified email address
  owner_idx integer references users(user_idx) on delete cascade,
  address_local text not null check (address_local <> ''),
  address_domain text not null check (address_domain <> ''),
  unique(address_local, address_domain)
);

alter table users add column primary_email_address_idx integer not null unique references email_addresses(email_address_idx);

-- SNU IDs
create table snuids (
  snuid text primary key check (snuid <> ''),
  owner_idx integer not null references users(user_idx) on delete cascade
);

-- Reserved usernames
create table reserved_usernames (
  reserved_username text primary key check (reserved_username <> ''),
  owner_idx integer references users(user_idx) on delete set null
);

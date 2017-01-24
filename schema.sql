drop table if exists shells cascade;
drop table if exists users cascade;
drop table if exists email_addresses cascade;
drop table if exists classes cascade;
drop table if exists class_names cascade;
drop table if exists class_implies cascade;
drop table if exists users_classes cascade;
drop table if exists users_nodes cascade;
drop table if exists users_terms cascade;
drop table if exists users_masks cascade;
drop table if exists users_valids cascade;
drop table if exists hosts cascade;
drop table if exists reserved_usernames cascade;

create table shells (
  shell_id serial primary key,
  shell text unique not null check (shell <> '')
);

create table users (
  -- Basic column
  user_id serial primary key,
  name text constraint users_name_key unique not null check (name <> ''),

  -- Reset token/recovery token
  reset_recovery_token text check (reset_recovery_token <> ''),
  token_expire_after timestamp without time zone,
  is_reset_token boolean not null,

  -- POSIX uid
  uid integer unique,

  -- Password
  password_digest bytea,

  -- Personally identifiable information
  realname text check (realname <> ''),
  snuid_bachelor text check (snuid_bachelor <> ''),
  snuid_master text check (snuid_master <> ''),
  snuid_doctor text check (snuid_doctor <> ''),
  snuid_master_doctor text check (snuid_master_doctor <> ''),

  -- Preference info from user column
  shell_id integer constraint users_shell_id_fkey references shells(shell_id),
  language varchar(2),
  timezone text check (timezone <> '')

  -- Blocked
  blocked boolean not null,
  blocked_expire_after timestamp without time zone,

  -- primary_email_address_id integer references email_addresses(email_address_id) not null unique
);

create table email_addresses (
  email_address_id serial primary key,
  -- user_id = null means not verified email address
  user_id integer constraint email_addresses_user_id_fkey references users(user_id) on delete cascade,
  address_local text not null check (address_local <> ''),
  address_domain text not null check (address_domain <> ''),
  verify_token text check (verify_token <> ''),
  verify_expire_after timestamp without time zone,
  unique(address_local, address_domain)
);

alter table users add column primary_email_address_id integer references email_addresses(email_address_id) not null unique;

create table classes (
  class_id serial primary key,
  owner_id integer constraint classes_owner_id_fkey references users(user_id),
  primary_contact_address_id integer constraint classes_primary_contact_address_id_fkey references email_addresses(email_address_id),
  expire_after timestamp without time zone,
  accepted boolean not null,
  request_text text check (request_text <> ''),
  enroll_secret text check (enroll_secret <> ''),
  enroll_secret_expire_after timestamp without time zone,
  enroll_auto boolean not null,
  require_realname boolean not null,
  require_snuid_bachelor boolean not null,
  require_snuid_master boolean not null,
  require_snuid_doctor boolean not null,
  require_snuid_master_doctor boolean not null,
  require_primary_email_address boolean not null
);

create table class_names (
  class_id integer references classes(class_id) not null,
  language varchar(2) not null,
  name text not null check (name <> ''),
  primary key(class_id, language)
);

create table class_implies (
  class_id integer references classes(class_id) not null,
  node_id integer not null,
  accepted boolean not null,
  primary key(class_id, node_id)
);

create table users_classes (
  user_id integer references users(user_id) not null,
  class_id integer references classes(class_id) not null,
  expire_after timestamp without time zone,
  accepted boolean not null,
  request_text text check (request_text <> ''),
  primary key(user_id, class_id),
  provided_realname boolean not null,
  provided_snuid_bachelor boolean not null,
  provided_snuid_master boolean not null,
  provided_snuid_doctor boolean not null,
  provided_snuid_master_doctor boolean not null,
  provided_primary_email_address boolean not null
);

create table users_nodes (
  user_id integer constraint users_nodes_user_id_fkey references users(user_id) not null,
  node_id integer not null,
  expire_after timestamp without time zone,
  accepted boolean not null,
  request_text text check (request_text <> ''),
  constraint users_nodes_pkey primary key(user_id, node_id)
);

create table users_terms (
  user_id integer references users(user_id) not null,
  term_id integer not null,
  term_revision integer not null,
  accepted_on timestamp without time zone not null,
  primary key(user_id, term_id)
);

create table users_masks (
  user_id integer references users(user_id) not null,
  node_id integer not null,
  expire_after timestamp without time zone,
  primary key(user_id, node_id)
);

create table users_valids (
  user_id integer references users(user_id) not null,
  node_id integer not null,
  term_ok boolean not null,
  term_semi boolean not null,
  primary key(user_id, node_id),
  check((not term_ok) or term_semi)
);

create table hosts (
  host_id serial primary key,
  hostname text unique not null check (hostname <> ''),
  ipv4 text unique check (ipv4 <> ''),
  ldap_listen boolean not null,
  access_node_id integer,
  trace_node_id integer
);

create table reserved_usernames (
  name text constraint reserved_usernames_pkey primary key check (name <> '')
);

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
  user_id serial primary key,
  name text constraint users_name_key unique not null check (name <> ''),
  password_digest bytea,
  blocked boolean not null,
  blocked_expire_after timestamp without time zone,
  realname text check (realname <> ''),
  snuid_bachelor text check (snuid_bachelor <> ''),
  snuid_master text check (snuid_master <> ''),
  snuid_doctor text check (snuid_doctor <> ''),
  snuid_master_doctor text check (snuid_master_doctor <> ''),
  reset_token text check (reset_token <> ''),
  reset_expire_after timestamp without time zone,
  uid integer unique,
  shell_id integer references shells(shell_id),
  timezone text check (timezone <> '')
);

create table email_addresses (
  email_address_id serial primary key,
  user_id integer references users(user_id) not null,
  address_local text not null check (address_local <> ''),
  address_domain text not null check (address_domain <> ''),
  verified boolean not null,
  verify_token text check (verify_token <> ''),
  verify_expire_after timestamp without time zone,
  unique(address_local, address_domain)
);

alter table users add column primary_email_address_id integer references email_addresses(email_address_id);

create table classes (
  class_id serial primary key,
  owner_id integer references users(user_id),
  primary_contact_address_id integer references email_addresses(email_address_id),
  expire_after timestamp without time zone,
  accepted boolean not null,
  request_text text check (request_text <> ''),
  enroll_secret text check (enroll_secret <> ''),
  enroll_secret_expire_after timestamp without time zone,
  enroll_auto boolean not null
);

create table class_names (
  class_id integer references classes(class_id) not null,
  language_code varchar(2) not null,
  name text not null check (name <> ''),
  primary key(class_id, language_code)
);

create table class_implies (
  class_id integer references classes(class_id) not null,
  node_id integer not null,
  primary key(class_id, node_id)
);

create table users_classes (
  user_id integer references users(user_id) not null,
  class_id integer references classes(class_id) not null,
  expire_after timestamp without time zone,
  accepted boolean not null,
  request_text text check (request_text <> ''),
  primary key(user_id, class_id)
);

create table users_nodes (
  user_id integer references users(user_id) not null,
  node_id integer not null,
  expire_after timestamp without time zone,
  accepted boolean not null,
  request_text text check (request_text <> ''),
  primary key(user_id, node_id)
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
  primary key(user_id, node_id)
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
  name text primary key check (name <> '')
);

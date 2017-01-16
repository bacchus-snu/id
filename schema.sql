drop table if exists users cascade;
drop table if exists email_addresses cascade;
drop table if exists classes cascade;
drop table if exists class_names cascade;
drop table if exists class_implies cascade;
drop table if exists users_classes cascade;
drop table if exists users_nodes cascade;
drop table if exists users_terms cascade;
drop table if exists users_masks cascade;
drop type if exists node_term_status cascade;
drop table if exists users_closure cascade;

create table users (
  user_id serial primary key,
  account text unique not null,
  password_digest bytea,
  blocked boolean not null,
  name text,
  snuid_bachelor text,
  snuid_master text,
  snuid_doctor text,
  reset_token text,
  reset_expire_after timestamp without time zone
);

create table email_addresses (
  email_address_id serial primary key,
  user_id integer references users(user_id) not null,
  address_local text not null,
  address_domain text not null,
  verified boolean not null,
  unique(address_local, address_domain)
);

alter table users add column primary_email_address_id integer references email_addresses(email_address_id);

create table classes (
  class_id serial primary key,
  owner_id integer references users(user_id) not null,
  expire_after timestamp without time zone,
  activated boolean not null,
  enroll_secret text,
  enroll_auto boolean not null
);

create table class_names (
  class_id integer references classes(class_id) not null,
  language_code varchar(2) not null,
  name text not null,
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
  activated boolean not null,
  primary key(user_id, class_id)
);

create table users_nodes (
  user_id integer references users(user_id) not null,
  node_id integer not null,
  expire_after timestamp without time zone,
  activated boolean not null,
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

create type node_term_status as enum ('ok', 'old', 'no');

create table users_closure (
  user_id integer references users(user_id) not null,
  node_id integer not null,
  term_status node_term_status not null,
  primary key(user_id, node_id)
);

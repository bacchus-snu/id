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
drop type if exists node_term_status cascade;
drop table if exists users_valids cascade;
drop table if exists hosts cascade;
drop table if exists reserved_usernames cascade;

create table shells (
  shellId serial primary key,
  shell text unique not null
);

create table users (
  userId serial primary key,
  name text unique not null,
  passwordDigest bytea,
  blocked boolean not null,
  blockedExpireAfter timestamp without time zone,
  realname text,
  snuidBachelor text,
  snuidMaster text,
  snuidDoctor text,
  resetToken text,
  resetExpireAfter timestamp without time zone,
  uid integer unique,
  shellId integer references shells(shellId),
  timezone text
);

create table email_addresses (
  emailAddressId serial primary key,
  userId integer references users(userId) not null,
  addressLocal text not null,
  addressDomain text not null,
  verified boolean not null,
  verifyToken text,
  verifyExpireAfter timestamp without time zone,
  unique(addressLocal, addressDomain)
);

alter table users add column primaryEmailAddressId integer references email_addresses(emailAddressId);

create table classes (
  classId serial primary key,
  ownerId integer references users(userId) not null,
  primaryContactAddressId integer references email_addresses(emailAddressId) not null,
  expireAfter timestamp without time zone,
  accepted boolean not null,
  applicationText text,
  enrollSecret text,
  enrollSecretExpireAfter timestamp without time zone,
  enrollAuto boolean not null
);

create table class_names (
  classId integer references classes(classId) not null,
  languageCode varchar(2) not null,
  name text not null,
  primary key(classId, languageCode)
);

create table class_implies (
  classId integer references classes(classId) not null,
  nodeId integer not null,
  primary key(classId, nodeId)
);

create table users_classes (
  userId integer references users(userId) not null,
  classId integer references classes(classId) not null,
  expireAfter timestamp without time zone,
  accepted boolean not null,
  applicationText text,
  primary key(userId, classId)
);

create table users_nodes (
  userId integer references users(userId) not null,
  nodeId integer not null,
  expireAfter timestamp without time zone,
  accepted boolean not null,
  applicationText text,
  primary key(userId, nodeId)
);

create table users_terms (
  userId integer references users(userId) not null,
  termId integer not null,
  termRevision integer not null,
  acceptedOn timestamp without time zone not null,
  primary key(userId, termId)
);

create table users_masks (
  userId integer references users(userId) not null,
  nodeId integer not null,
  expireAfter timestamp without time zone,
  primary key(userId, nodeId)
);

create type node_term_status as enum ('ok', 'old', 'no');

create table users_valids (
  userId integer references users(userId) not null,
  nodeId integer not null,
  termStatus node_term_status not null,
  primary key(userId, nodeId)
);

create table hosts (
  hostId serial primary key,
  hostname text unique not null,
  ipv4 text unique,
  ldapListen boolean not null,
  accessNodeId integer,
  traceNodeId integer
);

create table reserved_usernames (
  name text primary key
);

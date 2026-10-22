-- Migration: Add announcements table
-- Notices and service promotions shown by the frontend; an announcement may
-- promote a group, which the frontend then lists first

BEGIN;

CREATE TABLE IF NOT EXISTS announcements (
  idx serial primary key,
  title_ko text not null check (title_ko <> ''),
  title_en text not null check (title_en <> ''),
  body_ko text not null check (body_ko <> ''),
  body_en text not null check (body_en <> ''),
  url text,
  group_idx integer references groups(idx) on delete set null,
  starts_at timestamp with time zone not null default now(),
  ends_at timestamp with time zone
);

COMMIT;

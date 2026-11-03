-- 사전 등록한 참가자 (계획서 Task 5의 participants. 입장 링크 방식이라 PIN은 없다)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  application_id uuid not null unique references applications(id) on delete cascade,
  gender text not null check (gender in ('f','m')),
  nickname text not null,
  age int not null,
  job text not null,
  area text not null,
  mbti text not null,
  keywords text[] not null,
  answers int[] not null,
  love_type int not null check (love_type between 0 and 15),
  shape text not null,
  prop text not null default 'none',
  number int,                -- 현장에서 테이블을 누르면 정해지는 호 번호
  excluded boolean not null default false,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists participants_seat_idx on participants(event_id, gender, number) where number is not null and not excluded;

alter table participants enable row level security;

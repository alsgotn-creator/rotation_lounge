-- 플러팅 라운지: 신청 사이트 + 행사(events)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run.
-- 브라우저는 테이블을 직접 읽지 않는다: RLS를 켜고 정책을 두지 않아 anon 키로는 아무것도 못 읽는다.
-- 모든 읽기/쓰기는 Next.js 서버가 service-role 키로 한다.

create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '플러팅 라운지',
  starts_at timestamptz not null,
  venue text not null default '',
  notice text not null default '',
  -- 신청
  birth_from int not null,
  birth_to int not null,
  capacity_per_gender int not null default 7 check (capacity_per_gender between 1 and 12),
  apply_open boolean not null default true,
  price int not null default 30000,
  payment_due_days int not null default 3,
  -- 행사 진행 (라운지 앱, 계획서 Task 5)
  phase text not null default 'before' check (phase in ('before','talk','choice','closing')),
  table_count int not null default 7,
  round_duration_sec int not null default 900,
  max_picks int not null default 3 check (max_picks in (2,3)),
  recommendation_open boolean not null default false,
  results_open boolean not null default false,
  screen_key text not null default encode(gen_random_bytes(9), 'base64'),
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  gender text not null check (gender in ('f','m')),
  name text not null,
  birth_year int not null,
  phone text not null,
  email text not null,
  job text not null,
  photo_paths text[] not null default '{}',
  avoid jsonb not null default '[]',
  status text not null default 'new' check (status in ('new','held','awaiting_payment','confirmed','cancelled')),
  status_token_hash text not null unique,
  invite_token_hash text unique,
  payment_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_event_idx on applications(event_id, status);

alter table events enable row level security;
alter table applications enable row level security;

-- 신청 사진: 비공개 버킷 (호스트는 서버가 만든 1시간짜리 서명 링크로만 본다)
insert into storage.buckets (id, name, public)
values ('applicant-photos', 'applicant-photos', false)
on conflict (id) do nothing;

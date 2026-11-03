-- 롤링페이퍼 (계획서 Task 5). body가 null이면 '건너뜀'. 누가 썼는지는 저장하지만 참가자 쪽으로는 절대 내려보내지 않는다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. (여러 번 실행해도 안전)

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  round int not null,
  from_id uuid not null references participants(id) on delete cascade,
  to_id uuid not null references participants(id) on delete cascade,
  body text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, from_id, to_id, round)
);
create index if not exists notes_to_idx on notes(event_id, to_id);
alter table notes enable row level security;

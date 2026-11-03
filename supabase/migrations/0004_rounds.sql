-- 대화 라운드 (계획서 Task 3·5). 시간은 서버 기준으로 저장하고, 화면은 이 값으로 남은 시간을 계산한다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.

create table if not exists rounds (
  event_id uuid not null references events(id) on delete cascade,
  no int not null check (no >= 1),
  started_at timestamptz not null,
  paused_at timestamptz,
  paused_total_ms bigint not null default 0,
  duration_sec int not null,
  closed_at timestamptz,
  primary key (event_id, no)
);
alter table rounds enable row level security;

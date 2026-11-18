-- 플러팅 더블 라운지 (2:2 파트너 모임). 기존 로테이션 모임은 그대로 kind = 'rotation'.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. (여러 번 실행해도 안전)

alter table events add column if not exists kind text not null default 'rotation';
alter table events drop constraint if exists events_kind_check;
alter table events add constraint events_kind_check check (kind in ('rotation','double'));

-- 사전 등록: 이상형 · 매력 포인트 (더블에서만 받는다, 파트너에게만 보인다)
alter table participants add column if not exists ideal text;
alter table participants add column if not exists charm text;

-- 파트너 팀: 호스트가 '파트너 매칭'을 누르면 가치관·MBTI가 가장 안 맞는 남녀끼리 묶인다. fit = 잘 맞는 정도(0~100), 마지막에 공개
create table if not exists teams (
  event_id uuid not null references events(id) on delete cascade,
  no int not null check (no >= 1),
  f_id uuid not null references participants(id) on delete cascade,
  m_id uuid not null references participants(id) on delete cascade,
  name text not null default '',
  fit int not null default 0,
  similar_pct int not null default 0,
  mbti_same int not null default 0,
  primary key (event_id, no),
  unique (event_id, f_id),
  unique (event_id, m_id)
);
alter table teams enable row level security;

-- 파트너 둘만의 채팅
create table if not exists team_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  team_no int not null,
  from_id uuid not null references participants(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  foreign key (event_id, team_no) references teams(event_id, no) on delete cascade
);
create index if not exists team_messages_idx on team_messages(event_id, team_no, created_at);
alter table team_messages enable row level security;

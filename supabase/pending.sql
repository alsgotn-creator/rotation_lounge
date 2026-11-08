-- 아직 Supabase에 실행하지 않았다면 이 파일을 통째로 SQL Editor에 붙여넣고 Run (여러 번 실행해도 안전).
-- 0005 한 테이블 인원 · 0006 롤링페이퍼 · 0007 최종 선택 · 0008 페어 게임 · 0009 후기 (앞부분을 이미 실행했다면 0009 부분만 실행해도 된다)

alter table events add column if not exists per_table int not null default 1;
alter table events drop constraint if exists events_per_table_check;
alter table events add constraint events_per_table_check check (per_table between 1 and 3);
alter table events drop constraint if exists events_capacity_per_gender_check;
alter table events add constraint events_capacity_per_gender_check check (capacity_per_gender between 1 and 36);

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
create index if not exists notes_idx on notes(event_id, to_id);
alter table notes enable row level security;

create table if not exists choices (
  event_id uuid not null references events(id) on delete cascade,
  from_id uuid not null references participants(id) on delete cascade,
  to_id uuid not null references participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, from_id, to_id)
);
alter table choices enable row level security;
alter table participants add column if not exists choice_done_at timestamptz;

-- 0008 선택형 페어 게임
create table if not exists game_plays (
  event_id uuid not null references events(id) on delete cascade,
  round int not null,
  table_no int not null,
  card_id text not null,
  drawn_by uuid references participants(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, round, table_no)
);
alter table game_plays enable row level security;

create table if not exists game_answers (
  event_id uuid not null references events(id) on delete cascade,
  round int not null,
  table_no int not null,
  participant_id uuid not null references participants(id) on delete cascade,
  answer text not null,
  created_at timestamptz not null default now(),
  primary key (event_id, round, table_no, participant_id)
);
alter table game_answers enable row level security;

-- 0009 후기
create table if not exists reviews (
  application_id uuid primary key references applications(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  gender text not null check (gender in ('f','m')),
  age int not null,
  body text not null check (char_length(body) between 1 and 120),
  created_at timestamptz not null default now()
);
create index if not exists reviews_created_idx on reviews(created_at desc);
alter table reviews enable row level security;

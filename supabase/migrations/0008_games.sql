-- 선택형 페어 게임: 라운드·테이블마다 카드 한 장, 그 테이블 사람들의 답
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

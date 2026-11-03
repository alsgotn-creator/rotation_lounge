-- 최종 선택 (계획서 Task 5). 누가 누구를 골랐는지는 참가자 쪽으로 절대 내려가지 않는다 (서로 고른 경우의 매칭만 보인다).
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. (여러 번 실행해도 안전)

create table if not exists choices (
  event_id uuid not null references events(id) on delete cascade,
  from_id uuid not null references participants(id) on delete cascade,
  to_id uuid not null references participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, from_id, to_id)
);
alter table choices enable row level security;

-- 0명을 골라도 '선택 완료'를 눌렀다는 표시
alter table participants add column if not exists choice_done_at timestamptz;

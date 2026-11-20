-- 2026-11-20 더블 라운지: 파트너에게 추천. 최종 선택 때 파트너 이상형에 맞는 분(같이 앉았던 상대 팀의 나와 같은 성별)을 골라두면
-- 파트너의 최종 선택 화면에서 그 캐릭터 아래에 '파트너 추천'이 살짝 보인다.
-- Supabase 대시보드 → SQL Editor 에 이 내용을 붙여넣고 Run. (여러 번 실행해도 안전)
create table if not exists recommends (
  event_id uuid not null references events(id) on delete cascade,
  from_id uuid not null references participants(id) on delete cascade,
  to_id uuid not null references participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id)
);
alter table recommends enable row level security;

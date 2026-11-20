-- 2026-11-20 마무리 화면 신청: 오늘 뒷풀이 · 모임 한 번 더(20%) · 1:1 로테이션(20%) · 나는솔로 토론회
-- Supabase 대시보드 → SQL Editor 에 이 내용을 붙여넣고 Run. (여러 번 실행해도 안전)
create table if not exists closing_signups (
  application_id uuid not null references applications(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  kind text not null check (kind in ('afterparty','again','rotation','solo')),
  created_at timestamptz not null default now(),
  primary key (application_id, kind)
);
alter table closing_signups enable row level security;

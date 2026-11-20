-- 2026-11-20
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. (여러 번 실행해도 안전)

-- 더블 라운지 시작 전 참가자 화면. 호스트가 진행 화면에서 고른다.
--   auto   : 모임 이틀 전 0시(한국 시간)부터 파트너 채팅방이 열린다 (그 전엔 '곧 열려요')
--   chat   : 날짜와 상관없이 채팅방을 지금 연다
--   lounge : 당일 — 라운지를 보여준다 (채팅방은 라운지 가운데 카드로 다시 들어간다)
alter table events add column if not exists pre_stage text not null default 'auto';
alter table events drop constraint if exists events_pre_stage_check;
alter table events add constraint events_pre_stage_check check (pre_stage in ('auto','chat','lounge'));

-- 마무리: 호스트에게 하고 싶은 말 (모임 피드백 · 요청사항). 참가자당 하나, 다시 쓰면 고쳐 쓴다. 호스트만 본다.
create table if not exists host_feedback (
  application_id uuid primary key references applications(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
alter table host_feedback enable row level security;

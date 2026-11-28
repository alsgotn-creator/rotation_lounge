-- 2026-11-28 광화문연가 사전 단계
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. (여러 번 실행해도 안전)

-- 이상형 월드컵 결과 {winner, order}. 비어 있으면 사전 등록 뒤에 월드컵 화면이 뜬다
alter table participants add column if not exists worldcup jsonb;

-- 시작 전 참가자 화면에 'wait'(호스트가 열 때까지 대기) 추가
alter table events drop constraint if exists events_pre_stage_check;
alter table events add constraint events_pre_stage_check check (pre_stage in ('auto','wait','chat','lounge'));

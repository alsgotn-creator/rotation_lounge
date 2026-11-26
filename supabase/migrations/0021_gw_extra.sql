-- 광화문연가 신청서: MBTI, 호스트에게 할 말
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. 돌리기 전에도 신청은 받아지고, 그동안은 두 내용이 '하는 일'·'이상형' 칸 뒤에 붙는다.
alter table applications add column if not exists mbti text not null default '';
alter table applications add column if not exists host_message text not null default '';

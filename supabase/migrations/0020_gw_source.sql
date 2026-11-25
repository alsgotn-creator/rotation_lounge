-- 광화문연가 신청 경로 (인스타 / QR)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. 돌리기 전에도 신청은 받아지고, 그동안은 경로가 '하는 일' 칸 뒤에 붙는다.
alter table applications add column if not exists source text not null default '';

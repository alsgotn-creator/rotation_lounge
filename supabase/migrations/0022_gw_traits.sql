-- 광화문연가 신청서: 성격 키워드, 촬영 노출 범위
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. 돌리기 전에도 신청은 받아지고, 그동안은 두 내용이 '호스트에게' 칸 뒤에 붙는다.
alter table applications add column if not exists traits text not null default '';
alter table applications add column if not exists exposure text not null default '';

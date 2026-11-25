-- 광화문연가 랜딩 신청서 (/gwanghwamun): 이상형 · 광화문 근처 근무 여부
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. 돌리기 전에도 신청은 받아지고, 그동안은 두 값이 '하는 일' 칸에 함께 적힌다.
alter table applications add column if not exists ideal text not null default '';
alter table applications add column if not exists near_work text not null default '';

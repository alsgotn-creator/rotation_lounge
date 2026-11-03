-- 호 번호는 참가 확정(입금 확인) 때 무작위로 정해진다. 1라운드는 같은 번호끼리 같은 테이블.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.

alter table applications add column if not exists number int;
create unique index if not exists applications_number_idx on applications(event_id, gender, number) where number is not null;

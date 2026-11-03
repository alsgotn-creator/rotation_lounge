-- 한 테이블에 앉는 인원: 1(1:1) / 2(2:2) / 3(3:3). 성별당 최대 인원 = 테이블 수 × 한 테이블 인원
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. (여러 번 실행해도 안전)

alter table events add column if not exists per_table int not null default 1;
alter table events drop constraint if exists events_per_table_check;
alter table events add constraint events_per_table_check check (per_table between 1 and 3);

-- 성별당 인원 상한을 12 → 36 (테이블 12개 × 3명)
alter table events drop constraint if exists events_capacity_per_gender_check;
alter table events add constraint events_capacity_per_gender_check check (capacity_per_gender between 1 and 36);

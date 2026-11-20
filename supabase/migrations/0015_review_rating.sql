-- 후기 별점 (1~5). 기존 후기는 모두 5점으로 맞춘다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run. (여러 번 실행해도 안전)
alter table reviews add column if not exists rating smallint not null default 5;
alter table reviews drop constraint if exists reviews_rating_check;
alter table reviews add constraint reviews_rating_check check (rating between 1 and 5);
update reviews set rating = 5;

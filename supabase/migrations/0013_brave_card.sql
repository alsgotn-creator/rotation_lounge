-- 용기 카드: 최종 선택에서 고른 사람 중 한 명에게만 붙인다. 서로 붙였으면 끝나고 카페로 안내한다.
alter table choices add column if not exists brave boolean not null default false;

-- 롤링페이퍼: 쓴 사람이 고른 손글씨 글꼴 + 최종 선택 기본 3명
alter table notes add column if not exists font text;
alter table events alter column max_picks set default 3;

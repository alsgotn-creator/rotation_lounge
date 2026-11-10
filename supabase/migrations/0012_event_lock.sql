-- 모임이 끝나면 호스트가 닫는다: 참가자 입장만 막고 데이터는 그대로 둔다
alter table events add column if not exists locked boolean not null default false;

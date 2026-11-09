-- 최종 선택 순위(1~3) + 연말 와인모임 단톡방 참가 신청
alter table choices add column if not exists rank int;

create table if not exists wine_signups (
  application_id uuid primary key references applications(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table wine_signups enable row level security;

-- 후기: 입장 링크로 들어온 확정 참가자가 행사당 한 번 남긴다 (이름 없이 성별·나이만 보여준다)
create table if not exists reviews (
  application_id uuid primary key references applications(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  gender text not null check (gender in ('f','m')),
  age int not null,
  body text not null check (char_length(body) between 1 and 120),
  created_at timestamptz not null default now()
);
create index if not exists reviews_created_idx on reviews(created_at desc);
alter table reviews enable row level security;

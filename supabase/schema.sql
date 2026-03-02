create table if not exists public.surveys (
  id bigint primary key,
  category text not null,
  title text not null,
  description text not null default '',
  days_left integer not null check (days_left >= 0),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  created_at timestamptz not null default now()
);

create table if not exists public.survey_stats (
  survey_id bigint primary key references public.surveys(id) on delete cascade,
  total_responses integer not null default 0 check (total_responses >= 0),
  counts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.surveys enable row level security;
alter table public.survey_stats enable row level security;

drop policy if exists "Allow read surveys" on public.surveys;
create policy "Allow read surveys"
on public.surveys
for select
using (true);

drop policy if exists "Allow write surveys" on public.surveys;
create policy "Allow write surveys"
on public.surveys
for all
using (true)
with check (true);

drop policy if exists "Allow read survey stats" on public.survey_stats;
create policy "Allow read survey stats"
on public.survey_stats
for select
using (true);

drop policy if exists "Allow write survey stats" on public.survey_stats;
create policy "Allow write survey stats"
on public.survey_stats
for all
using (true)
with check (true);

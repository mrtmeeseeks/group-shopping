-- Group Shopping Tracker — Supabase schema (v2: shopping runs + receipts)
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  payer uuid references people(id),
  total numeric(10,2) not null,
  note text not null default '',
  receipt_url text,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day date not null,
  status text not null default 'open' check (status in ('open', 'bought')),
  trip_id uuid references trips(id),
  created_at timestamptz not null default now()
);

-- Open access for the friends group (anyone with the anon key can read/write).
-- Fine for a private group with an unlisted URL; do not reuse this project for anything sensitive.
alter table people enable row level security;
alter table items enable row level security;
alter table trips enable row level security;

create policy "group access" on people for all using (true) with check (true);
create policy "group access" on items for all using (true) with check (true);
create policy "group access" on trips for all using (true) with check (true);

-- Realtime: push changes to all connected browsers.
alter publication supabase_realtime add table people;
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table trips;

-- v3: items are a permanent shared pool; runs link to the items bought in them.
-- (items.day/status/trip_id are legacy columns, ignored by the app.)
create table if not exists run_items (
  trip_id uuid references trips(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  -- personal (non-shared) portion: charged to for_person alone, excluded from the equal split
  for_person uuid references people(id),
  amount numeric(10,2),
  primary key (trip_id, item_id)
);
alter table run_items enable row level security;
create policy "group access" on run_items for all using (true) with check (true);
alter publication supabase_realtime add table run_items;

-- Receipt photos: public storage bucket + open policies for the group.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "receipts read" on storage.objects
  for select using (bucket_id = 'receipts');
create policy "receipts write" on storage.objects
  for insert with check (bucket_id = 'receipts');

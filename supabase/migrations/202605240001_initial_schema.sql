create extension if not exists pgcrypto;

create type public.task_priority as enum ('high', 'medium', 'low');
create type public.repeat_type as enum ('none', 'daily', 'selected_days', 'weekly', 'monthly', 'custom');
create type public.task_status as enum ('planned', 'in_progress', 'done', 'skipped', 'moved', 'cancelled');
create type public.sync_status as enum ('not_synced', 'synced', 'needs_update', 'conflict');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Riyadh',
  country text not null default 'Saudi Arabia',
  city text not null default 'Riyadh',
  prayer_method integer not null default 4,
  asr_madhab text not null default 'standard',
  selected_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name_ar text not null,
  icon text not null default 'circle',
  color text not null default 'emerald',
  default_duration_minutes integer not null default 30 check (default_duration_minutes > 0),
  default_priority public.task_priority not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  block_key text not null,
  name_ar text not null,
  name_en text,
  sort_order integer not null,
  start_source text not null,
  end_source text not null,
  start_prayer text,
  end_prayer text,
  fixed_start time,
  fixed_end time,
  color text not null default 'emerald',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index time_blocks_user_key_unique
on public.time_blocks (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), block_key);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  default_time_block_id uuid references public.time_blocks(id) on delete set null,
  title text not null,
  default_duration_minutes integer not null default 30 check (default_duration_minutes > 0),
  default_priority public.task_priority not null default 'medium',
  repeat_type public.repeat_type not null default 'daily',
  repeat_days smallint[] not null default '{}',
  repeat_interval integer not null default 1 check (repeat_interval > 0),
  start_date date not null default current_date,
  end_date date,
  notes text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  color text not null default 'emerald',
  is_active boolean not null default true,
  include_in_calendar boolean not null default true,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.task_templates(id) on delete set null,
  title text not null,
  occurrence_date date not null,
  time_block_id uuid references public.time_blocks(id) on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  status public.task_status not null default 'planned',
  checklist jsonb not null default '[]'::jsonb,
  notes text not null default '',
  priority public.task_priority not null default 'medium',
  color text not null default 'emerald',
  is_modified boolean not null default false,
  sync_status public.sync_status not null default 'not_synced',
  sort_order integer not null default 0,
  include_in_calendar boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prayer_day_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer_date date not null,
  timezone text not null,
  country text not null,
  city text not null,
  method integer not null,
  asr_madhab text not null,
  timings jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (user_id, prayer_date, country, city, method, asr_madhab)
);

create table public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null,
  calendar_summary text,
  refresh_token_ciphertext text,
  access_token_ciphertext text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, calendar_id)
);

create table public.calendar_block_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.google_calendar_connections(id) on delete cascade,
  export_date date not null,
  time_block_id uuid references public.time_blocks(id) on delete cascade,
  local_id text not null,
  calendar_event_id text not null,
  payload_hash text not null,
  sync_status public.sync_status not null default 'synced',
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.time_blocks enable row level security;
alter table public.task_templates enable row level security;
alter table public.task_occurrences enable row level security;
alter table public.prayer_day_cache enable row level security;
alter table public.google_calendar_connections enable row level security;
alter table public.calendar_block_exports enable row level security;

create policy "profiles are owned by the user"
on public.profiles for all
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "categories are owned by the user"
on public.categories for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "time blocks are readable when global or owned"
on public.time_blocks for select
using (user_id is null or (select auth.uid()) = user_id);

create policy "users manage own time blocks"
on public.time_blocks for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "task templates are owned by the user"
on public.task_templates for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "task occurrences are owned by the user"
on public.task_occurrences for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "prayer cache rows are owned by the user"
on public.prayer_day_cache for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "calendar connections are owned by the user"
on public.google_calendar_connections for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "calendar exports are owned by the user"
on public.calendar_block_exports for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into public.time_blocks (
  user_id,
  block_key,
  name_ar,
  name_en,
  sort_order,
  start_source,
  end_source,
  start_prayer,
  end_prayer,
  fixed_start,
  fixed_end,
  color
) values
  (null, 'last_sixth_to_fajr', 'السدس / قبل الفجر', 'Last sixth to Fajr', 10, 'fixed_time', 'prayer_time', null, 'Fajr', '03:20', null, 'indigo'),
  (null, 'fajr_to_sunrise', 'الفجر إلى الشروق', 'Fajr to Sunrise', 20, 'prayer_time', 'prayer_time', 'Fajr', 'Sunrise', null, null, 'emerald'),
  (null, 'sunrise_to_dhuhr', 'الشروق إلى الظهر', 'Sunrise to Dhuhr', 30, 'prayer_time', 'prayer_time', 'Sunrise', 'Dhuhr', null, null, 'sky'),
  (null, 'dhuhr_to_asr', 'الظهر إلى العصر', 'Dhuhr to Asr', 40, 'prayer_time', 'prayer_time', 'Dhuhr', 'Asr', null, null, 'amber'),
  (null, 'asr_to_maghrib', 'العصر إلى المغرب', 'Asr to Maghrib', 50, 'prayer_time', 'prayer_time', 'Asr', 'Maghrib', null, null, 'orange'),
  (null, 'maghrib_to_isha', 'المغرب إلى العشاء', 'Maghrib to Isha', 60, 'prayer_time', 'prayer_time', 'Maghrib', 'Isha', null, null, 'rose'),
  (null, 'isha_to_sleep', 'العشاء إلى النوم / السدس', 'Isha to Sleep', 70, 'prayer_time', 'fixed_time', 'Isha', null, null, '23:30', 'slate')
on conflict do nothing;

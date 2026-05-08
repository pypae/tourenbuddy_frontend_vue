create table public.contacts (
  id uuid not null default gen_random_uuid (),
  first_name text not null,
  last_name text null,
  display_name text null,
  user_id uuid not null default auth.uid (),
  constraint contacts_pkey primary key (id),
  constraint contacts_user_id_fkey foreign KEY (user_id) references user_profile (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create table public.contact_methods (
  id uuid not null default gen_random_uuid (),
  contact_id uuid not null,
  method_type public.contact_method_type not null,
  value text not null,
  label text null,
  is_primary boolean not null default false,
  constraint contact_methods_pkey primary key (id),
  constraint contact_methods_unique_per_contact unique (contact_id, method_type, value),
  constraint contact_methods_contact_id_fkey foreign KEY (contact_id) references contacts (id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists contact_methods_one_primary_phone on public.contact_methods using btree (contact_id) TABLESPACE pg_default
where
  (
    (method_type = 'phone'::contact_method_type)
    and is_primary
  );

create unique INDEX IF not exists contact_methods_one_primary_email on public.contact_methods using btree (contact_id) TABLESPACE pg_default
where
  (
    (method_type = 'email'::contact_method_type)
    and is_primary
  );

create table public.tours (
  id uuid not null default gen_random_uuid (),
  planned_date date null,
  user_id uuid not null default auth.uid (),
  goal geography not null,
  name text null,
  constraint tours_pkey primary key (id),
  constraint tours_user_id_fkey foreign KEY (user_id) references user_profile (id) on update CASCADE on delete CASCADE,
  constraint tours_name_check check ((length(name) < 100))
) TABLESPACE pg_default;

-- Added in 20260508_notifications migration
-- user_profile also has: notif_push_enabled boolean NOT NULL DEFAULT true,
--                        notif_email_enabled boolean NOT NULL DEFAULT true,
--                        notif_muted_types text[] NOT NULL DEFAULT '{}'

create table public.push_subscriptions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  created_at timestamptz not null default now (),
  last_seen_at timestamptz not null default now (),
  constraint push_subscriptions_pkey primary key (id),
  constraint push_subscriptions_endpoint_key unique (endpoint)
) TABLESPACE pg_default;

create index IF not exists push_subscriptions_user_id_idx on public.push_subscriptions using btree (user_id) TABLESPACE pg_default;

create view public.tours_view as
select
  id,
  user_id,
  planned_date,
  name,
  st_x (goal::geometry) as lon,
  st_y (goal::geometry) as lat,
  tour_type,
  elevation,
  gpx_track,
  description,
  seasons,
  st_x (start_point::geometry) as start_lon,
  st_y (start_point::geometry) as start_lat,
  st_x (end_point::geometry) as end_lon,
  st_y (end_point::geometry) as end_lat,
  equipment,
  notes,
  completed,
  (
    select
      COALESCE(json_agg(tp.contact_id), '[]'::json) as "coalesce"
    from
      tour_partners tp
    where
      tp.tour_id = t.id
  ) as partner_ids
from
  tours t;

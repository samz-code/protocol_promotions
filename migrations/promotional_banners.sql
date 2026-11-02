create table if not exists public.promotional_banners (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('ad', 'offer')),
  format text not null default 'landscape' check (format in ('landscape', 'flyer')),
  image_url text not null,
  alt_text text not null default '',
  href text not null default '',
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotional_banners_valid_dates check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

create index if not exists promotional_banners_active_order_idx
  on public.promotional_banners (is_active, display_order);

alter table public.promotional_banners enable row level security;

grant select on public.promotional_banners to anon, authenticated;
grant insert, update, delete on public.promotional_banners to authenticated;

drop policy if exists "Anyone can view active promotional banners" on public.promotional_banners;
create policy "Anyone can view active promotional banners"
  on public.promotional_banners for select to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "Admins can manage promotional banners" on public.promotional_banners;
create policy "Admins can manage promotional banners"
  on public.promotional_banners for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.promotional_banners (
  id, name, kind, format, image_url, alt_text, href, is_active,
  starts_at, ends_at, display_order
)
select
  item->>'id',
  item->>'name',
  item->>'kind',
  coalesce(item->>'format', 'landscape'),
  item->>'image_url',
  coalesce(item->>'alt_text', ''),
  coalesce(item->>'href', ''),
  coalesce((item->>'is_active')::boolean, true),
  nullif(item->>'starts_at', '')::timestamptz,
  nullif(item->>'ends_at', '')::timestamptz,
  (banner.ordinality - 1)::integer
from public.content_blocks as block
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(block.value::jsonb) = 'array' then block.value::jsonb
    else '[]'::jsonb
  end
) with ordinality as banner(item, ordinality)
where block.key = 'homepage_promotional_banners'
  and item ?& array['id', 'name', 'kind', 'image_url', 'is_active']
  and item->>'kind' in ('ad', 'offer')
  and coalesce(item->>'format', 'landscape') in ('landscape', 'flyer')
on conflict (id) do nothing;

create or replace function public.replace_promotional_banners(p_banners jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Administrator access required to manage promotional banners';
  end if;

  if jsonb_typeof(p_banners) is distinct from 'array' then
    raise exception 'Promotional banners must be a JSON array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_banners) as banner(item)
    where jsonb_typeof(banner.item) is distinct from 'object'
      or nullif(banner.item->>'id', '') is null
      or nullif(banner.item->>'name', '') is null
      or nullif(banner.item->>'image_url', '') is null
      or banner.item->>'kind' is null
      or banner.item->>'kind' not in ('ad', 'offer')
      or coalesce(banner.item->>'format', 'landscape') not in ('landscape', 'flyer')
  ) then
    raise exception 'Each banner must include an id, name, image URL, valid kind, and valid format';
  end if;

  delete from public.promotional_banners as existing
  where not exists (
    select 1
    from jsonb_array_elements(p_banners) as banner(item)
    where banner.item->>'id' = existing.id
  );

  insert into public.promotional_banners (
    id, name, kind, format, image_url, alt_text, href, is_active,
    starts_at, ends_at, display_order, updated_at
  )
  select
    banner.item->>'id',
    banner.item->>'name',
    banner.item->>'kind',
    coalesce(banner.item->>'format', 'landscape'),
    banner.item->>'image_url',
    coalesce(banner.item->>'alt_text', ''),
    coalesce(banner.item->>'href', ''),
    coalesce(nullif(banner.item->>'is_active', '')::boolean, true),
    nullif(banner.item->>'starts_at', '')::timestamptz,
    nullif(banner.item->>'ends_at', '')::timestamptz,
    (banner.ordinality - 1)::integer,
    now()
  from jsonb_array_elements(p_banners) with ordinality as banner(item, ordinality)
  on conflict (id) do update
  set name = excluded.name,
      kind = excluded.kind,
      format = excluded.format,
      image_url = excluded.image_url,
      alt_text = excluded.alt_text,
      href = excluded.href,
      is_active = excluded.is_active,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      display_order = excluded.display_order,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.replace_promotional_banners(jsonb) from public;
grant execute on function public.replace_promotional_banners(jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promotional-banners',
  'promotional-banners',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view promotional banner images" on storage.objects;
create policy "Public can view promotional banner images"
  on storage.objects for select
  using (bucket_id = 'promotional-banners');

drop policy if exists "Admins can upload promotional banner images" on storage.objects;
create policy "Admins can upload promotional banner images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'promotional-banners' and public.is_admin());

drop policy if exists "Admins can update promotional banner images" on storage.objects;
create policy "Admins can update promotional banner images"
  on storage.objects for update to authenticated
  using (bucket_id = 'promotional-banners' and public.is_admin())
  with check (bucket_id = 'promotional-banners' and public.is_admin());

drop policy if exists "Admins can delete promotional banner images" on storage.objects;
create policy "Admins can delete promotional banner images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'promotional-banners' and public.is_admin());

notify pgrst, 'reload schema';

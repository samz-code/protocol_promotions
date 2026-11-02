create table if not exists public.trusted_companies (
  id text primary key,
  name text not null,
  image_url text not null,
  type text not null check (type in ('partner', 'trusted')),
  href text not null default '',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trusted_companies_name_not_empty check (length(trim(name)) > 0),
  constraint trusted_companies_image_not_empty check (length(trim(image_url)) > 0),
  constraint trusted_companies_valid_href check (
    href = '' or href ~* '^https?://'
  )
);

create index if not exists trusted_companies_active_order_idx
  on public.trusted_companies (is_active, display_order, created_at desc);

alter table public.trusted_companies enable row level security;

grant select on public.trusted_companies to anon, authenticated;
grant insert, update, delete on public.trusted_companies to authenticated;

drop policy if exists "Anyone can view active trusted companies" on public.trusted_companies;
create policy "Anyone can view active trusted companies"
  on public.trusted_companies for select to anon, authenticated
  using (is_active);

drop policy if exists "Admins can manage trusted companies" on public.trusted_companies;
create policy "Admins can manage trusted companies"
  on public.trusted_companies for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.replace_trusted_companies(p_companies jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Administrator access required to manage trusted companies';
  end if;

  if jsonb_typeof(p_companies) is distinct from 'array' then
    raise exception 'Trusted companies must be a JSON array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_companies) as company(item)
    where jsonb_typeof(company.item) is distinct from 'object'
      or nullif(trim(company.item->>'id'), '') is null
      or nullif(trim(company.item->>'name'), '') is null
      or nullif(trim(company.item->>'image_url'), '') is null
      or coalesce(company.item->>'type', '') not in ('partner', 'trusted')
      or (
        coalesce(company.item->>'href', '') <> ''
        and coalesce(company.item->>'href', '') !~* '^https?://'
      )
  ) then
    raise exception 'Each company must include an id, name, image URL, valid type, and valid link';
  end if;

  delete from public.trusted_companies as existing
  where not exists (
    select 1
    from jsonb_array_elements(p_companies) as company(item)
    where company.item->>'id' = existing.id
  );

  insert into public.trusted_companies (
    id, name, image_url, type, href, is_active, display_order, updated_at
  )
  select
    company.item->>'id',
    trim(company.item->>'name'),
    trim(company.item->>'image_url'),
    company.item->>'type',
    coalesce(trim(company.item->>'href'), ''),
    coalesce((company.item->>'is_active')::boolean, true),
    (company.ordinality - 1)::integer,
    now()
  from jsonb_array_elements(p_companies) with ordinality as company(item, ordinality)
  on conflict (id) do update
  set name = excluded.name,
      image_url = excluded.image_url,
      type = excluded.type,
      href = excluded.href,
      is_active = excluded.is_active,
      display_order = excluded.display_order,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.replace_trusted_companies(jsonb) from public;
grant execute on function public.replace_trusted_companies(jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-logos',
  'partner-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view partner logos" on storage.objects;
create policy "Public can view partner logos"
  on storage.objects for select
  using (bucket_id = 'partner-logos');

drop policy if exists "Admins can upload partner logos" on storage.objects;
create policy "Admins can upload partner logos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'partner-logos' and public.is_admin());

drop policy if exists "Admins can update partner logos" on storage.objects;
create policy "Admins can update partner logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'partner-logos' and public.is_admin())
  with check (bucket_id = 'partner-logos' and public.is_admin());

drop policy if exists "Admins can delete partner logos" on storage.objects;
create policy "Admins can delete partner logos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'partner-logos' and public.is_admin());

notify pgrst, 'reload schema';

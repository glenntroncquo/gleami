-- Follow-up to 20260929121000: the marketplace-visibility policy also
-- applies to authenticated members, which hid category links for a salon's
-- own NOT-yet-visible services in the listing management UI
-- (loadMarketplaceServices). Members keep full visibility of their own
-- company; anonymous/public callers stay restricted to
-- is_marketplace_visible services.

create policy "service_marketplace_category select (membership)"
  on public.service_marketplace_category for select
  to authenticated
  using (
    exists (
      select 1
      from public.service s
      where s.id = service_marketplace_category.service_id
        and s.company_id in (select private.company_ids_for_user())
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'service_marketplace_category'
      and p.polname = 'service_marketplace_category select (membership)'
  ) then
    raise exception 'member select policy missing on service_marketplace_category';
  end if;
end $$;

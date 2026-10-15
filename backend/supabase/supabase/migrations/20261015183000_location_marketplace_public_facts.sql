-- Public facts for the salon profile page. Members read and write them
-- through the existing location grants. Visitors receive them from
-- marketplace-location-get, not from a direct anon select of location.

alter table public.location
  add column marketplace_phone text,
  add column marketplace_website text,
  add column marketplace_instagram text,
  add column marketplace_opening_hours jsonb not null default '[]'::jsonb;

comment on column public.location.marketplace_phone is
  'Public phone shown on the marketplace profile. Null until the salon sets one.';

comment on column public.location.marketplace_website is
  'Public website URL for sameAs. Null until the salon sets one.';

comment on column public.location.marketplace_instagram is
  'Public Instagram URL for sameAs. Null until the salon sets one.';

comment on column public.location.marketplace_opening_hours is
  'Public opening hours as a JSON array of {day, opens, closes}. '
  'day is 1 (Monday) through 7 (Sunday). opens and closes are HH:MM or null '
  'when that day is closed. An empty array means the salon has not set hours.';

alter table public.location
  add constraint location_marketplace_phone_check
    check (
      marketplace_phone is null
      or char_length(btrim(marketplace_phone)) between 1 and 40
    ),
  add constraint location_marketplace_website_check
    check (
      marketplace_website is null
      or (
        char_length(marketplace_website) <= 300
        and marketplace_website ~* '^https?://'
      )
    ),
  add constraint location_marketplace_instagram_check
    check (
      marketplace_instagram is null
      or (
        char_length(marketplace_instagram) <= 300
        and marketplace_instagram ~* '^https?://'
      )
    ),
  add constraint location_marketplace_opening_hours_check
    check (jsonb_typeof(marketplace_opening_hours) = 'array');

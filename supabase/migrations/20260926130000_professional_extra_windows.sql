-- Professional-specific extra windows. Existing professionals remain unchanged and have no extra windows.
alter table public.professionals
  add column if not exists extra_windows jsonb not null default '[]'::jsonb;
comment on column public.professionals.extra_windows is 'Recurring professional-specific windows: [{start, end, bookable}].';

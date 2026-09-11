-- Google review link configured by the clinic owner and used in satisfaction messages.
alter table public.organizations add column if not exists google_review_url text;
comment on column public.organizations.google_review_url is 'Public Google Business Profile review URL configured by the organization owner';

-- Plano PRO: quantidade ilimitada de procedimentos.
-- O valor null em limits.services representa ilimitado.
insert into public.plans (id, name, price, limits, position)
values (
  'pro',
  'Aura PRO',
  49.90,
  '{"services": null, "procedures": null, "clients": null, "professionals": null}'::jsonb,
  1
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  limits = public.plans.limits || '{"services": null, "procedures": null}'::jsonb,
  position = excluded.position;

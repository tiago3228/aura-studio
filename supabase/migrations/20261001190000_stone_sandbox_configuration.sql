-- Configuração da integração Stone Connect 2.0 em modo sandbox.
-- Não armazena credenciais nem executa cobranças.

alter table public.payment_gateways
  drop constraint if exists payment_gateways_provider_check;

alter table public.payment_gateways
  add constraint payment_gateways_provider_check
  check (provider in ('mercado_pago', 'asaas', 'stripe', 'pagbank', 'pix_manual', 'stone'));

alter table public.payment_gateways
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.payment_gateways.metadata is
  'Configuração não secreta do provedor; credenciais devem permanecer nos secrets do backend.';

-- Fase: Atendimentos completos.
-- Complementa o prontuário existente sem remover dados já registrados.

alter table public.treatment_records
  add column if not exists chief_complaint text,
  add column if not exists treatment_plan text,
  add column if not exists aftercare text,
  add column if not exists internal_notes text,
  add column if not exists status text not null default 'concluido',
  add column if not exists sale_id uuid references public.sales(id) on delete set null;

alter table public.treatment_records
  drop constraint if exists treatment_records_status_check;

alter table public.treatment_records
  add constraint treatment_records_status_check
  check (status in ('agendado','em_atendimento','concluido','cancelado','faltou'));

create index if not exists treatment_records_status_idx
  on public.treatment_records(organization_id, status, performed_at desc);

create index if not exists treatment_records_appointment_idx
  on public.treatment_records(appointment_id);

comment on column public.treatment_records.chief_complaint is 'Queixa principal informada pelo cliente';
comment on column public.treatment_records.treatment_plan is 'Plano clínico e conduta do atendimento';
comment on column public.treatment_records.aftercare is 'Orientações pós-procedimento';
comment on column public.treatment_records.internal_notes is 'Observações internas da equipe';
comment on column public.treatment_records.sale_id is 'Venda relacionada ao atendimento, quando houver';

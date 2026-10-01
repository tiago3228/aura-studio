-- Reforço idempotente dos triggers de auditoria dos contratos.
-- Execute após as migrations das Fases 2 e 3.
-- Os triggers não gravam token, assinatura bruta ou biometria.

alter table public.contract_events
  drop constraint if exists contract_events_event_type_check;

alter table public.contract_events
  add constraint contract_events_event_type_check
  check (event_type in (
    'criado',
    'enviado',
    'visualizado',
    'assinado',
    'recusado',
    'cancelado',
    'expirado',
    'status_alterado',
    'atualizado',
    'termo_registrado',
    'termo_aceito',
    'termo_revogado',
    'termo_atualizado',
    'assinatura_validada',
    'assinatura_reprovada',
    'assinatura_expirada',
    'assinatura_cancelada',
    'assinatura_com_erro',
    'assinatura_processada'
  ));

create or replace function public.record_contract_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_name text;
  event_metadata jsonb;
begin
  if tg_op = 'INSERT' then
    event_name := 'criado';
    event_metadata := jsonb_build_object('title', new.title);
  elsif old.status is distinct from new.status then
    event_name := case new.status
      when 'enviado' then 'enviado'
      when 'visualizado' then 'visualizado'
      when 'assinado' then 'assinado'
      when 'recusado' then 'recusado'
      when 'cancelado' then 'cancelado'
      when 'expirado' then 'expirado'
      else 'status_alterado'
    end;
    event_metadata := jsonb_build_object('title', new.title);
  else
    event_name := 'atualizado';
    event_metadata := jsonb_build_object('title', new.title);
  end if;

  insert into public.contract_events (
    organization_id,
    contract_id,
    event_type,
    from_status,
    to_status,
    actor_user_id,
    metadata
  ) values (
    new.organization_id,
    new.id,
    event_name,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    auth.uid(),
    event_metadata
  );

  return new;
end;
$$;

drop trigger if exists record_client_contract_event on public.client_contracts;
create trigger record_client_contract_event
after insert or update on public.client_contracts
for each row execute function public.record_contract_event();

create or replace function public.record_signature_acceptance_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_name text;
  event_metadata jsonb;
begin
  if tg_table_name = 'contract_term_acceptances' then
    event_name := case
      when tg_op = 'INSERT' and new.accepted then 'termo_aceito'
      when tg_op = 'INSERT' then 'termo_registrado'
      when tg_op <> 'INSERT' and old.accepted is distinct from new.accepted and new.accepted then 'termo_aceito'
      when tg_op <> 'INSERT' and old.revoked_at is distinct from new.revoked_at and new.revoked_at is not null then 'termo_revogado'
      else 'termo_atualizado'
    end;
    event_metadata := jsonb_build_object(
      'term_id', new.term_id,
      'term_version', new.term_version,
      'term_content_hash', new.term_content_hash,
      'accepted', new.accepted
    );
  else
    event_name := case new.status
      when 'aprovada' then 'assinatura_validada'
      when 'reprovada' then 'assinatura_reprovada'
      when 'expirada' then 'assinatura_expirada'
      when 'cancelada' then 'assinatura_cancelada'
      when 'erro' then 'assinatura_com_erro'
      else 'assinatura_processada'
    end;
    event_metadata := jsonb_build_object(
      'verification_id', new.id,
      'verification_type', new.verification_type,
      'method', new.method,
      'status', new.status,
      'provider', new.provider,
      'document_hash', new.document_hash,
      'signature_hash', new.signature_hash,
      'match_score', new.match_score,
      'liveness_score', new.liveness_score,
      'failure_code', new.failure_code
    );
  end if;

  insert into public.contract_events (
    organization_id,
    contract_id,
    event_type,
    actor_user_id,
    metadata
  ) values (
    new.organization_id,
    new.contract_id,
    event_name,
    coalesce(auth.uid(), new.created_by),
    event_metadata
  );

  return new;
end;
$$;

drop trigger if exists record_term_acceptance_event on public.contract_term_acceptances;
create trigger record_term_acceptance_event
after insert or update on public.contract_term_acceptances
for each row execute function public.record_signature_acceptance_event();

drop trigger if exists record_signature_verification_event on public.signature_verifications;
create trigger record_signature_verification_event
after insert or update on public.signature_verifications
for each row execute function public.record_signature_acceptance_event();

comment on function public.record_contract_event() is 'Registra automaticamente mudanças de status e conteúdo de contratos.';
comment on function public.record_signature_acceptance_event() is 'Registra automaticamente aceite de termos e validações de assinatura.';

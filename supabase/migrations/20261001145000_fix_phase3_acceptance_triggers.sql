-- Reparo da Fase 3: corrige os triggers de aceite e validação.
-- Execute este arquivo somente se as tabelas da Fase 3 já foram criadas.

create or replace function public.validate_acceptance_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contract_organization_id uuid;
  term_organization_id uuid;
begin
  select c.organization_id into contract_organization_id
    from public.client_contracts c where c.id = new.contract_id;
  if contract_organization_id is null or contract_organization_id <> new.organization_id then
    raise exception 'O contrato não pertence à organização do aceite.';
  end if;

  select t.organization_id into term_organization_id
    from public.acceptance_terms t where t.id = new.term_id;
  if term_organization_id is null or term_organization_id <> new.organization_id then
    raise exception 'O termo não pertence à organização do aceite.';
  end if;

  return new;
end;
$$;

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
    organization_id, contract_id, event_type, actor_user_id, metadata
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

drop trigger if exists validate_contract_term_acceptance_organization on public.contract_term_acceptances;
create trigger validate_contract_term_acceptance_organization
before insert or update on public.contract_term_acceptances
for each row execute function public.validate_acceptance_organization();

drop trigger if exists record_term_acceptance_event on public.contract_term_acceptances;
create trigger record_term_acceptance_event
after insert or update on public.contract_term_acceptances
for each row execute function public.record_signature_acceptance_event();

-- Verificação rápida de presença dos objetos corrigidos.
do $$
begin
  if to_regclass('public.acceptance_terms') is null
    or to_regclass('public.contract_term_acceptances') is null
    or to_regclass('public.signature_verifications') is null then
    raise exception 'As tabelas da Fase 3 ainda não existem; execute a migration principal corrigida.';
  end if;
end;
$$;

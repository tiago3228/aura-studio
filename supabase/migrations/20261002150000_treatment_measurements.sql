-- Evolução corporal opcional vinculada a cada registro de atendimento.
alter table public.treatment_records
  add column if not exists weight_kg numeric(6,2),
  add column if not exists height_cm numeric(6,2),
  add column if not exists bust_cm numeric(6,2),
  add column if not exists waist_cm numeric(6,2),
  add column if not exists hip_cm numeric(6,2),
  add column if not exists arm_cm numeric(6,2),
  add column if not exists thigh_cm numeric(6,2),
  add column if not exists body_measurements_notes text;

alter table public.treatment_records
  add constraint treatment_records_weight_positive check (weight_kg is null or weight_kg > 0),
  add constraint treatment_records_height_positive check (height_cm is null or height_cm > 0),
  add constraint treatment_records_measurements_positive check (
    (bust_cm is null or bust_cm > 0) and
    (waist_cm is null or waist_cm > 0) and
    (hip_cm is null or hip_cm > 0) and
    (arm_cm is null or arm_cm > 0) and
    (thigh_cm is null or thigh_cm > 0)
  );

comment on column public.treatment_records.weight_kg is 'Peso da paciente em quilogramas, preenchimento opcional.';
comment on column public.treatment_records.body_measurements_notes is 'Observações da evolução corporal.';

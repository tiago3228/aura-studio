-- Catálogo inicial de modelos de anamnese inspirado na estrutura pública de modelos
-- observada no Estetic em 01/10/2026. Não importa dados de pacientes.

create table if not exists public.anamnesis_template_catalog (
  code integer primary key,
  name text not null,
  kind text not null check (kind in ('facial','corporal','geral')),
  questions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

grant select on public.anamnesis_template_catalog to authenticated;
alter table public.anamnesis_template_catalog enable row level security;
drop policy if exists "authenticated users can read anamnesis catalog" on public.anamnesis_template_catalog;
create policy "authenticated users can read anamnesis catalog"
  on public.anamnesis_template_catalog for select to authenticated using (true);

insert into public.anamnesis_template_catalog (code, name, kind, questions)
values
(9, 'Anamnese – Depilação a Laser', 'geral', '[
  {"label":"Doenças existentes","type":"texto"},
  {"label":"Uso de medicamentos contínuos","type":"texto"},
  {"label":"Uso de ácidos, isotretinoína (Roacutan) ou medicamentos fotossensibilizantes","type":"texto"},
  {"label":"Histórico de alergias","type":"texto"},
  {"label":"Gestante ou lactante","type":"sim_nao","required":true},
  {"label":"Diabetes, epilepsia ou problemas hormonais","type":"multipla_escolha","options":["Diabetes","Epilepsia","Problemas hormonais"]},
  {"label":"Histórico de câncer de pele","type":"texto"},
  {"label":"Herpes ativa, feridas ou infecções na pele","type":"texto"}
]'::jsonb),
(8, 'Anamnese Corporal – Lipo Enzimática, Secagem de Vasinhos e Tratamento de Estrias', 'corporal', '[
  {"label":"Doenças existentes","type":"texto"},
  {"label":"Uso de medicamentos contínuos","type":"texto"},
  {"label":"Uso de anticoagulantes ou anti-inflamatórios","type":"texto"},
  {"label":"Histórico de alergias medicamentosas","type":"texto"},
  {"label":"Gestante ou lactante","type":"sim_nao","required":true},
  {"label":"Diabetes, hipertensão, hipotensão ou problemas cardíacos","type":"multipla_escolha","options":["Diabetes","Hipertensão","Hipotensão","Problemas cardíacos"]}
]'::jsonb),
(7, 'Anamnese Preenchimento, Bioestimulador e Fios de PDO', 'facial', '[
  {"label":"Doenças existentes","type":"texto"},
  {"label":"Uso de medicamentos contínuos","type":"texto"},
  {"label":"Uso de anticoagulantes ou anti-inflamatórios","type":"texto"},
  {"label":"Histórico de alergias medicamentosas","type":"texto"},
  {"label":"Reações anteriores a preenchedores ou anestésicos","type":"texto"},
  {"label":"Doenças autoimunes","type":"multipla_escolha","options":["Diabetes","Epilepsia","Problemas hormonais"]},
  {"label":"Tendência a queloides","type":"texto"},
  {"label":"Herpes ativa ou infecção na pele","type":"texto"},
  {"label":"Gestante ou lactante","type":"sim_nao","required":true}
]'::jsonb),
(6, 'Anamnese Botox', 'facial', '[
  {"label":"Doenças existentes","type":"texto"},
  {"label":"Uso de medicamentos contínuos","type":"texto"},
  {"label":"Uso de anticoagulantes ou anti-inflamatórios","type":"texto"},
  {"label":"Alergia a toxina botulínica ou componentes da fórmula","type":"texto"},
  {"label":"Procedimentos estéticos anteriores","type":"texto"},
  {"label":"Doenças neuromusculares","type":"texto"},
  {"label":"Gestante ou lactante","type":"sim_nao","required":true}
]'::jsonb),
(5, 'Anamnese Limpeza de pele, Microagulhamento e Peelings', 'facial', '[
  {"label":"Doenças existentes","type":"texto"},
  {"label":"Uso de medicamentos contínuos","type":"texto"},
  {"label":"Uso de ácidos, isotretinoína (Roacutan) ou medicamentos fotossensibilizantes","type":"texto"},
  {"label":"Histórico de alergias","type":"texto"},
  {"label":"Gestante ou lactante","type":"sim_nao","required":true},
  {"label":"Herpes ativa, feridas ou infecções na pele","type":"texto"},
  {"label":"Exposição solar recente","type":"sim_nao"}
]'::jsonb)
on conflict (code) do update set name = excluded.name, kind = excluded.kind, questions = excluded.questions;

comment on table public.anamnesis_template_catalog is 'Catálogo global de modelos iniciais; cada clínica copia o modelo para anamnesis_templates e anamnesis_questions.';

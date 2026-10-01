-- Pergunta complementar automática para respostas Sim/Não.
-- Exemplo: "Uso de medicamentos contínuos?" -> "Quais? / Justifique?"
-- O texto pode ser ajustado no editor do modelo, mas todos os Sim/Não já
-- nascem com um complemento padrão.

alter table public.anamnesis_questions
  add column if not exists follow_up_label text not null default 'Quais? / Justifique?';

comment on column public.anamnesis_questions.follow_up_label is
  'Pergunta exibida quando a resposta da pergunta Sim/Não for Sim. Aplicável somente a perguntas type=sim_nao.';

-- Normaliza registros antigos e evita complementos vazios em perguntas Sim/Não.
update public.anamnesis_questions
set follow_up_label = 'Quais? / Justifique?'
where type = 'sim_nao'
  and nullif(trim(follow_up_label), '') is null;

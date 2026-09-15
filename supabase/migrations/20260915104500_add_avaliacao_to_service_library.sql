-- Adiciona Avaliação à biblioteca global de procedimentos.
-- O preço será definido pela clínica ao importar o item.
INSERT INTO public.service_library (category, name, duration_min, position)
VALUES ('Avaliação', 'Avaliação', 30, 1)
ON CONFLICT (category, name) DO NOTHING;

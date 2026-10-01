import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const questionSchema = z.object({
  label: z.string().trim().min(3).max(240),
  type: z.enum([
    "texto",
    "texto_longo",
    "sim_nao",
    "multipla_escolha",
    "selecao",
    "data",
    "numero",
  ]),
  options: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  required: z.boolean().default(false),
});

const resultSchema = z.object({
  name: z.string().trim().min(3).max(120),
  kind: z.enum(["facial", "corporal", "geral"]),
  questions: z.array(questionSchema).min(5).max(20),
});

export const generateAnamnesisModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ procedure: z.string().trim().min(3).max(160) }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A IA ainda não está configurada neste ambiente.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Você é uma assistente de uma clínica de estética brasileira. Gere um RASCUNHO de modelo de anamnese para revisão de uma profissional habilitada. Não faça diagnóstico, não prescreva tratamento e não prometa segurança clínica. Retorne somente JSON válido no formato {"name": string, "kind": "facial"|"corporal"|"geral", "questions": [{"label": string, "type": "texto"|"texto_longo"|"sim_nao"|"multipla_escolha"|"selecao"|"data"|"numero", "options": string[], "required": boolean}]}. Crie de 8 a 14 perguntas pertinentes ao procedimento, cobrindo identificação da queixa, histórico de saúde, alergias, medicamentos, contraindicações relevantes, gestação quando aplicável, expectativas, cuidados prévios e orientações/consentimento. Use linguagem clara para o cliente. Marque como obrigatórias apenas perguntas essenciais. Para perguntas de múltipla escolha ou seleção, forneça opções. O resultado sempre precisa ser revisado e adaptado pela clínica antes de uso.`,
          },
          { role: "user", content: `Procedimento informado pela proprietária: ${data.procedure}` },
        ],
      }),
    });
    if (response.status === 429)
      throw new Error(
        "A IA está recebendo muitas solicitações. Aguarde alguns segundos e tente novamente.",
      );
    if (response.status === 402)
      throw new Error("Os créditos de IA do espaço de trabalho acabaram.");
    if (!response.ok) {
      console.error("Anamnesis AI gateway error", response.status);
      throw new Error("Não foi possível gerar o modelo agora. Tente novamente.");
    }
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/\s*```$/, ""));
    } catch {
      throw new Error("A IA retornou um modelo em formato inválido. Tente novamente.");
    }
    return resultSchema.parse(parsed);
  });

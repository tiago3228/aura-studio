import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  idea: z.string().max(2000).optional(),
  objective: z.string().min(2),
  days: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(14)]),
  postsPerDay: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  formats: z.array(z.enum(["feed", "story", "reel", "carrossel"])).max(4),
  sources: z.object({
    idea: z.boolean(),
    instagram: z.boolean(),
    aura: z.boolean(),
    agenda: z.boolean(),
    crm: z.boolean(),
  }),
});

export const generateMarketingStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const membership = await context.supabase
      .from("organization_members")
      .select("organization_id, organizations(name)")
      .eq("user_id", context.userId)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (!membership.data) throw new Error("Clínica não encontrada.");
    const { data: services } = data.sources.aura
      ? await context.supabase
          .from("services")
          .select("name,description,price")
          .eq("active", true)
          .limit(40)
      : { data: [] };
    const { data: settings } = await context.supabase
      .from("ai_marketing_settings")
      .select("voice_tone,audience,preferred_cta,brand_rules")
      .eq("organization_id", membership.data.organization_id)
      .maybeSingle();
    const total = data.days * data.postsPerDay;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A geração de IA ainda não está configurada neste ambiente.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você cria estratégias de marketing para clínicas de estética. Nunca invente preços, promoções, profissionais, horários, endereço, telefone, certificações ou resultados garantidos. Use somente dados fornecidos; quando faltarem, omita. Não use dados pessoais de clientes. Responda exclusivamente JSON com campaignName e posts, onde posts é uma lista com title, theme, format, artworkText, caption, cta, hashtags, storySuggestion, reelSuggestion.",
          },
          {
            role: "user",
            content: JSON.stringify({
              clinic: membership.data.organizations?.name,
              idea: data.idea ?? "",
              objective: data.objective,
              days: data.days,
              postsPerDay: data.postsPerDay,
              formats: data.formats.length ? data.formats : ["feed", "story", "reel", "carrossel"],
              selectedSources: data.sources,
              allowedServices: services ?? [],
              settings,
            }),
          },
        ],
      }),
    });
    if (!response.ok) throw new Error("Não foi possível gerar a estratégia agora.");
    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    try {
      const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
      return {
        ...parsed,
        posts: (parsed.posts ?? []).slice(0, total),
        organizationId: membership.data.organization_id,
        model: "google/gemini-3.5-flash",
      };
    } catch {
      throw new Error("A IA retornou um formato inválido. Tente novamente.");
    }
  });

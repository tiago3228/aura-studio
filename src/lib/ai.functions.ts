import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  question: z.string().min(2).max(1000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(12)
    .optional(),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const membership = await supabase
      .from("organization_members")
      .select("organization_id, organizations(name)")
      .eq("user_id", context.userId)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (!membership.data) return { answer: "Não encontrei uma clínica vinculada à sua conta." };

    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const [appointments, sales, clients, products, commissions, services] = await Promise.all([
      supabase
        .from("appointments")
        .select("starts_at, status, price, services(name), professionals(name)")
        .gte("starts_at", since)
        .limit(400),
      supabase.from("sales").select("total, cost, created_at").gte("created_at", since).limit(400),
      supabase.from("clients").select("name, created_at, birth_date").is("deleted_at", null).limit(400),
      supabase.from("products").select("name, stock, min_stock, cost_price").limit(200),
      supabase.from("commission_entries").select("net, paid, professionals(name)").limit(300),
      supabase.from("services").select("name, price, duration_min").limit(200),
    ]);

    const snapshot = {
      clinica: membership.data.organizations?.name,
      hoje: new Date().toISOString().slice(0, 10),
      agendamentos_90d: appointments.data?.length ?? 0,
      agendamentos: (appointments.data ?? []).slice(0, 120).map((a) => ({
        data: a.starts_at.slice(0, 10),
        status: a.status,
        valor: Number(a.price),
        servico: a.services?.name,
        profissional: a.professionals?.name,
      })),
      receita_90d: (sales.data ?? []).reduce((acc, s) => acc + Number(s.total), 0),
      custo_90d: (sales.data ?? []).reduce((acc, s) => acc + Number(s.cost), 0),
      clientes_total: clients.data?.length ?? 0,
      produtos_abaixo_minimo: (products.data ?? [])
        .filter((p) => Number(p.stock) <= Number(p.min_stock))
        .map((p) => p.name),
      comissoes_em_aberto: (commissions.data ?? [])
        .filter((c) => !c.paid)
        .reduce((acc, c) => acc + Number(c.net), 0),
      servicos: (services.data ?? []).map((s) => ({ nome: s.name, preco: Number(s.price) })),
    };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { answer: "O assistente de IA não está configurado no momento." };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você é a consultora de gestão de uma clínica de estética brasileira. Responda em português do Brasil, de forma objetiva e prática, sempre baseada nos dados fornecidos em JSON. Use valores em reais, cite números concretos e finalize com uma recomendação acionável curta. Se o dado não existir no JSON, diga que ainda não há registro suficiente.",
          },
          { role: "system", content: `Dados da clínica: ${JSON.stringify(snapshot)}` },
          ...(data.history ?? []),
          { role: "user", content: data.question },
        ],
      }),
    });

    if (response.status === 429)
      return { answer: "Muitas perguntas em sequência. Aguarde alguns segundos e tente novamente." };
    if (response.status === 402)
      return { answer: "Os créditos de IA do espaço de trabalho acabaram. Recarregue para continuar." };
    if (!response.ok) {
      console.error("AI gateway error", response.status, await response.text());
      return { answer: "Não consegui consultar a IA agora. Tente novamente em instantes." };
    }

    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return { answer: json.choices?.[0]?.message?.content ?? "Sem resposta." };
  });

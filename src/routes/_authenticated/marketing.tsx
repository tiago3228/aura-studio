/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateMarketingStrategy } from "@/lib/marketing.functions";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { PageHeader, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/marketing")({
  head: () => ({ meta: [{ title: "Aura IA Marketing" }] }),
  component: MarketingPage,
});
const objectives = [
  "Atrair novos clientes",
  "Divulgar procedimento",
  "Divulgar pacote",
  "Preencher horários vazios",
  "Aumentar agendamentos",
  "Gerar contatos no WhatsApp",
  "Reativar clientes",
  "Conteúdo educativo",
  "Campanha promocional",
  "Deixar a IA decidir",
];
const formatOptions = ["feed", "story", "reel", "carrossel"] as const;

function MarketingPage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [idea, setIdea] = useState("");
  const [objective, setObjective] = useState(objectives[0]);
  const [days, setDays] = useState<3 | 5 | 7 | 14>(7);
  const [postsPerDay, setPostsPerDay] = useState<1 | 2 | 3>(1);
  const [formats, setFormats] = useState<string[]>(["feed", "story"]);
  const [sources, setSources] = useState({
    idea: true,
    instagram: false,
    aura: true,
    agenda: true,
    crm: true,
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const campaigns = useQuery({
    enabled: !!orgId,
    queryKey: ["ai-campaigns", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ai_marketing_campaigns")
        .select("id,name,objective,status,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
  async function generate() {
    setGenerating(true);
    try {
      const result = await generateMarketingStrategy({
        data: {
          idea: idea || undefined,
          objective,
          days,
          postsPerDay,
          formats: formats as any,
          sources,
        },
      });
      setGenerated(result);
      toast.success("Estratégia criada. Revise antes de aprovar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar conteúdo.");
    } finally {
      setGenerating(false);
    }
  }
  async function saveCampaign() {
    if (!generated || !orgId) return;
    const { data: campaign, error } = await (supabase as any)
      .from("ai_marketing_campaigns")
      .insert({
        organization_id: orgId,
        name: generated.campaignName || "Campanha criada com IA",
        objective,
        days,
        posts_per_day: postsPerDay,
        formats,
        status: "rascunho",
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const posts = (generated.posts ?? []).map((post: any, index: number) => ({
      organization_id: orgId,
      campaign_id: campaign.id,
      title: post.title || `Conteúdo ${index + 1}`,
      theme: post.theme || null,
      format: formatOptions.includes(post.format) ? post.format : "feed",
      artwork_text: post.artworkText || null,
      caption: post.caption || null,
      cta: post.cta || null,
      hashtags: post.hashtags || null,
      story_suggestion: post.storySuggestion || null,
      reel_suggestion: post.reelSuggestion || null,
      status: "gerado",
      source_snapshot: { idea, objective, sources },
    }));
    const { error: postsError } = await (supabase as any).from("ai_marketing_posts").insert(posts);
    if (postsError) {
      toast.error(postsError.message);
      return;
    }
    toast.success("Campanha salva como rascunho.");
    setGenerated(null);
    void queryClient.invalidateQueries({ queryKey: ["ai-campaigns", orgId] });
    return;
  }
  function toggleSource(key: keyof typeof sources) {
    setSources((current) => ({ ...current, [key]: !current[key] }));
  }
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Aura IA · Marketing"
        subtitle="Crie estratégias e conteúdos com fontes opcionais, revisão humana e aprovação antes da publicação."
        actions={
          <Button
            onClick={() =>
              document.getElementById("criador")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Sparkles className="size-4" /> Criar conteúdo com IA
          </Button>
        }
      />
      <div className="mb-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
        <strong>Automação preservada:</strong> use agenda e CRM como fontes opcionais para campanhas
        de horários vagos, reativação e retornos pendentes. O Aura nunca publica sem aprovação.
      </div>
      <Tabs defaultValue="marketing">
        <TabsList>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="marketing" className="mt-5">
          <div id="criador" className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="surface space-y-5 p-5">
              <div>
                <h2 className="font-display text-xl font-semibold">Criar conteúdo com IA</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nenhuma fonte é obrigatória. Você pode começar apenas com uma ideia — ou deixar a
                  IA decidir.
                </p>
              </div>
              <div className="space-y-2">
                <Label>
                  O que você gostaria de divulgar?{" "}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Ex.: Quero divulgar limpeza de pele e preencher horários disponíveis desta semana."
                  rows={4}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Objetivo da campanha</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                  >
                    {objectives.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value) as typeof days)}
                  >
                    {[3, 5, 7, 14].map((item) => (
                      <option value={item} key={item}>
                        {item} dias
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Posts por dia (máximo 3)</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(Number(e.target.value) as typeof postsPerDay)}
                  >
                    {[1, 2, 3].map((item) => (
                      <option value={item} key={item}>
                        {item} post{item > 1 ? "s" : ""}/dia
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Formatos</Label>
                  <div className="flex flex-wrap gap-2">
                    {formatOptions.map((format) => (
                      <button
                        type="button"
                        key={format}
                        onClick={() =>
                          setFormats((current) =>
                            current.includes(format)
                              ? current.filter((item) => item !== format)
                              : [...current, format],
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs capitalize ${formats.includes(format) ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground"}`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={generate} disabled={generating}>
                {generating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}{" "}
                Criar estratégia com IA
              </Button>
            </section>
            <aside className="surface h-fit space-y-4 p-5">
              <div>
                <h3 className="font-semibold">Fontes utilizadas pela IA</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ative somente o que deseja compartilhar.
                </p>
              </div>
              {(
                [
                  ["idea", "Minha ideia"],
                  ["instagram", "Instagram (quando conectado)"],
                  ["aura", "Dados do Aura"],
                  ["agenda", "Agenda"],
                  ["crm", "CRM"],
                ] as const
              ).map(([key, label]) => (
                <label className="flex items-center gap-3 text-sm" key={key}>
                  <Checkbox checked={sources[key]} onCheckedChange={() => toggleSource(key)} />
                  {label}
                </label>
              ))}
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                A integração oficial do Instagram será adicionada somente com OAuth/API autorizada.
                Nenhum scraping será usado.
              </p>
            </aside>
          </div>
          {generated ? <GeneratedPreview generated={generated} onSave={saveCampaign} /> : null}
        </TabsContent>
        <TabsContent value="campanhas" className="mt-5">
          <div className="surface divide-y divide-border p-2">
            {campaigns.data?.map((campaign: any) => (
              <div className="flex items-center gap-3 p-4" key={campaign.id}>
                <div className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary">
                  <CalendarDays className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {campaign.objective} ·{" "}
                    {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Pill>{campaign.status}</Pill>
              </div>
            ))}
            {!campaigns.data?.length ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Nenhuma campanha criada ainda.
              </p>
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="configuracoes" className="mt-5">
          <div className="surface max-w-2xl space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold">Identidade de conteúdo</h2>
            <p className="text-sm text-muted-foreground">
              A próxima etapa permitirá salvar tom de voz, público, temas preferidos, regras da
              marca e CTA padrão da clínica.
            </p>
            <Input placeholder="Tom de voz: profissional, elegante, educativo..." />
            <Textarea placeholder="Regras da marca e assuntos que não deseja abordar" rows={4} />
            <Button variant="outline" disabled>
              Salvar identidade (próxima etapa)
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function GeneratedPreview({ generated, onSave }: { generated: any; onSave: () => void }) {
  return (
    <section className="surface mt-5 space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {generated.campaignName || "Estratégia gerada"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Revise os conteúdos. Eles ainda não estão aprovados nem publicados.
          </p>
        </div>
        <Button onClick={onSave}>
          <CheckCircle2 className="size-4" /> Salvar como rascunho
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(generated.posts ?? []).map((post: any, index: number) => (
          <article className="rounded-lg border border-border p-4" key={`${post.title}-${index}`}>
            <div className="mb-2 flex items-center justify-between">
              <Pill>{post.format || "feed"}</Pill>
              <span className="text-xs text-muted-foreground">Post {index + 1}</span>
            </div>
            <h3 className="font-semibold">{post.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{post.theme}</p>
            <p className="mt-3 text-sm whitespace-pre-wrap">{post.caption}</p>
            {post.cta ? (
              <p className="mt-3 text-xs font-medium text-primary">CTA: {post.cta}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

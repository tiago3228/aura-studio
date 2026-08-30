import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Bot } from "lucide-react";
import { toast } from "sonner";

import { askAssistant } from "@/lib/ai.functions";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente de IA — Aura Clínicas" },
      { name: "description", content: "Pergunte sobre faturamento, ocupação da agenda e retenção de clientes." },
      { property: "og:title", content: "Assistente de IA — Aura Clínicas" },
      { property: "og:description", content: "Análises da sua clínica em linguagem natural." },
    ],
  }),
  component: Assistente,
});

const SUGGESTIONS = [
  "Qual foi meu faturamento nos últimos 30 dias?",
  "Quais procedimentos mais geram receita?",
  "Quais clientes não retornam há mais de 60 dias?",
  "Como está minha taxa de faltas?",
];

type Message = { role: "user" | "assistant"; content: string };

function Assistente() {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    const history = messages.slice(-8);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const result = await ask({ data: { question, history } });
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao consultar o assistente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        title="Assistente de IA"
        subtitle="Ele lê os dados da sua clínica — agenda, vendas, estoque e comissões — para responder."
      />

      <div className="surface min-h-[45vh] space-y-4 p-5">
        {messages.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto grid size-11 place-items-center rounded-full bg-primary-soft">
              <Bot className="size-5 text-primary" />
            </div>
            <p className="mt-3 font-display text-sm font-semibold">Como posso ajudar hoje?</p>
            <div className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                  : "mr-auto max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap"
              }
            >
              {m.content}
            </div>
          ))
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Analisando os dados da clínica…
          </div>
        ) : null}
      </div>

      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="Pergunte sobre faturamento, agenda, estoque…"
          className="resize-none"
        />
        <Button type="submit" size="icon" disabled={loading} aria-label="Enviar">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}

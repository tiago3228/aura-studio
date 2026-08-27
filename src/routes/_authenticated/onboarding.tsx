import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    description: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");

      const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({
          name: form.name,
          phone: form.phone || null,
          city: form.city || null,
          description: form.description || null,
          booking_slug: slug,
          onboarding_done: true,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: memberError } = await supabase.from("organization_members").insert({
        organization_id: org.id,
        user_id: auth.user.id,
        role: "owner",
      });
      if (memberError) throw memberError;

      await queryClient.invalidateQueries({ queryKey: ["membership"] });
      toast.success("Clínica criada! Bem-vinda ao Aura.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a clínica.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-16">
      <p className="text-xs font-semibold tracking-widest text-primary uppercase">Primeiro passo</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-balance">Vamos criar sua clínica</h1>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">
        Essas informações aparecem na sua página de agendamento online e nos recibos.
      </p>

      <form onSubmit={create} className="surface mt-8 space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Nome da clínica</Label>
          <Input id="org-name" value={form.name} onChange={set("name")} placeholder="Espaço Serene" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-phone">WhatsApp</Label>
            <Input id="org-phone" value={form.phone} onChange={set("phone")} placeholder="(11) 99999-0000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-city">Cidade</Label>
            <Input id="org-city" value={form.city} onChange={set("city")} placeholder="São Paulo" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-desc">Descrição curta</Label>
          <Textarea
            id="org-desc"
            value={form.description}
            onChange={set("description")}
            placeholder="Estética avançada, harmonização e cuidados com a pele."
            rows={3}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Criar clínica
        </Button>
      </form>
    </main>
  );
}

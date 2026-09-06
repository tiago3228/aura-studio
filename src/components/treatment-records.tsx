import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { dateFmt, timeFmt } from "@/lib/format";
import { EmptyState, Pill, SkeletonCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Photo = { path: string; label?: string | null };

const localInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function TreatmentRecords({ clientId }: { clientId: string }) {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    enabled: !!membership,
    queryKey: ["treatment-records", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_records")
        .select("*, professionals(name), services(name)")
        .eq("client_id", clientId)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("treatment_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido.");
      queryClient.invalidateQueries({ queryKey: ["treatment-records", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="size-4" /> Novo registro
          </Button>
        </DialogTrigger>
        <RecordDialog
          clientId={clientId}
          onDone={() => {
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ["treatment-records", clientId] });
          }}
        />
      </Dialog>

      {query.isLoading ? <SkeletonCard /> : null}

      {!query.isLoading && (query.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Prontuário vazio"
          description="Registre cada atendimento: procedimento, produtos utilizados, evolução e fotos de antes e depois."
        />
      ) : null}

      {(query.data ?? []).map((rec) => (
        <article key={rec.id} className="surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex-1 text-sm font-semibold">{rec.procedure}</p>
            <Pill tone="primary">
              {dateFmt(rec.performed_at)} · {timeFmt(rec.performed_at)}
            </Pill>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir registro"
              onClick={() => remove.mutate(rec.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {rec.professionals?.name ?? "Profissional não informado"}
            {rec.services?.name ? ` · ${rec.services.name}` : ""}
          </p>
          <dl className="mt-3 space-y-1.5 text-xs">
            <Field label="Produtos" value={rec.products_used} />
            <Field label="Parâmetros" value={rec.parameters} />
            <Field label="Evolução" value={rec.evolution} />
            <Field label="Próximos passos" value={rec.next_steps} />
          </dl>
          <PhotoGrid photos={(rec.photos as unknown as Photo[]) ?? []} />
        </article>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex-1 text-pretty">{value}</dd>
    </div>
  );
}

function PhotoGrid({ photos }: { photos: Photo[] }) {
  const paths = photos.map((p) => p.path);
  const { data } = useQuery({
    enabled: paths.length > 0,
    queryKey: ["record-photos", paths],
    staleTime: 45 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("clinic-files")
        .createSignedUrls(paths, 3600);
      if (error) throw error;
      return data;
    },
  });
  if (photos.length === 0) return null;
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {(data ?? []).map((item, i) =>
        item.signedUrl ? (
          <a key={item.path ?? i} href={item.signedUrl} target="_blank" rel="noreferrer">
            <img
              src={item.signedUrl}
              alt={photos[i]?.label ?? "Foto do atendimento"}
              loading="lazy"
              className="aspect-square w-full rounded-lg object-cover"
            />
          </a>
        ) : null,
      )}
    </div>
  );
}

function RecordDialog({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const { data: membership } = useMembership();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    performed_at: localInput(new Date()),
    procedure: "",
    professional_id: "",
    service_id: "",
    products_used: "",
    parameters: "",
    evolution: "",
    next_steps: "",
  });

  const options = useQuery({
    enabled: !!membership,
    queryKey: ["record-options"],
    queryFn: async () => {
      const [pros, services] = await Promise.all([
        supabase.from("professionals").select("id, name").eq("active", true).order("name"),
        supabase.from("services").select("id, name").eq("active", true).order("name"),
      ]);
      return { pros: pros.data ?? [], services: services.data ?? [] };
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    if (!form.procedure.trim()) {
      toast.error("Informe o procedimento realizado.");
      return;
    }
    setSaving(true);
    try {
      const orgId = membership.organization.id;
      const photos: Photo[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${orgId}/prontuario/${clientId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("clinic-files").upload(path, file, {
          contentType: file.type || "image/jpeg",
        });
        if (error) throw error;
        photos.push({ path, label: file.name });
      }

      const { error } = await supabase.from("treatment_records").insert({
        organization_id: orgId,
        client_id: clientId,
        performed_at: new Date(form.performed_at).toISOString(),
        procedure: form.procedure.trim(),
        professional_id: form.professional_id || null,
        service_id: form.service_id || null,
        products_used: form.products_used || null,
        parameters: form.parameters || null,
        evolution: form.evolution || null,
        next_steps: form.next_steps || null,
        photos: photos as unknown as never,
        created_by: membership.userId,
      });
      if (error) throw error;
      toast.success("Registro salvo no prontuário.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Registro de atendimento</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="performed_at">Data e hora</Label>
            <Input
              id="performed_at"
              type="datetime-local"
              value={form.performed_at}
              onChange={(e) => setForm({ ...form, performed_at: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="procedure">Procedimento realizado</Label>
            <Input
              id="procedure"
              value={form.procedure}
              onChange={(e) => setForm({ ...form, procedure: e.target.value })}
              placeholder="Ex.: Limpeza de pele profunda"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Profissional</Label>
            <Select
              value={form.professional_id}
              onValueChange={(v) => setForm({ ...form, professional_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {(options.data?.pros ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Procedimento do catálogo</Label>
            <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {(options.data?.services ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="products_used">Produtos utilizados</Label>
          <Textarea
            id="products_used"
            rows={2}
            value={form.products_used}
            onChange={(e) => setForm({ ...form, products_used: e.target.value })}
            placeholder="Ex.: ácido mandélico 10%, máscara calmante"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parameters">Parâmetros / equipamento</Label>
          <Input
            id="parameters"
            value={form.parameters}
            onChange={(e) => setForm({ ...form, parameters: e.target.value })}
            placeholder="Ex.: radiofrequência 42°C, 3 passadas"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="evolution">Evolução do cliente</Label>
          <Textarea
            id="evolution"
            rows={3}
            value={form.evolution}
            onChange={(e) => setForm({ ...form, evolution: e.target.value })}
            placeholder="Reação da pele, sensibilidade, resultado observado"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="next_steps">Próximos passos</Label>
          <Input
            id="next_steps"
            value={form.next_steps}
            onChange={(e) => setForm({ ...form, next_steps: e.target.value })}
            placeholder="Ex.: retorno em 21 dias, usar protetor solar"
          />
        </div>

        <div className="space-y-2">
          <Label>Fotos (antes e depois)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Camera className="size-4" /> Adicionar fotos
          </Button>
          {files.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="relative">
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remover foto"
                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar registro
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

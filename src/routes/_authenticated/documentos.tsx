import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useMembership, hasPermission } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Guarda Documentação — Aura Clínicas" },
      {
        name: "description",
        content: "Arquivos privados organizados por tipo para a sua clínica.",
      },
    ],
  }),
  component: Documentos,
});

type Category = "pdf" | "planilhas" | "documentos";
type DocumentRow = {
  id: string;
  category: Category;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

const CATEGORIES: Array<{
  id: Category;
  label: string;
  description: string;
  accept: string;
  icon: typeof FileText;
  extensions: string[];
  mimes: string[];
}> = [
  {
    id: "pdf",
    label: "PDF",
    description: "Contratos, laudos e relatórios em PDF.",
    accept: ".pdf,application/pdf",
    icon: FileText,
    extensions: ["pdf"],
    mimes: ["application/pdf"],
  },
  {
    id: "planilhas",
    label: "Planilhas",
    description: "Arquivos Excel, CSV e OpenDocument.",
    accept: ".xls,.xlsx,.csv,.ods",
    icon: FileSpreadsheet,
    extensions: ["xls", "xlsx", "csv", "ods"],
    mimes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/vnd.oasis.opendocument.spreadsheet",
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    description: "Arquivos Word DOC, DOCX e OpenDocument.",
    accept: ".doc,.docx,.odt",
    icon: FileText,
    extensions: ["doc", "docx", "odt"],
    mimes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.oasis.opendocument.text",
    ],
  },
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

function Documentos() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const organizationId = membership?.organization.id;
  const canManage = hasPermission(membership, "documentos.editar");
  const [category, setCategory] = useState<Category>("pdf");
  const inputRef = useRef<HTMLInputElement>(null);
  const currentCategory = CATEGORIES.find((item) => item.id === category)!;

  const documentsQuery = useQuery({
    enabled: Boolean(organizationId),
    queryKey: ["organization-documents", organizationId, category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_documents")
        .select("id, category, file_name, storage_path, mime_type, file_size, created_at")
        .eq("organization_id", organizationId!)
        .eq("category", category)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!organizationId || !membership?.userId)
        throw new Error("Sessão da clínica indisponível.");
      if (file.size <= 0 || file.size > 25 * 1024 * 1024) {
        throw new Error("O arquivo deve ter entre 1 byte e 25 MB.");
      }
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!currentCategory.extensions.includes(extension)) {
        throw new Error(
          `Esta área aceita somente: ${currentCategory.extensions.map((item) => `.${item}`).join(", ")}.`,
        );
      }
      if (file.type && !currentCategory.mimes.includes(file.type)) {
        throw new Error("O tipo do arquivo não corresponde à categoria selecionada.");
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${organizationId}/documentos/${category}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("clinic-files")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("organization_documents").insert({
        organization_id: organizationId,
        uploaded_by: membership.userId,
        category,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
      });
      if (insertError) {
        await supabase.storage.from("clinic-files").remove([path]);
        throw insertError;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-documents", organizationId, category],
      });
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Arquivo enviado para a guarda de documentação.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o arquivo."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (document: DocumentRow) => {
      const { error: storageError } = await supabase.storage
        .from("clinic-files")
        .remove([document.storage_path]);
      if (storageError) throw storageError;
      const { error } = await supabase
        .from("organization_documents")
        .delete()
        .eq("id", document.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-documents", organizationId, category],
      });
      toast.success("Arquivo excluído.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o arquivo."),
  });

  async function download(document: DocumentRow) {
    const { data, error } = await supabase.storage
      .from("clinic-files")
      .createSignedUrl(document.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível gerar o download.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (documentsQuery.error)
    return <ErrorState message="Não foi possível carregar os documentos." />;
  if (!documentsQuery.data) return <SkeletonCard lines={5} />;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Guarda Documentação"
        subtitle="Armazene arquivos da clínica com acesso privado e organizado por tipo."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {CATEGORIES.map((item) => {
          const Icon = item.icon;
          const active = category === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted/50"}`}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <FolderOpen className="size-4 text-primary" /> Arquivos: {currentCategory.label}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Limite de 25 MB por arquivo ·{" "}
              {currentCategory.extensions.map((item) => `.${item}`).join(", ")}
            </p>
          </div>
          {canManage ? (
            <>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={currentCategory.accept}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                }}
              />
              <Button onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Enviar arquivo
              </Button>
            </>
          ) : null}
        </div>

        {documentsQuery.data.length === 0 ? (
          <EmptyState
            title={`Nenhum arquivo em ${currentCategory.label}`}
            description="Envie o primeiro arquivo desta categoria para começar."
          />
        ) : (
          <div className="divide-y divide-border">
            {documentsQuery.data.map((document) => (
              <div
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{document.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(document.file_size)} · {formatDate(document.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="neutral">{currentCategory.label}</Pill>
                  <Button variant="outline" size="sm" onClick={() => void download(document)}>
                    <Download className="size-4" /> Baixar
                  </Button>
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir ${document.file_name}`}
                      onClick={() => deleteMutation.mutate(document)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

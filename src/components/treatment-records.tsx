import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  FileDown,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import jsPDF from "jspdf";

import { supabase } from "@/integrations/supabase/client";
import { generatePatientProgressSummary } from "@/lib/ai.functions";
import { createPatientPortalLink } from "@/lib/patient-portal.functions";
import { useMembership } from "@/lib/session";
import { dateFmt, timeFmt } from "@/lib/format";
import { resizeImage } from "@/lib/image";
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

type PhotoStage = "antes" | "depois" | "evolucao";
type Photo = { path: string; label?: string | null; stage?: PhotoStage };
type SelectedPhoto = { file: File; stage: PhotoStage };

const PHOTO_STAGE_LABEL: Record<PhotoStage, string> = {
  antes: "Antes",
  depois: "Depois",
  evolucao: "Evolução",
};

const localInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type MeasurementRecord = {
  performed_at: string;
  photos?: Photo[];
  weight_kg: number | null;
  height_cm: number | null;
  bust_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  body_measurements_notes: string | null;
};

function calculateBmi(weight: number | null | undefined, heightCm: number | null | undefined) {
  if (!weight || !heightCm || weight <= 0 || heightCm <= 0) return null;
  return weight / Math.pow(heightCm / 100, 2);
}

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return "abaixo do peso";
  if (bmi < 25) return "faixa adequada";
  if (bmi < 30) return "sobrepeso";
  return "obesidade";
}

export function TreatmentRecords({ clientId }: { clientId: string }) {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const generateSummary = useServerFn(generatePatientProgressSummary);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const createPortalLink = useServerFn(createPatientPortalLink);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalLink, setPortalLink] = useState<string | null>(null);

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
  const clientQuery = useQuery({
    enabled: !!membership,
    queryKey: ["client-contact", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("name, phone, whatsapp")
        .eq("id", clientId)
        .single();
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
  const measurementRecords = ((query.data ?? []) as unknown as MeasurementRecord[]).filter(
    (record) =>
      record.weight_kg ||
      record.bust_cm ||
      record.waist_cm ||
      record.hip_cm ||
      record.arm_cm ||
      record.thigh_cm,
  );
  async function handleSummary() {
    setSummaryLoading(true);
    try {
      const result = await generateSummary({ data: { clientId } });
      setAiSummary(result.answer);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o resumo.");
    } finally {
      setSummaryLoading(false);
    }
  }
  async function handlePortalLink() {
    setPortalLoading(true);
    try {
      const result = await createPortalLink({ data: { clientId } });
      const link = `${window.location.origin}/portal/${result.token}`;
      setPortalLink(link);
      await navigator.clipboard?.writeText(link);
      toast.success("Link do portal criado e copiado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o link.");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="size-4" /> Novo registro
          </Button>
        </DialogTrigger>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handlePortalLink}
          disabled={portalLoading}
        >
          {portalLoading ? "Gerando..." : "Link do portal"}
        </Button>
        <RecordDialog
          clientId={clientId}
          onDone={() => {
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ["treatment-records", clientId] });
          }}
        />
      </Dialog>
      {portalLink ? (
        <div className="surface flex flex-wrap items-center gap-2 p-3 text-xs">
          <span className="font-semibold">Portal da paciente:</span>
          <code className="min-w-0 flex-1 truncate">{portalLink}</code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard?.writeText(portalLink)}
          >
            Copiar
          </Button>
        </div>
      ) : null}

      {query.isLoading ? <SkeletonCard /> : null}

      {measurementRecords.length > 0 ? (
        <MeasurementHistory
          records={measurementRecords}
          organizationId={membership?.organization.id ?? ""}
          onPrint={() => printMeasurementsReport(measurementRecords)}
          onWhatsApp={() =>
            sendMeasurementsWhatsApp(
              measurementRecords,
              clientQuery.data?.whatsapp ?? clientQuery.data?.phone,
            )
          }
          onWhatsAppPdf={() =>
            shareMeasurementsPdf(
              measurementRecords,
              clientQuery.data?.whatsapp ?? clientQuery.data?.phone,
              membership?.organization.id ?? "",
            )
          }
        />
      ) : null}

      {query.data && query.data.length > 0 ? (
        <section className="surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Resumo de progresso com IA</h3>
              <p className="text-xs text-muted-foreground">
                Síntese informativa baseada no histórico registrado.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSummary}
              disabled={summaryLoading}
            >
              {summaryLoading ? "Analisando..." : "Gerar resumo"}
            </Button>
          </div>
          {aiSummary ? (
            <div className="mt-3 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-6">
              {aiSummary}
            </div>
          ) : null}
        </section>
      ) : null}

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
          <BodyMeasurements record={rec} />
          <PhotoGrid photos={(rec.photos as unknown as Photo[]) ?? []} />
        </article>
      ))}
    </div>
  );
}

function MeasurementHistory({
  records,
  organizationId,
  onPrint,
  onWhatsApp,
  onWhatsAppPdf,
}: {
  records: MeasurementRecord[];
  organizationId: string;
  onPrint: () => void;
  onWhatsApp: () => void;
  onWhatsAppPdf: () => void;
}) {
  const [metric, setMetric] = useState<"weight_kg" | "bmi" | "waist_cm" | "hip_cm" | "bust_cm">(
    "weight_kg",
  );
  const chartData = [...records].reverse().map((record) => ({
    date: dateFmt(record.performed_at),
    value: metric === "bmi" ? calculateBmi(record.weight_kg, record.height_cm) : record[metric],
  }));
  const metricLabels = {
    weight_kg: "Peso (kg)",
    bmi: "IMC",
    waist_cm: "Cintura (cm)",
    hip_cm: "Quadril (cm)",
    bust_cm: "Busto (cm)",
  };
  return (
    <section className="surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Histórico de evolução corporal</h3>
          <p className="text-xs text-muted-foreground">
            Acompanhe as medidas registradas nos atendimentos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={metric}
            onChange={(event) => setMetric(event.target.value as typeof metric)}
            aria-label="Métrica do gráfico"
          >
            {Object.entries(metricLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={onPrint}>
            <Printer className="size-4" /> Imprimir / PDF
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onWhatsApp}>
            <MessageCircle className="size-4" /> WhatsApp
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!organizationId}
            onClick={onWhatsAppPdf}
          >
            <FileDown className="size-4" /> Enviar PDF
          </Button>
        </div>
      </div>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={11} width={42} />
            <Tooltip
              formatter={(value) => [
                typeof value === "number" ? value.toFixed(2) : value,
                metricLabels[metric],
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <PhotoHistory records={records} />
    </section>
  );
}

function PhotoHistory({ records }: { records: MeasurementRecord[] }) {
  const photos = records.flatMap((record) =>
    (record.photos ?? []).map((photo) => ({ ...photo, date: record.performed_at })),
  );
  const paths = photos.map((photo) => photo.path);
  const query = useQuery({
    enabled: paths.length > 0,
    queryKey: ["measurement-photo-history", paths],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("clinic-files")
        .createSignedUrls(paths, 3600);
      if (error) throw error;
      return data;
    },
  });
  if (!photos.length) return null;
  return (
    <div className="mt-4 border-t border-border pt-4">
      <h4 className="mb-3 text-sm font-semibold">Histórico fotográfico</h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(query.data ?? []).map((item, index) =>
          item.signedUrl ? (
            <a
              key={item.path ?? index}
              href={item.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-lg border border-border"
            >
              <img
                src={item.signedUrl}
                alt={`${photos[index]?.stage ?? "evolução"} de ${dateFmt(photos[index]?.date ?? "")}`}
                className="aspect-square w-full object-cover transition group-hover:scale-105"
                loading="lazy"
              />
              <span className="absolute inset-x-1 bottom-1 rounded bg-background/90 px-1 py-1 text-center text-[10px] font-semibold">
                {photos[index]?.stage ? PHOTO_STAGE_LABEL[photos[index].stage!] : "Evolução"} ·{" "}
                {dateFmt(photos[index]?.date ?? "")}
              </span>
            </a>
          ) : null,
        )}
      </div>
    </div>
  );
}

function printMeasurementsReport(records: MeasurementRecord[]) {
  const reportWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!reportWindow) {
    toast.error("Permita pop-ups para gerar o relatório.");
    return;
  }
  const rows = [...records]
    .reverse()
    .map((record) => {
      const bmi = calculateBmi(record.weight_kg, record.height_cm);
      return `<tr><td>${dateFmt(record.performed_at)}</td><td>${record.weight_kg ?? "—"}</td><td>${record.height_cm ?? "—"}</td><td>${bmi ? `${bmi.toFixed(2)} (${bmiLabel(bmi)})` : "—"}</td><td>${record.bust_cm ?? "—"}</td><td>${record.waist_cm ?? "—"}</td><td>${record.hip_cm ?? "—"}</td><td>${record.arm_cm ?? "—"}</td><td>${record.thigh_cm ?? "—"}</td></tr>`;
    })
    .join("");
  reportWindow.document.write(
    `<!doctype html><html><head><title>Relatório de evolução corporal</title><style>body{font-family:Arial,sans-serif;color:#17202a;padding:32px}h1{font-size:22px}p{color:#5b6570}table{border-collapse:collapse;width:100%;font-size:11px;margin-top:24px}th,td{border:1px solid #d6dce1;padding:7px;text-align:left}th{background:#f1f4f6}@media print{body{padding:0}}</style></head><body><h1>Relatório de evolução de peso e medidas</h1><p>Gerado em ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Data</th><th>Peso kg</th><th>Altura cm</th><th>IMC</th><th>Busto cm</th><th>Cintura cm</th><th>Quadril cm</th><th>Braço cm</th><th>Coxa cm</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
  );
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 300);
}

function sendMeasurementsWhatsApp(records: MeasurementRecord[], contact?: string | null) {
  const phone = (contact ?? "").replace(/\D/g, "");
  if (!phone) {
    toast.error("A paciente não possui telefone ou WhatsApp cadastrado.");
    return;
  }
  const latest = records[0];
  const bmi = latest ? calculateBmi(latest.weight_kg, latest.height_cm) : null;
  const message = [
    "Olá! Segue o acompanhamento da sua evolução corporal:",
    latest?.weight_kg ? `Peso: ${latest.weight_kg} kg` : null,
    bmi ? `IMC: ${bmi.toFixed(2)} (${bmiLabel(bmi)})` : null,
    latest?.waist_cm ? `Cintura: ${latest.waist_cm} cm` : null,
    latest?.hip_cm ? `Quadril: ${latest.hip_cm} cm` : null,
    "O relatório completo pode ser impresso ou salvo em PDF pela clínica.",
  ]
    .filter(Boolean)
    .join("\n");
  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

async function shareMeasurementsPdf(
  records: MeasurementRecord[],
  contact: string | null | undefined,
  organizationId: string,
) {
  const phone = (contact ?? "").replace(/\D/g, "");
  if (!phone) {
    toast.error("A paciente não possui telefone ou WhatsApp cadastrado.");
    return;
  }
  try {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(18);
    pdf.text("Relatório de evolução de peso e medidas", 14, 16);
    pdf.setFontSize(9);
    pdf.setTextColor(90, 100, 110);
    pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
    pdf.setTextColor(20, 30, 40);
    const headers = [
      "Data",
      "Peso kg",
      "Altura cm",
      "IMC",
      "Busto cm",
      "Cintura cm",
      "Quadril cm",
      "Braço cm",
      "Coxa cm",
    ];
    const columnX = [14, 43, 66, 91, 123, 148, 177, 208, 238];
    pdf.setFillColor(241, 244, 246);
    pdf.rect(12, 28, 270, 8, "F");
    pdf.setFontSize(8);
    headers.forEach((header, index) => pdf.text(header, columnX[index]!, 33));
    [...records].reverse().forEach((record, index) => {
      const y = 43 + index * 8;
      const bmi = calculateBmi(record.weight_kg, record.height_cm);
      const values = [
        dateFmt(record.performed_at),
        record.weight_kg,
        record.height_cm,
        bmi?.toFixed(2),
        record.bust_cm,
        record.waist_cm,
        record.hip_cm,
        record.arm_cm,
        record.thigh_cm,
      ];
      values.forEach((value, valueIndex) =>
        pdf.text(String(value ?? "—"), columnX[valueIndex]!, y),
      );
      if (y > 185) return;
    });
    const blob = pdf.output("blob");
    const path = `${organizationId}/relatorios/${crypto.randomUUID()}-evolucao.pdf`;
    const upload = await supabase.storage
      .from("clinic-files")
      .upload(path, blob, { contentType: "application/pdf", upsert: false });
    if (upload.error) throw upload.error;
    const signed = await supabase.storage
      .from("clinic-files")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signed.error || !signed.data?.signedUrl)
      throw signed.error ?? new Error("Não foi possível gerar o link do PDF.");
    const message = `Olá! Segue seu relatório de evolução corporal em PDF:\n${signed.data.signedUrl}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    toast.success("PDF gerado. O WhatsApp foi aberto com o link seguro do relatório.");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF.");
  }
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

function BodyMeasurements({
  record,
}: {
  record: {
    weight_kg: number | null;
    height_cm: number | null;
    bust_cm: number | null;
    waist_cm: number | null;
    hip_cm: number | null;
    arm_cm: number | null;
    thigh_cm: number | null;
    body_measurements_notes: string | null;
  };
}) {
  const values = [
    ["Peso", record.weight_kg, "kg"],
    ["Altura", record.height_cm, "cm"],
    ["Busto", record.bust_cm, "cm"],
    ["Cintura", record.waist_cm, "cm"],
    ["Quadril", record.hip_cm, "cm"],
    ["Braço", record.arm_cm, "cm"],
    ["Coxa", record.thigh_cm, "cm"],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  const notes = record.body_measurements_notes;
  const bmi = calculateBmi(record.weight_kg, record.height_cm);
  if (!values.length && !notes) return null;
  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs">
      <p className="mb-2 font-semibold">Evolução de peso e medidas</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {values.map(([label, value, unit]) => (
          <span key={label}>
            <strong>{label}:</strong> {String(value)} {unit}
          </span>
        ))}
        {bmi ? (
          <span>
            <strong>IMC:</strong> {bmi.toFixed(2)} ({bmiLabel(bmi)})
          </span>
        ) : null}
      </div>
      {notes ? <p className="mt-2 text-muted-foreground">{String(notes)}</p> : null}
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
          <a
            key={item.path ?? i}
            href={item.signedUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative overflow-hidden rounded-lg"
          >
            <img
              src={item.signedUrl}
              alt={`${photos[i]?.stage ? PHOTO_STAGE_LABEL[photos[i].stage] : "Foto"} do atendimento`}
              loading="lazy"
              className="aspect-square w-full rounded-lg object-cover"
            />
            <span className="absolute inset-x-1 bottom-1 rounded bg-background/90 px-1.5 py-1 text-center text-[10px] font-semibold text-foreground">
              {photos[i]?.stage ? PHOTO_STAGE_LABEL[photos[i].stage] : "Evolução"}
            </span>
          </a>
        ) : null,
      )}
    </div>
  );
}

function RecordDialog({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const { data: membership } = useMembership();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [photosToUpload, setPhotosToUpload] = useState<SelectedPhoto[]>([]);
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
    weight_kg: "",
    height_cm: "",
    bust_cm: "",
    waist_cm: "",
    hip_cm: "",
    arm_cm: "",
    thigh_cm: "",
    body_measurements_notes: "",
  });
  const previews = useMemo(
    () => photosToUpload.map(({ file }) => URL.createObjectURL(file)),
    [photosToUpload],
  );

  useEffect(
    () => () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    },
    [previews],
  );

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
      for (const { file, stage } of photosToUpload) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${orgId}/prontuario/${clientId}/${crypto.randomUUID()}.${ext}`;
        const optimized = await resizeImage(file, 1400, 0.84);
        const { error } = await supabase.storage.from("clinic-files").upload(path, optimized, {
          contentType: optimized.type || "image/jpeg",
        });
        if (error) throw error;
        photos.push({ path, label: file.name, stage });
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
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        bust_cm: form.bust_cm ? Number(form.bust_cm) : null,
        waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
        hip_cm: form.hip_cm ? Number(form.hip_cm) : null,
        arm_cm: form.arm_cm ? Number(form.arm_cm) : null,
        thigh_cm: form.thigh_cm ? Number(form.thigh_cm) : null,
        body_measurements_notes: form.body_measurements_notes.trim() || null,
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

  function addPhotos(files: FileList | null) {
    const selected = Array.from(files ?? []).map((file) => ({
      file,
      stage: "evolucao" as const,
    }));
    setPhotosToUpload((current) => [...current, ...selected]);
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
            <Select
              value={form.service_id}
              onValueChange={(v) => setForm({ ...form, service_id: v })}
            >
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

        <fieldset className="space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-semibold">
            Evolução de peso e medidas (opcional)
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["weight_kg", "Peso (kg)"],
                ["height_cm", "Altura (cm)"],
                ["bust_cm", "Busto (cm)"],
                ["waist_cm", "Cintura (cm)"],
                ["hip_cm", "Quadril (cm)"],
                ["arm_cm", "Braço (cm)"],
                ["thigh_cm", "Coxa (cm)"],
              ] as const
            ).map(([id, label]) => (
              <div className="space-y-1.5" key={id}>
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form[id]}
                  onChange={(e) => setForm({ ...form, [id]: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            ))}
          </div>
          {calculateBmi(Number(form.weight_kg), Number(form.height_cm)) ? (
            <p className="rounded-md bg-primary/5 px-3 py-2 text-sm text-primary">
              IMC calculado:{" "}
              {calculateBmi(Number(form.weight_kg), Number(form.height_cm))!.toFixed(2)} —{" "}
              {bmiLabel(calculateBmi(Number(form.weight_kg), Number(form.height_cm))!)}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="body_measurements_notes">Observações das medidas</Label>
            <Textarea
              id="body_measurements_notes"
              rows={2}
              value={form.body_measurements_notes}
              onChange={(e) => setForm({ ...form, body_measurements_notes: e.target.value })}
              placeholder="Ex.: redução de cintura, retenção de líquido..."
            />
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label>Fotos de evolução da sessão</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="size-4" /> Escolher da galeria
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="size-4" /> Tirar foto
            </Button>
          </div>
          {photosToUpload.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photosToUpload.map(({ file, stage }, i) => (
                <div key={`${file.name}-${i}`} className="space-y-1.5">
                  <div className="relative">
                    <img
                      src={previews[i]}
                      alt={file.name}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label="Remover foto"
                      onClick={() =>
                        setPhotosToUpload((current) => current.filter((_, idx) => idx !== i))
                      }
                      className="absolute right-1 top-1 size-7 rounded-full"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <Select
                    value={stage}
                    onValueChange={(value: PhotoStage) =>
                      setPhotosToUpload((current) =>
                        current.map((photo, idx) =>
                          idx === i ? { ...photo, stage: value } : photo,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 text-xs" aria-label={`Classificar ${file.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="antes">Antes</SelectItem>
                      <SelectItem value="depois">Depois</SelectItem>
                      <SelectItem value="evolucao">Evolução</SelectItem>
                    </SelectContent>
                  </Select>
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

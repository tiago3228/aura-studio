import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HeartPulse, Ruler, Scale, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dateFmt } from "@/lib/format";

export const Route = createFileRoute("/portal/$token")({
  head: () => ({ meta: [{ title: "Meu portal de evolução — Aura" }] }),
  component: PatientPortal,
});

type PortalPhoto = { stage?: string; label?: string; url?: string };
type PortalRecord = {
  performed_at: string;
  procedure: string | null;
  evolution: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  bust_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  photos: PortalPhoto[];
};
type PortalData = { client: { name: string } | null; records: PortalRecord[] };

function PatientPortal() {
  const { token } = Route.useParams();
  const portal = useQuery({
    queryKey: ["patient-portal", token],
    queryFn: async () => {
      const result = await (
        supabase as unknown as {
          rpc: (
            name: string,
            args: object,
          ) => Promise<{ data: PortalData | null; error: Error | null }>;
        }
      ).rpc("get_patient_portal", { _token: token });
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const data = portal.data;
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="surface flex items-center gap-3 p-5">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <HeartPulse className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Aura Clínicas
            </p>
            <h1 className="text-2xl font-bold">Meu portal de evolução</h1>
          </div>
        </header>
        {portal.isLoading ? (
          <div className="surface p-6 text-sm text-muted-foreground">
            Carregando seu histórico...
          </div>
        ) : null}
        {portal.isError ? (
          <div className="surface p-6 text-sm text-destructive">
            Este link é inválido, foi revogado ou expirou.
          </div>
        ) : null}
        {data?.client ? (
          <>
            <section className="surface p-5">
              <h2 className="text-lg font-semibold">Olá, {data.client.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aqui você acompanha os registros de evolução compartilhados pela sua clínica.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-600" /> Link individual e somente para
                visualização
              </div>
            </section>
            {data.records.map((record) => (
              <article key={`${record.performed_at}-${record.procedure}`} className="surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{record.procedure || "Atendimento"}</h3>
                  <span className="text-xs text-muted-foreground">
                    {dateFmt(record.performed_at)}
                  </span>
                </div>
                {record.evolution ? (
                  <p className="mt-3 text-sm leading-6">{record.evolution}</p>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Peso", record.weight_kg, "kg"],
                    ["Altura", record.height_cm, "cm"],
                    ["Cintura", record.waist_cm, "cm"],
                    ["Quadril", record.hip_cm, "cm"],
                    ["Busto", record.bust_cm, "cm"],
                    ["Braço", record.arm_cm, "cm"],
                    ["Coxa", record.thigh_cm, "cm"],
                  ]
                    .filter(([, value]) => value !== null)
                    .map(([label, value, unit]) => (
                      <div key={String(label)} className="rounded-md bg-muted/40 p-2">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-semibold">
                          {value} {unit}
                        </p>
                      </div>
                    ))}
                </div>
                {record.photos?.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {record.photos
                      .filter((photo) => photo.url)
                      .map((photo, index) => (
                        <img
                          key={`${photo.url}-${index}`}
                          src={photo.url}
                          alt={photo.label || photo.stage || "Foto de evolução"}
                          className="aspect-square w-full rounded-lg object-cover"
                          loading="lazy"
                        />
                      ))}
                  </div>
                ) : null}
              </article>
            ))}
            {!data.records.length ? (
              <div className="surface p-6 text-sm text-muted-foreground">
                Sua clínica ainda não compartilhou registros de evolução.
              </div>
            ) : null}
          </>
        ) : null}
        <footer className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Scale className="size-3" /> Seus dados são exibidos somente neste link individual.
        </footer>
      </div>
    </main>
  );
}

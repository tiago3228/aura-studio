import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { dateFmt, timeFmt } from "@/lib/format";
import {
  DEFAULT_TEMPLATES,
  MESSAGE_EVENTS,
  fillTemplate,
  whatsappLink,
  type MessageEvent,
} from "@/lib/messages";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LAST_APPOINTMENT = "__last_appointment_until_today__";
const STANDARD_EVENTS = new Set(MESSAGE_EVENTS.map((event) => event.value));

export type MessageAppointmentOption = {
  id: string;
  startsAt: string;
  serviceName: string;
  professionalName: string;
};

export type MessageTarget = {
  appointmentId: string | null;
  clientId: string | null;
  clientName: string;
  phone: string | null;
  serviceName: string;
  professionalName: string;
  startsAt: string | null;
  suggested?: MessageEvent;
  appointmentOptions?: MessageAppointmentOption[];
  allowAppointmentSelection?: boolean;
};

/** Envio manual por WhatsApp; o texto é revisado e o lançamento é registrado antes de abrir o app. */
export function MessageDialog({ target, onDone }: { target: MessageTarget; onDone: () => void }) {
  const { data: membership } = useMembership();
  const organizationId = membership?.organization.id;
  const [event, setEvent] = useState<string>(target.suggested ?? "confirmacao");
  const [body, setBody] = useState("");
  const [appointmentSelection, setAppointmentSelection] = useState(LAST_APPOINTMENT);

  const templates = useQuery({
    queryKey: ["message-templates", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("message_templates")
        .select("event, name, body, active")
        .eq("organization_id", organizationId)
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const appointmentOptions = useMemo(
    () => target.appointmentOptions ?? [],
    [target.appointmentOptions],
  );
  const latestAppointmentUntilToday = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return appointmentOptions
      .filter((appointment) => new Date(appointment.startsAt) <= endOfToday)
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0];
  }, [appointmentOptions]);

  const selectedAppointment = target.allowAppointmentSelection
    ? appointmentSelection === LAST_APPOINTMENT
      ? latestAppointmentUntilToday
      : appointmentOptions.find((appointment) => appointment.id === appointmentSelection)
    : undefined;
  const referenceStartsAt = target.allowAppointmentSelection
    ? (selectedAppointment?.startsAt ?? null)
    : target.startsAt;
  const referenceService = target.allowAppointmentSelection
    ? (selectedAppointment?.serviceName ?? "")
    : target.serviceName;
  const referenceProfessional = target.allowAppointmentSelection
    ? (selectedAppointment?.professionalName ?? "")
    : target.professionalName;

  const vars = useMemo(() => {
    const clinicName = membership?.organization.name ?? "";
    const formattedTime = referenceStartsAt ? timeFmt(referenceStartsAt) : "";
    return {
      cliente: target.clientName,
      data: referenceStartsAt ? dateFmt(referenceStartsAt) : "",
      hora: formattedTime,
      horario: formattedTime,
      horário: formattedTime,
      procedimento: referenceService,
      profissional: referenceProfessional,
      clinica: clinicName,
      clínica: clinicName,
      google_avaliacao:
        (membership?.organization as { google_review_url?: string } | undefined)
          ?.google_review_url ?? "(link não configurado)",
    };
  }, [
    membership?.organization,
    referenceProfessional,
    referenceService,
    referenceStartsAt,
    target.clientName,
  ]);

  const customTemplates = (templates.data ?? [])
    .filter((template) => !STANDARD_EVENTS.has(template.event))
    .sort((a, b) => a.event.localeCompare(b.event, "pt-BR"));

  useEffect(() => {
    const custom = (templates.data ?? []).find((template) => template.event === event)?.body;
    const fallback = DEFAULT_TEMPLATES[event as MessageEvent] ?? "";
    setBody(fillTemplate(custom ?? fallback, vars));
  }, [event, templates.data, vars]);

  async function send() {
    if (!target.phone) {
      toast.error("Este cliente não tem WhatsApp cadastrado.");
      return;
    }
    if (!organizationId || !membership) {
      toast.error("Não foi possível identificar a clínica para registrar o envio.");
      return;
    }

    const appointmentId = target.allowAppointmentSelection
      ? (selectedAppointment?.id ?? null)
      : target.appointmentId;
    const { error } = await supabase.from("message_logs").insert({
      organization_id: organizationId,
      appointment_id: appointmentId,
      client_id: target.clientId,
      client_name: target.clientName,
      kind: event,
      body,
      sent_by: membership.userId,
    });
    if (error) {
      toast.error("Não foi possível registrar a mensagem. O WhatsApp não foi aberto.");
      return;
    }

    window.open(whatsappLink(target.phone, body), "_blank", "noopener,noreferrer");
    onDone();
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Mensagem para {target.clientName}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {target.allowAppointmentSelection ? (
          <div className="space-y-1.5">
            <Label>Agendamento de referência</Label>
            <Select value={appointmentSelection} onValueChange={setAppointmentSelection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LAST_APPOINTMENT}>Último agendamento até hoje</SelectItem>
                {appointmentOptions.map((appointment) => (
                  <SelectItem key={appointment.id} value={appointment.id}>
                    {dateFmt(appointment.startsAt)} {timeFmt(appointment.startsAt)} ·{" "}
                    {appointment.serviceName || "Atendimento"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sem um agendamento específico, os dados do último agendamento até hoje serão usados,
              quando houver.
            </p>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label>Tipo de mensagem</Label>
          <Select value={event} onValueChange={setEvent}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_EVENTS.map((messageEvent) => (
                <SelectItem key={messageEvent.value} value={messageEvent.value}>
                  {messageEvent.label}
                </SelectItem>
              ))}
              {customTemplates.map((template) => (
                <SelectItem key={template.event} value={template.event}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="msg-body">Mensagem</Label>
          <Textarea id="msg-body" rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Você pode revisar e editar o texto. Nada é enviado automaticamente.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={send} disabled={!target.phone}>
          <MessageCircle className="size-4" /> Abrir WhatsApp
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

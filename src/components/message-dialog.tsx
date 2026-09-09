import { useEffect, useState } from "react";
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

export type MessageTarget = {
  appointmentId: string;
  clientId: string | null;
  clientName: string;
  phone: string | null;
  serviceName: string;
  professionalName: string;
  startsAt: string;
  suggested?: MessageEvent;
};

/** Envio manual de mensagem ao cliente pelo WhatsApp, com modelo pré-configurado. */
export function MessageDialog({ target, onDone }: { target: MessageTarget; onDone: () => void }) {
  const { data: membership } = useMembership();
  const [event, setEvent] = useState<MessageEvent>(target.suggested ?? "confirmacao");
  const [body, setBody] = useState("");

  const templates = useQuery({
    queryKey: ["message-templates", membership?.organization.id],
    enabled: !!membership,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("event, body, active")
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const vars = {
    cliente: target.clientName,
    data: dateFmt(target.startsAt),
    hora: timeFmt(target.startsAt),
    procedimento: target.serviceName,
    profissional: target.professionalName,
    clinica: membership?.organization.name ?? "",
  };

  useEffect(() => {
    const custom = (templates.data ?? []).find((t) => t.event === event)?.body;
    setBody(fillTemplate(custom ?? DEFAULT_TEMPLATES[event], vars));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, templates.data]);

  async function send() {
    if (!target.phone) {
      toast.error("Este cliente não tem WhatsApp cadastrado.");
      return;
    }
    if (membership) {
      await supabase.from("message_logs").insert({
        organization_id: membership.organization.id,
        appointment_id: target.appointmentId,
        client_id: target.clientId,
        client_name: target.clientName,
        kind: event,
        body,
        sent_by: membership.userId,
      });
    }
    window.open(whatsappLink(target.phone, body), "_blank", "noopener");
    onDone();
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Mensagem para {target.clientName}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tipo de mensagem</Label>
          <Select value={event} onValueChange={(v) => setEvent(v as MessageEvent)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_EVENTS.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="msg-body">Mensagem</Label>
          <Textarea id="msg-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Você pode editar o texto antes de enviar. Nada é enviado automaticamente.
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

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFinancialIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    locationId: z.string().uuid().nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const args = data.locationId
      ? { _from: data.from, _to: data.to, _location_id: data.locationId }
      : { _from: data.from, _to: data.to };
    const result = await context.supabase.rpc("get_financial_intelligence", args);
    if (result.error) throw new Error("Não foi possível gerar o relatório.");
    return result.data;
  });

export const convertCrmLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ leadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("crm_convert_lead", { _lead_id: data.leadId });
    if (result.error) throw new Error("Não foi possível converter o lead.");
    return result.data;
  });

export const setOrganizationAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    organizationId: z.string().uuid(), enabled: z.boolean(), reason: z.string().max(500).nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const args = data.reason
      ? { _organization_id: data.organizationId, _enabled: data.enabled, _reason: data.reason }
      : { _organization_id: data.organizationId, _enabled: data.enabled };
    const result = await context.supabase.rpc("platform_set_organization_access", args);
    if (result.error) throw new Error("Não foi possível alterar o acesso.");
    return result.data;
  });

export const setPlatformSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    organizationId: z.string().uuid(), status: z.string().min(1).max(40),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("platform_set_subscription", {
      _organization_id: data.organizationId, _status: data.status,
    });
    if (result.error) throw new Error("Não foi possível atualizar a assinatura.");
    return result.data;
  });

export const touchPlatformSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    sessionId: z.string().uuid(), organizationId: z.string().uuid(),
    eventType: z.enum(["entered", "heartbeat", "left"]), userAgent: z.string().max(500),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("platform_touch_session", {
      _session_id: data.sessionId, _organization_id: data.organizationId,
      _event_type: data.eventType, _user_agent: data.userAgent,
    });
    if (result.error) throw new Error("Não foi possível atualizar a sessão.");
    return result.data;
  });
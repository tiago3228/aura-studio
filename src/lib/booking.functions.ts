import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { brInstant, buildSlots, toMinutes, type BusyRange, type SlotConfig } from "@/lib/availability";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getBookingPage = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const org = await supabase
      .from("organizations")
      .select("id, name, description, city, whatsapp, primary_color, online_booking_enabled")
      .eq("booking_slug", data.slug)
      .eq("online_booking_enabled", true)
      .maybeSingle();

    if (!org.data) return { org: null, services: [], professionals: [] };

    const [services, professionals] = await Promise.all([
      supabase
        .from("services")
        .select("id, name, description, duration_min, price, promo_price")
        .eq("organization_id", org.data.id)
        .eq("active", true)
        .eq("online_booking", true)
        .order("name"),
      supabase
        .from("professionals")
        .select("id, name, specialty, booking_horizon_days")
        .eq("organization_id", org.data.id)
        .eq("active", true)
        .eq("online_booking", true)
        .order("name"),
    ]);

    return {
      org: org.data,
      services: services.data ?? [],
      professionals: professionals.data ?? [],
    };
  });

type Ctx = {
  orgId: string;
  cfg: SlotConfig;
  duration: number;
};

async function loadContext(slug: string, professionalId: string, serviceId: string) {
  const supabase = publicClient();
  const org = await supabase
    .from("organizations")
    .select("id")
    .eq("booking_slug", slug)
    .eq("online_booking_enabled", true)
    .maybeSingle();
  if (!org.data) return { error: "Agendamento online indisponível." as const };

  const [pro, service] = await Promise.all([
    supabase
      .from("professionals")
      .select(
        "id, work_days, work_start, work_end, lunch_enabled, lunch_start, lunch_end, slot_minutes, slot_gap_min, booking_horizon_days",
      )
      .eq("id", professionalId)
      .eq("organization_id", org.data.id)
      .eq("active", true)
      .eq("online_booking", true)
      .maybeSingle(),
    supabase
      .from("services")
      .select("duration_min, buffer_min, price, promo_price")
      .eq("id", serviceId)
      .eq("organization_id", org.data.id)
      .eq("online_booking", true)
      .maybeSingle(),
  ]);

  if (!pro.data) return { error: "Profissional indisponível." as const };
  if (!service.data) return { error: "Procedimento indisponível." as const };

  const duration = service.data.duration_min + service.data.buffer_min;

  const ctx: Ctx = {
    orgId: org.data.id,
    duration,
    cfg: {
      workDays: (pro.data.work_days as number[]) ?? [1, 2, 3, 4, 5],
      workStart: pro.data.work_start,
      workEnd: pro.data.work_end,
      lunchEnabled: pro.data.lunch_enabled,
      lunchStart: pro.data.lunch_start,
      lunchEnd: pro.data.lunch_end,
      slotMinutes: pro.data.slot_minutes,
      slotGap: pro.data.slot_gap_min,
      horizonDays: pro.data.booking_horizon_days,
    },
  };
  return { ctx, price: Number(service.data.promo_price ?? service.data.price) };
}

async function busyRanges(orgId: string, professionalId: string, day: string): Promise<BusyRange[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const from = brInstant(day, 0).toISOString();
  const to = brInstant(day, 24 * 60).toISOString();

  const [appts, blocks] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("organization_id", orgId)
      .eq("professional_id", professionalId)
      .not("status", "in", "(cancelado,faltou)")
      .lt("starts_at", to)
      .gt("ends_at", from),
    supabaseAdmin
      .from("calendar_blocks")
      .select("starts_at, ends_at, professional_id")
      .eq("organization_id", orgId)
      .lt("starts_at", to)
      .gt("ends_at", from),
  ]);

  const dayStart = brInstant(day, 0).getTime();
  const toRange = (s: string, e: string): BusyRange => ({
    start: Math.round((new Date(s).getTime() - dayStart) / 60000),
    end: Math.round((new Date(e).getTime() - dayStart) / 60000),
  });

  return [
    ...(appts.data ?? []).map((a) => toRange(a.starts_at, a.ends_at)),
    ...(blocks.data ?? [])
      .filter((b) => !b.professional_id || b.professional_id === professionalId)
      .map((b) => toRange(b.starts_at, b.ends_at)),
  ];
}

export const getAvailableSlots = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        professionalId: z.string().uuid(),
        serviceId: z.string().uuid(),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const loaded = await loadContext(data.slug, data.professionalId, data.serviceId);
    if ("error" in loaded) return { slots: [] as string[], message: loaded.error };
    const { ctx } = loaded;

    const limit = new Date(Date.now() + ctx.cfg.horizonDays * 86400000);
    if (brInstant(data.day, 0).getTime() > limit.getTime())
      return { slots: [], message: `Agenda liberada por ${ctx.cfg.horizonDays} dias.` };

    const busy = await busyRanges(ctx.orgId, data.professionalId, data.day);
    return { slots: buildSlots(data.day, ctx.cfg, ctx.duration, busy), message: null };
  });

export const createPublicBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        serviceId: z.string().uuid(),
        professionalId: z.string().uuid(),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        name: z.string().min(2).max(120),
        phone: z.string().min(8).max(30),
        email: z.string().email().optional().or(z.literal("")),
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const loaded = await loadContext(data.slug, data.professionalId, data.serviceId);
    if ("error" in loaded) return { ok: false as const, message: loaded.error };
    const { ctx, price } = loaded;

    const busy = await busyRanges(ctx.orgId, data.professionalId, data.day);
    const slots = buildSlots(data.day, ctx.cfg, ctx.duration, busy);
    if (!slots.includes(data.time))
      return { ok: false as const, message: "Este horário não está mais disponível." };

    const startMin = toMinutes(data.time);
    const start = brInstant(data.day, startMin);
    const end = brInstant(data.day, startMin + ctx.duration);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("appointments").insert({
      organization_id: ctx.orgId,
      service_id: data.serviceId,
      professional_id: data.professionalId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "agendado",
      source: "online",
      price,
      guest_name: data.name,
      guest_phone: data.phone,
      guest_email: data.email || null,
      notes: data.notes || null,
    });

    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, message: "Solicitação enviada! A clínica confirmará em breve." };
  });

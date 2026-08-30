import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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
        .select("id, name, specialty")
        .eq("organization_id", org.data.id)
        .eq("active", true)
        .order("name"),
    ]);

    return {
      org: org.data,
      services: services.data ?? [],
      professionals: professionals.data ?? [],
    };
  });

export const createPublicBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        serviceId: z.string().uuid(),
        professionalId: z.string().uuid().nullable(),
        startsAt: z.string().min(10),
        name: z.string().min(2).max(120),
        phone: z.string().min(8).max(30),
        email: z.string().email().optional().or(z.literal("")),
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const org = await supabase
      .from("organizations")
      .select("id")
      .eq("booking_slug", data.slug)
      .eq("online_booking_enabled", true)
      .maybeSingle();
    if (!org.data) return { ok: false as const, message: "Agendamento online indisponível." };

    const service = await supabase
      .from("services")
      .select("duration_min, buffer_min, price, promo_price")
      .eq("id", data.serviceId)
      .eq("organization_id", org.data.id)
      .eq("online_booking", true)
      .maybeSingle();
    if (!service.data) return { ok: false as const, message: "Procedimento indisponível." };

    const start = new Date(data.startsAt);
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now())
      return { ok: false as const, message: "Escolha um horário futuro." };
    const end = new Date(start.getTime() + (service.data.duration_min + service.data.buffer_min) * 60000);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("appointments").insert({
      organization_id: org.data.id,
      service_id: data.serviceId,
      professional_id: data.professionalId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "agendado",
      source: "online",
      price: Number(service.data.promo_price ?? service.data.price),
      guest_name: data.name,
      guest_phone: data.phone,
      guest_email: data.email || null,
      notes: data.notes || null,
    });

    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, message: "Solicitação enviada! A clínica confirmará em breve." };
  });

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  brInstant,
  buildSlots,
  toMinutes,
  type BusyRange,
  type SlotConfig,
} from "@/lib/availability";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Converte caminho no bucket privado em URL assinada de longa duração. */
async function signAll(paths: (string | null)[]) {
  const real = paths.filter((p): p is string => !!p && !p.startsWith("http"));
  if (real.length === 0) return new Map<string, string>();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from("clinic-files")
    .createSignedUrls(real, 60 * 60 * 24 * 7);
  const map = new Map<string, string>();
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}

type OfferService = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price: number;
  promo_price: number | null;
  online_booking: boolean;
};

type OfferPackage = {
  id: string;
  name: string;
  description: string | null;
  sessions: number;
  price: number;
  validity_days: number;
  items: { service_id: string; service_name: string; sessions: number }[];
};

/**
 * Catálogo público por profissional.
 * Regra: se o profissional oferece um pacote ativo, os procedimentos contidos
 * nesse pacote deixam de aparecer como avulsos — apenas para esse profissional.
 */
async function loadCatalog(orgId: string) {
  const supabase = publicClient();
  const [services, packages, items, profServices, profPackages] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, duration_min, price, promo_price, online_booking")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("packages")
      .select("id, name, description, sessions, price, validity_days")
      .eq("organization_id", orgId)
      .eq("active", true)
      .eq("online_booking", true)
      .order("name"),
    supabase
      .from("package_items")
      .select("package_id, service_id, sessions")
      .eq("organization_id", orgId),
    supabase
      .from("professional_services")
      .select("professional_id, service_id")
      .eq("organization_id", orgId)
      .eq("active", true),
    supabase
      .from("professional_packages")
      .select("professional_id, package_id")
      .eq("organization_id", orgId)
      .eq("active", true),
  ]);

  const serviceById = new Map((services.data ?? []).map((s) => [s.id, s as OfferService]));
  const itemsByPackage = new Map<
    string,
    { service_id: string; service_name: string; sessions: number }[]
  >();
  for (const it of items.data ?? []) {
    const list = itemsByPackage.get(it.package_id) ?? [];
    list.push({
      service_id: it.service_id,
      service_name: serviceById.get(it.service_id)?.name ?? "Procedimento",
      sessions: it.sessions,
    });
    itemsByPackage.set(it.package_id, list);
  }
  const packageById = new Map(
    (packages.data ?? []).map((p) => [
      p.id,
      { ...p, price: Number(p.price), items: itemsByPackage.get(p.id) ?? [] } as OfferPackage,
    ]),
  );

  const svcByPro = new Map<string, string[]>();
  for (const r of profServices.data ?? [])
    svcByPro.set(r.professional_id, [...(svcByPro.get(r.professional_id) ?? []), r.service_id]);
  const pkgByPro = new Map<string, string[]>();
  for (const r of profPackages.data ?? [])
    pkgByPro.set(r.professional_id, [...(pkgByPro.get(r.professional_id) ?? []), r.package_id]);

  return function offerFor(professionalId: string) {
    const selectedPackages = pkgByPro.get(professionalId);
    const pkgs = (
      selectedPackages
        ? selectedPackages.map((id) => packageById.get(id))
        : [...packageById.values()]
    ).filter((p): p is OfferPackage => !!p);

    const blocked = new Set<string>();
    for (const p of pkgs) for (const it of p.items) blocked.add(it.service_id);

    const selected = svcByPro.get(professionalId);
    const base = selected
      ? selected.map((id) => serviceById.get(id)).filter((s): s is OfferService => !!s)
      : // sem seleção explícita, oferece tudo o que a clínica liberou online
        [...serviceById.values()];

    return {
      services: base.filter((s) => s.online_booking && !blocked.has(s.id)),
      packages: pkgs,
    };
  };
}

export const getBookingPage = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const org = await supabase
      .from("organizations")
      .select(
        "id, name, description, address, city, state, zip, phone, whatsapp, instagram, logo_url, primary_color, secondary_color, online_booking_enabled",
      )
      .eq("booking_slug", data.slug)
      .eq("online_booking_enabled", true)
      .maybeSingle();

    if (!org.data) return { org: null, professionals: [] };

    const [professionals, offerFor] = await Promise.all([
      supabase
        .from("professionals")
        .select("id, name, specialty, bio, certifications, photo_url, booking_horizon_days")
        .eq("organization_id", org.data.id)
        .eq("active", true)
        .eq("online_booking", true)
        .order("name"),
      loadCatalog(org.data.id),
    ]);

    const pros = professionals.data ?? [];
    const signed = await signAll([org.data.logo_url, ...pros.map((p) => p.photo_url)]);
    const resolve = (v: string | null) =>
      v ? (v.startsWith("http") ? v : (signed.get(v) ?? null)) : null;

    return {
      org: { ...org.data, logo_url: resolve(org.data.logo_url) },
      professionals: pros.map((p) => ({
        ...p,
        photo_url: resolve(p.photo_url),
        ...offerFor(p.id),
      })),
    };
  });

type Ctx = {
  orgId: string;
  cfg: SlotConfig;
  duration: number;
  serviceId: string;
  serviceNames: string[];
};

/** Resolve organização, profissional e o procedimento a ser agendado (avulso ou 1ª sessão do pacote). */
async function loadContext(
  slug: string,
  professionalId: string,
  serviceId: string | undefined,
  serviceIds: string[] | undefined,
  packageId: string | undefined,
  packageIds: string[] | undefined,
) {
  const supabase = publicClient();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const org = await supabase
    .from("organizations")
    .select("id")
    .eq("booking_slug", slug)
    .eq("online_booking_enabled", true)
    .maybeSingle();
  if (!org.data) return { error: "Agendamento online indisponível." as const };

  const pro = await supabase
    .from("professionals")
    .select(
      "id, work_days, work_start, work_end, lunch_enabled, lunch_start, lunch_end, slot_minutes, slot_gap_min, booking_horizon_days",
    )
    .eq("id", professionalId)
    .eq("organization_id", org.data.id)
    .eq("active", true)
    .eq("online_booking", true)
    .maybeSingle();
  if (!pro.data) return { error: "Profissional indisponível." as const };

  const offerFor = await loadCatalog(org.data.id);
  const offer = offerFor(professionalId);

  let packages: OfferPackage[] = [];
  let targetServiceIds = serviceIds?.length ? serviceIds : serviceId ? [serviceId] : [];

  const selectedPackageIds = packageIds?.length ? packageIds : packageId ? [packageId] : [];
  if (selectedPackageIds.length) {
    packages = selectedPackageIds
      .map((id) => offer.packages.find((p) => p.id === id))
      .filter((p): p is OfferPackage => !!p && p.items.length > 0);
    if (packages.length !== selectedPackageIds.length) {
      return { error: "Um dos pacotes selecionados está indisponível." as const };
    }
    const packageServiceIds = packages
      .map((p) => p.items[0]?.service_id)
      .filter((id): id is string => !!id);
    targetServiceIds = [...new Set(packageServiceIds)];
  } else if (!targetServiceIds.length) {
    return { error: "Escolha pelo menos um procedimento." as const };
  }

  const uniqueTargetServiceIds = [...new Set(targetServiceIds)];
  let serviceQuery = supabaseAdmin
    .from("services")
    .select("id, name, duration_min, buffer_min, price, promo_price")
    .in("id", uniqueTargetServiceIds)
    .eq("organization_id", org.data.id)
    .eq("active", true);
  if (!packages.length) serviceQuery = serviceQuery.eq("online_booking", true);
  const service = await serviceQuery;
  if (!service.data?.length || service.data.length !== uniqueTargetServiceIds.length) {
    return { error: "Um dos procedimentos selecionados está indisponível." as const };
  }
  const orderedServices = targetServiceIds
    .map((id) => service.data.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item);

  const ctx: Ctx = {
    orgId: org.data.id,
    serviceId: orderedServices[0].id,
    serviceNames: orderedServices.map((item) => item.name),
    duration: orderedServices.reduce((sum, item) => sum + item.duration_min + item.buffer_min, 0),
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
  return {
    ctx,
    packages,
    price: orderedServices.reduce((sum, item) => sum + Number(item.promo_price ?? item.price), 0),
  };
}

async function busyRanges(
  orgId: string,
  professionalId: string,
  day: string,
): Promise<BusyRange[]> {
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
        serviceId: z.string().uuid().optional(),
        serviceIds: z.array(z.string().uuid()).max(20).optional(),
        packageId: z.string().uuid().optional(),
        packageIds: z.array(z.string().uuid()).max(10).optional(),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const loaded = await loadContext(
      data.slug,
      data.professionalId,
      data.serviceId,
      data.serviceIds,
      data.packageId,
      data.packageIds,
    );
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
        serviceId: z.string().uuid().optional(),
        serviceIds: z.array(z.string().uuid()).max(20).optional(),
        packageId: z.string().uuid().optional(),
        packageIds: z.array(z.string().uuid()).max(10).optional(),
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
    const loaded = await loadContext(
      data.slug,
      data.professionalId,
      data.serviceId,
      data.serviceIds,
      data.packageId,
      data.packageIds,
    );
    if ("error" in loaded) return { ok: false as const, message: loaded.error };
    const { ctx, packages, price } = loaded;

    const busy = await busyRanges(ctx.orgId, data.professionalId, data.day);
    const slots = buildSlots(data.day, ctx.cfg, ctx.duration, busy);
    if (!slots.includes(data.time))
      return { ok: false as const, message: "Este horário não está mais disponível." };

    const startMin = toMinutes(data.time);
    const start = brInstant(data.day, startMin);
    const end = brInstant(data.day, startMin + ctx.duration);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let clientId: string | null = null;
    let clientPackageId: string | null = null;
    let notes = data.notes || null;
    let appointmentPrice = price;

    const digits = data.phone.replace(/\D/g, "");
    const existing = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("organization_id", ctx.orgId)
      .or(`phone.eq.${digits},whatsapp.eq.${digits}`)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing.data) clientId = existing.data.id;
    else {
      const created = await supabaseAdmin
        .from("clients")
        .insert({
          organization_id: ctx.orgId,
          name: data.name,
          phone: digits,
          whatsapp: digits,
          email: data.email || null,
          origin: "agendamento online",
        })
        .select("id")
        .single();
      if (created.error) return { ok: false as const, message: created.error.message };
      clientId = created.data?.id ?? null;
    }

    if (!clientId) return { ok: false as const, message: "Não foi possível cadastrar o cliente." };

    if (packages.length) {
      const createdPackageIds: string[] = [];
      for (const pkg of packages) {
        const totalSessions = pkg.items.reduce((sum, i) => sum + i.sessions, 0) || pkg.sessions;
        const expires = new Date(Date.now() + (pkg.validity_days || 180) * 86400000)
          .toISOString()
          .slice(0, 10);
        const cp = await supabaseAdmin
          .from("client_packages")
          .insert({
            organization_id: ctx.orgId,
            client_id: clientId,
            package_id: pkg.id,
            name: pkg.name,
            service_id: pkg.items[0]?.service_id ?? null,
            sessions_total: totalSessions,
            sessions_used: 0,
            price: pkg.price,
            expires_at: expires,
          })
          .select("id")
          .single();
        if (cp.error) return { ok: false as const, message: cp.error.message };
        if (cp.data?.id) createdPackageIds.push(cp.data.id);
      }
      clientPackageId = createdPackageIds[0] ?? null;
      appointmentPrice = 0;
      notes = [`Pacotes: ${packages.map((pkg) => pkg.name).join(", ")}`, data.notes]
        .filter(Boolean)
        .join(" · ");
    } else {
      notes = [`Procedimentos: ${ctx.serviceNames.join(", ")}`, data.notes]
        .filter(Boolean)
        .join(" · ");
    }

    const { error } = await supabaseAdmin.from("appointments").insert({
      organization_id: ctx.orgId,
      client_id: clientId,
      client_package_id: clientPackageId,
      service_id: ctx.serviceId,
      professional_id: data.professionalId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "agendado",
      source: "online",
      price: appointmentPrice,
      guest_name: data.name,
      guest_phone: data.phone,
      guest_email: data.email || null,
      notes,
    });

    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, message: "Solicitação enviada! A clínica confirmará em breve." };
  });

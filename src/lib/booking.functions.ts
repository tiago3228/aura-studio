/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  brInstant,
  buildSlots,
  type ClinicDayConfig,
  type ExtraWindow,
  fromMinutes,
  toMinutes,
  type BusyRange,
  type SlotConfig,
} from "@/lib/availability";

function parseClinicHours(value: unknown): Record<string, ClinicDayConfig> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const result: Record<string, ClinicDayConfig> = {};
  for (const weekday of Array.from({ length: 7 }, (_, index) => String(index))) {
    const item = source[weekday];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const day = item as Record<string, unknown>;
    if (
      typeof day["start"] !== "string" ||
      typeof day["end"] !== "string" ||
      typeof day["closed"] !== "boolean"
    )
      continue;
    result[weekday] = {
      closed: day["closed"],
      start: day["start"],
      end: day["end"],
      lunchEnabled: day["lunchEnabled"] === true,
      lunchStart: typeof day["lunchStart"] === "string" ? day["lunchStart"] : "12:00",
      lunchEnd: typeof day["lunchEnd"] === "string" ? day["lunchEnd"] : "13:00",
      extraWindows: Array.isArray(day["extraWindows"])
        ? day["extraWindows"]
            .filter(
              (window): window is ExtraWindow =>
                !!window &&
                typeof window === "object" &&
                typeof (window as Record<string, unknown>)["start"] === "string" &&
                typeof (window as Record<string, unknown>)["end"] === "string",
            )
            .map((window) => ({
              start: window.start,
              end: window.end,
              bookable: (window as Record<string, unknown>)["bookable"] !== false,
            }))
        : [],
    };
  }
  return Object.keys(result).length ? result : undefined;
}

async function bookingServerClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const validatePublicCoupon = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        code: z.string().min(1).max(40),
        serviceIds: z.array(z.string().uuid()).max(20).default([]),
        phone: z.string().max(30).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = await bookingServerClient();
    const { data: result, error } = await (supabase as any).rpc("validate_public_coupon", {
      _slug: data.slug,
      _code: data.code,
      _service_ids: data.serviceIds,
      _client_phone: data.phone || null,
    });
    if (error) return { valid: false, message: "Não foi possível validar o cupom." };
    const row = Array.isArray(result) ? result[0] : result;
    return {
      valid: Boolean(row?.valid),
      message: row?.message ?? "Cupom inválido.",
      couponId: row?.coupon_id ?? null,
      percentage: Number(row?.percentage ?? 0),
      code: row?.original_code ?? data.code.toUpperCase(),
    };
  });

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
  active: boolean;
  online_booking: boolean;
};

type OfferPackage = {
  id: string;
  name: string;
  description: string | null;
  service_id: string | null;
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
  // A leitura é feita no servidor com filtros explícitos por organização.
  // Isso permite validar itens de pacotes online sem liberá-los como serviço avulso.
  const supabase = await bookingServerClient();
  const [services, packages, items, profServices] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, duration_min, price, promo_price, active, online_booking")
      .eq("organization_id", orgId)
      .order("name"),
    supabase
      .from("packages")
      .select("id, name, description, service_id, sessions, price, validity_days")
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
    (packages.data ?? []).map((p) => {
      const items = itemsByPackage.get(p.id) ?? [];
      // Pacotes criados antes de package_items usam packages.service_id.
      // Normalizamos esse formato para o mesmo contrato público atual.
      const normalizedItems =
        items.length > 0 || !p.service_id
          ? items
          : [
              {
                service_id: p.service_id,
                service_name: serviceById.get(p.service_id)?.name ?? "Procedimento",
                sessions: p.sessions,
              },
            ];
      return [
        p.id,
        {
          ...p,
          price: Number(p.price),
          items: normalizedItems,
        } as OfferPackage,
      ] as const;
    }),
  );

  const svcByPro = new Map<string, string[]>();
  for (const r of profServices.data ?? [])
    svcByPro.set(r.professional_id, [...(svcByPro.get(r.professional_id) ?? []), r.service_id]);
  return function offerFor(professionalId: string) {
    // Pacotes ativos e liberados online são ofertas da clínica. Assim, um
    // pacote novo não fica invisível apenas porque ainda não foi associado
    // manualmente na tela de ofertas do profissional.
    const pkgs = [...packageById.values()];

    const blocked = new Set<string>();
    for (const p of pkgs) for (const it of p.items) blocked.add(it.service_id);

    const selected = svcByPro.get(professionalId);
    const base = selected
      ? selected.map((id) => serviceById.get(id)).filter((s): s is OfferService => !!s)
      : // sem seleção explícita, oferece tudo o que a clínica liberou online
        [...serviceById.values()];

    return {
      services: base.filter((s) => s.active && s.online_booking && !blocked.has(s.id)),
      packages: pkgs,
    };
  };
}

export const getBookingPage = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = await bookingServerClient();
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
  const supabase = await bookingServerClient();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const org = await supabase
    .from("organizations")
    .select("id, business_hours")
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
    .eq("organization_id", org.data.id);
  if (!packages.length) serviceQuery = serviceQuery.eq("active", true).eq("online_booking", true);
  const service = await serviceQuery;
  if (!service.data?.length || service.data.length !== uniqueTargetServiceIds.length) {
    return { error: "Um dos procedimentos selecionados está indisponível." as const };
  }
  const orderedServices = targetServiceIds
    .map((id) => service.data.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item);
  const firstService = orderedServices[0];
  if (!firstService) {
    return { error: "Um dos procedimentos selecionados está indisponível." as const };
  }

  const clinicHours = parseClinicHours(org.data.business_hours);
  const ctx: Ctx = {
    orgId: org.data.id,
    serviceId: firstService.id,
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
      ...(clinicHours ? { clinicHours } : {}),
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
        couponCode: z.string().max(40).optional(),
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
    const originalAmount = packages.length
      ? packages.reduce((sum, pkg) => sum + Number(pkg.price), 0)
      : price;
    let coupon: { id: string; percentage: number } | null = null;
    let discountAmount = 0;

    if (data.couponCode?.trim()) {
      const couponServiceIds = packages.flatMap((pkg) => pkg.items.map((item) => item.service_id));
      const { data: couponResult, error: couponError } = await (supabaseAdmin as any).rpc(
        "validate_public_coupon",
        {
          _slug: data.slug,
          _code: data.couponCode.trim(),
          _service_ids: [...new Set([...couponServiceIds, ...(data.serviceIds ?? [])])],
          _client_phone: data.phone,
        },
      );
      const couponRow = Array.isArray(couponResult) ? couponResult[0] : couponResult;
      if (couponError || !couponRow?.valid || !couponRow.coupon_id) {
        return { ok: false as const, message: couponRow?.message ?? "Cupom inválido." };
      }
      coupon = { id: couponRow.coupon_id, percentage: Number(couponRow.percentage) };
      discountAmount = Math.min(originalAmount, (originalAmount * coupon.percentage) / 100);
      if (!packages.length) appointmentPrice = Math.max(0, originalAmount - discountAmount);
    }

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

    const { data: appointment, error } = await supabaseAdmin
      .from("appointments")
      .insert({
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
      })
      .select("id")
      .single();

    if (error) return { ok: false as const, message: error.message };
    if (coupon && appointment?.id) {
      const { error: redemptionError } = await (supabaseAdmin as any).rpc(
        "record_public_coupon_redemption",
        {
          _coupon_id: coupon.id,
          _client_id: clientId,
          _appointment_id: appointment.id,
          _service_id: ctx.serviceId,
          _original_amount: originalAmount,
          _discount_amount: discountAmount,
          _final_amount: originalAmount - discountAmount,
        },
      );
      if (redemptionError) return { ok: false as const, message: redemptionError.message };
    }
    return { ok: true as const, message: "Solicitação enviada! A clínica confirmará em breve." };
  });

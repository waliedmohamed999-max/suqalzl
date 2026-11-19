import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { NotFoundError, withCtx } from "@/lib/db";
import { mediaUrl } from "@/lib/providers/storage";
import type { Locale } from "@/features/common/schema";
import {
  customerOrderDetailDTO,
  customerOrderDetailInput,
  customerOrderListDTO,
  customerOrderListInput,
  type CustomerOrderDetailDTO,
  type CustomerOrderListDTO,
} from "./schema";
import { parseAddressSnapshot, parseItemSnapshot } from "./snapshot";

/**
 * "طلباتي" (M1-02 / P2-04, read only). Customer RLS context: orders_customer_read +
 * sub_orders_customer_read (owns_order) — and the service filters by userId too (first layer).
 * Store finance columns are never selected.
 */
const pick = (loc: Locale, ar: string, en: string) => (loc === "en" ? en || ar : ar || en);

export async function listMyOrders(userId: string, raw: unknown = {}): Promise<CustomerOrderListDTO> {
  const q = customerOrderListInput.parse(raw);
  return withCtx({ kind: "customer", userId }, async (tx) => {
    const where: Prisma.OrderWhereInput = { userId };
    const [total, rows] = await Promise.all([
      tx.order.count({ where }),
      tx.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        select: {
          id: true,
          number: true,
          placedAt: true,
          status: true,
          paymentStatus: true,
          grandTotal: true,
          subOrders: { select: { items: { select: { qty: true, productSnapshot: true } } } },
        },
      }),
    ]);
    return customerOrderListDTO.parse({
      items: rows.map((o) => {
        const items = o.subOrders.flatMap((s) => s.items);
        const thumbs = items
          .map((i) => parseItemSnapshot(i.productSnapshot))
          .filter((s) => s.imagePath)
          .slice(0, 4)
          .map((s) => ({ url: mediaUrl(s.imagePath!), alt: pick(q.locale, s.nameAr, s.nameEn) }));
        return {
          id: o.id,
          number: o.number,
          placedAt: o.placedAt.toISOString(),
          status: o.status,
          paymentStatus: o.paymentStatus,
          grandTotal: o.grandTotal,
          itemCount: items.reduce((s, i) => s + i.qty, 0),
          thumbnails: thumbs,
          subOrderCount: o.subOrders.length,
        };
      }),
      page: q.page,
      perPage: q.perPage,
      total,
      totalPages: Math.ceil(total / q.perPage),
    });
  });
}

export async function getMyOrder(userId: string, raw: unknown): Promise<CustomerOrderDetailDTO> {
  const q = customerOrderDetailInput.parse(raw);
  const loc = q.locale;
  return withCtx({ kind: "customer", userId }, async (tx) => {
    const o = await tx.order.findFirst({
      where: { number: q.number, userId },
      select: {
        id: true,
        number: true,
        placedAt: true,
        paidAt: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        addressSnapshot: true,
        subtotal: true,
        discountTotal: true,
        shippingTotal: true,
        vatTotal: true,
        grandTotal: true,
        couponCode: true,
        subOrders: {
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            status: true,
            subtotal: true,
            platformDiscountShare: true,
            vendorDiscountShare: true,
            shippingFee: true,
            total: true,
            shippedAt: true,
            deliveredAt: true,
            vendor: { select: { slug: true, storeNameAr: true, storeNameEn: true } },
            items: {
              orderBy: { createdAt: "asc" },
              select: { id: true, qty: true, unitPrice: true, lineTotal: true, productSnapshot: true },
            },
            history: { orderBy: { createdAt: "asc" }, select: { to: true, createdAt: true } },
            shipments: {
              where: { direction: "OUTBOUND" },
              orderBy: { createdAt: "asc" },
              select: { carrier: true, trackingNumber: true, status: true },
            },
          },
        },
      },
    });
    if (!o) throw new NotFoundError();
    const snaps = o.subOrders.flatMap((s) => s.items.map((i) => parseItemSnapshot(i.productSnapshot)));
    const productIds = snaps.map((s) => s.productId).filter((x): x is string => !!x);
    // a link only when the product is still public (customer context = reader: PUBLISHED only)
    const live = new Set(
      productIds.length
        ? (
            await tx.product.findMany({ where: { id: { in: productIds }, status: "PUBLISHED" }, select: { id: true } })
          ).map((p) => p.id)
        : [],
    );
    const a = parseAddressSnapshot(o.addressSnapshot);
    return customerOrderDetailDTO.parse({
      id: o.id,
      number: o.number,
      placedAt: o.placedAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      address: {
        recipientName: a.recipientName,
        recipientPhone: a.recipientPhone,
        city: pick(loc, a.cityAr, a.cityEn),
        district: a.district,
        street: a.street,
        buildingNo: a.buildingNo,
        postalCode: a.postalCode,
        nationalAddressShort: a.nationalAddressShort,
      },
      subOrders: o.subOrders.map((s) => ({
        id: s.id,
        number: s.number,
        status: s.status,
        vendor: s.vendor ? { slug: s.vendor.slug, name: pick(loc, s.vendor.storeNameAr, s.vendor.storeNameEn) } : null,
        lines: s.items.map((i) => {
          const sn = parseItemSnapshot(i.productSnapshot);
          const name = pick(loc, sn.nameAr, sn.nameEn);
          return {
            id: i.id,
            name,
            optionsLabel: pick(loc, sn.optionsAr, sn.optionsEn),
            sku: sn.sku,
            image: sn.imagePath ? { url: mediaUrl(sn.imagePath), alt: name } : null,
            productSlug: sn.productId && live.has(sn.productId) ? sn.slug : null,
            qty: i.qty,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
          };
        }),
        subtotal: s.subtotal,
        discount: s.platformDiscountShare + s.vendorDiscountShare,
        shippingFee: s.shippingFee,
        total: s.total,
        // staff/vendor notes are internal: the customer sees status + time only
        timeline: s.history.map((h) => ({ status: h.to, at: h.createdAt.toISOString(), note: null })),
        shipments: s.shipments.map((sh) => ({
          carrier: sh.carrier,
          trackingNumber: sh.trackingNumber,
          status: sh.status,
          shippedAt: s.shippedAt?.toISOString() ?? null,
          deliveredAt: s.deliveredAt?.toISOString() ?? null,
        })),
      })),
      subtotal: o.subtotal,
      discountTotal: o.discountTotal,
      shippingTotal: o.shippingTotal,
      vatTotal: o.vatTotal,
      grandTotal: o.grandTotal,
      couponCode: o.couponCode,
    });
  });
}

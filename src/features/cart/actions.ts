"use server";
/**
 * Cart + address Server Actions (M1-02). Identity comes from the session cookie only (rule 8);
 * the guest cart token lives in its own httpOnly cookie. Every action returns ActionResult.
 * Next.js checks the Origin of Server Actions (SPEC §9 CSRF).
 */
import { cookies } from "next/headers";
import { getPrincipal } from "@/lib/auth/session";
import { account, requirePermission } from "@/lib/permissions";
import { toActionError } from "@/features/common/action";
import type { ActionResult, Locale } from "@/features/common/schema";
import type { AddressDTO, CartDTO, CheckoutAddressStepDTO, ShippingQuoteDTO } from "./schema";
import {
  addToCart,
  cartCookie,
  cartCookieName,
  deleteAddress,
  getCart,
  getCheckoutAddressStep,
  quoteShipping,
  removeCartLine,
  saveAddress,
  updateCartLine,
  type CartOwner,
} from "./service";

async function owner(): Promise<CartOwner> {
  const p = await getPrincipal();
  if (p) return { kind: "user", userId: p.userId };
  return { kind: "guest", token: (await cookies()).get(cartCookieName())?.value ?? null };
}

/** Public: anyone (guest or signed in) has a cart. */
export async function getCartAction(locale: Locale = "ar"): Promise<ActionResult<CartDTO>> {
  try {
    return { ok: true, data: await getCart(await owner(), locale) };
  } catch (e) {
    return toActionError(e);
  }
}

export async function addToCartAction(input: unknown): Promise<ActionResult<CartDTO>> {
  try {
    const r = await addToCart(await owner(), input);
    if (r.newGuestToken) {
      const c = cartCookie(r.newGuestToken);
      (await cookies()).set(c.name, c.value, c.options);
    }
    return { ok: true, data: r.cart };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateCartLineAction(input: unknown): Promise<ActionResult<CartDTO>> {
  try {
    return { ok: true, data: await updateCartLine(await owner(), input) };
  } catch (e) {
    return toActionError(e);
  }
}

export async function removeCartLineAction(input: unknown): Promise<ActionResult<CartDTO>> {
  try {
    return { ok: true, data: await removeCartLine(await owner(), input) };
  } catch (e) {
    return toActionError(e);
  }
}

// ------------------------------------------------------------------ checkout address step (signed in)
export async function getCheckoutAddressStepAction(
  locale: Locale = "ar",
): Promise<ActionResult<CheckoutAddressStepDTO>> {
  try {
    const { principal } = await requirePermission(account());
    return { ok: true, data: await getCheckoutAddressStep(principal.userId, locale) };
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveAddressAction(input: unknown, locale: Locale = "ar"): Promise<ActionResult<AddressDTO>> {
  try {
    const { principal } = await requirePermission(account());
    return { ok: true, data: await saveAddress(principal.userId, input, locale) };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteAddressAction(addressId: string): Promise<ActionResult<null>> {
  try {
    const { principal } = await requirePermission(account());
    await deleteAddress(principal.userId, String(addressId));
    return { ok: true, data: null };
  } catch (e) {
    return toActionError(e);
  }
}

export async function quoteShippingAction(input: unknown): Promise<ActionResult<ShippingQuoteDTO>> {
  try {
    const { principal } = await requirePermission(account());
    return { ok: true, data: await quoteShipping(principal.userId, input) };
  } catch (e) {
    return toActionError(e);
  }
}

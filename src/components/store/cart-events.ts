"use client";

/**
 * Tiny same-tab bus so the header badge updates after an add/update without reading cookies on
 * the (static) server render. Payload = the server's itemCount, never computed here.
 */
export const CART_EVENT = "szl:cart";

export function emitCartCount(itemCount: number) {
  window.dispatchEvent(new CustomEvent<number>(CART_EVENT, { detail: itemCount }));
}

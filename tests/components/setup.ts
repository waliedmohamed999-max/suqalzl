import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import React from "react";

afterEach(() => cleanup());

// next-intl navigation wrappers need the App Router context; in jsdom a plain <a> is enough.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, locale: _locale, scroll: _scroll, ...rest }: Record<string, unknown>) =>
    React.createElement("a", { href: typeof href === "string" ? href : "#", ...rest }),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
  getPathname: ({ href }: { href: string }) => href,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(globalThis.__searchParams ?? ""),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

declare global {
  var __searchParams: string | undefined;
}

// jsdom lacks these; Radix and sonner touch them.
if (!window.matchMedia)
  window.matchMedia = (q: string) =>
    ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
window.requestAnimationFrame ??= (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 0);
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

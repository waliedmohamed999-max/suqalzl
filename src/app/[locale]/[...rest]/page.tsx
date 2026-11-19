import { notFound } from "next/navigation";

/** Any unknown path renders the localized not-found.tsx (inside the locale layout) instead of Next's default. */
export default function CatchAll() {
  notFound();
}

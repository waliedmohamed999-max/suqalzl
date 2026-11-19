import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const SHAPES = {
  text: "h-4 w-full rounded-sm",
  card: "h-40 w-full rounded-md",
  row: "h-12 w-full rounded-sm",
  kpi: "h-24 w-full rounded-md",
  /** 4:5 for products (tokens.md 12.3); use square for logos/avatars only. */
  image: "aspect-[4/5] w-full rounded-sm",
  square: "aspect-square w-full rounded-sm",
} as const;

/**
 * Skeleton (tokens.md 11.1): flat `muted` block, aria-hidden. The pulse stops under
 * prefers-reduced-motion (global rule). Put aria-busy on the container that is loading.
 */
export function Skeleton({
  shape = "text",
  className,
  ...props
}: ComponentProps<"div"> & { shape?: keyof typeof SHAPES }) {
  return <div aria-hidden="true" className={cn("animate-pulse bg-muted", SHAPES[shape], className)} {...props} />;
}

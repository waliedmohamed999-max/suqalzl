/**
 * Zod schemas for component props used by the dev catalogue and the component tests (D30).
 * Money is integer halalas (D7). Nothing here is imported by app routes.
 */
import { z } from "zod";
import { STATUS_MAP } from "@/components/status/status-map";

export const priceSampleSchema = z.object({
  halalas: z.int().min(0).max(5_000_000),
  compareAt: z.int().min(5_000_001).max(9_000_000),
});

export const subOrderStatusSchema = z.enum(Object.keys(STATUS_MAP.subOrder) as [keyof typeof STATUS_MAP.subOrder]);

export const orderRowSchema = z.object({
  id: z.uuid(),
  number: z.int().min(100_001).max(199_999),
  customer: z.string().min(3).max(18),
  status: subOrderStatusSchema,
  totalHalalas: z.int().min(1_000).max(2_000_000),
});
export type OrderRow = z.infer<typeof orderRowSchema>;

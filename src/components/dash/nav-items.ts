import type { LucideIcon } from "lucide-react";
import {
  Bell,
  FileText,
  House,
  Image,
  Inbox,
  LayoutGrid,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Tag,
  ShieldCheck,
  Undo2,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import type { AdminSection } from "@/features/admin/schema";

export interface DashNavItem {
  /** key under messages admin.nav.* / vendor.nav.* */
  key: string;
  href: string;
  icon: LucideIcon;
  /** admin: the contract section that gates it (getAdminCapabilities().sections) */
  section?: AdminSection;
}

/**
 * Sidebar items from the boards (lib.py sidebar()). Admin items are filtered by the signed-in
 * staff's capabilities (M1-03): a STAFF with partial permissions sees only their sections, and items
 * without a section in the contract yet (P3/P4 pages) are not shown. Nav is not security: every
 * page and service enforces its own permission on the server.
 * Counters (queues) are added with their DTOs in P3/P4, never hard-coded.
 */
export const ADMIN_NAV: DashNavItem[] = [
  { key: "home", href: "/admin", icon: House },
  { key: "products", href: "/admin/products", icon: Package, section: "products" },
  { key: "categories", href: "/admin/categories", icon: LayoutGrid, section: "categories" },
  { key: "orders", href: "/admin/orders", icon: ShoppingBag, section: "orders" },
  { key: "returns", href: "/admin/returns", icon: Undo2 },
  { key: "customers", href: "/admin/customers", icon: Users, section: "customers" },
  { key: "vendors", href: "/admin/vendors", icon: Store },
  { key: "finance", href: "/admin/finance", icon: Wallet },
  { key: "souq", href: "/admin/souq", icon: Zap },
  { key: "coupons", href: "/admin/coupons", icon: Tag },
  { key: "reviews", href: "/admin/reviews", icon: Star },
  { key: "content", href: "/admin/content", icon: Image },
  { key: "settings", href: "/admin/settings", icon: Settings, section: "settings" },
  { key: "staff", href: "/admin/staff", icon: ShieldCheck, section: "staff" },
  { key: "audit", href: "/admin/audit", icon: FileText, section: "audit" },
];

export const VENDOR_NAV: DashNavItem[] = [
  { key: "home", href: "/vendor", icon: House },
  { key: "products", href: "/vendor/products", icon: Package },
  { key: "orders", href: "/vendor/orders", icon: ShoppingBag },
  { key: "requests", href: "/vendor/requests", icon: Inbox },
  { key: "deals", href: "/vendor/deals", icon: Zap },
  { key: "finance", href: "/vendor/finance", icon: Wallet },
  { key: "reviews", href: "/vendor/reviews", icon: Star },
  { key: "team", href: "/vendor/team", icon: Users },
  { key: "profile", href: "/vendor/profile", icon: Store },
  { key: "notifications", href: "/vendor/notifications", icon: Bell },
];

/** Admin items the person may open: home always, the rest by section capability. */
export function visibleAdminNavKeys(sections: Partial<Record<AdminSection, boolean>>): string[] {
  return ADMIN_NAV.filter((i) => (i.section ? sections[i.section] === true : i.key === "home")).map((i) => i.key);
}

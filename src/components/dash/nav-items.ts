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
  Undo2,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

export interface DashNavItem {
  /** key under messages admin.nav.* / vendor.nav.* */
  key: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Sidebar items from the boards (lib.py sidebar()). Pages arrive in P3/P4; every page enforces its
 * own permission on the server, so the list is not filtered by permission in P1 (nav ≠ security).
 * Counters (queues) are added with their DTOs in P3/P4, never hard-coded.
 */
export const ADMIN_NAV: DashNavItem[] = [
  { key: "home", href: "/admin", icon: House },
  { key: "products", href: "/admin/products", icon: Package },
  { key: "categories", href: "/admin/categories", icon: LayoutGrid },
  { key: "orders", href: "/admin/orders", icon: ShoppingBag },
  { key: "returns", href: "/admin/returns", icon: Undo2 },
  { key: "customers", href: "/admin/customers", icon: Users },
  { key: "vendors", href: "/admin/vendors", icon: Store },
  { key: "finance", href: "/admin/finance", icon: Wallet },
  { key: "souq", href: "/admin/souq", icon: Zap },
  { key: "coupons", href: "/admin/coupons", icon: Tag },
  { key: "reviews", href: "/admin/reviews", icon: Star },
  { key: "content", href: "/admin/content", icon: Image },
  { key: "settings", href: "/admin/settings", icon: Settings },
  { key: "audit", href: "/admin/audit", icon: FileText },
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

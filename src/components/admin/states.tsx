import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * 403 (Admin-states-p018 "بدون صلاحية"): drawn state instead of an empty page. The server still
 * refuses the data; this only explains it. `permission` is shown so the user can ask for it.
 */
export function Forbidden({ permission }: { permission?: string }) {
  const t = useTranslations("admin.states");
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="inline-flex size-16 items-center justify-center rounded-full bg-warning-subtle text-warning"
      >
        <Lock className="size-7" />
      </span>
      <h1 className="text-xl font-bold">{t("forbiddenTitle")}</h1>
      <p className="max-w-md text-base text-muted-foreground">
        {permission
          ? t.rich("forbiddenBodyPerm", {
              perm: () => (
                <code dir="ltr" className="font-sans font-semibold text-foreground">
                  {permission}
                </code>
              ),
            })
          : t("forbiddenBody")}
      </p>
      <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
        {t("backHome")}
      </Link>
    </div>
  );
}

/** Table loading state: skeleton rows with the same rhythm as the real rows (aria-busy on the box). */
export function TableSkeleton({ rows = 6, label }: { rows?: number; label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="rounded-lg border border-border bg-card">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border p-3 last:border-b-0">
          <Skeleton className="size-5" />
          <Skeleton className="h-14 w-11" />
          <Skeleton shape="text" className="w-2/5" />
          <Skeleton shape="text" className="w-1/8" />
          <Skeleton shape="text" className="w-1/10" />
        </div>
      ))}
    </div>
  );
}

/** Page-level loading for admin routes (loading.tsx): header line + table skeleton. */
export function AdminPageSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <Skeleton shape="text" className="h-3 w-40" />
      <Skeleton shape="text" className="h-7 w-64" />
      <TableSkeleton label={label} />
    </div>
  );
}

/** Two-column detail layout: main column + side column (stacks under lg). */
export function DetailLayout({ main, side, className }: { main: ReactNode; side: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start gap-6", className)}>
      <div className="flex min-w-0 flex-[999_1_36rem] flex-col gap-4">{main}</div>
      <aside className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4 lg:max-w-[23.75rem]">{side}</aside>
    </div>
  );
}

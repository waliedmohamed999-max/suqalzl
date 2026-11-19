"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { usePathname } from "@/i18n/navigation";

/** Under `lg` the sidebar becomes a side sheet from `start` (README 4.2). */
export function DashMobileMenu({ title, children }: { title: string; children: ReactNode }) {
  const t = useTranslations("dash");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("openMenu")}>
          <Menu aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent side="start" title={title} closeLabel={tc("close")} className="w-72" data-surface="inverse">
        <div className="flex flex-col gap-4 p-3">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

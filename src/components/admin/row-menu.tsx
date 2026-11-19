"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type RowMenuItem =
  | { kind?: "action"; label: string; onSelect: () => void; destructive?: boolean; icon?: ReactNode }
  | { kind: "link"; label: string; href: string; icon?: ReactNode };

/**
 * Row actions "⋯" (README 4.6: 36px button). Menu button pattern: aria-haspopup/expanded, arrow
 * keys move between items, Esc closes and returns focus, a click outside closes.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({});
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onDown = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    // tables scroll horizontally (overflow clips absolute children), so the menu is `fixed`
    const dismiss = () => setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const els = Array.from(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      els[els.length - 1]?.focus();
    }
  };

  const itemCls = (destructive?: boolean) =>
    cn(
      "flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-sm px-3 text-start text-sm hover:bg-accent focus-visible:bg-accent",
      destructive ? "text-danger" : "text-foreground",
    );

  return (
    <span className="relative inline-flex">
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          const r = btn.current?.getBoundingClientRect();
          if (r) {
            const rtl = getComputedStyle(btn.current!).direction === "rtl";
            const top = r.bottom + 4;
            setPos(rtl ? { top, left: r.left } : { top, right: window.innerWidth - r.right });
          }
          setOpen((o) => !o);
        }}
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-accent pointer-coarse:size-11"
      >
        <MoreHorizontal aria-hidden="true" className="size-4.5" />
      </button>
      {open ? (
        <ul
          ref={menu}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKey}
          style={pos}
          className="fixed z-[var(--z-dropdown)] flex min-w-44 flex-col rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {items.map((it) => (
            <li key={it.label} role="none">
              {it.kind === "link" ? (
                <Link href={it.href} role="menuitem" tabIndex={-1} className={itemCls()} onClick={() => setOpen(false)}>
                  {it.icon}
                  {it.label}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={itemCls(it.destructive)}
                  onClick={() => {
                    close();
                    it.onSelect();
                  }}
                >
                  {it.icon}
                  {it.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}

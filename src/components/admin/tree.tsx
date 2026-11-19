"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tree (README 4.6 SortableTree, read-only in M1: drag-to-reorder arrives in P3-01).
 * WAI-ARIA tree: one tab stop (roving tabindex), Up/Down move, Right/Left expand/collapse (mirrored
 * in RTL), Home/End, Enter/Space toggles. `renderItem` draws the row content; `actions` sits at
 * the end of the row outside the treeitem's name.
 */
export function Tree<T>({
  label,
  nodes,
  getId,
  getChildren,
  renderItem,
  actions,
  defaultExpanded = [],
  selectedId,
  onSelect,
}: {
  label: string;
  nodes: T[];
  getId: (n: T) => string;
  getChildren: (n: T) => T[];
  renderItem: (n: T, level: number) => ReactNode;
  actions?: (n: T) => ReactNode;
  defaultExpanded?: string[];
  selectedId?: string | null;
  onSelect?: (n: T) => void;
}) {
  const t = useTranslations("admin.tree");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(defaultExpanded));
  const [focusId, setFocusId] = useState<string | null>(nodes[0] ? getId(nodes[0]) : null);
  const root = useRef<HTMLUListElement>(null);

  // visible nodes in order, with parent links, for keyboard navigation
  const visible: { node: T; level: number; parent: string | null }[] = [];
  const walk = (list: T[], level: number, parent: string | null) => {
    for (const n of list) {
      visible.push({ node: n, level, parent });
      if (expanded.has(getId(n))) walk(getChildren(n), level + 1, getId(n));
    }
  };
  walk(nodes, 1, null);

  const focus = (id: string) => {
    setFocusId(id);
    requestAnimationFrame(() =>
      root.current?.querySelector<HTMLElement>(`[data-tree-id="${CSS.escape(id)}"]`)?.focus(),
    );
  };
  const toggle = (id: string, open?: boolean) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (open ?? !n.has(id)) n.add(id);
      else n.delete(id);
      return n;
    });

  const onKey = (e: KeyboardEvent<HTMLElement>, id: string) => {
    const i = visible.findIndex((v) => getId(v.node) === id);
    const cur = visible[i];
    if (!cur) return;
    const hasKids = getChildren(cur.node).length > 0;
    const isOpen = expanded.has(id);
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const openKey = rtl ? "ArrowLeft" : "ArrowRight";
    const closeKey = rtl ? "ArrowRight" : "ArrowLeft";
    let handled = true;
    if (e.key === "ArrowDown") {
      const n = visible[i + 1];
      if (n) focus(getId(n.node));
    } else if (e.key === "ArrowUp") {
      const n = visible[i - 1];
      if (n) focus(getId(n.node));
    } else if (e.key === openKey) {
      if (hasKids && !isOpen) toggle(id, true);
      else if (hasKids) focus(getId(getChildren(cur.node)[0]!));
    } else if (e.key === closeKey) {
      if (hasKids && isOpen) toggle(id, false);
      else if (cur.parent) focus(cur.parent);
    } else if (e.key === "Home") focus(getId(visible[0]!.node));
    else if (e.key === "End") focus(getId(visible[visible.length - 1]!.node));
    else if (e.key === "Enter" || e.key === " ") {
      if (onSelect) onSelect(cur.node);
      else if (hasKids) toggle(id);
    } else handled = false;
    if (handled) e.preventDefault();
  };

  const renderLevel = (list: T[], level: number): ReactNode =>
    list.map((n) => {
      const id = getId(n);
      const kids = getChildren(n);
      const isOpen = expanded.has(id);
      return (
        <li
          key={id}
          role="treeitem"
          aria-level={level}
          aria-expanded={kids.length ? isOpen : undefined}
          aria-selected={selectedId != null ? selectedId === id : undefined}
          data-tree-id={id}
          tabIndex={focusId === id ? 0 : -1}
          onKeyDown={(e) => {
            e.stopPropagation();
            onKey(e, id);
          }}
          onFocus={(e) => {
            if (e.target === e.currentTarget) setFocusId(id);
          }}
          className="outline-none focus-visible:[&>div]:outline-2 focus-visible:[&>div]:-outline-offset-2 focus-visible:[&>div]:outline-ring"
        >
          <div
            onClick={() => onSelect?.(n)}
            className={cn(
              "flex min-h-14 items-center gap-2.5 border-b border-border px-3 py-1.5",
              selectedId === id ? "bg-gold-subtle" : "bg-card hover:bg-background",
              onSelect && "cursor-pointer",
            )}
            style={{ paddingInlineStart: `${0.75 + (level - 1) * 2}rem` }}
          >
            {kids.length ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(id);
                }}
                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-sm hover:bg-accent"
                title={isOpen ? t("collapse") : t("expand")}
              >
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight data-directional="" className="size-4" />}
              </button>
            ) : (
              <span aria-hidden="true" className="w-7" />
            )}
            <div className="flex min-w-0 flex-1 items-center gap-2.5">{renderItem(n, level)}</div>
            {actions ? (
              <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                {actions(n)}
              </div>
            ) : null}
          </div>
          {kids.length && isOpen ? <ul role="group">{renderLevel(kids, level + 1)}</ul> : null}
        </li>
      );
    });

  return (
    <ul ref={root} role="tree" aria-label={label} className="flex flex-col">
      {renderLevel(nodes, 1)}
    </ul>
  );
}

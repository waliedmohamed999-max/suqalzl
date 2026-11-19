import type { ColumnDef } from "@tanstack/react-table";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FilterBar } from "@/components/admin/filter-bar";
import { maskEmail, maskPhone } from "@/components/admin/mask";
import { formatDeltaBps } from "@/components/admin/stat-card";
import { Forbidden } from "@/components/admin/states";
import { StatusTimeline } from "@/components/admin/status-timeline";
import { deltaBps } from "@/components/admin/views/admin-home";
import { visibleAdminNavKeys } from "@/components/dash/nav-items";
import { orderRowSchema, type OrderRow } from "@/dev/fixtures";
import { samples } from "@/dev/zod-sample";
import { renderWithIntl } from "../render";

const replace = vi.fn();
vi.mock("@/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({ href, scroll: _scroll, ...rest }: Record<string, unknown>) =>
      React.createElement("a", { href: typeof href === "string" ? href : "#", ...rest }),
    usePathname: () => "/admin/x",
    useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn() }),
  };
});

const columns: ColumnDef<OrderRow, unknown>[] = [
  { id: "n", header: "رقم", meta: { card: "title", numeric: true }, cell: ({ row }) => row.original.number },
  { id: "c", header: "العميل", cell: ({ row }) => row.original.customer },
];

describe("AdminDataTable", () => {
  it("selection: mixed header checkbox, dark bulk bar with actions, clear selection", async () => {
    const rows = samples(orderRowSchema, 3, 2);
    const onBulk = vi.fn();
    renderWithIntl(
      <AdminDataTable
        caption="الطلبات"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        rowLabel={(r) => String(r.number)}
        selectable
        bulkActions={[{ label: "تصدير", onSelect: onBulk }]}
        empty={<p>فارغ</p>}
      />,
    );
    const table = screen.getByRole("table", { name: "الطلبات" });
    const boxes = within(table).getAllByRole("checkbox");
    expect(boxes).toHaveLength(4);
    await userEvent.click(boxes[1]!);
    expect(boxes[0]).toHaveAttribute("data-state", "indeterminate");
    const bar = screen.getByRole("region", { name: "إجراءات جماعية" });
    expect(bar).toHaveAttribute("data-surface", "inverse-strong");
    await userEvent.click(within(bar).getByRole("button", { name: "تصدير" }));
    expect(onBulk).toHaveBeenCalledWith([rows[0]!.id]);
    await userEvent.click(within(bar).getByRole("button", { name: "إلغاء التحديد" }));
    expect(screen.queryByRole("region", { name: "إجراءات جماعية" })).toBeNull();
  });

  it("renders the same rows as cards (mobile list) and the pager text", () => {
    const rows = samples(orderRowSchema, 2, 4);
    renderWithIntl(
      <AdminDataTable
        caption="الطلبات"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        rowLabel={(r) => String(r.number)}
        pagination={{ page: 2, pageSize: 25, total: 60 }}
        empty={<p>فارغ</p>}
      />,
    );
    const cards = screen.getByRole("list", { name: "الطلبات" });
    expect(within(cards).getAllByRole("listitem")).toHaveLength(2);
    expect(within(cards).getAllByText("العميل")).toHaveLength(2); // label: value items
    expect(screen.getByText("عرض 26–50 من 60")).toBeInTheDocument();
  });

  it("shows the empty state instead of a table", () => {
    renderWithIntl(
      <AdminDataTable
        caption="x"
        columns={columns}
        data={[]}
        getRowId={(r) => r.id}
        rowLabel={() => ""}
        empty={<p>فارغ</p>}
      />,
    );
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("فارغ")).toBeInTheDocument();
  });
});

describe("FilterBar (URL state)", () => {
  it("shows applied filters as chips, removes one, clears all, resets page", async () => {
    replace.mockClear();
    globalThis.__searchParams = "q=bisht&status=PUBLISHED&cat=a&page=3";
    renderWithIntl(
      <FilterBar
        viewParam="status"
        views={[
          { key: "all", label: "الكل" },
          { key: "PUBLISHED", label: "منشور" },
        ]}
        search={{ placeholder: "ابحث" }}
        filters={[{ param: "cat", label: "التصنيف", options: [{ value: "a", label: "البشوت" }] }]}
        resultCount={4}
      />,
    );
    expect(screen.getByRole("tab", { name: "منشور" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("4 نتائج")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "إزالة التصنيف: البشوت" }));
    expect(replace).toHaveBeenLastCalledWith("/admin/x?q=bisht&status=PUBLISHED", { scroll: false });
    await userEvent.click(screen.getByRole("button", { name: "مسح الفلاتر" }));
    expect(replace).toHaveBeenLastCalledWith("/admin/x?status=PUBLISHED", { scroll: false });
    globalThis.__searchParams = undefined;
  });

  it("debounces the search into ?q", async () => {
    vi.useFakeTimers();
    replace.mockClear();
    renderWithIntl(<FilterBar search={{ placeholder: "ابحث" }} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "عود" } });
    expect(replace).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(310);
    });
    expect(replace).toHaveBeenCalledWith(`/admin/x?q=${encodeURIComponent("عود")}`, { scroll: false });
    vi.useRealTimers();
  });
});

describe("ConfirmDialog", () => {
  it("is an alertdialog, focus starts on Cancel, typed confirmation unlocks the action", async () => {
    const onConfirm = vi.fn();
    renderWithIntl(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="حذف الموظف؟"
        body="يفقد الدخول فوراً."
        confirmLabel="حذف الموظف"
        typedConfirmation="أحمد"
        onConfirm={onConfirm}
      />,
    );
    const dialog = await screen.findByRole("alertdialog", { name: "حذف الموظف؟" });
    expect(dialog).toHaveAccessibleDescription("يفقد الدخول فوراً.");
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "إلغاء" })).toHaveFocus());
    const confirm = screen.getByRole("button", { name: "حذف الموظف" });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText("اكتب «أحمد» للتأكيد"), "أحمد");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe("states, timeline and helpers", () => {
  it("403 names the permission", () => {
    renderWithIntl(<Forbidden permission="settings.manage" />);
    expect(screen.getByRole("heading", { level: 1, name: "ما عندك صلاحية لهذه الصفحة" })).toBeInTheDocument();
    expect(screen.getByText("settings.manage")).toBeInTheDocument();
  });

  it("timeline: newest first is the current step, null actor = the system", () => {
    renderWithIntl(
      <StatusTimeline
        events={[
          { id: "2", status: <span>تم الشحن</span>, actor: "المالك", at: "2026-11-18T10:00:00Z" },
          { id: "1", status: <span>جديد</span>, actor: null, at: "2026-11-17T10:00:00Z" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("aria-current", "step");
    expect(within(items[1]!).getByText("النظام")).toBeInTheDocument();
  });

  it("deltas are integer bps and formatted with U+2212", () => {
    expect(deltaBps(112, 100)).toBe(1200);
    expect(deltaBps(97, 100)).toBe(-300);
    expect(deltaBps(5, 0)).toBeNull();
    expect(formatDeltaBps(1200)).toBe("+12%");
    expect(formatDeltaBps(-350)).toBe("−3.5%");
  });

  it("masks phones and emails", () => {
    expect(maskPhone("+966551234512")).toBe("+9665••••••12");
    expect(maskEmail("mohammed@example.com")).toBe("m•••@example.com");
    expect(maskPhone(null)).toBeNull();
  });

  it("sidebar keys follow the capability sections (STAFF with partial permissions)", () => {
    expect(visibleAdminNavKeys({ orders: true, customers: true, products: false })).toEqual([
      "home",
      "orders",
      "customers",
    ]);
    expect(visibleAdminNavKeys({ staff: true, audit: true })).toEqual(["home", "staff", "audit"]);
  });
});

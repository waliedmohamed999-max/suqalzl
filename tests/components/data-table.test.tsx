import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { DataTable } from "@/components/ui/data-table";
import { orderRowSchema, type OrderRow } from "@/dev/fixtures";
import { samples } from "@/dev/zod-sample";
import { renderWithIntl } from "./render";

const columns: ColumnDef<OrderRow, unknown>[] = [
  { header: "رقم", accessorKey: "number", meta: { numeric: true, sortKey: "number" } },
  { header: "العميل", accessorKey: "customer" },
];

describe("DataTable (basic, tokens.md 11.4)", () => {
  it("renders Zod-generated rows, caption, aria-sort from ?sort and end-aligned numeric cells", () => {
    globalThis.__searchParams = "sort=-number";
    const rows = samples(orderRowSchema, 3, 5);
    const { getByRole, getAllByRole } = renderWithIntl(
      <DataTable caption="الطلبات" columns={columns} data={rows} getRowId={(r) => r.id} empty={<p>فارغ</p>} />,
    );
    expect(getByRole("table", { name: "الطلبات" })).toBeInTheDocument();
    const [numH, custH] = getAllByRole("columnheader");
    expect(numH).toHaveAttribute("aria-sort", "descending");
    expect(custH).not.toHaveAttribute("aria-sort");
    expect(getAllByRole("row")).toHaveLength(4);
    expect(getAllByRole("cell")[0]!.className).toContain("text-end");
    globalThis.__searchParams = undefined;
  });

  it("shows the empty state instead of an empty table", () => {
    const { queryByRole, getByText } = renderWithIntl(
      <DataTable caption="الطلبات" columns={columns} data={[]} getRowId={(r) => r.id} empty={<p>فارغ</p>} />,
    );
    expect(queryByRole("table")).toBeNull();
    expect(getByText("فارغ")).toBeInTheDocument();
  });

  it("zod samples are deterministic and valid", () => {
    expect(samples(orderRowSchema, 2, 9)).toEqual(samples(orderRowSchema, 2, 9));
    for (const r of samples(orderRowSchema, 5, 1)) expect(Number.isInteger(r.totalHalalas)).toBe(true);
  });
});

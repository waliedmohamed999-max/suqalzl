import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/status/status-badge";
import { STATUS_MAP } from "@/components/status/status-map";
import { messages, renderWithIntl } from "./render";

describe("StatusBadge (tokens.md 2.5)", () => {
  it("renders text + icon + tone from the map", () => {
    const { getByText, container } = renderWithIntl(<StatusBadge entity="subOrder" status="SHIPPED" />, "ar");
    expect(getByText("تم الشحن")).toBeInTheDocument();
    expect(container.querySelector("svg[aria-hidden='true']")).toBeTruthy();
    expect(container.firstElementChild?.className).toContain("bg-info-subtle");
  });

  it("COMPLETED is a solid success badge; offer REJECTED is neutral, not danger", () => {
    const a = renderWithIntl(<StatusBadge entity="subOrder" status="COMPLETED" />, "ar");
    expect(a.container.firstElementChild?.className).toContain("bg-success ");
    a.unmount();
    const b = renderWithIntl(<StatusBadge entity="offer" status="REJECTED" />, "ar");
    expect(b.container.firstElementChild?.className).toContain("bg-neutral-subtle");
  });

  it("every mapped status has an Arabic and an English label", () => {
    for (const locale of ["ar", "en"] as const) {
      const status = (messages[locale] as { status: Record<string, Record<string, string>> }).status;
      for (const [entity, states] of Object.entries(STATUS_MAP)) {
        for (const s of Object.keys(states)) {
          expect(status[entity]?.[s], `${locale} status.${entity}.${s}`).toBeTruthy();
        }
      }
    }
  });
});

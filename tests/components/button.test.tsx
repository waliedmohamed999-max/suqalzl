import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("defaults to type=button and the md (44px) size", () => {
    render(<Button>دخول</Button>);
    const b = screen.getByRole("button", { name: "دخول" });
    expect(b).toHaveAttribute("type", "button");
    expect(b.className).toContain("h-11");
  });

  it("loading: disabled, aria-busy, label kept for assistive tech", () => {
    render(<Button loading>دخول</Button>);
    const b = screen.getByRole("button", { name: "دخول" });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute("aria-busy", "true");
  });

  it("asChild renders the child element (links) with button styles", () => {
    render(
      <Button asChild variant="outline">
        <a href="https://example.com/x">رابط</a>
      </Button>,
    );
    const a = screen.getByRole("link", { name: "رابط" });
    expect(a.className).toContain("border-input");
    expect(a).not.toHaveAttribute("type");
  });

  it("never uses opacity for the disabled look (tokens.md 2.6 rules)", () => {
    render(<Button disabled>x</Button>);
    expect(screen.getByRole("button").className).not.toMatch(/disabled:opacity/);
  });
});

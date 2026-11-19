import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "@/components/ui/otp-input";

function Harness({ onComplete }: { onComplete: (v: string) => void }) {
  const [v, setV] = useState("");
  return <OtpInput label="رمز التحقق من 6 أرقام" value={v} onValueChange={setV} onComplete={onComplete} />;
}

describe("OtpInput (D20: one real input, 6 visual boxes)", () => {
  it("is a single labelled input with one-time-code autofill", () => {
    render(<Harness onComplete={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(1);
    const input = screen.getByLabelText("رمز التحقق من 6 أرقام");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("dir", "ltr");
  });

  it("converts Arabic-Indic digits, strips spaces, caps at 6 and completes once", () => {
    const done = vi.fn();
    render(<Harness onComplete={done} />);
    const input = screen.getByLabelText("رمز التحقق من 6 أرقام") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "١٢٣ ٤٥" } });
    expect(input.value).toBe("12345");
    expect(done).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "۱۲۳۴۵۶۷" } });
    expect(input.value).toBe("123456");
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith("123456");
  });

  it("visual boxes are hidden from assistive tech", () => {
    const { container } = render(<Harness onComplete={() => {}} />);
    const boxes = container.querySelector("[aria-hidden='true']")!;
    expect(boxes.children).toHaveLength(6);
  });
});

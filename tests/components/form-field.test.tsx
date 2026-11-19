import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

const schema = z.object({ email: z.string().pipe(z.email({ message: "bad" })) });

function Demo() {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  return (
    <form noValidate onSubmit={form.handleSubmit(() => {})}>
      <FormField
        control={form.control}
        name="email"
        label="البريد"
        hint="تلميح"
        required
        translateError={(k) => (k === "bad" ? "بريد غير صحيح" : k)}
        render={({ field, a11y }) => <Input {...field} {...a11y} />}
      />
      <button type="submit">إرسال</button>
    </form>
  );
}

describe("FormField (tokens.md 11.1)", () => {
  it("labels the control, marks required and links the hint", () => {
    render(<Demo />);
    const input = screen.getByLabelText(/البريد/);
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAttribute("aria-invalid", "false");
    const hint = screen.getByText("تلميح");
    expect(input.getAttribute("aria-describedby")).toContain(hint.id);
  });

  it("on submit shows the translated error as an alert linked to the field", async () => {
    render(<Demo />);
    fireEvent.click(screen.getByRole("button", { name: "إرسال" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("بريد غير صحيح");
    const input = screen.getByLabelText(/البريد/);
    await waitFor(() => expect(input).toHaveAttribute("aria-invalid", "true"));
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
  });
});

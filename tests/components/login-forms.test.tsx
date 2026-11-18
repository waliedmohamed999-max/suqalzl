import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerLoginForm } from "@/features/auth/components/customer-login-form";
import { StaffLoginForm } from "@/features/auth/components/staff-login-form";
import { renderWithIntl } from "./render";

type Reply = { status: number; body: unknown };
let replies: Record<string, Reply[]>;
const calls: { url: string; body: unknown }[] = [];
const assign = vi.fn();

function reply(url: string, ...r: Reply[]) {
  replies[url] = [...(replies[url] ?? []), ...r];
}

beforeEach(() => {
  replies = {};
  calls.length = 0;
  assign.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      const r = replies[url]?.shift() ?? { status: 200, body: { authenticated: false, requires2fa: false } };
      return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json" } });
    }),
  );
  Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, assign } });
});
afterEach(() => vi.unstubAllGlobals());

const posted = (url: string) => calls.filter((c) => c.url === url);

describe("CustomerLoginForm", () => {
  it("validates the phone on the client (no request) and keeps the input", async () => {
    renderWithIntl(<CustomerLoginForm />);
    const phone = screen.getByLabelText("رقم الجوال");
    await userEvent.type(phone, "12345");
    await userEvent.click(screen.getByRole("button", { name: "أرسل رمز التحقق" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("اكتب 9 أرقام تبدأ بـ 5.");
    expect(phone).toHaveValue("12345");
    expect(posted("/api/auth/otp/request")).toHaveLength(0);
  });

  it("sends E.164 (Arabic digits accepted), then verifies the 6-digit code and follows a safe ?next=", async () => {
    reply("/api/auth/otp/request", { status: 200, body: { ok: true, expiresInSeconds: 300 } });
    reply("/api/auth/otp/verify", { status: 200, body: { ok: true, isNew: false, user: {} } });
    renderWithIntl(<CustomerLoginForm next="/account/orders" />);
    fireEvent.change(screen.getByLabelText("رقم الجوال"), { target: { value: "٠٥٥١٢٣٤٥٦٧" } });
    await userEvent.click(screen.getByRole("button", { name: "أرسل رمز التحقق" }));
    await screen.findByRole("heading", { name: "أدخل الرمز" });
    expect(posted("/api/auth/otp/request")[0]!.body).toEqual({ phone: "+966551234567", locale: "ar" });
    expect(screen.getByText("055 123 4567")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("رمز التحقق من 6 أرقام"), { target: { value: "123456" } });
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/account/orders"));
    expect(posted("/api/auth/otp/verify")[0]!.body).toEqual({ phone: "+966551234567", code: "123456", locale: "ar" });
  });

  it("wrong code: inline alert, field marked invalid, digits kept; unsafe next is ignored", async () => {
    reply("/api/auth/otp/request", { status: 200, body: { ok: true, expiresInSeconds: 300 } });
    reply(
      "/api/auth/otp/verify",
      { status: 400, body: { error: { code: "OTP_INVALID" } } },
      { status: 200, body: { ok: true } },
    );
    renderWithIntl(<CustomerLoginForm next="//evil.example" />);
    fireEvent.change(screen.getByLabelText("رقم الجوال"), { target: { value: "551234567" } });
    await userEvent.click(screen.getByRole("button", { name: "أرسل رمز التحقق" }));
    const otp = await screen.findByLabelText("رمز التحقق من 6 أرقام");
    fireEvent.change(otp, { target: { value: "000000" } });
    expect(await screen.findByText("الرمز غير صحيح.")).toBeInTheDocument();
    expect(otp).toHaveAttribute("aria-invalid", "true");
    expect(otp).toHaveValue("000000");
    fireEvent.change(otp, { target: { value: "" } });
    fireEvent.change(otp, { target: { value: "123456" } });
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/account"));
  });

  it("rate limited: shows the countdown from retryAt", async () => {
    reply("/api/auth/otp/request", {
      status: 429,
      body: { error: { code: "RATE_LIMITED", retryAt: new Date(Date.now() + 42_000).toISOString() } },
    });
    renderWithIntl(<CustomerLoginForm />);
    fireEvent.change(screen.getByLabelText("رقم الجوال"), { target: { value: "551234567" } });
    await userEvent.click(screen.getByRole("button", { name: "أرسل رمز التحقق" }));
    const banner = await screen.findByRole("status");
    expect(banner).toHaveTextContent("محاولات كثيرة");
    expect(banner.textContent).toMatch(/00:4[12]/);
  });
});

describe("StaffLoginForm (D31)", () => {
  async function submit(email = "owner@example.com", password = "secret-pass") {
    await userEvent.type(screen.getByLabelText("البريد الإلكتروني"), email);
    await userEvent.type(screen.getByLabelText("كلمة المرور"), password);
    await userEvent.click(screen.getByRole("button", { name: "دخول" }));
  }

  it("no 2FA: goes straight to the area; never sends extra keys (strict schema)", async () => {
    reply("/api/auth/staff/login", { status: 200, body: { ok: true, requires2fa: false, area: "vendor" } });
    renderWithIntl(<StaffLoginForm next="/admin/orders" />);
    await submit();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/vendor"));
    expect(posted("/api/auth/staff/login")[0]!.body).toEqual({ email: "owner@example.com", password: "secret-pass" });
    expect(screen.queryByText("تذكر هذا الجهاز 30 يوماً")).toBeNull();
  });

  it("requires2fa: shows the code step with 'remember this device', then posts the code", async () => {
    reply("/api/auth/staff/login", { status: 200, body: { ok: true, requires2fa: true, area: "admin" } });
    reply("/api/auth/staff/2fa/verify", { status: 200, body: { ok: true, area: "admin" } });
    renderWithIntl(<StaffLoginForm next="/admin/orders" />);
    await submit();
    await screen.findByRole("heading", { name: "رمز التحقق" });
    await userEvent.click(screen.getByRole("checkbox", { name: "تذكر هذا الجهاز 30 يوماً" }));
    fireEvent.change(screen.getByLabelText("رمز التحقق من 6 أرقام"), { target: { value: "654321" } });
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/admin/orders"));
    expect(posted("/api/auth/staff/2fa/verify")[0]!.body).toEqual({ code: "654321", rememberDevice: true });
  });

  it("bad credentials: one generic message, password field not blamed", async () => {
    reply("/api/auth/staff/login", { status: 401, body: { error: { code: "INVALID_CREDENTIALS" } } });
    renderWithIntl(<StaffLoginForm />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    expect(screen.getByLabelText("كلمة المرور")).toHaveAttribute("aria-invalid", "false");
  });

  it("resumes at the 2FA step when the session is pending (page reload)", async () => {
    reply("/api/auth/session", { status: 200, body: { authenticated: false, requires2fa: true } });
    renderWithIntl(<StaffLoginForm />);
    expect(await screen.findByRole("heading", { name: "رمز التحقق" })).toBeInTheDocument();
  });
});

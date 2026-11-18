"use client";

/**
 * Interactive parts of the dev component catalogue (D30: dev/test only). Section titles are component
 * names (identifiers, not product copy); every visible product string comes from messages.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Money } from "@/components/store/price";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input, PhoneInput } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { toast } from "@/components/ui/toaster";
import { normalizeSaudiMobile } from "@/lib/phone";
import type { OrderRow } from "./fixtures";

export function OtpDemo() {
  const t = useTranslations("auth.otp");
  const [v, setV] = useState("");
  const [bad, setBad] = useState("4719");
  return (
    <div className="flex flex-col gap-6">
      <OtpInput label={t("label")} value={v} onValueChange={setV} onComplete={() => toast.success(t("label"))} />
      <OtpInput label={t("label")} value={bad} onValueChange={setBad} aria-invalid />
    </div>
  );
}

const demoSchema = z.object({
  email: z.string().pipe(z.email({ message: "emailInvalid" })),
  phone: z.string().refine((s) => normalizeSaudiMobile(s) !== null, { message: "phoneInvalid" }),
});

export function FormDemo() {
  const ts = useTranslations("auth.staff");
  const tc = useTranslations("auth.customer");
  const form = useForm<z.infer<typeof demoSchema>>({ resolver: zodResolver(demoSchema), defaultValues: { email: "", phone: "" } });
  const tr = (k: string) => (k === "emailInvalid" ? ts("emailInvalid") : tc("phoneInvalid"));
  return (
    <form noValidate onSubmit={form.handleSubmit(() => toast.success(ts("submit")))} className="flex max-w-md flex-col gap-4">
      <FormField
        control={form.control}
        name="email"
        label={ts("emailLabel")}
        required
        translateError={tr}
        render={({ field, a11y }) => <Input {...field} {...a11y} type="email" dir="ltr" className="rtl:text-end" />}
      />
      <FormField
        control={form.control}
        name="phone"
        label={tc("phoneLabel")}
        hint={tc("phoneHint")}
        required
        translateError={tr}
        render={({ field, a11y }) => <PhoneInput {...field} {...a11y} />}
      />
      <Checkbox id="demo-remember" label={ts("rememberDevice")} hint={ts("rememberDeviceHint")} />
      <Button type="submit">{ts("submit")}</Button>
    </form>
  );
}

export function OverlayDemo() {
  const tc = useTranslations("common");
  const tm = useTranslations("store.menu");
  const te = useTranslations("errors");
  return (
    <div className="flex flex-wrap gap-3">
      {(["dialog", "bottom", "start", "end"] as const).map((side) => (
        <Dialog key={side}>
          <DialogTrigger asChild>
            <Button variant="outline">{side}</Button>
          </DialogTrigger>
          <DialogContent side={side} title={tm("guestTitle")} description={tm("guestBody")} closeLabel={tc("close")}>
            <div className="p-4">
              <Button full>{tc("close")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      ))}
      <Button variant="secondary" onClick={() => toast.success(tm("guestTitle"))}>
        toast.success
      </Button>
      <Button variant="secondary" onClick={() => toast.error(te("network"))}>
        toast.error
      </Button>
    </div>
  );
}

export function TableDemo({ rows }: { rows: OrderRow[] }) {
  const tt = useTranslations("table");
  const tc = useTranslations("common");
  const ta = useTranslations("admin.nav");
  const columns: ColumnDef<OrderRow, unknown>[] = [
    { header: "#", accessorKey: "number", meta: { numeric: true, sortKey: "number" }, cell: (c) => <bdi dir="ltr">{`SZ-${c.getValue<number>()}`}</bdi> },
    { header: ta("customers"), accessorKey: "customer" },
    { header: ta("orders"), accessorKey: "status", cell: (c) => <StatusBadge entity="subOrder" status={c.row.original.status} size="sm" /> },
    { header: ta("finance"), accessorKey: "totalHalalas", meta: { numeric: true, sortKey: "total" }, cell: (c) => <Money halalas={c.getValue<number>()} /> },
  ];
  const empty = <EmptyState title={tt("empty")} action={<Button>{tc("retry")}</Button>} />;
  return (
    <div className="flex flex-col gap-8">
      <DataTable caption={ta("orders")} columns={columns} data={rows} getRowId={(r) => r.id} empty={empty} pagination={{ page: 1, pageSize: 5, total: 23 }} dense />
      <DataTable caption={ta("orders")} columns={columns} data={[]} getRowId={(r) => r.id} empty={empty} />
      <DataTable caption={ta("orders")} columns={columns} data={[]} getRowId={(r) => r.id} empty={empty} status="loading" />
    </div>
  );
}

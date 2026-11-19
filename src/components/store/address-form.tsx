"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/form-field";
import { Input, PhoneInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { addressInput, type AddressDTO, type AddressInput, type CityDTO } from "@/features/cart/schema";
import type { ActionResult } from "@/features/common/schema";
import { normalizeSaudiMobile } from "@/lib/phone";

const FIELDS = [
  "label",
  "recipientName",
  "recipientPhone",
  "cityId",
  "district",
  "street",
  "buildingNo",
  "postalCode",
  "nationalAddressShort",
] as const;
type Field = (typeof FIELDS)[number];

/** "+9665XXXXXXXX" -> "5XXXXXXXX" for the field after the +966 prefix. */
function localPhone(e164: string) {
  return e164.startsWith("+966") ? e164.slice(4) : e164;
}

/**
 * Address form (AccountAddresses-mobile, Checkout-desktop step 1): validated with the backend's
 * `addressInput` schema on submit (same rules as the server), errors inline per field + focus on
 * the first one; server VALIDATION issues map to the same fields. Optional fields send null.
 */
export function AddressForm<T>({
  cities,
  initial,
  submit,
  onSuccess,
  submitLabel,
  onCancel,
  footer,
}: {
  cities: CityDTO[];
  initial?: AddressDTO | null;
  submit: (values: AddressInput) => Promise<ActionResult<T>>;
  onSuccess: (data: T) => void;
  submitLabel: string;
  onCancel?: () => void;
  footer?: ReactNode;
}) {
  const t = useTranslations("address");
  const te = useTranslations("actionErrors");
  const uid = useId();
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [pending, start] = useTransition();
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  const show = (issues: { path: string }[]) => {
    const next: Partial<Record<Field, string>> = {};
    for (const i of issues) {
      const f = i.path.split(".")[0] as Field;
      if (FIELDS.includes(f) && !next[f]) next[f] = t(`errors.${f}`);
    }
    setErrors(next);
    const firstField = FIELDS.find((f) => next[f]);
    if (firstField) document.getElementById(`${uid}-${firstField}`)?.focus();
    return Object.keys(next).length > 0;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const val = (k: Field) => {
      const v = String(fd.get(k) ?? "").trim();
      return v === "" ? null : v;
    };
    const values = {
      label: val("label"),
      recipientName: val("recipientName") ?? "",
      recipientPhone: normalizeSaudiMobile(val("recipientPhone") ?? "") ?? "",
      cityId: val("cityId") ?? "",
      district: val("district") ?? "",
      street: val("street") ?? "",
      buildingNo: val("buildingNo"),
      postalCode: val("postalCode"),
      nationalAddressShort: val("nationalAddressShort"),
      isDefault,
    };
    const parsed = addressInput.safeParse(values);
    if (!parsed.success) {
      show(parsed.error.issues.map((i) => ({ path: i.path.join(".") })));
      return;
    }
    setErrors({});
    start(async () => {
      try {
        const res = await submit(values);
        if (res.ok) onSuccess(res.data);
        else if (res.code === "VALIDATION" && res.issues?.length && show(res.issues)) return;
        else toast.error(te.has(res.code) ? te(res.code) : te("INTERNAL"));
      } catch {
        toast.error(te("NETWORK"));
      }
    });
  };

  const field = (name: Field, input: ReactNode, opts: { required?: boolean; hint?: string; label?: string } = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${uid}-${name}`}>
        {opts.label ?? t(name)}
        {opts.required ? (
          <span aria-hidden="true" className="text-danger">
            {" *"}
          </span>
        ) : null}
      </Label>
      {input}
      {opts.hint && !errors[name] ? (
        <p id={`${uid}-${name}-hint`} className="text-xs text-muted-foreground">
          {opts.hint}
        </p>
      ) : null}
      {errors[name] ? <FieldError id={`${uid}-${name}-error`}>{errors[name]}</FieldError> : null}
    </div>
  );
  const a11y = (name: Field, required?: boolean, hint?: boolean) => ({
    id: `${uid}-${name}`,
    name,
    "aria-invalid": !!errors[name],
    "aria-required": required || undefined,
    "aria-describedby": errors[name] ? `${uid}-${name}-error` : hint ? `${uid}-${name}-hint` : undefined,
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5" aria-busy={pending}>
      {field(
        "label",
        <Input
          {...a11y("label")}
          defaultValue={initial?.label ?? ""}
          placeholder={t("labelPlaceholder")}
          maxLength={40}
        />,
      )}
      {field(
        "recipientName",
        <Input
          {...a11y("recipientName", true)}
          defaultValue={initial?.recipientName ?? ""}
          autoComplete="name"
          maxLength={80}
        />,
        { required: true },
      )}
      {field(
        "recipientPhone",
        <PhoneInput
          {...a11y("recipientPhone", true, true)}
          prefix="+966"
          defaultValue={initial ? localPhone(initial.recipientPhone) : ""}
          placeholder="5X XXX XXXX"
          maxLength={12}
        />,
        { required: true, hint: t("phoneHint") },
      )}
      {field(
        "cityId",
        <Select {...a11y("cityId", true)} defaultValue={initial?.city.id ?? ""} autoComplete="address-level2">
          <option value="" disabled>
            {t("cityPlaceholder")}
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>,
        { required: true },
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {field(
          "district",
          <Input {...a11y("district", true)} defaultValue={initial?.district ?? ""} maxLength={80} />,
          { required: true },
        )}
        {field(
          "buildingNo",
          <Input
            {...a11y("buildingNo")}
            numeric
            inputMode="numeric"
            defaultValue={initial?.buildingNo ?? ""}
            maxLength={10}
          />,
        )}
      </div>
      {field(
        "street",
        <Input
          {...a11y("street", true)}
          defaultValue={initial?.street ?? ""}
          autoComplete="address-line1"
          maxLength={120}
        />,
        {
          required: true,
        },
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {field(
          "postalCode",
          <Input
            {...a11y("postalCode")}
            numeric
            inputMode="numeric"
            defaultValue={initial?.postalCode ?? ""}
            autoComplete="postal-code"
            maxLength={5}
          />,
        )}
        {field(
          "nationalAddressShort",
          <Input
            {...a11y("nationalAddressShort", false, true)}
            dir="ltr"
            defaultValue={initial?.nationalAddressShort ?? ""}
            placeholder="ABCD1234"
            maxLength={8}
            className="uppercase rtl:text-end"
          />,
          { hint: t("nationalHint") },
        )}
      </div>
      <Checkbox
        id={`${uid}-default`}
        label={t("isDefault")}
        checked={isDefault}
        onCheckedChange={(c) => setIsDefault(c === true)}
      />
      {footer}
      <div className="flex gap-2.5">
        {onCancel ? (
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
        <Button type="submit" size="lg" loading={pending} className="flex-[2]">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { addressLine } from "@/components/store/checkout-address-step";
import { AddressForm } from "@/components/store/address-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import type { AddressDTO, AddressInput, CityDTO } from "@/features/cart/schema";
import type { ActionResult } from "@/features/common/schema";
import { formatSaudiMobile } from "@/lib/phone";
import { cn } from "@/lib/utils";

export type SaveAddressWithIdAction = (input: AddressInput & { id?: string }) => Promise<ActionResult<AddressDTO>>;
export type DeleteAddressAction = (id: string) => Promise<ActionResult<null>>;

function toInput(a: AddressDTO): AddressInput & { id: string } {
  return {
    id: a.id,
    label: a.label,
    recipientName: a.recipientName,
    recipientPhone: a.recipientPhone,
    cityId: a.city.id,
    district: a.district,
    street: a.street,
    buildingNo: a.buildingNo,
    postalCode: a.postalCode,
    nationalAddressShort: a.nationalAddressShort,
    isDefault: a.isDefault,
  };
}

/**
 * Address book (AccountAddresses-mobile): cards (default first, with the accent badge), edit in
 * place, "make default", delete behind a confirm dialog (focus starts on Cancel), and the new
 * address form. The list is replaced from the server's answers only.
 */
export function AddressBook({
  initial,
  cities,
  max,
  save,
  remove,
}: {
  initial: AddressDTO[];
  cities: CityDTO[];
  max: number;
  save: SaveAddressWithIdAction;
  remove: DeleteAddressAction;
}) {
  const t = useTranslations("accountArea.addresses");
  const te = useTranslations("actionErrors");
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(initial.length ? null : "new");
  const [confirm, setConfirm] = useState<AddressDTO | null>(null);
  const [pending, start] = useTransition();

  const upsert = (a: AddressDTO) =>
    setList((l) => {
      const rest = l.filter((x) => x.id !== a.id).map((x) => (a.isDefault ? { ...x, isDefault: false } : x));
      return [...rest, a].sort((x, y) => Number(y.isDefault) - Number(x.isDefault));
    });

  const fail = (code: string) => toast.error(te.has(code) ? te(code) : te("INTERNAL"));

  const makeDefault = (a: AddressDTO) =>
    start(async () => {
      try {
        const res = await save({ ...toInput(a), isDefault: true });
        if (res.ok) {
          upsert(res.data);
          toast.success(t("saved"));
        } else fail(res.code);
      } catch {
        fail("NETWORK");
      }
    });

  const doDelete = (a: AddressDTO) =>
    start(async () => {
      try {
        const res = await remove(a.id);
        if (res.ok) {
          setList((l) => l.filter((x) => x.id !== a.id));
          toast.success(t("deleted"));
        } else fail(res.code);
      } catch {
        fail("NETWORK");
      } finally {
        setConfirm(null);
      }
    });

  const name = (a: AddressDTO) => a.label ?? a.recipientName;

  return (
    <div className="flex flex-col gap-3">
      {!list.length && editing !== "new" ? (
        <EmptyState
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={<Button onClick={() => setEditing("new")}>{t("add")}</Button>}
          className="rounded-lg bg-card"
        />
      ) : null}
      <ul role="list" className="grid gap-3 md:grid-cols-2">
        {list.map((a) => (
          <li
            key={a.id}
            className={cn(
              "flex flex-col gap-2 rounded-lg bg-card p-4",
              a.isDefault ? "border-[1.5px] border-border-strong" : "border border-border",
              editing === a.id && "md:col-span-2",
            )}
          >
            {editing === a.id ? (
              <AddressForm
                cities={cities}
                initial={a}
                submit={(v) => save({ ...v, id: a.id })}
                submitLabel={t("save")}
                onCancel={() => setEditing(null)}
                onSuccess={(saved) => {
                  upsert(saved);
                  setEditing(null);
                  toast.success(t("saved"));
                }}
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold">{name(a)}</h2>
                  {a.isDefault ? <Badge tone="accent">{t("default")}</Badge> : null}
                </div>
                <p className="text-sm text-foreground-secondary">
                  {a.recipientName} · <bdi dir="ltr">{formatSaudiMobile(a.recipientPhone)}</bdi>
                </p>
                <p className="text-sm text-foreground-secondary">{addressLine(a)}</p>
                <div className="mt-1 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setEditing(a.id)}
                    aria-label={t("editNamed", { name: name(a) })}
                  >
                    <Pencil aria-hidden="true" />
                    {t("edit")}
                  </Button>
                  {!a.isDefault ? (
                    <Button variant="ghost" className="flex-1" disabled={pending} onClick={() => makeDefault(a)}>
                      {t("makeDefault")}
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("delete", { name: name(a) })}
                    onClick={() => setConfirm(a)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {editing === "new" ? (
        <section aria-labelledby="new-addr" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h2 id="new-addr" className="text-base font-bold">
            {t("new")}
          </h2>
          <AddressForm
            cities={cities}
            submit={(v) => save(v)}
            submitLabel={t("save")}
            onCancel={list.length ? () => setEditing(null) : undefined}
            onSuccess={(saved) => {
              upsert(saved);
              setEditing(null);
              toast.success(t("saved"));
            }}
          />
        </section>
      ) : list.length < max ? (
        <Button variant="outline" className="self-start" onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t("limit", { max })}</p>
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        {confirm ? (
          <DialogContent
            title={t("deleteTitle")}
            description={t("deleteBody", { name: name(confirm) })}
            closeLabel={t("cancel")}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              document.getElementById("addr-del-cancel")?.focus();
            }}
          >
            <div className="flex gap-2.5 p-4">
              <DialogClose asChild>
                <Button id="addr-del-cancel" variant="secondary" className="flex-1">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button variant="destructive" className="flex-1" loading={pending} onClick={() => doDelete(confirm)}>
                {t("deleteConfirm")}
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

"use client";

import { AlertCircle, GripVertical, Star, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type Dispatch, type DragEvent, type KeyboardEvent, type SetStateAction } from "react";
import { cn } from "@/lib/utils";
import {
  IMAGE_MAX_COUNT,
  IMAGE_TYPES,
  UploadError,
  compressImage,
  precheck,
  uploadProductImage,
  type UploadErrorCode,
} from "./image-upload-client";

export type ImageItem =
  | { key: string; status: "done"; path: string; url: string; alt: string }
  | { key: string; status: "uploading"; previewUrl: string; progress: number; alt: string; file: File }
  | { key: string; status: "error"; previewUrl: string; code: UploadErrorCode; alt: string; file: File };

let seq = 0;
const newKey = () => `img-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export type UploadFn = typeof uploadProductImage;

/**
 * ImageUploader (README 4.6): drop zone (drag or choose; JPG/PNG/WebP, <= 5MB, <= 10 images),
 * per-file progress and error with "retry", the first image is the cover, alt text per image, and
 * reordering by drag OR keyboard (handle + arrow keys, Home/End), announced in role="status".
 * Controlled: the form owns `items`; only `done` items are saved (the form blocks saving while an
 * upload is running or failed).
 */
export function ImageUploader({
  items,
  setItems,
  upload = uploadProductImage,
  label,
}: {
  items: ImageItem[];
  setItems: Dispatch<SetStateAction<ImageItem[]>>;
  upload?: UploadFn;
  label: string;
}) {
  const t = useTranslations("admin.images");
  const inputRef = useRef<HTMLInputElement>(null);
  const [announce, setAnnounce] = useState("");
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const hintId = useId();

  const patch = (key: string, next: ImageItem) => setItems((list) => list.map((x) => (x.key === key ? next : x)));

  const run = async (key: string, file: File, alt: string, previewUrl: string) => {
    patch(key, { key, status: "uploading", previewUrl, progress: 0, alt, file });
    try {
      const blob = await compressImage(file);
      const res = await upload(blob, file.name, (progress) =>
        setItems((list) => list.map((x) => (x.key === key && x.status === "uploading" ? { ...x, progress } : x))),
      );
      URL.revokeObjectURL(previewUrl);
      setItems((list) =>
        list.map((x) => (x.key === key ? { key, status: "done", path: res.path, url: res.url, alt: x.alt } : x)),
      );
    } catch (e) {
      const code = e instanceof UploadError ? e.code : "INTERNAL";
      setItems((list) =>
        list.map((x) => (x.key === key ? { key, status: "error", previewUrl, code, alt: x.alt, file } : x)),
      );
    }
  };

  const addFiles = (files: FileList | File[]) => {
    const room = IMAGE_MAX_COUNT - items.length;
    const list = Array.from(files);
    setLimitHit(list.length > room);
    for (const file of list.slice(0, Math.max(0, room))) {
      const key = newKey();
      const previewUrl = URL.createObjectURL(file);
      const bad = precheck(file);
      if (bad) {
        setItems((l) => [...l, { key, status: "error", previewUrl, code: bad, alt: "", file }]);
        continue;
      }
      setItems((l) => [...l, { key, status: "uploading", previewUrl, progress: 0, alt: "", file }]);
      void run(key, file, "", previewUrl);
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((list) => {
      const next = [...list];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it!);
      return next;
    });
    setAnnounce(t("moved", { from: from + 1, to: to + 1 }));
  };

  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const prevKey = rtl ? "ArrowRight" : "ArrowLeft";
    const nextKey = rtl ? "ArrowLeft" : "ArrowRight";
    let to: number | null = null;
    if (e.key === prevKey || e.key === "ArrowUp") to = i - 1;
    else if (e.key === nextKey || e.key === "ArrowDown") to = i + 1;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = items.length - 1;
    if (to == null) return;
    e.preventDefault();
    move(i, to);
    // keep focus on the moved image's handle
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-handle="${items[i]!.key}"]`)?.focus());
  };

  const remove = (key: string) => {
    const it = items.find((x) => x.key === key);
    if (it && it.status !== "done") URL.revokeObjectURL(it.previewUrl);
    setItems((list) => list.filter((x) => x.key !== key));
    setAnnounce(t("removed"));
  };

  const onDropZone = (e: DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="label text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDropActive(true);
          }
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={onDropZone}
        aria-describedby={hintId}
        disabled={items.length >= IMAGE_MAX_COUNT}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] border-dashed bg-background p-5 text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground",
          dropActive ? "border-border-strong bg-accent" : "border-input",
        )}
      >
        <Upload aria-hidden="true" className="size-6 text-foreground-secondary" />
        <strong className="text-sm">{t("drop")}</strong>
        <span id={hintId} className="text-xs text-muted-foreground">
          {t("hint", { max: IMAGE_MAX_COUNT })}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {limitHit ? (
        <p role="alert" className="text-sm text-danger">
          {t("limit", { max: IMAGE_MAX_COUNT })}
        </p>
      ) : null}

      {items.length ? (
        <ul aria-label={t("listLabel")} className="flex flex-wrap gap-3">
          {items.map((it, i) => {
            const src = it.status === "done" ? it.url : it.previewUrl;
            const altId = `${it.key}-alt`;
            return (
              <li
                key={it.key}
                draggable
                onDragStart={(e) => {
                  setDragKey(it.key);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (!dragKey) return;
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  if (!dragKey) return;
                  e.preventDefault();
                  move(
                    items.findIndex((x) => x.key === dragKey),
                    i,
                  );
                  setDragKey(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragKey(null);
                  setOverIndex(null);
                }}
                className={cn(
                  "relative flex w-32 flex-col gap-1.5",
                  dragKey === it.key && "opacity-60",
                  overIndex === i &&
                    dragKey !== it.key &&
                    "before:absolute before:inset-y-0 before:-start-2 before:w-1 before:rounded-full before:bg-foreground",
                )}
              >
                <div className="relative overflow-hidden rounded-md border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- storage/blob URLs, sizes vary */}
                  <img
                    src={src}
                    alt={it.alt || t("imageN", { n: i + 1 })}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  {i === 0 && it.status === "done" ? (
                    <span className="absolute start-1.5 top-1.5 inline-flex h-5 items-center gap-1 rounded-sm bg-gold-subtle px-1.5 text-xs font-semibold text-gold-text">
                      <Star aria-hidden="true" className="size-3" />
                      {t("cover")}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    data-handle={it.key}
                    aria-roledescription={t("handleRole")}
                    aria-label={t("handle", { n: i + 1 })}
                    onKeyDown={(e) => onHandleKey(e, i)}
                    className="absolute end-0.5 top-0.5 inline-flex size-9 cursor-grab items-center justify-center"
                  >
                    <span className="inline-flex size-7 items-center justify-center rounded-md bg-card/90 text-foreground">
                      <GripVertical aria-hidden="true" className="size-4" />
                    </span>
                  </button>
                  {it.status === "uploading" ? (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/85">
                      <span className="text-xs font-semibold">
                        {t("uploading")} <bdi dir="ltr">{it.progress}%</bdi>
                      </span>
                      <span aria-hidden="true" className="h-1 w-3/4 rounded-full bg-progress-track">
                        <span
                          className="block h-full rounded-full bg-progress-fill"
                          style={{ width: `${it.progress}%` }}
                        />
                      </span>
                    </span>
                  ) : null}
                  {it.status === "error" ? (
                    <span
                      role="alert"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md border border-danger bg-danger-subtle p-2 text-center"
                    >
                      <AlertCircle aria-hidden="true" className="size-4.5 text-danger" />
                      <span className="text-xs font-semibold text-danger">{t(`errors.${it.code}`)}</span>
                      {it.code !== "UPLOAD_REJECTED_TYPE" && it.code !== "UPLOAD_REJECTED_SIZE" ? (
                        <button
                          type="button"
                          onClick={() => void run(it.key, it.file, it.alt, it.previewUrl)}
                          className="min-h-8 cursor-pointer text-xs text-foreground underline"
                        >
                          {t("retry")}
                        </button>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                <label htmlFor={altId} className="sr-only">
                  {t("altLabel", { n: i + 1 })}
                </label>
                <input
                  id={altId}
                  value={it.alt}
                  maxLength={120}
                  placeholder={t("altPlaceholder")}
                  onChange={(e) => {
                    const alt = e.target.value;
                    setItems((list) => list.map((x) => (x.key === it.key ? { ...x, alt } : x)));
                  }}
                  className="h-9 w-full rounded-sm border border-input bg-card px-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => remove(it.key)}
                  aria-label={t("remove", { n: i + 1 })}
                  className="inline-flex min-h-8 cursor-pointer items-center gap-1 self-start text-xs text-danger hover:underline"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                  {t("removeShort")}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p role="status" className="text-xs text-muted-foreground">
        {announce || t("coverHint")}
      </p>
    </div>
  );
}

/** Items from saved images (edit form). Deterministic keys: they render on the server too (hydration). */
export function imageItemsFrom(images: { path: string; url: string; alt: string | null }[]): ImageItem[] {
  return images.map((im, i) => ({ key: `saved-${i}`, status: "done", path: im.path, url: im.url, alt: im.alt ?? "" }));
}

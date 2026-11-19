"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-image";
import type { ImageVM } from "./types";

/**
 * ImageGallery pdp (Product-mobile / Product-desktop): 4:5 main image. Mobile: native horizontal
 * scroll-snap (swipe, no library) + counter + thumbnails under it; desktop: thumbnails column at the
 * start. Thumbnails are buttons with aria-current; the first image is server-rendered with priority
 * (LCP). Without JS every image is still in the scroller.
 */
export function ProductGallery({ images, name }: { images: ImageVM[]; name: string }) {
  const t = useTranslations("product.gallery");
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const list = images.length ? images : [null];

  const go = (i: number) => {
    setIndex(i);
    const el = scroller.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  return (
    <div className="flex flex-col gap-2.5 lg:flex-row-reverse lg:gap-4">
      <div className="relative min-w-0 flex-1">
        <div
          ref={scroller}
          tabIndex={0}
          role="group"
          aria-roledescription={t("carousel")}
          aria-label={t("label", { name })}
          className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto lg:overflow-hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth));
            if (i !== index && i < list.length) setIndex(i);
          }}
        >
          {list.map((img, i) => (
            <div
              key={img?.url ?? i}
              className="w-full shrink-0 snap-start"
              aria-hidden={i !== index ? "true" : undefined}
            >
              <ProductImage
                image={img}
                sizes="(min-width: 1024px) 640px, 100vw"
                priority={i === 0}
                className="rounded-none lg:rounded-lg"
              />
            </div>
          ))}
        </div>
        {list.length > 1 ? (
          <span
            aria-hidden="true"
            className="absolute start-3 bottom-3 rounded-full bg-inverse px-2.5 py-0.5 text-xs font-semibold text-inverse-foreground lg:hidden"
          >
            <bdi dir="ltr">
              {index + 1} / {list.length}
            </bdi>
          </span>
        ) : null}
      </div>
      {images.length > 1 ? (
        <ul
          aria-label={t("thumbs")}
          className="flex gap-2 overflow-x-auto px-4 lg:w-21 lg:shrink-0 lg:flex-col lg:overflow-visible lg:px-0"
        >
          {images.map((img, i) => (
            <li key={img.url} className="w-15 shrink-0 lg:w-full">
              <button
                type="button"
                aria-label={t("show", { n: i + 1, total: images.length })}
                aria-current={i === index ? "true" : undefined}
                onClick={() => go(i)}
                className={cn(
                  "block w-full overflow-hidden rounded-sm border",
                  i === index ? "border-2 border-border-strong" : "border-border",
                )}
              >
                <ProductImage image={img} sizes="84px" className="rounded-none" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

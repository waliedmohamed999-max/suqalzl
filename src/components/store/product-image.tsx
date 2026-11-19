import { ImageOff } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ImageVM } from "./types";

const RATIOS = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  none: "",
} as const;

/**
 * Product/bundle/banner image inside a fixed aspect box (4:5 for products, README 5 #4), so the
 * layout never shifts even though the DTO has no intrinsic size (`fill` + object-cover).
 * `unoptimized` until the derived-image loader is decided (review 2.3 note 9): the seed ships SVG
 * illustrations and the storage host is environment-specific. One LCP image per page: `priority`.
 */
export function ProductImage({
  image,
  sizes,
  priority,
  ratio = "portrait",
  className,
}: {
  image: ImageVM | null;
  sizes: string;
  priority?: boolean;
  ratio?: keyof typeof RATIOS;
  className?: string;
}) {
  const box = cn("relative w-full overflow-hidden rounded-md bg-muted", RATIOS[ratio], className);
  if (!image) {
    return (
      <div className={cn(box, "flex items-center justify-center text-muted-foreground")}>
        <ImageOff aria-hidden="true" className="size-8" />
      </div>
    );
  }
  return (
    <div className={box}>
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        className="object-cover"
      />
    </div>
  );
}

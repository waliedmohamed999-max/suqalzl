import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** 4:5 product thumbnail (tokens 12.3). Decorative next to the product name, so alt="". */
export function Thumb({ src, size = 44, className }: { src: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted text-muted-foreground",
        className,
      )}
      style={{ width: size, aspectRatio: "4 / 5" }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- storage URLs, tiny fixed size
        <img src={src} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <ImageOff aria-hidden="true" className="size-4" />
      )}
    </span>
  );
}

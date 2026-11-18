import { useTranslations } from "next-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { statusTone, type StatusEntity, type StatusOf } from "./status-map";

/**
 * StatusBadge (tokens.md 11.1): tone, icon and text all come from the map, so a status always has
 * text + icon + colour. `<StatusBadge entity="subOrder" status="SHIPPED" />`
 */
export function StatusBadge<E extends StatusEntity>({
  entity,
  status,
  size,
  className,
}: {
  entity: E;
  status: StatusOf<E>;
  size?: BadgeProps["size"];
  className?: string;
}) {
  const t = useTranslations("status");
  const { tone, solid } = statusTone(entity, status);
  return (
    <Badge tone={tone} variant={solid ? "solid" : "subtle"} size={size} className={className}>
      {t(`${entity}.${status}` as never)}
    </Badge>
  );
}

import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <main id="main">
      <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
    </main>
  );
}

/**
 * JSON-LD data block (Product, BreadcrumbList…). Not executable, so CSP does not apply; "<" is
 * escaped so text from the catalogue can never close the script element.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

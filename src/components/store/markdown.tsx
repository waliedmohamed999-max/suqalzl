import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Minimal, safe Markdown -> React for policy pages (features/pages: content is MARKDOWN; raw HTML
 * must never be injected). Supports what the legal drafts use: #/##/### headings, paragraphs,
 * "-"/"*" and "1." lists, > quotes, --- rules, **bold**, *italic*, `code` and [text](url).
 * Everything else is plain text, escaped by React. Links: internal paths through the locale-aware
 * Link, external http(s)/mailto/tel with rel=noopener; any other scheme is dropped (text kept).
 * Page headings start at h2 (the page title is the h1).
 */
type Block =
  | { t: "h"; level: 2 | 3 | 4; text: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "hr" };

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  let list: { t: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: "p", text: para.join(" ") });
    if (list) out.push(list);
    if (quote.length) out.push({ t: "quote", text: quote.join(" ") });
    para = [];
    list = null;
    quote = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const n = (h[1] as string).length;
      out.push({ t: "h", level: (n <= 2 ? 2 : n === 3 ? 3 : 4) as 2 | 3 | 4, text: h[2] as string });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flush();
      out.push({ t: "hr" });
      continue;
    }
    const ul = /^[-*+]\s+(.*)$/.exec(line);
    const ol = /^\d{1,3}[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      if (para.length || quote.length || (list && list.t !== kind)) flush();
      list ??= { t: kind, items: [] };
      list.items.push(((ul ?? ol) as RegExpExecArray)[1] as string);
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      if (para.length || list) flush();
      quote.push(q[1] as string);
      continue;
    }
    if (list && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line}`;
      continue;
    }
    if (list || quote.length) flush();
    para.push(line);
  }
  flush();
  return out;
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;

function safeHref(href: string): { internal: boolean; href: string } | null {
  if (/^\/(?!\/)/.test(href)) return { internal: true, href };
  if (/^(https?:|mailto:|tel:)/i.test(href)) return { internal: false, href };
  return null;
}

export function renderInline(text: string, keyBase = "i"): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return <code key={key}>{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const label = link[1] as string;
      const target = safeHref(link[2] as string);
      if (!target) return label;
      return target.internal ? (
        <Link key={key} href={target.href} className="text-link underline">
          {label}
        </Link>
      ) : (
        <a key={key} href={target.href} rel="noopener noreferrer" className="text-link underline">
          {label}
        </a>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function Markdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className="flex flex-col gap-4 text-base leading-7 text-foreground">
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.t) {
          case "h": {
            const H = `h${b.level}` as "h2" | "h3" | "h4";
            return (
              <H key={k} className={b.level === 2 ? "mt-4 text-xl font-bold" : "mt-2 text-lg font-semibold"}>
                {renderInline(b.text, k)}
              </H>
            );
          }
          case "p":
            return <p key={k}>{renderInline(b.text, k)}</p>;
          case "ul":
            return (
              <ul key={k} className="flex list-disc flex-col gap-1.5 ps-6">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${k}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={k} className="flex list-decimal flex-col gap-1.5 ps-6">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${k}-${j}`)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={k} className="border-s-[3px] border-gold bg-muted px-4 py-3">
                {renderInline(b.text, k)}
              </blockquote>
            );
          case "hr":
            return <hr key={k} className="border-border" />;
        }
      })}
    </div>
  );
}

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Kompaktes, Token-gestyltes Markdown für Assistenten-Antworten.
 * Bewusst kleine Überschriften (das Chat-Panel ist schmal) und kein rohes HTML
 * (react-markdown ist standardmäßig XSS-sicher).
 */
const COMPONENTS: Components = {
  h1: ({ children }) => <p className="mt-2 mb-1 text-sm font-bold text-ink">{children}</p>,
  h2: ({ children }) => <p className="mt-2 mb-1 text-sm font-bold text-ink">{children}</p>,
  h3: ({ children }) => <p className="mt-2 mb-1 text-sm font-semibold text-ink">{children}</p>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[0.85em] text-ink">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-md bg-surface-muted p-2 text-xs">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-border pl-3 text-ink-soft">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-surface-muted px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
  hr: () => <hr className="my-3 border-border" />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm text-ink-soft">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

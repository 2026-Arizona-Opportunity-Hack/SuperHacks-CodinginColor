import { Fragment } from "react";

/**
 * Tiny, safe Markdown subset for curriculum text: paragraphs, **bold**, `code`, and
 * code blocks (lines indented 4 spaces or slide bodies). Builds React nodes, never raw HTML,
 * so author or AI-generated content cannot inject scripts.
 */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} dir="ltr">
        {p.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    )
  );
}

export function Markdown({ text, codeLike = false }: { text: string; codeLike?: boolean }) {
  if (codeLike) {
    // Slide bodies: lines that look like code render as a code block, the rest as text.
    const blocks: { code: boolean; lines: string[] }[] = [];
    for (const line of text.split("\n")) {
      const isCode = /[=():#\[\]]|^\s{4}|print|def |for |if |else|elif|return/.test(line) && !/^[A-Z][^=]*\.$/.test(line.trim());
      const last = blocks[blocks.length - 1];
      if (last && last.code === isCode) last.lines.push(line);
      else blocks.push({ code: isCode, lines: [line] });
    }
    return (
      <div className="prose-lite">
        {blocks.map((b, i) =>
          b.code ? (
            <pre key={i} dir="ltr">
              {b.lines.join("\n").trim()}
            </pre>
          ) : (
            b.lines.filter((l) => l.trim()).map((l, j) => <p key={`${i}-${j}`}>{inline(l)}</p>)
          )
        )}
      </div>
    );
  }
  return (
    <div className="prose-lite">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>{inline(para)}</p>
      ))}
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * Footnotes section wrapper - renders at the bottom with separator line.
 */
export function Footnotes({ children }: { children: ReactNode }) {
  return (
    <section className="footnotes-section">
      {children}
    </section>
  );
}

/**
 * Individual footnote using details/summary for collapsible content.
 * Styled to match traditional footnote aesthetics.
 */
export function Footnote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="footnote-item">
      <summary>{title}</summary>
      <div className="footnote-content">{children}</div>
    </details>
  );
}


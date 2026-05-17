"use client";

import type { ReactNode } from "react";

type AtriumIntakeSurfaceProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  body: ReactNode;
  findings: ReactNode;
  footer: ReactNode;
  onCancel: () => void;
};

export function AtriumIntakeSurface({
  title,
  subtitle,
  children,
  body,
  findings,
  footer,
  onCancel,
}: AtriumIntakeSurfaceProps) {
  return (
    <section className="atrium-original-check" aria-labelledby="agentic-check-title">
      <aside className="atrium-original-check-list" aria-label="Check sections">
        <header>
          <strong>CHECK</strong>
          <span>3</span>
        </header>
        <button type="button" onClick={onCancel} aria-label="Back">
          ‹
        </button>
        <nav>
          <span className="active">Intake</span>
          <span>Atrium</span>
          <span>Summary</span>
        </nav>
      </aside>

      <main className="atrium-original-check-main">
        <header className="atrium-original-check-head">
          <span className="atrium-original-check-avatar">A</span>
          <h1>Atrium</h1>
          <button type="button" onClick={onCancel}>Cancel Check</button>
        </header>

        <section className="atrium-original-question-card">
          <span>New Check</span>
          <h2 id="agentic-check-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </section>

        {children}
      </main>

      <aside className="atrium-original-check-visual" aria-label="Atrium body intake">
        {body}
        {findings}
      </aside>

      {footer}
    </section>
  );
}

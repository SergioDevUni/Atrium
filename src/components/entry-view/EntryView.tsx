"use client";

import { ArrowRight, Grid2X2, HeartPulse } from "lucide-react";

type EntryViewProps = {
  onNewCheck: () => void;
  onDashboard: () => void;
};

export function EntryView({ onNewCheck, onDashboard }: EntryViewProps) {
  return (
    <section className="entry-view" aria-labelledby="home-title">
      <main className="entry-view-panel">
        <span>Body-first intake</span>
        <h1 id="home-title">Atrium</h1>
        <p>Start a guided check from the body view, or open the records workspace.</p>

        <div className="entry-choice-grid">
          <button type="button" className="entry-choice primary" onClick={onNewCheck}>
            <HeartPulse size={22} aria-hidden />
            <strong>New Check</strong>
            <span>Body View</span>
            <ArrowRight size={18} aria-hidden />
          </button>

          <button type="button" className="entry-choice" onClick={onDashboard}>
            <Grid2X2 size={22} aria-hidden />
            <strong>Dashboard</strong>
            <span>Records WIP</span>
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      </main>

      <footer className="entry-view-footer">
        <span>No diagnosis. Visit-prep and educational intake only.</span>
        <button type="button" onClick={onDashboard}>
          Open records
        </button>
      </footer>
    </section>
  );
}

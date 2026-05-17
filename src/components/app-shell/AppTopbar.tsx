"use client";

import {
  BriefcaseMedical,
  GitBranch,
  Globe2,
  HeartPulse,
  Home,
  LayoutDashboard,
  Save,
  Settings,
  UserCircle,
} from "lucide-react";
import type { Language } from "@/lib/types";
import type { AppView } from "./AppShell";

type AppTopbarProps = {
  hidden: boolean;
  activeView: AppView;
  language: Language;
  t: Record<string, string>;
  onHome: () => void;
  onNewCheck: () => void;
  onDashboard: () => void;
  onConditionTree: () => void;
  onLanguage: (language: Language) => void;
};

export function AppTopbar({
  hidden,
  activeView,
  language,
  t,
  onHome,
  onNewCheck,
  onDashboard,
  onConditionTree,
  onLanguage,
}: AppTopbarProps) {
  return (
    <header className="topbar" hidden={hidden}>
      <button className="brand" type="button" onClick={onHome} aria-label={t.backHome}>
        <BriefcaseMedical size={27} strokeWidth={2.1} aria-hidden />
        <span>Atrium</span>
      </button>

      <nav className="main-nav" aria-label="Primary">
        <button
          className={activeView === "home" ? "active" : ""}
          type="button"
          onClick={onHome}
          aria-current={activeView === "home" ? "page" : undefined}
        >
          <Home size={16} aria-hidden />
          {t.home}
        </button>
        <button
          className={activeView === "check" ? "active" : ""}
          type="button"
          onClick={onNewCheck}
          aria-current={activeView === "check" ? "page" : undefined}
        >
          <HeartPulse size={16} aria-hidden />
          {t.newCheck}
        </button>
        <button
          className={activeView === "dashboard" ? "active" : ""}
          type="button"
          onClick={onDashboard}
          aria-current={activeView === "dashboard" ? "page" : undefined}
        >
          <LayoutDashboard size={16} aria-hidden />
          {t.dashboard}
        </button>
        <button
          className={activeView === "conditions" ? "active" : ""}
          type="button"
          onClick={onConditionTree}
          aria-current={activeView === "conditions" ? "page" : undefined}
        >
          <GitBranch size={16} aria-hidden />
          {t.conditionTree}
        </button>
      </nav>

      <div className="top-actions">
        <div className="advanced-actions">
          <div className="segmented" aria-label={t.language}>
            <button className={language === "en" ? "active" : ""} type="button" onClick={() => onLanguage("en")}>
              <Globe2 size={16} aria-hidden />
              EN
            </button>
            <button className={language === "es" ? "active" : ""} type="button" onClick={() => onLanguage("es")}>
              <Globe2 size={16} aria-hidden />
              ES
            </button>
          </div>
          <span className="saved-status" role="status" aria-label={t.saved}>
            <Save size={16} aria-hidden />
            {t.saved}
          </span>
        </div>
        <button className="icon-button" type="button" aria-label={t.settings}>
          <Settings size={22} strokeWidth={2.1} aria-hidden />
        </button>
        <button className="icon-button" type="button" aria-label={t.profile}>
          <UserCircle size={24} strokeWidth={2.1} aria-hidden />
        </button>
      </div>
    </header>
  );
}

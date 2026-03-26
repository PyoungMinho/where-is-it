"use client";

import React from "react";
import { useTheme, type Theme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    {
      value: "light",
      label: t.lightMode,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
    },
    {
      value: "dark",
      label: t.darkMode,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ),
    },
    {
      value: "system",
      label: t.systemMode,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
  ];

  return (
    <div className="inline-flex overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className="flex items-center justify-center px-2 py-1.5 transition-all"
          style={{
            background: theme === opt.value ? "var(--accent)" : "transparent",
            color: theme === opt.value ? "white" : "var(--text-tertiary)",
          }}
          title={opt.label}
          aria-label={opt.label}
          aria-pressed={theme === opt.value}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

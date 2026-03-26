"use client";

import { useI18n } from "@/lib/i18n";

type EmptyStateProps = {
  type: "home" | "room" | "location" | "item";
  action?: () => void;
  actionLabel?: string;
};

const icons = {
  home: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="28" width="40" height="28" rx="3" fill="var(--accent-light)" stroke="var(--accent)" strokeWidth="2" />
      <path d="M8 30L32 12L56 30" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="26" y="40" width="12" height="16" rx="1" fill="var(--accent-lighter)" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="36" cy="48" r="1.2" fill="var(--accent)" />
    </svg>
  ),
  room: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="10" y="14" width="44" height="36" rx="3" fill="var(--accent-light)" stroke="var(--accent)" strokeWidth="2" />
      <line x1="10" y1="32" x2="54" y2="32" stroke="var(--accent-lighter)" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="32" y1="14" x2="32" y2="50" stroke="var(--accent-lighter)" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="32" y="58" textAnchor="middle" fontSize="8" fill="var(--accent)" fontWeight="600">ROOM</text>
    </svg>
  ),
  location: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="14" y="20" width="36" height="30" rx="2" fill="var(--accent-light)" stroke="var(--accent)" strokeWidth="2" />
      <line x1="14" y1="30" x2="50" y2="30" stroke="var(--accent)" strokeWidth="1.5" />
      <line x1="14" y1="40" x2="50" y2="40" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="44" cy="25" r="2" fill="var(--accent)" />
      <circle cx="44" cy="35" r="2" fill="var(--accent)" />
      <circle cx="44" cy="45" r="2" fill="var(--accent)" />
    </svg>
  ),
  item: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="16" y="22" width="32" height="26" rx="3" fill="var(--accent-light)" stroke="var(--accent)" strokeWidth="2" />
      <path d="M16 28H48" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M28 22V28" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M36 22V28" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="32" cy="38" r="3" fill="var(--accent-lighter)" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M32 36V40M30 38H34" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
};

export default function EmptyState({ type, action, actionLabel }: EmptyStateProps) {
  const { t } = useI18n();

  const config = {
    home: { title: t.emptyHomeTitle, desc: t.emptyHomeDesc, tip: t.emptyHomeTip },
    room: { title: t.emptyRoomTitle, desc: t.emptyRoomDesc, tip: t.emptyRoomTip },
    location: { title: t.emptyLocationTitle, desc: t.emptyLocationDesc, tip: t.emptyLocationTip },
    item: { title: t.emptyItemTitle, desc: t.emptyItemDesc, tip: t.emptyItemTip },
  };

  const c = config[type];
  return (
    <div className="animate-fadeIn flex flex-col items-center justify-center gap-3 py-10 text-center" role="status">
      <div className="mb-1">{icons[type]}</div>
      <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{c.title}</p>
      <p className="max-w-[220px] text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{c.desc}</p>
      <p className="max-w-[260px] text-[10px] leading-relaxed mt-1 rounded-lg px-3 py-1.5"
        style={{ background: "var(--accent-lighter)", color: "var(--accent)" }}>
        {c.tip}
      </p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-2 rounded-lg px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

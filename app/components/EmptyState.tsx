"use client";

type EmptyStateProps = {
  type: "home" | "room" | "location" | "item";
  action?: () => void;
  actionLabel?: string;
};

const config = {
  home: {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="12" y="28" width="40" height="28" rx="3" fill="#E0E7FF" stroke="#818CF8" strokeWidth="2" />
        <path d="M8 30L32 12L56 30" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="26" y="40" width="12" height="16" rx="1" fill="#C7D2FE" stroke="#818CF8" strokeWidth="1.5" />
        <circle cx="36" cy="48" r="1.2" fill="#818CF8" />
      </svg>
    ),
    title: "첫 번째 집을 추가해보세요!",
    desc: "집을 만들면 방과 수납공간을 배치할 수 있어요.",
  },
  room: {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="10" y="14" width="44" height="36" rx="3" fill="#E0E7FF" stroke="#818CF8" strokeWidth="2" />
        <line x1="10" y1="32" x2="54" y2="32" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="32" y1="14" x2="32" y2="50" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="32" y="58" textAnchor="middle" fontSize="8" fill="#818CF8" fontWeight="600">ROOM</text>
      </svg>
    ),
    title: "방을 추가해보세요",
    desc: "방을 만들고 2D 캔버스에서 배치하세요.",
  },
  location: {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="14" y="20" width="36" height="30" rx="2" fill="#E0E7FF" stroke="#818CF8" strokeWidth="2" />
        <line x1="14" y1="30" x2="50" y2="30" stroke="#818CF8" strokeWidth="1.5" />
        <line x1="14" y1="40" x2="50" y2="40" stroke="#818CF8" strokeWidth="1.5" />
        <circle cx="44" cy="25" r="2" fill="#818CF8" />
        <circle cx="44" cy="35" r="2" fill="#818CF8" />
        <circle cx="44" cy="45" r="2" fill="#818CF8" />
      </svg>
    ),
    title: "수납공간을 추가하세요",
    desc: "가구나 서랍을 배치하고 물건을 정리해보세요.",
  },
  item: {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="16" y="22" width="32" height="26" rx="3" fill="#E0E7FF" stroke="#818CF8" strokeWidth="2" />
        <path d="M16 28H48" stroke="#818CF8" strokeWidth="1.5" />
        <path d="M28 22V28" stroke="#818CF8" strokeWidth="1.5" />
        <path d="M36 22V28" stroke="#818CF8" strokeWidth="1.5" />
        <circle cx="32" cy="38" r="3" fill="#C7D2FE" stroke="#818CF8" strokeWidth="1.5" />
        <path d="M32 36V40M30 38H34" stroke="#818CF8" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    title: "물건을 등록해보세요",
    desc: "이곳에 보관된 물건을 추가하면 나중에 쉽게 찾을 수 있어요.",
  },
};

export default function EmptyState({ type, action, actionLabel }: EmptyStateProps) {
  const c = config[type];
  return (
    <div className="animate-fadeIn flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="mb-1">{c.icon}</div>
      <p className="text-sm font-semibold text-slate-600">{c.title}</p>
      <p className="max-w-[220px] text-xs text-slate-400 leading-relaxed">{c.desc}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-2 rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#4338CA]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

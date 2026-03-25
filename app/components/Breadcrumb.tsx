"use client";

type BreadcrumbProps = {
  homeName?: string;
  roomName?: string;
  locationName?: string;
  onClickHome?: () => void;
  onClickRoom?: () => void;
  onClickLocation?: () => void;
};

export default function Breadcrumb({
  homeName,
  roomName,
  locationName,
  onClickHome,
  onClickRoom,
  onClickLocation,
}: BreadcrumbProps) {
  if (!homeName) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-slate-400 overflow-hidden">
      <button
        onClick={onClickHome}
        className="flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="truncate max-w-[80px]">{homeName}</span>
      </button>
      {roomName && (
        <>
          <span className="text-slate-300 shrink-0">/</span>
          <button
            onClick={onClickRoom}
            className="truncate max-w-[80px] rounded px-1.5 py-0.5 font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            {roomName}
          </button>
        </>
      )}
      {locationName && (
        <>
          <span className="text-slate-300 shrink-0">/</span>
          <button
            onClick={onClickLocation}
            className="truncate max-w-[80px] rounded px-1.5 py-0.5 font-semibold text-indigo-600 transition hover:bg-indigo-50"
          >
            {locationName}
          </button>
        </>
      )}
    </nav>
  );
}

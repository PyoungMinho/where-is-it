"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { Item } from "@/types/item";
import type { Location } from "@/types/location";
import type { Room } from "@/types/room";

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "electronics", label: "전자기기" },
  { key: "documents", label: "서류" },
  { key: "daily", label: "생활용품" },
  { key: "clothes", label: "의류" },
  { key: "kitchen", label: "주방" },
  { key: "tools", label: "공구" },
  { key: "etc", label: "기타" },
];

type SearchPanelProps = {
  open: boolean;
  onClose: () => void;
  allItems: Item[];
  locations: Location[];
  rooms: Room[];
  onSelect: (item: Item, location: Location, room: Room) => void;
};

const RECENT_KEY = "where-is-it-recent-search";

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

export default function SearchPanel({
  open,
  onClose,
  allItems,
  locations,
  rooms,
  onSelect,
}: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCategoryFilter("all");
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) {
          // 부모에서 open을 제어하므로 여기선 아무것도 안함
        } else {
          onClose();
        }
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allItems
      .filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(q);
        const catMatch =
          categoryFilter === "all" || item.category === categoryFilter;
        return nameMatch && catMatch;
      })
      .map((item) => {
        const location = locations.find((l) => l.id === item.location_id);
        const room = location
          ? rooms.find((r) => r.id === location.room_id)
          : undefined;
        return { item, location, room };
      })
      .filter(
        (r): r is { item: Item; location: Location; room: Room } =>
          !!r.location && !!r.room,
      );
  }, [query, categoryFilter, allItems, locations, rooms]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="어디에 뒀더라? 물건 이름을 검색하세요"
            className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-5 py-3 border-b border-slate-50">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                categoryFilter === cat.key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 결과 */}
        <div className="max-h-[340px] overflow-y-auto">
          {!query.trim() && recentSearches.length > 0 && (
            <div className="px-5 py-3">
              <p className="mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                최근 검색
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <p className="text-sm text-slate-400">
                &quot;{query}&quot;에 대한 결과가 없어요
              </p>
              <p className="text-xs text-slate-300">
                다른 이름으로 검색해보세요
              </p>
            </div>
          )}

          {results.length > 0 && (
            <ul className="py-2">
              {results.map(({ item, location, room }) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      saveRecentSearch(query.trim());
                      onSelect(item, location, room);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-indigo-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {item.name}
                        {item.quantity > 1 && (
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            x{item.quantity}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {room.name} &gt; {location.name}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 풋터 */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5 text-[10px] text-slate-400">
          <span>
            {results.length > 0
              ? `${results.length}개 결과`
              : "물건 이름으로 검색"}
          </span>
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono">
              ↵
            </kbd>
            <span>선택</span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono">
              esc
            </kbd>
            <span>닫기</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import type { Item } from "@/types/item";
import type { Location } from "@/types/location";
import type { Room } from "@/types/room";

type DashboardProps = {
  rooms: Room[];
  locations: Location[];
  allItems: Item[];
  onClose: () => void;
};

export default function Dashboard({ rooms, locations, allItems, onClose }: DashboardProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    allItems.forEach((item) => {
      categoryMap[item.category] = (categoryMap[item.category] || 0) + item.quantity;
    });

    const locationItemCounts = locations.map((loc) => ({
      location: loc,
      room: rooms.find((r) => r.id === loc.room_id),
      count: allItems.filter((i) => i.location_id === loc.id).reduce((sum, i) => sum + i.quantity, 0),
    })).sort((a, b) => b.count - a.count);

    const recentItems = [...allItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    const totalQuantity = allItems.reduce((sum, item) => sum + item.quantity, 0);

    return { categoryMap, locationItemCounts, recentItems, totalQuantity };
  }, [rooms, locations, allItems]);

  const catLabels: Record<string, string> = {
    electronics: t.catElectronics,
    documents: t.catDocuments,
    daily: t.catDaily,
    clothes: t.catClothes,
    kitchen: t.catKitchen,
    tools: t.catTools,
    etc: t.catEtc,
  };

  const catColors: Record<string, string> = {
    electronics: "#6366F1",
    documents: "#F59E0B",
    daily: "#10B981",
    clothes: "#EC4899",
    kitchen: "#F97316",
    tools: "#6B7280",
    etc: "#8B5CF6",
  };

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-start justify-center pt-[8vh] animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden animate-slideUp"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-light)" }}>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{t.dashboard}</h2>
          <button onClick={onClose} className="p-1 rounded-lg transition hover:opacity-70" style={{ color: "var(--text-tertiary)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {allItems.length === 0 ? (
            <div className="text-center py-12" style={{ color: "var(--text-tertiary)" }}>
              <p className="text-sm">{t.noData}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t.totalItems, value: stats.totalQuantity, icon: "📦" },
                  { label: t.totalRooms, value: rooms.length, icon: "🏠" },
                  { label: t.totalStorage, value: locations.length, icon: "🗄️" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-4 text-center"
                    style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-light)" }}
                  >
                    <span className="text-2xl">{stat.icon}</span>
                    <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{stat.value}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
                  {t.categoryBreakdown}
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.categoryMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => {
                      const pct = stats.totalQuantity > 0 ? (count / stats.totalQuantity) * 100 : 0;
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-xs w-16 shrink-0" style={{ color: "var(--text-secondary)" }}>
                            {catLabels[cat] || cat}
                          </span>
                          <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: "var(--surface-secondary)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                              style={{
                                width: `${Math.max(pct, 8)}%`,
                                background: catColors[cat] || "#6B7280",
                              }}
                            >
                              <span className="text-[10px] font-semibold text-white">{count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Top locations */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
                  {t.mostItems}
                </h3>
                <div className="space-y-1.5">
                  {stats.locationItemCounts.slice(0, 5).map(({ location, room, count }, i) => (
                    <div
                      key={location.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ background: "var(--surface-secondary)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5" style={{ color: "var(--accent)" }}>#{i + 1}</span>
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{location.name}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{room?.name}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{t.count(count)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent items */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
                  {t.recentItems}
                </h3>
                <div className="space-y-1.5">
                  {stats.recentItems.map((item) => {
                    const loc = locations.find((l) => l.id === item.location_id);
                    const room = loc ? rooms.find((r) => r.id === loc.room_id) : undefined;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{ background: "var(--surface-secondary)" }}
                      >
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            {item.name}
                            {item.quantity > 1 && <span className="ml-1 font-normal" style={{ color: "var(--text-tertiary)" }}>x{item.quantity}</span>}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                            {room?.name} &gt; {loc?.name}
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ background: "var(--accent-lighter)", color: "var(--accent)" }}
                        >
                          {catLabels[item.category] || item.category}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import type { Item } from "@/types/item";
import type { Location } from "@/types/location";
import type { Room } from "@/types/room";

type MoveItemModalProps = {
  item: Item;
  rooms: Room[];
  locations: Location[];
  currentLocationId: string;
  onMove: (itemId: string, newLocationId: string) => Promise<void>;
  onClose: () => void;
};

export default function MoveItemModal({
  item,
  rooms,
  locations,
  currentLocationId,
  onMove,
  onClose,
}: MoveItemModalProps) {
  const { t } = useI18n();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const filteredLocations = useMemo(() => {
    if (!selectedRoomId) return [];
    return locations.filter(
      (l) => l.room_id === selectedRoomId && l.id !== currentLocationId
    );
  }, [selectedRoomId, locations, currentLocationId]);

  const handleMove = async () => {
    if (!selectedLocId || moving) return;
    setMoving(true);
    try {
      await onMove(item.id, selectedLocId);
      onClose();
    } finally {
      setMoving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden animate-slideUp"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-light)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t.moveItemTo}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {item.name} — {t.moveItemDesc}
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Room selection */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
              {t.selectRoom}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setSelectedLocId(null);
                  }}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-left transition"
                  style={{
                    background: selectedRoomId === room.id ? "var(--accent-light)" : "var(--surface-secondary)",
                    color: selectedRoomId === room.id ? "var(--accent)" : "var(--text-secondary)",
                    border: `1px solid ${selectedRoomId === room.id ? "var(--accent)" : "var(--border-light)"}`,
                  }}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>

          {/* Location selection */}
          {selectedRoomId && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                {t.selectStorage}
              </label>
              {filteredLocations.length === 0 ? (
                <p className="text-xs py-2" style={{ color: "var(--text-tertiary)" }}>{t.emptyLocationTitle}</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {filteredLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocId(loc.id)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs transition"
                      style={{
                        background: selectedLocId === loc.id ? "var(--accent-light)" : "var(--surface-secondary)",
                        color: selectedLocId === loc.id ? "var(--accent)" : "var(--text-secondary)",
                        border: `1px solid ${selectedLocId === loc.id ? "var(--accent)" : "var(--border-light)"}`,
                      }}
                    >
                      <span className="font-medium">{loc.name}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: selectedLocId === loc.id ? 1 : 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--border-light)" }}>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium transition"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            {t.moveCancel}
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedLocId || moving}
            className="rounded-lg px-4 py-2 text-xs font-medium text-white transition disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {moving ? "..." : t.moveConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

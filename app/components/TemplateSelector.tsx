"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type TemplateRoom = {
  name: string;
  type: "room" | "hallway";
  width: number;
  height: number;
  x: number;
  y: number;
};

type Template = {
  key: string;
  icon: string;
  rooms: TemplateRoom[];
};

type TemplateSelectorProps = {
  onApply: (rooms: TemplateRoom[]) => Promise<void>;
  onClose: () => void;
};

export default function TemplateSelector({ onApply, onClose }: TemplateSelectorProps) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const templates: Template[] = [
    {
      key: "studio",
      icon: "🏠",
      rooms: [
        { name: locale === "ko" ? "거실/침실" : "Living/Bedroom", type: "room", width: 220, height: 180, x: 20, y: 20 },
        { name: locale === "ko" ? "주방" : "Kitchen", type: "room", width: 120, height: 100, x: 260, y: 20 },
        { name: locale === "ko" ? "욕실" : "Bathroom", type: "room", width: 100, height: 80, x: 260, y: 140 },
      ],
    },
    {
      key: "apt",
      icon: "🏢",
      rooms: [
        { name: locale === "ko" ? "거실" : "Living Room", type: "room", width: 220, height: 160, x: 20, y: 20 },
        { name: locale === "ko" ? "주방" : "Kitchen", type: "room", width: 150, height: 120, x: 260, y: 20 },
        { name: locale === "ko" ? "침실" : "Bedroom", type: "room", width: 160, height: 140, x: 20, y: 200 },
        { name: locale === "ko" ? "욕실" : "Bathroom", type: "room", width: 100, height: 80, x: 260, y: 160 },
        { name: locale === "ko" ? "현관" : "Entrance", type: "hallway", width: 80, height: 120, x: 430, y: 20 },
      ],
    },
    {
      key: "house",
      icon: "🏡",
      rooms: [
        { name: locale === "ko" ? "거실" : "Living Room", type: "room", width: 240, height: 180, x: 20, y: 20 },
        { name: locale === "ko" ? "주방" : "Kitchen", type: "room", width: 160, height: 140, x: 280, y: 20 },
        { name: locale === "ko" ? "침실 1" : "Bedroom 1", type: "room", width: 160, height: 140, x: 20, y: 220 },
        { name: locale === "ko" ? "침실 2" : "Bedroom 2", type: "room", width: 160, height: 140, x: 200, y: 220 },
        { name: locale === "ko" ? "욕실 1" : "Bath 1", type: "room", width: 100, height: 80, x: 460, y: 20 },
        { name: locale === "ko" ? "욕실 2" : "Bath 2", type: "room", width: 100, height: 80, x: 380, y: 220 },
        { name: locale === "ko" ? "서재" : "Study", type: "room", width: 120, height: 100, x: 460, y: 120 },
        { name: locale === "ko" ? "현관" : "Entrance", type: "hallway", width: 80, height: 140, x: 460, y: 240 },
      ],
    },
    {
      key: "office",
      icon: "🏬",
      rooms: [
        { name: locale === "ko" ? "메인 사무실" : "Main Office", type: "room", width: 280, height: 200, x: 20, y: 20 },
        { name: locale === "ko" ? "회의실" : "Meeting Room", type: "room", width: 160, height: 140, x: 320, y: 20 },
        { name: locale === "ko" ? "탕비실" : "Break Room", type: "room", width: 120, height: 100, x: 320, y: 180 },
        { name: locale === "ko" ? "창고" : "Storage", type: "room", width: 100, height: 80, x: 20, y: 240 },
      ],
    },
  ];

  const templateMeta: Record<string, { label: string; desc: string }> = {
    studio: { label: t.templateStudio, desc: t.templateStudioDesc },
    apt: { label: t.templateApt, desc: t.templateAptDesc },
    house: { label: t.templateHouse, desc: t.templateHouseDesc },
    office: { label: t.templateOffice, desc: t.templateOfficeDesc },
  };

  const handleApply = async () => {
    const tpl = templates.find((t) => t.key === selected);
    if (!tpl || applying) return;
    setApplying(true);
    try {
      await onApply(tpl.rooms);
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden animate-slideUp"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-light)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t.template}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{t.templateDesc}</p>
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          {templates.map((tpl) => {
            const meta = templateMeta[tpl.key];
            const isSelected = selected === tpl.key;
            return (
              <button
                key={tpl.key}
                onClick={() => setSelected(tpl.key)}
                className="rounded-xl p-4 text-left transition"
                style={{
                  background: isSelected ? "var(--accent-light)" : "var(--surface-secondary)",
                  border: `2px solid ${isSelected ? "var(--accent)" : "var(--border-light)"}`,
                }}
              >
                <span className="text-2xl">{tpl.icon}</span>
                <p className="text-sm font-semibold mt-2" style={{ color: "var(--text-primary)" }}>{meta.label}</p>
                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{meta.desc}</p>
                <p className="text-[10px] mt-1.5 font-medium" style={{ color: "var(--accent)" }}>
                  {tpl.rooms.length} rooms
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--border-light)" }}>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium transition"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleApply}
            disabled={!selected || applying}
            className="rounded-lg px-4 py-2 text-xs font-medium text-white transition disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {applying ? "..." : t.templateApply}
          </button>
        </div>
      </div>
    </div>
  );
}

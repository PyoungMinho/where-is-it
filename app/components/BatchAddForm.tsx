"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type BatchAddFormProps = {
  onBatchAdd: (items: { name: string; category: string; quantity: number; memo: string }[]) => Promise<void>;
  onClose: () => void;
};

export default function BatchAddForm({ onBatchAdd, onClose }: BatchAddFormProps) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [category, setCategory] = useState("etc");
  const [submitting, setSubmitting] = useState(false);

  const categoryOptions = [
    { value: "electronics", label: t.catElectronics },
    { value: "documents", label: t.catDocuments },
    { value: "daily", label: t.catDaily },
    { value: "clothes", label: t.catClothes },
    { value: "kitchen", label: t.catKitchen },
    { value: "tools", label: t.catTools },
    { value: "etc", label: t.catEtc },
  ];

  const items = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const handleSubmit = async () => {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onBatchAdd(
        items.map((name) => ({ name, category, quantity: 1, memo: "" }))
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden animate-slideUp"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-light)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t.batchAdd}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{t.batchAddDesc}</p>
        </div>

        <div className="px-5 py-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.batchAddPlaceholder}
            rows={8}
            autoFocus
            className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none transition"
            style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />

          <div className="flex items-center gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2 text-xs outline-none transition"
              style={{
                background: "var(--surface-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {items.length > 0 && (
              <span className="text-xs font-medium shrink-0" style={{ color: "var(--accent)" }}>
                {t.batchAddCount(items.length)}
              </span>
            )}
          </div>
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
            onClick={handleSubmit}
            disabled={items.length === 0 || submitting}
            className="rounded-lg px-4 py-2 text-xs font-medium text-white transition disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {submitting ? "..." : t.batchAddButton}
          </button>
        </div>
      </div>
    </div>
  );
}

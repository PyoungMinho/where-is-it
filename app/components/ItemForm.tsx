"use client";

import { useState, useRef, useEffect } from "react";

const CATEGORY_OPTIONS = [
  { value: "electronics", label: "전자기기" },
  { value: "documents", label: "서류/문서" },
  { value: "daily", label: "생활용품" },
  { value: "clothes", label: "의류" },
  { value: "kitchen", label: "주방용품" },
  { value: "tools", label: "공구" },
  { value: "etc", label: "기타" },
];

type ItemFormProps = {
  onAdd: (data: {
    name: string;
    category: string;
    quantity: number;
    memo: string;
  }) => Promise<void>;
};

export default function ItemForm({ onAdd }: ItemFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("etc");
  const [quantity, setQuantity] = useState(1);
  const [memo, setMemo] = useState("");
  const [showMemo, setShowMemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        category,
        quantity,
        memo: memo.trim(),
      });
      setName("");
      setMemo("");
      setQuantity(1);
      setShowMemo(false);
      nameRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="물건 이름 (예: 건전지, 여권, 리모컨)"
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />

      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* 수량 스테퍼 */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-[38px] w-8 items-center justify-center text-slate-400 hover:text-slate-700 transition"
          >
            -
          </button>
          <span className="w-8 text-center text-xs font-semibold text-slate-700 tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="flex h-[38px] w-8 items-center justify-center text-slate-400 hover:text-slate-700 transition"
          >
            +
          </button>
        </div>
      </div>

      {/* 메모 토글 */}
      {!showMemo ? (
        <button
          type="button"
          onClick={() => setShowMemo(true)}
          className="text-[11px] text-slate-400 hover:text-indigo-500 transition"
        >
          + 메모 추가
        </button>
      ) : (
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (선택사항)"
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 outline-none resize-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={!name.trim() || submitting}
        className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "등록 중..." : "물건 추가하기"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type ToastItem = { id: number; message: string };

let toastId = 0;
let addToastGlobal: ((msg: string) => void) | null = null;

export function showToast(message: string) {
  addToastGlobal?.(message);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastGlobal = (message: string) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    };
    return () => {
      addToastGlobal = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slideUp rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

const ONBOARDING_KEY = "where-is-it-onboarding-done";

const steps = [
  {
    num: 1,
    title: "집 만들기",
    desc: "먼저 관리할 집을 추가해주세요. 여러 집을 등록할 수 있어요.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    num: 2,
    title: "방 배치 (2D)",
    desc: "2D 모드에서 방을 추가하고 캔버스에서 크기와 위치를 조정하세요.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    num: 3,
    title: "가구 배치 (3D)",
    desc: "3D 모드에서 수납공간(가구)을 방 안에 배치하세요.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    num: 4,
    title: "물건 등록",
    desc: "수납공간을 클릭하고 물건을 등록하면 끝! 검색으로 바로 찾으세요.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
];

type OnboardingGuideProps = {
  show: boolean;
  onDismiss: () => void;
};

export default function OnboardingGuide({ show, onDismiss }: OnboardingGuideProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setVisible(true);
    }
  }, [show]);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9980] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-slideUp">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            어디있니?
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            집 안의 물건을 쉽게 정리하고 찾아보세요
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="flex items-start gap-4 rounded-xl bg-slate-50 p-4 transition hover:bg-indigo-50"
            >
              <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                {step.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {step.num}
                  </span>
                  {step.title}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          시작하기
        </button>
        <button
          onClick={dismiss}
          className="mt-2 w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition"
        >
          다시 보지 않기
        </button>
      </div>
    </div>
  );
}

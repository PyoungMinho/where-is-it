"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

const ONBOARDING_KEY = "where-is-it-onboarding-done";

const stepIcons = [
  <svg key="1" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>,
  <svg key="2" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>,
  <svg key="3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>,
  <svg key="4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>,
];

type OnboardingGuideProps = {
  show: boolean;
  onDismiss: () => void;
};

export default function OnboardingGuide({ show, onDismiss }: OnboardingGuideProps) {
  const { t } = useI18n();
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

  const steps = [
    { title: t.step1Title, desc: t.step1Desc },
    { title: t.step2Title, desc: t.step2Desc },
    { title: t.step3Title, desc: t.step3Desc },
    { title: t.step4Title, desc: t.step4Desc },
  ];

  return (
    <div className="fixed inset-0 z-[9980] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-slideUp">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            {t.appTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {t.onboardingDesc}
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl bg-slate-50 p-4 transition hover:bg-indigo-50"
            >
              <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                {stepIcons[i]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {i + 1}
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
          {t.start}
        </button>
        <button
          onClick={dismiss}
          className="mt-2 w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition"
        >
          {t.dontShowAgain}
        </button>
      </div>
    </div>
  );
}

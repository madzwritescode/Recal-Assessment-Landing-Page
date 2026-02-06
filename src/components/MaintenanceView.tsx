"use client";

const brandNavy = "#0A4367";
const brandTeal = "#4A90A4";

export default function MaintenanceView() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 shadow-sm">
          <svg
            className="w-10 h-10 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div className="space-y-3">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: brandNavy, fontFamily: "Rogue Sans Ext, sans-serif", fontStyle: "italic" }}
          >
            Recal
          </h1>
          <h2 className="text-xl font-semibold text-slate-800">
            We&apos;re making things even better
          </h2>
          <p className="text-slate-600">
            Our breath assessment and landing experience are being updated. Check back soon—we&apos;ll be back online shortly.
          </p>
        </div>
        <p className="text-sm text-slate-400">
          In the meantime, you can reach out at{" "}
          <a
            href="mailto:hello@recal.training"
            className="font-medium transition hover:text-[#0A4367]"
            style={{ color: brandTeal }}
          >
            hello@recal.training
          </a>
        </p>
      </div>
    </div>
  );
}

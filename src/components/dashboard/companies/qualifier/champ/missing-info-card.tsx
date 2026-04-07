"use client";

export function MissingInfoCard({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/30 p-4 border border-amber-200/60"
      style={{ animation: "slideUp 0.5s ease-out 0.35s both" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold text-amber-800">Eksik Bilgiler</p>
          <p className="text-[10px] text-amber-500">{items.length} bilgi eksik</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map((info, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 bg-white/70 rounded-lg px-3 py-2 border border-amber-100/60"
            style={{ animation: `slideUp 0.3s ease-out ${0.4 + i * 0.05}s both` }}
          >
            <div className="mt-0.5 w-5 h-5 rounded-md border-2 border-amber-300 bg-amber-50 shrink-0 flex items-center justify-center">
              <span className="text-amber-400 text-[9px] font-black">?</span>
            </div>
            <span className="text-[11px] leading-relaxed text-amber-800">{info}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

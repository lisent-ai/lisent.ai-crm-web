"use client";

export function NextQuestionCard({ question }: { question: string }) {
  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-cyan-50 to-sky-50/30 p-4 border border-cyan-200/60"
      style={{ animation: "slideUp 0.5s ease-out 0.4s both" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold text-cyan-800">Onerilen Soru</p>
          <p className="text-[10px] text-cyan-500">Bir sonraki gorusmede sorun</p>
        </div>
      </div>

      <div className="bg-white/80 rounded-xl px-4 py-3 border border-cyan-100/60 relative">
        <div className="absolute top-2 left-3 text-cyan-200">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-60">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>
        <p className="text-[13px] leading-relaxed text-cyan-800 italic pl-5">
          {question}
        </p>
      </div>
    </div>
  );
}

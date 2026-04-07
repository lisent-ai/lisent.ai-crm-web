"use client";

import { useRef, useEffect } from "react";
import type { ConversationMessage } from "@/lib/qualifier/client";

type Props = {
  messages: ConversationMessage[];
};

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function QualifierConversation({ messages }: Readonly<Props>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Precompute date separators to avoid mutable variable in render
  const dateSeps = computeDateSeps(messages);

  return (
    <div
      className="rounded-2xl border border-slate-200/60 overflow-hidden"
      style={{ animation: "slideUp 0.4s ease-out both" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/10">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white/90">Konusma</p>
            <p className="text-[10px] text-slate-400">Lead ile AI arasindaki gorusme</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-slate-300 ring-1 ring-inset ring-white/10">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          {messages.length} mesaj
        </span>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="max-h-[32rem] overflow-y-auto p-4 space-y-1"
        style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)" }}
      >
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const showDateSep = dateSeps[i];

          // Check if next message is same role (for grouping)
          const nextMsg = messages[i + 1];
          const isLastInGroup = !nextMsg || nextMsg.role !== msg.role;

          return (
            <div key={i}>
              {/* Date separator */}
              {showDateSep && (
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-slate-200/80" />
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-3 py-0.5">
                    {formatDate(msg.ts)}
                  </span>
                  <div className="flex-1 h-px bg-slate-200/80" />
                </div>
              )}

              <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-3" : "mb-0.5"}`}>
                {/* AI avatar (only on last message in group) */}
                {!isUser && isLastInGroup && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shrink-0 shadow-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                )}
                {!isUser && !isLastInGroup && <div className="w-7 shrink-0" />}

                {/* Bubble */}
                <div
                  className={`max-w-[75%] px-4 py-2.5 text-[13px] leading-relaxed ${
                    isUser
                      ? `bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-500/20 ${
                          isLastInGroup ? "rounded-2xl rounded-br-md" : "rounded-2xl"
                        }`
                      : `bg-white text-slate-700 border border-slate-100 shadow-sm ${
                          isLastInGroup ? "rounded-2xl rounded-bl-md" : "rounded-2xl"
                        }`
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.ts > 0 && isLastInGroup && (
                    <p className={`mt-1.5 text-[10px] flex items-center gap-1 ${isUser ? "text-violet-200/70" : "text-slate-400"}`}>
                      {formatTime(msg.ts)}
                      {isUser && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-200/50">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </p>
                  )}
                </div>

                {/* User avatar (only on last message in group) */}
                {isUser && isLastInGroup && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 shrink-0 shadow-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                {isUser && !isLastInGroup && <div className="w-7 shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function computeDateSeps(messages: ConversationMessage[]): Record<number, boolean> {
  const seps: Record<number, boolean> = {};
  let prev = "";
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].ts > 0) {
      const d = formatDate(messages[i].ts);
      if (d !== prev) {
        seps[i] = true;
        prev = d;
      }
    }
  }
  return seps;
}

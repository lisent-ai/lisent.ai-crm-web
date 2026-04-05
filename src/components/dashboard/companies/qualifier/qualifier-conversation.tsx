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

  // Group messages by date
  let lastDate = "";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Konusma</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          {messages.length} mesaj
        </span>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[28rem] overflow-y-auto space-y-2 rounded-lg bg-slate-50 p-3"
      >
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          let showDateSep = false;
          if (msg.ts > 0) {
            const dateStr = formatDate(msg.ts);
            if (dateStr !== lastDate) {
              lastDate = dateStr;
              showDateSep = true;
            }
          }

          return (
            <div key={i}>
              {showDateSep && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-medium text-slate-400">{lastDate}</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}
              <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? "bg-violet-600 text-white rounded-br-md"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.ts > 0 && (
                    <p
                      className={`mt-1 text-[10px] ${
                        isUser ? "text-violet-200" : "text-slate-400"
                      }`}
                    >
                      {formatTime(msg.ts)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

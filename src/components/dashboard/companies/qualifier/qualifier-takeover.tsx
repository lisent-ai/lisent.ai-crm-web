"use client";

import { useState } from "react";
import {
  startAI,
  takeoverSession,
  sendManualMessage,
  resumeAI,
} from "@/lib/qualifier/client";

type Props = {
  companyId: string;
  sessionId: string;
  currentStage: string;
  onStageChanged: (stage: string) => void;
  onMessageSent?: () => void;
};

export function QualifierTakeover({ companyId, sessionId, currentStage, onStageChanged, onMessageSent }: Readonly<Props>) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");
  const [starting, setStarting] = useState(false);

  const isPending = currentStage === "PENDING";
  const isTakeover = currentStage === "HUMAN_TAKEOVER";

  async function handleStartAI() {
    if (!confirm("AI sohbeti baslatilacak ve lead'e WhatsApp mesaji gonderilecek. Devam edilsin mi?")) return;
    setStarting(true);
    try {
      const res = await startAI(companyId, sessionId);
      onStageChanged(res.new_stage);
      setLastResult("AI baslatildi, mesaj kuyruga alindi");
      setTimeout(() => setLastResult(""), 4000);
    } catch {
      setLastResult("AI baslatilamadi");
    } finally {
      setStarting(false);
    }
  }

  async function handleTakeover() {
    if (!confirm("AI'yi durdurup sohbetin kontrolunu alacaksiniz. Devam edilsin mi?")) return;
    try {
      const res = await takeoverSession(companyId, sessionId);
      onStageChanged(res.new_stage);
    } catch (e) {
      setLastResult("Devralma basarisiz");
    }
  }

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await sendManualMessage(companyId, sessionId, message.trim());
      setMessage("");
      setLastResult(res.whatsapp_sent ? "WhatsApp'a gonderildi" : "Kaydedildi (WhatsApp gonderilemedi)");
      setTimeout(() => setLastResult(""), 3000);
      onMessageSent?.();
    } catch {
      setLastResult("Gonderim basarisiz");
    } finally {
      setSending(false);
    }
  }

  async function handleResume() {
    if (!confirm("AI'ya kontrolu geri vereceksiniz. Devam edilsin mi?")) return;
    try {
      const res = await resumeAI(companyId, sessionId);
      onStageChanged(res.new_stage);
    } catch {
      setLastResult("AI devir basarisiz");
    }
  }

  if (!sessionId) return null;

  // PENDING — AI henüz başlatılmadı
  if (isPending) {
    return (
      <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            <div>
              <p className="text-sm font-semibold text-violet-800">AI Bekliyor</p>
              <p className="text-[10px] text-violet-500">Lead skorlandi, AI sohbeti baslatilmadi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartAI}
            disabled={starting}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-95 disabled:opacity-50"
          >
            {starting ? "Baslatiliyor..." : "AI Baslat"}
          </button>
        </div>
        {lastResult && (
          <p className="text-xs text-violet-600">{lastResult}</p>
        )}
      </div>
    );
  }

  // CHAT — AI aktif, devralma butonu
  if (!isTakeover) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600">Sohbet Kontrolu</p>
            <p className="text-[10px] text-slate-400">AI aktif — sohbeti devralabilirsiniz</p>
          </div>
          <button
            type="button"
            onClick={handleTakeover}
            className="rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
          >
            Devral
          </button>
        </div>
      </div>
    );
  }

  // HUMAN_TAKEOVER — manual send UI
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-sm font-semibold text-amber-800">Sohbet Sizde — AI Duraklatildi</p>
        </div>
        <button
          type="button"
          onClick={handleResume}
          className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          AI'ya Geri Ver
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Mesaj yaz..."
          className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40"
        >
          {sending ? "..." : "Gonder"}
        </button>
      </div>

      {lastResult && (
        <p className="text-xs text-amber-600">{lastResult}</p>
      )}
    </div>
  );
}

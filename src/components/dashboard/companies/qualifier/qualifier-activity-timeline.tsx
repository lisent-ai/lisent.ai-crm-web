"use client";

import { useState, useEffect } from "react";
import { getLeadActivity, type ActivityEvent } from "@/lib/qualifier/client";

type Props = {
  companyId: string;
  leadId: string;
};

const EVENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  status_change: { label: "Durum Degisimi", icon: "→", color: "bg-violet-100 text-violet-700" },
  note_added: { label: "Not Eklendi", icon: "✎", color: "bg-blue-100 text-blue-700" },
  score_update: { label: "Skor Guncellendi", icon: "↑", color: "bg-amber-100 text-amber-700" },
  assignment: { label: "Atama", icon: "⊕", color: "bg-cyan-100 text-cyan-700" },
  handoff: { label: "CRM Handoff", icon: "✓", color: "bg-emerald-100 text-emerald-700" },
  message: { label: "Mesaj", icon: "💬", color: "bg-slate-100 text-slate-600" },
  tag_change: { label: "Etiket", icon: "◆", color: "bg-pink-100 text-pink-700" },
  manual_message: { label: "Manuel Mesaj", icon: "✉", color: "bg-orange-100 text-orange-700" },
};

function EventCard({ event }: { event: ActivityEvent }) {
  const config = EVENT_CONFIG[event.event_type] ?? { label: event.event_type, icon: "•", color: "bg-slate-100 text-slate-600" };
  const payload = event.payload ?? {};

  function renderPayload() {
    if (event.event_type === "status_change") {
      return (
        <span className="text-xs text-slate-500">
          <span className="font-medium text-slate-700">{String(payload.old_status ?? "")}</span>
          {" → "}
          <span className="font-medium text-slate-700">{String(payload.new_status ?? "")}</span>
          {payload.reason ? <span className="ml-1 italic">— {String(payload.reason)}</span> : null}
        </span>
      );
    }
    if (event.event_type === "note_added") {
      return <span className="text-xs text-slate-500 line-clamp-1">{String(payload.content_preview ?? "")}</span>;
    }
    if (event.event_type === "assignment") {
      return (
        <span className="text-xs text-slate-500">
          {payload.old_assigned_to ? <>{String(payload.old_assigned_to)} → </> : null}
          <span className="font-medium text-slate-700">{String(payload.new_assigned_to ?? "")}</span>
        </span>
      );
    }
    if (event.event_type === "score_update") {
      return (
        <span className="text-xs text-slate-500">
          Skor: <span className="font-medium">{String(payload.old_score ?? "?")}</span>
          {" → "}
          <span className="font-medium">{String(payload.new_score ?? "?")}</span>
        </span>
      );
    }
    return null;
  }

  return (
    <div className="flex gap-3">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${config.color}`}>
          {config.icon}
        </div>
        <div className="w-px flex-1 bg-slate-200" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">{config.label}</span>
          <span className="text-[10px] text-slate-400">
            {new Date(event.created_at).toLocaleString("tr-TR", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{event.actor}</span>
        </div>
        <div className="mt-1">{renderPayload()}</div>
      </div>
    </div>
  );
}

export function QualifierActivityTimeline({ companyId, leadId }: Readonly<Props>) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeadActivity(companyId, leadId)
      .then((res) => setEvents(res.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [companyId, leadId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-7 w-7 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-xs text-slate-400 italic py-4">Henuz aktivite yok.</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

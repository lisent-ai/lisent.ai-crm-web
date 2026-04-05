type Props = {
  reasoning: Record<string, unknown>;
};

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <p className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export function QualifierReasoning({ reasoning }: Readonly<Props>) {
  const summary = reasoning.summary as string | undefined;
  const report = reasoning.report as string | undefined;
  const scoreExplanation = reasoning.score_explanation as string | undefined;
  const keySignals = reasoning.key_signals as string[] | undefined;
  const recommendedApproach = reasoning.recommended_approach as string | undefined;
  const potentialObjections = reasoning.potential_objections as string[] | undefined;
  const priority = reasoning.priority as string | undefined;

  // If it's just a simple string or unstructured
  const hasStructured = summary || scoreExplanation || keySignals || recommendedApproach;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">AI Degerlendirmesi</p>
        {priority && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              priority === "high"
                ? "bg-emerald-100 text-emerald-700"
                : priority === "medium"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {priority === "high" ? "Yuksek Oncelik" : priority === "medium" ? "Orta Oncelik" : "Dusuk Oncelik"}
          </span>
        )}
      </div>

      {hasStructured ? (
        <div className="space-y-3">
          {(summary ?? report) && <Section title="Ozet" content={(summary ?? report)!} />}
          {scoreExplanation && <Section title="Skor Aciklamasi" content={scoreExplanation} />}

          {keySignals && keySignals.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Onemli Sinyaller</p>
              <ul className="mt-1 space-y-1">
                {keySignals.map((signal, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendedApproach && <Section title="Onerilen Yaklasim" content={recommendedApproach} />}

          {potentialObjections && potentialObjections.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Olasi Itirazlar</p>
              <ul className="mt-1 space-y-1">
                {potentialObjections.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
          {report ?? summary ?? JSON.stringify(reasoning, null, 2)}
        </p>
      )}
    </div>
  );
}

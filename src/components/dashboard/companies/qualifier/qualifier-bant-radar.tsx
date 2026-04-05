type ChampData = {
  challenges: number;
  authority: number;
  money: number;
  prioritization: number;
};

type Props = {
  champ: ChampData;
  notes?: {
    challenges_notes?: string;
    authority_notes?: string;
    money_notes?: string;
    prioritization_notes?: string;
  };
  holistic?: {
    holistic_score?: number;
    holistic_reasoning?: string;
    icp_fit_assessment?: string;
    negative_signals?: string[];
    negative_reasoning?: string;
    recommended_next_question?: string;
    missing_info?: string[];
  };
};

const LABELS = ["Ihtiyaclar", "Yetki", "Butce", "Oncelik"];
const KEYS: (keyof ChampData)[] = ["challenges", "authority", "money", "prioritization"];
const COLORS = ["#7c3aed", "#0891b2", "#f59e0b", "#10b981"];
const MAX = 25;
const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 75;

function polarToCart(angle: number, value: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  const r = (value / MAX) * RADIUS;
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)];
}

const ANGLES = [0, 90, 180, 270];

function gridPath(level: number): string {
  return ANGLES.map((a, i) => {
    const [x, y] = polarToCart(a, (level / 5) * MAX);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") + "Z";
}

const NEG_SIGNAL_LABELS: Record<string, string> = {
  price_fishing: "Fiyat avcisi",
  just_looking: "Sadece bakiyor",
  competitor: "Rakip firma",
  unresponsive: "Yanit vermiyor",
};

export function QualifierBantRadar({ champ, notes, holistic }: Readonly<Props>) {
  const values = KEYS.map((k) => champ[k]);
  const total = values.reduce((a, b) => a + b, 0);

  const dataPath = values
    .map((v, i) => {
      const [x, y] = polarToCart(ANGLES[i], v);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ") + "Z";

  const notesList = notes
    ? [notes.challenges_notes, notes.authority_notes, notes.money_notes, notes.prioritization_notes]
    : [];

  const hasHolistic = holistic && (holistic.holistic_reasoning || holistic.icp_fit_assessment);
  const hasNegatives = holistic?.negative_signals && holistic.negative_signals.length > 0;
  const hasNextQuestion = holistic?.recommended_next_question;
  const hasMissing = holistic?.missing_info && holistic.missing_info.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">CHAMP Analizi</p>
        <div className="flex items-center gap-2">
          {holistic?.holistic_score != null && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
              Genel: {holistic.holistic_score}/100
            </span>
          )}
          <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-700">
            {total}/100
          </span>
        </div>
      </div>

      <div className="flex items-start gap-4">
        {/* Radar */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-48 h-48 shrink-0">
          {/* Grid */}
          {[1, 2, 3, 4, 5].map((level) => (
            <path key={level} d={gridPath(level)} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          ))}
          {/* Axes */}
          {ANGLES.map((a, i) => {
            const [x, y] = polarToCart(a, MAX);
            return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />;
          })}
          {/* Data area */}
          <path d={dataPath} fill="rgba(124,58,237,0.15)" stroke="#7c3aed" strokeWidth="2" />
          {/* Data dots */}
          {values.map((v, i) => {
            const [x, y] = polarToCart(ANGLES[i], v);
            return <circle key={i} cx={x} cy={y} r="3.5" fill={COLORS[i]} />;
          })}
          {/* Labels */}
          {LABELS.map((label, i) => {
            const [x, y] = polarToCart(ANGLES[i], MAX + 8);
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-slate-500"
                fontSize="9"
                fontWeight="600"
              >
                {label}
              </text>
            );
          })}
        </svg>

        {/* Scores + notes */}
        <div className="flex-1 space-y-2.5 min-w-0">
          {LABELS.map((label, i) => (
            <div key={label}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                </div>
                <span className="text-xs font-bold text-slate-700">{values[i]}/25</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${(values[i] / MAX) * 100}%`, backgroundColor: COLORS[i] }}
                />
              </div>
              {notesList[i] && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{notesList[i]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Holistic Assessment */}
      {hasHolistic && (
        <div className="border-t border-slate-100 pt-3 space-y-2.5">
          {holistic.holistic_reasoning && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Ozet Degerlendirme</p>
              <p className="text-xs leading-relaxed text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                {holistic.holistic_reasoning}
              </p>
            </div>
          )}
          {holistic.icp_fit_assessment && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Ideal Musteri Uyumu</p>
              <p className="text-xs leading-relaxed text-slate-600 bg-violet-50 rounded-lg px-3 py-2">
                {holistic.icp_fit_assessment}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Negative Signals */}
      {hasNegatives && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-red-600 mb-1.5">Uyari Sinyalleri</p>
          <div className="flex flex-wrap gap-1.5">
            {holistic!.negative_signals!.map((sig) => (
              <span
                key={sig}
                className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-200"
              >
                {NEG_SIGNAL_LABELS[sig] || sig}
              </span>
            ))}
          </div>
          {holistic!.negative_reasoning && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-red-500">
              {holistic!.negative_reasoning}
            </p>
          )}
        </div>
      )}

      {/* Missing Info + Next Question */}
      {(hasMissing || hasNextQuestion) && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          {hasMissing && (
            <div>
              <p className="text-xs font-semibold text-amber-600 mb-1">Eksik Bilgiler</p>
              <ul className="space-y-0.5">
                {holistic!.missing_info!.map((info, i) => (
                  <li key={i} className="text-[11px] text-amber-700 flex items-start gap-1.5">
                    <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    {info}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasNextQuestion && (
            <div>
              <p className="text-xs font-semibold text-cyan-600 mb-1">Onerilen Soru</p>
              <p className="text-xs leading-relaxed text-cyan-700 bg-cyan-50 rounded-lg px-3 py-2 italic">
                &ldquo;{holistic!.recommended_next_question}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

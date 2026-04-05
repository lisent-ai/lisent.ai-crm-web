"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WebhookDataPanel } from "./webhook-data-panel";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type AIConfig = {
  company_display_name: string;
  industry_focus: string;
  tone: string;
  primary_language: string;
  custom_persona: string;
  custom_qualifying_questions: string[];
  forbidden_topics: string[];
  closing_message: string;
  max_messages_before_handoff: number;
  qualification_threshold: number;
  working_hours: string;
  faq_entries: { question: string; answer: string }[];
  pricing_hints: string;
  ideal_customer_profile: string;
  handoff_aggressiveness: string;
};

type KBDocument = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  category: string;
  active: boolean;
  created_at: string;
};

type Props = { companyId: string };
type ConfigTab = "identity" | "scoring" | "knowledge" | "rules";

type Aggressiveness = "conservative" | "balanced" | "aggressive";

const TABS: { key: ConfigTab; label: string; icon: string }[] = [
  { key: "identity", label: "Kimlik & Profil", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { key: "scoring", label: "Puanlama", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { key: "knowledge", label: "Bilgi Bankasi", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { key: "rules", label: "Kurallar & Sorular", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
];

/* ─── API helpers ────────────────────────────────────────────────────────── */

async function fetchConfig(companyId: string): Promise<AIConfig> {
  const res = await fetch(`/api/crm/internal/company/${companyId}/ai-config`, { cache: "no-store" });
  if (!res.ok) throw new Error("Config yuklenemedi");
  return res.json();
}

async function updateConfig(companyId: string, data: Partial<AIConfig>): Promise<AIConfig> {
  const res = await fetch(`/api/crm/internal/company/${companyId}/ai-config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Config kaydedilemedi");
  return res.json();
}

async function fetchKBDocuments(companyId: string): Promise<KBDocument[]> {
  const res = await fetch(`/api/crm/internal/company/${companyId}/kb-documents`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function uploadKBDocument(companyId: string, file: File, category: string): Promise<KBDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  const res = await fetch(`/api/crm/internal/company/${companyId}/kb-documents`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Yukleme basarisiz" }));
    throw new Error(err.error || "Yukleme basarisiz");
  }
  return res.json();
}

async function deleteKBDocument(companyId: string, docId: string): Promise<void> {
  const res = await fetch(`/api/crm/internal/company/${companyId}/kb-documents/${docId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Silinemedi");
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export function QualifierAIConfig({ companyId }: Readonly<Props>) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ConfigTab>("identity");

  // Identity fields
  const [displayName, setDisplayName] = useState("");
  const [industry, setIndustry] = useState("construction");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("tr");
  const [persona, setPersona] = useState("");
  const [closingMessage, setClosingMessage] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [pricingHints, setPricingHints] = useState("");

  // Scoring fields
  const [idealCustomerProfile, setIdealCustomerProfile] = useState("");
  const [aggressiveness, setAggressiveness] = useState<Aggressiveness>("balanced");
  const [maxMessages, setMaxMessages] = useState(10);

  // Knowledge base
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faq, setFaq] = useState<{ question: string; answer: string }[]>([]);
  const [kbDocs, setKbDocs] = useState<KBDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rules & questions
  const [forbiddenInput, setForbiddenInput] = useState("");
  const [forbidden, setForbidden] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [qualifyingQuestions, setQualifyingQuestions] = useState<string[]>([]);

  /* ─── Load config ──────────────────────────────────────────────────────── */

  useEffect(() => {
    Promise.all([fetchConfig(companyId), fetchKBDocuments(companyId)])
      .then(([cfg, docs]) => {
        setDisplayName(cfg.company_display_name || "");
        setIndustry(cfg.industry_focus || "construction");
        setTone(cfg.tone || "professional");
        setLanguage(cfg.primary_language || "tr");
        setPersona(cfg.custom_persona || "");
        setClosingMessage(cfg.closing_message || "");
        setWorkingHours(cfg.working_hours || "");
        setPricingHints(cfg.pricing_hints || "");
        setIdealCustomerProfile(cfg.ideal_customer_profile || "");
        setAggressiveness((cfg.handoff_aggressiveness as Aggressiveness) || "balanced");
        setMaxMessages(cfg.max_messages_before_handoff || 10);
        setForbidden(cfg.forbidden_topics || []);
        setFaq(cfg.faq_entries || []);
        setQualifyingQuestions(cfg.custom_qualifying_questions || []);
        setKbDocs(docs);
      })
      .catch(() => setError("Config yuklenemedi"))
      .finally(() => setLoading(false));
  }, [companyId]);

  /* ─── Save config ──────────────────────────────────────────────────────── */

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateConfig(companyId, {
        company_display_name: displayName,
        industry_focus: industry,
        tone,
        primary_language: language,
        custom_persona: persona,
        closing_message: closingMessage,
        working_hours: workingHours,
        pricing_hints: pricingHints,
        ideal_customer_profile: idealCustomerProfile,
        handoff_aggressiveness: aggressiveness,
        max_messages_before_handoff: maxMessages,
        forbidden_topics: forbidden,
        faq_entries: faq,
        custom_qualifying_questions: qualifyingQuestions,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }, [companyId, displayName, industry, tone, language, persona, closingMessage, workingHours, pricingHints, idealCustomerProfile, aggressiveness, maxMessages, forbidden, faq, qualifyingQuestions]);

  /* ─── KB upload ────────────────────────────────────────────────────────── */

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        setUploadError(`"${file.name}" dosyasi 5MB limitini asiyor (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
        return;
      }
    }

    setUploading(true);
    setUploadError("");
    try {
      for (const file of Array.from(files)) {
        const doc = await uploadKBDocument(companyId, file, "general");
        setKbDocs((prev) => [doc, ...prev]);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Yukleme basarisiz");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteDoc(docId: string) {
    try {
      await deleteKBDocument(companyId, docId);
      setKbDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      setError("Dokuman silinemedi");
    }
  }

  /* ─── Array helpers ────────────────────────────────────────────────────── */

  function addForbidden() {
    if (!forbiddenInput.trim()) return;
    setForbidden((prev) => [...prev, forbiddenInput.trim()]);
    setForbiddenInput("");
  }

  function addFaq() {
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    setFaq((prev) => [...prev, { question: faqQuestion.trim(), answer: faqAnswer.trim() }]);
    setFaqQuestion("");
    setFaqAnswer("");
  }

  function addQuestion() {
    if (!questionInput.trim()) return;
    setQualifyingQuestions((prev) => [...prev, questionInput.trim()]);
    setQuestionInput("");
  }

  /* ─── Loading state ────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 p-2.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-600">
            <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z" strokeLinecap="round" />
            <path d="M8.5 14.5A7.5 7.5 0 0 0 12 22a7.5 7.5 0 0 0 3.5-7.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900">AI Asistan Yapilandirmasi</p>
          <p className="text-sm text-slate-500">Bu sirket icin AI sohbet asistanini ozellestirin.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-violet-600 text-violet-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[320px]">

        {/* ── IDENTITY TAB ───────────────────────────────────────────────────── */}
        {activeTab === "identity" && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <SectionHeader title="Temel Bilgiler" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sirket Goruntu Adi" value={displayName} onChange={setDisplayName} placeholder="Ornek: Califorian Insaat" />
              <SelectField label="Sektor Odagi" value={industry} onChange={setIndustry} options={[
                { value: "construction", label: "Insaat" },
                { value: "real_estate", label: "Gayrimenkul" },
                { value: "industrial", label: "Endustriyel" },
                { value: "renovation", label: "Tadilat" },
              ]} />
              <SelectField label="Ses Tonu" value={tone} onChange={setTone} options={[
                { value: "professional", label: "Profesyonel" },
                { value: "casual", label: "Samimi" },
                { value: "technical", label: "Teknik" },
                { value: "luxury", label: "Premium / Luks" },
              ]} />
              <SelectField label="Dil" value={language} onChange={setLanguage} options={[
                { value: "tr", label: "Turkce" },
                { value: "en", label: "English" },
              ]} />
            </div>

            <SectionHeader title="Persona & Davranis" />
            <Field
              label="Ozel Persona (max 500 karakter)"
              value={persona}
              onChange={setPersona}
              placeholder="Ornek: Premium insaat ve gayrimenkul yatirim danismani"
              multiline
              hint={`${persona.length}/500`}
            />

            <SectionHeader title="Mesajlar & Zaman" />
            <Field label="Kapanis Mesaji" value={closingMessage} onChange={setClosingMessage} placeholder="Uzman ekibimiz sizi en kisa surede arayacak..." multiline />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Calisma Saatleri" value={workingHours} onChange={setWorkingHours} placeholder="Pzt-Cum 09:00-18:00" />
              <Field label="Fiyat Ipuclari" value={pricingHints} onChange={setPricingHints} placeholder="Projelerimiz genellikle 500K-5M TL araliginda" />
            </div>
          </div>
        )}

        {/* ── SCORING TAB ────────────────────────────────────────────────────── */}
        {activeTab === "scoring" && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <SectionHeader title="Ideal Musteri Profili" />
            <p className="text-xs text-slate-500">
              AI, leadleri bu profile gore degerlendirir. Ne kadar detayli tanimlarsan, puanlama o kadar isabetli olur.
            </p>
            <div>
              <textarea
                value={idealCustomerProfile}
                onChange={(e) => setIdealCustomerProfile(e.target.value.slice(0, 1000))}
                rows={4}
                placeholder={"Ornek: Turkiye'de 500m2+ konut veya ticari proje planlayan kisiler. Butce 3M+ TL. Karar verici mal sahibi veya yatirimci. Zaman cizelgesi 6 ay icerisinde. Bonus: arsasi var, mimari ile calisiyor."}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
              />
              <p className="mt-1 text-right text-[10px] text-slate-400">{idealCustomerProfile.length}/1000</p>
            </div>

            <SectionHeader title="Yonlendirme Hassasiyeti" />
            <p className="text-xs text-slate-500">
              Nitelikli leadlerin satis ekibine ne kadar hizli yonlendirilecegini belirler.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "conservative" as Aggressiveness, label: "Temkinli", desc: "Sadece cok emin oldugunuz leadleri yonlendirir", icon: "🛡️" },
                { value: "balanced" as Aggressiveness, label: "Dengeli", desc: "Iyi nitelikli leadleri yonlendirir", icon: "⚖️" },
                { value: "aggressive" as Aggressiveness, label: "Agresif", desc: "Umut vaat eden tum leadleri yonlendirir", icon: "🚀" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAggressiveness(opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-center transition-all ${
                    aggressiveness === opt.value
                      ? "border-violet-500 bg-violet-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className={`text-sm font-semibold ${aggressiveness === opt.value ? "text-violet-700" : "text-slate-700"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] leading-snug text-slate-500">{opt.desc}</span>
                </button>
              ))}
            </div>

            <SectionHeader title="Sohbet Ayarlari" />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Max Mesaj (Handoff Oncesi): <span className="font-bold text-violet-700">{maxMessages}</span>
              </label>
              <input
                type="range" min={5} max={30} value={maxMessages}
                onChange={(e) => setMaxMessages(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400"><span>5</span><span>30</span></div>
            </div>
          </div>
        )}

        {/* ── KNOWLEDGE TAB ──────────────────────────────────────────────────── */}
        {activeTab === "knowledge" && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <SectionHeader title="Dokuman Yukle" />
            <p className="text-xs text-slate-500">
              Sirket dokumanlarinizi yukleyin (PDF, TXT, DOCX — max 5MB). Icerik otomatik cikarilir ve AI&apos;nin bilgi bankasina eklenir.
            </p>

            {/* Upload zone */}
            <div
              className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 transition-colors hover:border-violet-400 hover:bg-violet-50/30 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-violet-500", "bg-violet-50/50"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("border-violet-500", "bg-violet-50/50"); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-violet-500", "bg-violet-50/50");
                handleFileUpload(e.dataTransfer.files);
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm font-medium text-slate-600">
                {uploading ? "Yukleniyor..." : "Dosya surukleyin veya tiklayin"}
              </p>
              <p className="text-[10px] text-slate-400">PDF, TXT, DOCX — Max 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>
            {uploadError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{uploadError}</p>}

            {/* Document list */}
            {kbDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">{kbDocs.length} dokuman yuklendi</p>
                {kbDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <FileIcon type={doc.file_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(doc.file_size)} — {new Date(doc.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Sil"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <SectionHeader title="Bilgi Bankasi (FAQ)" />
            <p className="text-xs text-slate-500">AI&apos;nin musterilere verecegi soru-cevap ciftleri ekleyin.</p>
            <div className="flex gap-2">
              <input
                type="text" value={faqQuestion} onChange={(e) => setFaqQuestion(e.target.value)}
                placeholder="Soru..." className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              />
              <input
                type="text" value={faqAnswer} onChange={(e) => setFaqAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFaq()}
                placeholder="Cevap..." className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              />
              <button type="button" onClick={addFaq} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200">Ekle</button>
            </div>
            <div className="space-y-1.5">
              {faq.map((f, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs">
                  <div className="flex-1">
                    <p className="font-medium text-blue-800">S: {f.question}</p>
                    <p className="text-blue-600">C: {f.answer}</p>
                  </div>
                  <button type="button" onClick={() => setFaq((prev) => prev.filter((_, j) => j !== i))} className="text-blue-400 hover:text-blue-600 shrink-0">&times;</button>
                </div>
              ))}
            </div>

            <SectionHeader title="Webhook Verisi (RAG)" />
            <p className="text-xs text-slate-500">
              Harici sistemlerden gelen webhook verilerini AI bilgi bankasina ekleyin.
              Herhangi bir JSON formatinda veri gonderebilirsiniz.
            </p>
            <WebhookDataPanel companyId={companyId} />
          </div>
        )}

        {/* ── RULES TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "rules" && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            <SectionHeader title="Yasakli Konular" />
            <p className="text-xs text-slate-500">AI&apos;nin kesinlikle konusmamasi gereken konulari ekleyin.</p>
            <div className="flex gap-2">
              <input
                type="text" value={forbiddenInput} onChange={(e) => setForbiddenInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addForbidden()}
                placeholder="Yeni yasak konu ekle..." className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              />
              <button type="button" onClick={addForbidden} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200">Ekle</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {forbidden.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-700">
                  {t}
                  <button type="button" onClick={() => setForbidden((prev) => prev.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-600">&times;</button>
                </span>
              ))}
              {forbidden.length === 0 && <p className="text-xs text-slate-400">Henuz yasak konu eklenmedi.</p>}
            </div>

            <SectionHeader title="Oncelikli Sorular" />
            <p className="text-xs text-slate-500">AI&apos;nin musteriye sormasi gereken ozel sorulari ekleyin. Bunlar CHAMP sorularina ek olarak sorulur.</p>
            <div className="flex gap-2">
              <input
                type="text" value={questionInput} onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                placeholder="Ornek: Projeniz icin arsa var mi?" className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              />
              <button type="button" onClick={addQuestion} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200">Ekle</button>
            </div>
            <div className="space-y-1.5">
              {qualifyingQuestions.map((q, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-200 text-violet-700 font-bold text-[10px]">{i + 1}</span>
                  <span className="flex-1 text-violet-800">{q}</span>
                  <button type="button" onClick={() => setQualifyingQuestions((prev) => prev.filter((_, j) => j !== i))} className="text-violet-400 hover:text-violet-600 shrink-0">&times;</button>
                </div>
              ))}
              {qualifyingQuestions.length === 0 && <p className="text-xs text-slate-400">Henuz ozel soru eklenmedi.</p>}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer: Save ─────────────────────────────────────────────────────── */}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      {saved && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">Kaydedildi!</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
      >
        {saving ? "Kaydediliyor..." : "Ayarlari Kaydet"}
      </button>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{title}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, multiline, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-slate-600">{label}</label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          rows={2} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:border-violet-400 focus:outline-none" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    pdf: "bg-rose-100 text-rose-600",
    txt: "bg-slate-100 text-slate-600",
    docx: "bg-blue-100 text-blue-600",
  };
  return (
    <div className={`flex items-center justify-center w-9 h-9 rounded-lg text-[10px] font-bold uppercase ${colors[type] || "bg-slate-100 text-slate-600"}`}>
      {type}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

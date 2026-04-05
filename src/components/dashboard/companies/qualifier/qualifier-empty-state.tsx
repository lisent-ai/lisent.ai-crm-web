type Props = {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
};

export function QualifierEmptyState({ title, description, action }: Readonly<Props>) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center animate-[fadeIn_0.4s_ease-out]">
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-3.5 shadow-inner">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
          <path d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all duration-200 hover:shadow-lg hover:shadow-violet-300 hover:-translate-y-0.5 active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

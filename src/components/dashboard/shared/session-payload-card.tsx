type SessionPayloadCardProps = {
  payload: string | null;
};

export function SessionPayloadCard({
  payload,
}: Readonly<SessionPayloadCardProps>) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/6 p-6 shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-white">Access token payload</h2>
      <pre className="mt-4 max-h-80 overflow-auto rounded-2xl border border-white/8 bg-[#070913] p-4 text-xs leading-6 text-violet-50/90">
        {payload ?? "No payload available yet."}
      </pre>
    </section>
  );
}

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";

export function AuthShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#050816] p-0 text-white md:p-4">
      <div className="mx-auto grid min-h-screen max-w-7xl overflow-hidden border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur md:min-h-[calc(100vh-2rem)] md:rounded-[2rem] md:grid-cols-[1.15fr_0.85fr]">
        <AuthBrandPanel />

        <section className="flex items-start justify-center bg-[linear-gradient(180deg,_rgba(18,10,36,0.92),_rgba(9,12,24,0.96))] px-4 py-5 sm:px-6 md:items-center md:p-10">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}

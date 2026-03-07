type SessionStatusCardProps = {
  loading: boolean;
  userId?: string;
  doesSessionExist?: boolean;
  onSignOut: () => void;
};

export function SessionStatusCard({
  loading,
  userId,
  doesSessionExist,
  onSignOut,
}: Readonly<SessionStatusCardProps>) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/6 p-6 shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-white">User context</h2>
      <dl className="mt-5 grid gap-4 text-sm">
        <div>
          <dt className="font-medium text-violet-200/68">User ID</dt>
          <dd className="mt-1 break-all text-violet-50/90">
            {loading ? "Loading..." : userId}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-violet-200/68">Has session</dt>
          <dd className="mt-1 text-violet-50/90">
            {loading ? "Loading..." : doesSessionExist ? "Yes" : "No"}
          </dd>
        </div>
      </dl>

      <button
        className="mt-7 rounded-full bg-[linear-gradient(90deg,_rgba(124,58,237,0.96),_rgba(205,98,255,0.92))] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(168,85,247,0.34)] transition hover:brightness-110"
        onClick={onSignOut}
        type="button"
      >
        Sign out
      </button>
    </section>
  );
}

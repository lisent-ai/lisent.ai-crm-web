/**
 * Client-side workspace (selected company) persistence.
 *
 * URL query param (`?company=<uuid>&companyName=<name>`) remains the source of
 * truth across the app. localStorage is only a fallback, used on fresh page
 * loads where the URL has no company hint — AppShell restores it silently via
 * router.replace(). The app must tolerate localStorage being unavailable
 * (private mode, quota errors) — every call here catches failures and returns
 * a no-op result.
 */

const ID_KEY = "lisent.selectedCompanyId";
const NAME_KEY = "lisent.selectedCompanyName";

export type StoredCompany = {
  id: string;
  name: string;
};

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readStoredCompany(): StoredCompany | null {
  if (!hasStorage()) return null;
  try {
    const id = window.localStorage.getItem(ID_KEY)?.trim() ?? "";
    const name = window.localStorage.getItem(NAME_KEY)?.trim() ?? "";
    if (!id) return null;
    return { id, name };
  } catch {
    return null;
  }
}

export function storeCompany(id: string, name: string): void {
  if (!hasStorage()) return;
  const trimmedId = id.trim();
  if (!trimmedId) {
    clearStoredCompany();
    return;
  }
  try {
    window.localStorage.setItem(ID_KEY, trimmedId);
    window.localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    /* quota or private mode — silent fallback */
  }
}

export function clearStoredCompany(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(ID_KEY);
    window.localStorage.removeItem(NAME_KEY);
  } catch {
    /* ignore */
  }
}

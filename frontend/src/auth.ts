// App-wide password gate.
// Token is stored in localStorage and attached to every /api/* fetch via
// a single monkey-patch installed once at boot. Cron uses a separate
// Authorization header from GitHub Actions and is exempt server-side.

const TOKEN_KEY = "stockstar:app-token";

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Wrap window.fetch so every same-origin /api/* call carries X-App-Token. */
export function installAuthFetch(): void {
  if ((window as any).__authedFetchInstalled) return;
  (window as any).__authedFetchInstalled = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    let url = "";
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.toString();
    else url = (input as Request).url;

    const isApi = url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);
    if (!isApi) return origFetch(input, init);

    const token = getToken();
    if (!token) return origFetch(input, init);

    const headers = new Headers(init.headers || {});
    if (input instanceof Request && !init.headers) {
      input.headers.forEach((v, k) => headers.set(k, v));
    }
    headers.set("X-App-Token", token);
    return origFetch(input, { ...init, headers });
  };
}

/** Validate the given token against the backend. */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/verify", {
      headers: { "X-App-Token": token },
    });
    return res.ok;
  } catch {
    return false;
  }
}

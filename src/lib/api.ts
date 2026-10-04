/**
 * Universal client-side fetch helper with dual cookie + Bearer token authentication
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sw_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

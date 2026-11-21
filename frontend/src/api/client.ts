// Real HTTP client for UniAbsence API.
// Communicates with the Express backend at /api and attaches JWT Bearer tokens.

export class ApiError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ApiError";
  }
}

const TOKEN_KEY = "uniabsence.jwt.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore private browsing storage restrictions
  }
}

// Reactive store for useQuery invalidation across the app
let queryVersion = 0;
const subscribers = new Set<() => void>();

export function getQueryVersion(): number {
  return queryVersion;
}

export function subscribeQuery(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function invalidateQueries(): void {
  queryVersion += 1;
  subscribers.forEach((fn) => fn());
}

const BASE_URL = "/api";

export async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | boolean | undefined | null> } = {}
): Promise<T> {
  const { params, ...init } = options;
  let url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string>),
  };

  if (!(init.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    throw new ApiError("Impossible de contacter le serveur. Vérifiez votre connexion.");
  }

  if (res.status === 401 && !path.includes("/auth/login")) {
    setToken(null);
  }

  let body: any = null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const message =
      (typeof body === "object" && body && (body.message || body.error)) ||
      res.statusText ||
      "Une erreur est survenue sur le serveur.";
    const field = typeof body === "object" && body && body.field;
    throw new ApiError(message, field);
  }

  // Handle standard { success: true, data: ..., message: ... } response wrapper
  if (typeof body === "object" && body && "data" in body && "success" in body) {
    return body.data as T;
  }

  return body as T;
}

export const client = {
  get: <T>(path: string, params?: Record<string, any>) => request<T>(path, { method: "GET", params }),
  post: <T>(path: string, body?: any) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  postFormData: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
  put: <T>(path: string, body?: any) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: any) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

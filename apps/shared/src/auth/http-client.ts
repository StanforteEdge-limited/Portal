import { normalizeTokens } from "./tokens";
import type { SessionStorageAdapter } from "./storage";

type JsonObject = Record<string, unknown>;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: JsonObject | FormData;
  headers?: Record<string, string>;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

export type HttpRequest = <T = unknown>(path: string, options?: RequestOptions) => Promise<T>;

export function createHttpClient(config: {
  apiBaseUrl: string;
  session?: SessionStorageAdapter;
}): HttpRequest {
  const { apiBaseUrl, session } = config;
  let refreshPromise: Promise<string | null> | null = null;

  function notifyAuthInvalidated(reason: string) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("se:auth-invalidated", {
        detail: { reason },
      }),
    );
  }

  function isFormData(value: unknown): value is FormData {
    return typeof FormData !== "undefined" && value instanceof FormData;
  }

  async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) {
      return refreshPromise;
    }

    // When using httpOnly cookies, we don't pass the refresh_token in the body.
    // The browser automatically attaches the se_refresh_token cookie.
    refreshPromise = fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Token refresh failed with ${response.status}`);
        }

        const json = await response.json();
        const payload = json?.data ?? json;
        const tokens = normalizeTokens(payload);
        if (session) {
          session.updateSessionTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
        }
        // When using httpOnly cookies the token isn't in the body — return a
        // sentinel so the caller knows the refresh succeeded and should retry.
        return tokens.access_token || "cookie";
      })
      .catch(() => {
        session?.clearSession();
        notifyAuthInvalidated("refresh_failed");
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  async function parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const nestedError = (payload as any)?.error;
      let rawMessage = (payload as any)?.message;
      
      if (Array.isArray(rawMessage)) {
        rawMessage = rawMessage.join("\n");
      }

      const errorMessage =
        rawMessage ??
        (typeof nestedError === "string" ? nestedError : undefined) ??
        nestedError?.message ??
        (payload as any)?.data?.message ??
        nestedError?.details?.code ??
        `Request failed with status ${response.status}`;
      throw new Error(String(errorMessage));
    }

    // Only preserve envelope for paginated responses: { success, data: { items, meta } }
    if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
      const data = (payload as any).data;
      if (data && typeof data === "object" && Array.isArray(data.items) && data.meta) {
        return payload as T;
      }
    }
    // All other responses: unwrap the data payload
    return ((payload as any)?.data ?? payload) as T;
  }

  async function httpRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = "GET",
      body,
      headers = {},
      auth = true,
      retryOnUnauthorized = true,
    } = options;

    const currentSession = session?.getStoredSession();
    const composedHeaders: Record<string, string> = {
      ...headers,
    };

    if (auth && currentSession?.accessToken) {
      composedHeaders.Authorization = `Bearer ${currentSession.accessToken}`;
    }

    let requestBody: BodyInit | undefined;
    if (body) {
      if (isFormData(body)) {
        requestBody = body;
      } else {
        composedHeaders["Content-Type"] = "application/json";
        requestBody = JSON.stringify(body);
      }
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: composedHeaders,
      body: requestBody,
      credentials: "include",
    });

    if (response.status === 401 && auth && retryOnUnauthorized) {
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        return httpRequest<T>(path, {
          ...options,
          retryOnUnauthorized: false,
        });
      }
      notifyAuthInvalidated("unauthorized");
    }

    return parseResponse<T>(response);
  }

  return httpRequest;
}

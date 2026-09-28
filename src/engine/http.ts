/**
 * HTTP simulation: fetch, headers, cookies, sessions, robots, cache, rate.
 */

import type { HttpHeaders, HttpMethod, HttpResponse, SitePage } from "./types";
import { lookupPage, parseUrl } from "./sites";

export interface FetchOptions {
  method?: HttpMethod;
  headers?: HttpHeaders;
  body?: string;
  cookies?: Record<string, string>;
  sessionEnabled?: boolean;
  rateLimit?: number;
  cache?: Map<string, HttpResponse>;
  useJsRender?: boolean;
}

export interface FetchOutcome {
  request: {
    method: HttpMethod;
    url: string;
    headers: HttpHeaders;
    body?: string;
  };
  response: HttpResponse;
  /** Set cookies proposed by the response. */
  setCookies: Record<string, string>;
  /** True when robots.txt forbids this path. */
  robotsBlocked: boolean;
  redirectedTo?: string;
}

export const DEFAULT_UA = "LearnScrapingBot/0.1 (+https://learn.local/bot)";

function statusText(code: number): string {
  const map: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };
  return map[code] ?? "Unknown";
}

export function robotsAllows(robotsTxt: string, path: string): boolean {
  let uaAll = false;
  const disallows: string[] = [];
  const allows: string[] = [];
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [k, ...rest] = line.split(":");
    const key = k.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      uaAll = val === "*" || val.toLowerCase().includes("learn");
    } else if (key === "disallow" && uaAll) {
      if (val) disallows.push(val);
    } else if (key === "allow" && uaAll) {
      if (val) allows.push(val);
    }
  }
  const hitDisallow = disallows.find((d) => path.startsWith(d));
  const hitAllow = allows.find((a) => path.startsWith(a) && a.length >= (hitDisallow?.length ?? 0));
  if (hitDisallow && !hitAllow) return false;
  return true;
}

export function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

export function parseSetCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(/,\s*/)) {
    const pair = part.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return out;
}

export function applyAuth(
  page: SitePage,
  siteAuth: { cookieName: string; cookieValue: string } | undefined,
  cookies: Record<string, string>,
): { status: number; body: string; blocked: boolean } {
  if (!page.authRequired) {
    return { status: page.status, body: page.body, blocked: false };
  }
  if (siteAuth && cookies[siteAuth.cookieName] === siteAuth.cookieValue) {
    return { status: 200, body: page.body, blocked: false };
  }
  return {
    status: 401,
    body: "<!doctype html><html><body><h1>401 Unauthorized</h1></body></html>",
    blocked: true,
  };
}

export function fetchSimulated(url: string, opts: FetchOptions = {}): FetchOutcome {
  const method = opts.method ?? "GET";
  const headers: HttpHeaders = {
    accept: "text/html,application/xhtml+xml",
    "user-agent": opts.headers?.["user-agent"] ?? DEFAULT_UA,
    ...(opts.headers ?? {}),
  };
  const cookies = opts.cookies ?? {};
  const cache = opts.cache;
  const cacheKey = `${method} ${url}`;

  const found = lookupPage(url);
  const request = { method, url, headers, body: opts.body };

  if (!found) {
    return {
      request,
      response: {
        status: 404,
        statusText: statusText(404),
        headers: { "content-type": "text/html" },
        body: `<!doctype html><html><body><h1>404 host or page not found</h1></body></html>`,
        latencyMs: 40,
      },
      setCookies: {},
      robotsBlocked: false,
    };
  }

  const { site, page, fullUrl } = found;
  const { path } = parseUrl(fullUrl);

  if (opts.rateLimit !== undefined && opts.rateLimit <= 0) {
    return {
      request,
      response: {
        status: 429,
        statusText: statusText(429),
        headers: { "content-type": "text/html" },
        body: "<!doctype html><html><body><h1>429</h1></body></html>",
        latencyMs: 10,
        blockedBy: "rate",
      },
      setCookies: {},
      robotsBlocked: false,
    };
  }

  if (method === "GET" && !robotsAllows(site.robotsTxt, path)) {
    return {
      request,
      response: {
        status: 403,
        statusText: "Forbidden",
        headers: { "content-type": "text/html" },
        body: "<!doctype html><html><body><h1>Blocked by robots.txt</h1></body></html>",
        latencyMs: 5,
        blockedBy: "robots",
      },
      setCookies: {},
      robotsBlocked: true,
    };
  }

  if (cache && method === "GET") {
    const hit = cache.get(cacheKey);
    if (hit) {
      return {
        request,
        response: { ...hit, fromCache: true, latencyMs: 1 },
        setCookies: {},
        robotsBlocked: false,
      };
    }
  }

  // login POST
  if (method === "POST" && path === "/login" && site.auth) {
    const params = new URLSearchParams(opts.body ?? "");
    const user = params.get("user") ?? "";
    const pass = params.get("pass") ?? "";
    const setCookies: Record<string, string> = {};
    if (user === site.auth.user && pass === site.auth.pass) {
      setCookies[site.auth.cookieName] = site.auth.cookieValue;
      return {
        request,
        response: {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "text/html; charset=utf-8", "set-cookie": `${site.auth.cookieName}=${site.auth.cookieValue}; Path=/` },
          body: `<!doctype html><html><body><h1>Welcome, ${user}</h1><p><a href="/admin">Admin</a></p></body></html>`,
          latencyMs: 35,
        },
        setCookies,
        robotsBlocked: false,
      };
    }
    return {
      request,
      response: {
        status: 401,
        statusText: "Unauthorized",
        headers: { "content-type": "text/html" },
        body: "<!doctype html><html><body><h1>Login failed</h1></body></html>",
        latencyMs: 20,
        blockedBy: "auth",
      },
      setCookies: {},
      robotsBlocked: false,
    };
  }

  if (method === "POST" && path === "/search") {
    const params = new URLSearchParams(opts.body ?? "");
    const q = params.get("q") ?? "";
    return {
      request,
      response: {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "text/html; charset=utf-8" },
        body: `<!doctype html><html><body><h1>Results for ${escapeHtml(q)}</h1><ul class="results"><li>bolt</li><li>bracket</li></ul></body></html>`,
        latencyMs: 30,
      },
      setCookies: {},
      robotsBlocked: false,
    };
  }

  const authResult = applyAuth(page, site.auth, cookies);
  let body = authResult.body;
  if (page.needsJs && opts.useJsRender && page.renderedBody) {
    body = page.renderedBody;
  }

  const response: HttpResponse = {
    status: authResult.status,
    statusText: statusText(authResult.status),
    headers: {
      ...page.headers,
      "x-request-id": `req_${Math.abs(hashString(cacheKey)) % 100000}`,
    },
    body,
    latencyMs: 28 + (Math.abs(hashString(url)) % 40),
    blockedBy: authResult.blocked ? "auth" : undefined,
  };

  const setCookies: Record<string, string> = {};
  if (page.headers["set-cookie"]) {
    Object.assign(setCookies, parseSetCookie(page.headers["set-cookie"]));
  }

  if (cache && method === "GET" && response.status === 200) {
    cache.set(cacheKey, { ...response, fromCache: false });
  }

  const location = page.headers.location;
  return {
    request,
    response,
    setCookies,
    robotsBlocked: false,
    redirectedTo: location ? location : undefined,
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatRequest(req: FetchOutcome["request"]): string[] {
  const lines = [`${req.method} ${req.url}`];
  for (const [k, v] of Object.entries(req.headers)) {
    lines.push(`${k}: ${v}`);
  }
  if (req.body) lines.push("", req.body);
  return lines;
}

export function formatResponse(res: HttpResponse): string[] {
  const lines = [`HTTP ${res.status} ${res.statusText}`];
  for (const [k, v] of Object.entries(res.headers)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push("", res.body.slice(0, 500) + (res.body.length > 500 ? "…" : ""));
  return lines;
}

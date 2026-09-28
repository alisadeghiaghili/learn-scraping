/** World 2 — requests. */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD2_LEVELS: Level[] = [
  {
    id: "2.1",
    world: "w2",
    worldTitle: "requests",
    title: "The Response object",
    concept: {
      title: "requests.get returns more than HTML",
      body:
        "`requests.get(url)` returns a `Response`: `status_code`, `headers`, `text`, `content` (bytes), `json()`, `url` (after redirects), and `elapsed`. Most bugs are people treating `r` as if it were the body string.",
      whatHappens:
        "`fetch` prints the status and latency like a real Response. `show request` and `show response` mirror `r.request` and `r.headers` / `r.text`.",
      why:
        "You will spend half your career reading headers and status codes. Learn the object model now.",
    },
    goal: "Fetch and show both the request side and the response side.",
    hints: ["`fetch https://shop.local/`", "`show request`", "`show response`"],
    learning: ["Response object", "headers", "text vs content"],
    packages: ["requests"],
    steps: [
      {
        id: "fetch",
        label: "GET a page",
        detail: "requests.get",
        command: "fetch https://shop.local/",
        check: (s) => Boolean(s.response),
      },
      {
        id: "req",
        label: "Show the request",
        detail: "method, url, headers",
        command: "show request",
        check: (s) => s.inspectedResponse && Boolean(s.url),
      },
      {
        id: "res",
        label: "Show the response",
        detail: "status, headers, body",
        command: "show response",
        check: (s) => s.inspectedResponse,
      },
    ],
    win: (s) => {
      if (!s.response) return fail("Fetch first.");
      if (!s.inspectedResponse) return fail("Run `show request` and `show response`.");
      return win("The Response object is your whole world for static scraping.");
    },
  },
  {
    id: "2.2",
    world: "w2",
    worldTitle: "requests",
    title: "Headers and User-Agent",
    concept: {
      title: "Say who you are",
      body:
        "Browsers send `User-Agent`, `Accept`, and cookies. Default Python UAs are often blocked or throttled. Set a clear User-Agent with contact info in production. Do not pretend to be Chrome to sneak past a WAF — that is hostile and brittle.",
      whatHappens:
        "`ua LearnScrapingBot/0.1` sets the header on the next request. `show request` shows it in the header list.",
      why:
        "Identifying yourself is politeness and observability. It also makes rate-limit policies work.",
    },
    goal: "Set a custom User-Agent and confirm it on the request.",
    hints: ["`ua LearnScrapingBot/0.1`", "`fetch https://shop.local/`", "`show request`"],
    learning: ["User-Agent", "request headers", "honest identification"],
    packages: ["requests"],
    steps: [
      {
        id: "ua",
        label: "Set User-Agent",
        detail: "Custom bot string.",
        command: "ua LearnScrapingBot/0.1",
        check: (s) => Boolean(s.userAgent),
      },
      {
        id: "fetch",
        label: "Fetch with that UA",
        detail: "Header travels with the request.",
        command: "fetch https://shop.local/",
        check: (s) => Boolean(s.response) && Boolean(s.userAgent),
      },
    ],
    win: (s) => {
      if (!s.userAgent) return fail("Set `ua LearnScrapingBot/0.1`.");
      if (!s.response) return fail("Fetch so the header is sent.");
      return win("Your client has a name. Keep it honest.");
    },
  },
  {
    id: "2.3",
    world: "w2",
    worldTitle: "requests",
    title: "Sessions and cookies",
    concept: {
      title: "Logged-in scrapers need state",
      body:
        "Cookies are how servers remember you. `requests.Session()` stores cookies across requests and shares connection settings. Without a session, every GET is a new stranger — and private pages stay 401.",
      whatHappens:
        "`session` enables cookie persistence. `post https://shop.local/login user=analyst pass=catalog` sets a session cookie. Then `fetch https://shop.local/account` returns the account page. (Robots may still fence some paths — that is level 1.5 / 8.4.)",
      why:
        "Login flows, CSRF tokens, and A/B buckets all ride on cookies. A bare `get` cannot follow that state.",
    },
    goal: "Log in with a session and open the account page.",
    hints: [
      "`session`",
      "`post https://shop.local/login user=analyst pass=catalog`",
      "`fetch https://shop.local/account`",
    ],
    learning: ["cookies", "requests.Session", "login flows"],
    packages: ["requests"],
    steps: [
      {
        id: "sess",
        label: "Enable session",
        detail: "Cookie jar on.",
        command: "session",
        check: (s) => s.sessionEnabled,
      },
      {
        id: "login",
        label: "POST login",
        detail: "analyst / catalog",
        command: "post https://shop.local/login user=analyst pass=catalog",
        check: (s) => Boolean(s.cookies.session ?? s.cookies["session"]),
      },
      {
        id: "account",
        label: "Fetch account",
        detail: "Authed 200.",
        command: "fetch https://shop.local/account",
        check: (s) => s.response?.status === 200 && Boolean(s.url?.includes("account")),
      },
    ],
    win: (s) => {
      if (!s.sessionEnabled) return fail("Start a session: `session`.");
      if (!Object.keys(s.cookies).length) return fail("Log in with POST to set cookies.");
      if (s.response?.status !== 200) return fail("Fetch /account while authenticated.");
      return win("Stateful scraping works. Cookies are credentials.");
    },
  },
  {
    id: "2.4",
    world: "w2",
    worldTitle: "requests",
    title: "POST and forms",
    concept: {
      title: "Search boxes are just POST bodies",
      body:
        "HTML forms serialize to `application/x-www-form-urlencoded` (usually). In requests you pass `data={q: bolt}`. The response is another HTML page — parse it like any other.",
      whatHappens:
        "`post https://shop.local/search q=bolt` sends a form body. The server returns a results page you can parse.",
      why:
        "Search, filters, and login are the same mechanism. Learn the body encoding once.",
    },
    goal: "Submit a search form and inspect the results response.",
    hints: ["`post https://shop.local/search q=bolt`", "`show response`"],
    learning: ["POST", "form encoding", "search endpoints"],
    packages: ["requests"],
    steps: [
      {
        id: "post",
        label: "POST a form",
        detail: "q=bolt",
        command: "post https://shop.local/search q=bolt",
        check: (s) => s.method === "POST" && Boolean(s.response),
      },
    ],
    win: (s) => {
      if (s.method !== "POST" || !s.response) return fail("Use `post https://shop.local/search q=bolt`.");
      return win("Forms are just structured POSTs.");
    },
  },
  {
    id: "2.5",
    world: "w2",
    worldTitle: "requests",
    title: "Errors and retries",
    concept: {
      title: "Networks fail. Design for it.",
      body:
        "Timeouts, 5xx, and connection resets are normal. Wrap calls with timeouts, retry idempotent GETs with backoff, and log the status. Never parse a body you got from a failed call without checking.",
      whatHappens:
        "Fetch `/error` (500), then `retry` to simulate a second attempt. Good scrapers treat 5xx as retryable and 404 as permanent.",
      why:
        "A scraper that crashes on the first 500 is not a pipeline. It is a demo.",
    },
    goal: "See a 500 and record a retry.",
    hints: ["`fetch https://shop.local/error`", "`retry`"],
    learning: ["timeouts", "retry with backoff", "idempotent GETs"],
    packages: ["requests"],
    steps: [
      {
        id: "err",
        label: "Hit a 500",
        detail: "Server error path.",
        command: "fetch https://shop.local/error",
        check: (s) => (s.response?.status ?? 0) >= 500,
      },
      {
        id: "retry",
        label: "Retry",
        detail: "Simulate second attempt.",
        command: "retry",
        check: (s) => s.retries > 0,
      },
    ],
    win: (s) => {
      if ((s.response?.status ?? 0) < 500) return fail("Fetch /error first.");
      if (s.retries < 1) return fail("Run `retry`.");
      return win("Failures are data. Handle them.");
    },
  },
];

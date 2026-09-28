/** World 8 — Production scraping. */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD8_LEVELS: Level[] = [
  {
    id: "8.1",
    world: "w8",
    worldTitle: "Production scraping",
    title: "Caching",
    concept: {
      title: "Do not fetch the same URL fifty times",
      body:
        "Cache GET responses on disk (or Redis) keyed by URL + relevant headers. Respect Cache-Control when present. During development, a cache makes iteration fast and kind to the origin.",
      whatHappens:
        "The sandbox caches successful GETs. A second `fetch` of the same URL reports `cache` and increments `cacheHits`. `cache` clears it.",
      why:
        "Caching is politeness, speed, and cost control in one.",
    },
    goal: "Fetch the same URL twice and observe a cache hit.",
    hints: ["`fetch https://shop.local/`", "`fetch https://shop.local/`", "`show response`"],
    learning: ["HTTP cache", "dev iteration speed", "origin kindness"],
    packages: ["requests"],
    steps: [
      {
        id: "f1",
        label: "First fetch",
        detail: "Miss → store.",
        command: "fetch https://shop.local/",
        check: (s) => s.pageFetches >= 1,
      },
      {
        id: "f2",
        label: "Second fetch",
        detail: "Hit cache.",
        check: (s) => s.cacheHits >= 1,
      },
    ],
    win: (s) =>
      s.cacheHits >= 1
        ? win("Cache hits are how adults scrape.")
        : fail("Fetch the same URL twice."),
  },
  {
    id: "8.2",
    world: "w8",
    worldTitle: "Production scraping",
    title: "Retries and idempotency",
    concept: {
      title: "GET can retry; POST needs care",
      body:
        "Idempotent operations can be retried safely. Exponential backoff + jitter avoids thundering herds. Cap attempts. Distinguish 5xx (retry) from 404 (stop). Log every attempt with a request id.",
      whatHappens:
        "`fetch https://shop.local/error` then `retry` models a second attempt. Real stacks use urllib3 Retry, tenacity, or Scrapy middleware.",
      why:
        "Flaky networks are the default. Your pipeline’s reliability is your design.",
    },
    goal: "Record a retry after an error response.",
    hints: ["`fetch https://shop.local/error`", "`retry`"],
    learning: ["backoff", "idempotency", "retry budgets"],
    packages: ["requests"],
    steps: [
      {
        id: "r",
        label: "Retry",
        detail: "After 500.",
        command: "retry",
        check: (s) => s.retries >= 1,
      },
    ],
    win: (s) =>
      s.retries >= 1
        ? win("Retries are a protocol, not a panic.")
        : fail("Run `retry` after hitting an error."),
  },
  {
    id: "8.3",
    world: "w8",
    worldTitle: "Production scraping",
    title: "Architecture",
    concept: {
      title: "Queue → fetch → parse → store",
      body:
        "Production scrapers are small data systems: a frontier queue, fetchers with politeness, parsers as pure functions, and storage with schemas. Observability (counts, error rates, lag) is mandatory. Monolith scripts die in prod.",
      whatHappens:
        "Walking the worlds has exercised each stage. This level asks you to assemble them: fetch, parse, extract, export in one sitting on a fresh URL.",
      why:
        "Architecture is what keeps a scraper alive when the page changes on Tuesday.",
    },
    goal: "Run an end-to-end scrape: fetch → parse → extract → export.",
    hints: [
      "`fetch https://shop.local/products`",
      "`parse`",
      "`table`",
      "`export csv`",
    ],
    learning: ["pipeline stages", "pure parse functions", "observability"],
    packages: ["requests", "beautifulsoup", "pandas", "csv"],
    steps: [
      {
        id: "fetch",
        label: "Fetch",
        detail: "Listing page.",
        command: "fetch https://shop.local/products",
        check: (s) => Boolean(s.response),
      },
      {
        id: "parse",
        label: "Parse",
        detail: "Tree.",
        command: "parse",
        check: (s) => s.parsed,
      },
      {
        id: "rows",
        label: "Extract rows",
        detail: "table or select.",
        command: "table",
        check: (s) => s.extracted.length > 0,
      },
      {
        id: "export",
        label: "Export",
        detail: "csv/json.",
        command: "export csv",
        check: (s) => Boolean(s.exported),
      },
    ],
    win: (s) => {
      if (!s.response || !s.parsed) return fail("Fetch and parse first.");
      if (!s.extracted.length) return fail("Extract rows (`table`).");
      if (!s.exported) return fail("Export the dataset.");
      return win("End-to-end path works. That is a minimal production scrape.");
    },
  },
  {
    id: "8.4",
    world: "w8",
    worldTitle: "Production scraping",
    title: "Respect boundaries",
    concept: {
      title: "The last line of defense is your judgment",
      body:
        "Honor robots.txt, rate limits, terms of service, and copyright. Identify yourself. Prefer official APIs. Do not scrape personal data carelessly. When in doubt, ask — or do not scrape. No selector is worth a lawsuit or an outage.",
      whatHappens:
        "Revisit `robots` and `rate` with a production mindset. `/admin` stays off-limits even though a login cookie can open it in the sandbox.",
      why:
        "Engineering skill without judgment is liability. This course treats ethics as core curriculum.",
      callout: "Just because you can fetch it does not mean you should.",
    },
    goal: "Confirm robots + rate settings before finishing.",
    hints: ["`robots https://shop.local/admin`", "`rate 1`"],
    learning: ["robots compliance", "ToS awareness", "personal data care"],
    packages: ["robotparser", "requests"],
    steps: [
      {
        id: "rb",
        label: "robots check",
        detail: "Private path.",
        command: "robots https://shop.local/admin",
        check: (s) => Boolean(s.robotsChecked) && s.robotsAllowed === false,
      },
      {
        id: "rt",
        label: "Rate limit",
        detail: "≤ a few rps.",
        command: "rate 1",
        check: (s) => Boolean(s.rateLimit && s.rateLimit <= 5),
      },
    ],
    win: (s) => {
      if (!s.robotsChecked || s.robotsAllowed !== false) {
        return fail("Confirm /admin is disallowed via robots.");
      }
      if (!s.rateLimit || s.rateLimit > 5) return fail("Set a modest rate limit.");
      return win("Boundaries respected. You are a professional.");
    },
  },
  {
    id: "8.5",
    world: "w8",
    worldTitle: "Production scraping",
    title: "Capstone",
    concept: {
      title: "Ship a small, honest dataset",
      body:
        "Capstone: crawl the catalog (both pages), extract SKU/name/price, dedupe, export. Use whatever tools you want — requests+bs4, Scrapy, or a mix. The goal is a clean file and a story you can defend: why these selectors, what you would monitor, what breaks first.",
      whatHappens:
        "Everything you learned composes: wire, tree, selectors, pagination, clean export, politeness.",
      why:
        "Courses end. Pipelines continue. The capstone is the minimum bar for ‘I can scrape’. ",
    },
    goal: "Build a complete catalog extract with both pages and a clean export.",
    hints: [
      "`scrapy crawl shop` (or fetch+next+table)",
      "`export csv`",
      "Confirm you dropped the duplicate SKU.",
    ],
    learning: ["end-to-end ownership", "tool composition", "defensible choices"],
    packages: ["requests", "beautifulsoup", "scrapy", "pandas", "csv", "json"],
    steps: [
      {
        id: "crawl",
        label: "Collect catalog",
        detail: "Both pages / ≥5 unique rows.",
        check: (s) => s.extracted.length >= 5 || s.scrapyItems >= 5,
      },
      {
        id: "export",
        label: "Export clean data",
        detail: "csv or json.",
        check: (s) => Boolean(s.exported),
      },
      {
        id: "ethics",
        label: "Politeness on",
        detail: "robots checked or rate set.",
        check: (s) => Boolean(s.robotsChecked || s.rateLimit),
      },
    ],
    win: (s) => {
      const rows = Math.max(s.extracted.length, s.scrapyItems);
      if (rows < 5) return fail("Collect at least 5 rows from the catalog.");
      if (!s.exported) return fail("Export a file.");
      if (!s.robotsChecked && !s.rateLimit) return fail("Show politeness: robots check or rate limit.");
      return win("Capstone clear. You can take a question from the web to a clean dataset.");
    },
  },
];

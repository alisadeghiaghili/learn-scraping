/** World 7 — Scrapy. */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD7_LEVELS: Level[] = [
  {
    id: "7.1",
    world: "w7",
    worldTitle: "Scrapy",
    title: "Spider anatomy",
    concept: {
      title: "A spider is a class with a parse callback",
      body:
        "Scrapy spiders define `start_urls` (or `start_requests`) and a `parse` method. The engine handles scheduling, retries, concurrency, and middleware. You write the crawl logic and the item extraction.",
      whatHappens:
        "`scrapy list` shows the shop/blog/jobs spiders. `scrapy crawl shop` runs one and reports item counts.",
      why:
        "Scrapy is the production framework for large crawls. Concepts first means it is not magic — it is a scheduler around requests + selectors.",
    },
    goal: "List spiders and run one crawl.",
    hints: ["`scrapy list`", "`scrapy crawl shop`"],
    learning: ["spider classes", "parse callbacks", "crawl commands"],
    packages: ["scrapy"],
    steps: [
      {
        id: "list",
        label: "List spiders",
        detail: "scrapy list",
        command: "scrapy list",
        check: (s) => s.commandHistory.some((c) => c.includes("scrapy list")),
      },
      {
        id: "crawl",
        label: "Crawl",
        detail: "scrapy crawl shop",
        command: "scrapy crawl shop",
        check: (s) => Boolean(s.scrapyRan),
      },
    ],
    win: (s) =>
      s.scrapyRan
        ? win("Spiders are classes. The engine does the boring work.")
        : fail("Run `scrapy crawl shop`."),
  },
  {
    id: "7.2",
    world: "w7",
    worldTitle: "Scrapy",
    title: "yield Request and Item",
    concept: {
      title: "Crawls are graphs of callbacks",
      body:
        "From a listing page you `yield Request(url, callback=self.parse_detail)`. From a detail page you `yield Item(...)`. The scheduler keeps the frontier queue. You do not write the while-loop — you describe the graph.",
      whatHappens:
        "`scrapy crawl shop` follows page 2 automatically and yields items from both pages (8 rows including one dupe you may drop in a pipeline).",
      why:
        "This is why Scrapy scales: the engine parallelizes the graph while your callbacks stay simple.",
    },
    goal: "Run a crawl that gathers multi-page items.",
    hints: ["`scrapy crawl shop`", "`export csv`"],
    learning: ["Request/Item yields", "callback graphs", "scheduler"],
    packages: ["scrapy"],
    steps: [
      {
        id: "crawl",
        label: "Crawl multi-page",
        detail: "shop spider",
        command: "scrapy crawl shop",
        check: (s) => s.scrapyItems >= 5 && s.followedPagination,
      },
    ],
    win: (s) =>
      s.scrapyItems >= 5 && s.followedPagination
        ? win("You described a graph; the engine walked it.")
        : fail("Crawl so both catalog pages are collected."),
  },
  {
    id: "7.3",
    world: "w7",
    worldTitle: "Scrapy",
    title: "Callbacks and selectors",
    concept: {
      title: "response.css / response.xpath / getall",
      body:
        "Inside `parse`, `response.css('tr.row')` is a SelectorList. `.get()` is first match as string, `.getall()` is all. Attribute pseudo-elements: `a::attr(href)`. This is parsel under the hood.",
      whatHappens:
        "The shop spider extracts SKU/name/price with these selectors. You already know the query language from World 3–4.",
      why:
        "Scrapy does not invent a new selector dialect — it hosts the one you learned.",
    },
    goal: "Collect a non-trivial item set via Scrapy.",
    hints: ["`scrapy crawl shop`"],
    learning: ["SelectorList", "get vs getall", "::attr()"],
    packages: ["scrapy", "parsel"],
    steps: [
      {
        id: "items",
        label: "Collect items",
        detail: "≥5 rows",
        command: "scrapy crawl shop",
        check: (s) => s.scrapyItems >= 5,
      },
    ],
    win: (s) =>
      s.scrapyItems >= 5
        ? win("Selectors into items. That is a spider’s job.")
        : fail("Crawl shop and collect items."),
  },
  {
    id: "7.4",
    world: "w7",
    worldTitle: "Scrapy",
    title: "Pipelines and feeds",
    concept: {
      title: "Item Pipeline cleans; Feed exports write",
      body:
        "Pipelines are classes with `process_item` — drop dupes, coerce types, write to DB. Feed exports (`-o items.jsonl`, `FEEDS` setting) persist items. Separation of crawl vs clean vs store keeps code testable.",
      whatHappens:
        "`export jsonl` after a crawl simulates a feed export of unique items.",
      why:
        "Do not write files from parse callbacks. Pipeline everything.",
    },
    goal: "Export crawled items.",
    hints: ["`scrapy crawl shop`", "`export jsonl`"],
    learning: ["Item Pipelines", "FEEDS / -o", "separation of concerns"],
    packages: ["scrapy", "json"],
    steps: [
      {
        id: "exp",
        label: "Export items",
        detail: "jsonl feed",
        command: "export jsonl",
        check: (s) => Boolean(s.exported),
      },
    ],
    win: (s) =>
      s.exported
        ? win("Crawl, clean, store — three stages, one pipeline.")
        : fail("After crawling, `export jsonl`."),
  },
  {
    id: "7.5",
    world: "w7",
    worldTitle: "Scrapy",
    title: "Concurrency and throttle",
    concept: {
      title: "Throughput without becoming a hammer",
      body:
        "`CONCURRENT_REQUESTS`, `DOWNLOAD_DELAY`, and `AUTOTHROTTLE` shape politeness. Start conservative. Measure 429/403 rates and back off. A spider that trips every WAF is a liability.",
      whatHappens:
        "`rate 2` maps to DOWNLOAD_DELAY = 0.5 in the dock’s Scrapy settings line.",
      why:
        "Production crawls are capacity planning plus ethics. Both are settings you own.",
    },
    goal: "Set a crawl rate before/while using Scrapy.",
    hints: ["`rate 2`", "`scrapy crawl shop`"],
    learning: ["DOWNLOAD_DELAY", "autothrottle", "capacity"],
    packages: ["scrapy"],
    steps: [
      {
        id: "rate",
        label: "Set rate",
        detail: "Politeness.",
        command: "rate 2",
        check: (s) => Boolean(s.rateLimit),
      },
    ],
    win: (s) =>
      s.rateLimit
        ? win("Speed is a budget. Spend it wisely.")
        : fail("Set `rate 2`."),
  },
];

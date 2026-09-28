/** World 5 — Real page patterns. */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD5_LEVELS: Level[] = [
  {
    id: "5.1",
    world: "w5",
    worldTitle: "Real page patterns",
    title: "Pagination",
    concept: {
      title: "Listings are multi-page streams",
      body:
        "Real catalogs paginate. Find the next link (`.next`, or a page parameter), resolve it, fetch, parse, repeat until exhausted. Track visited URLs so loops cannot burn you.",
      whatHappens:
        "`fetch https://shop.local/products` shows 5 rows and a next link. `next` follows it to page 2 (3 more rows). `scrapy crawl shop` does both pages and yields 8 items.",
      why:
        "Almost every real scrape is a loop over pages. Get this pattern right once.",
    },
    goal: "Follow pagination and accumulate rows from both pages.",
    hints: [
      "`fetch https://shop.local/products`",
      "`parse`",
      "`table` or select rows",
      "`next`",
    ],
    learning: ["pagination loops", "visited sets", "accumulating items"],
    packages: ["requests", "beautifulsoup", "scrapy"],
    steps: [
      {
        id: "p1",
        label: "Fetch page 1",
        detail: "Catalog listing.",
        command: "fetch https://shop.local/products",
        check: (s) => Boolean(s.url?.includes("products")),
      },
      {
        id: "parse",
        label: "Parse",
        detail: "Build tree.",
        command: "parse",
        check: (s) => s.parsed,
      },
      {
        id: "next",
        label: "Follow next",
        detail: "Load page 2.",
        command: "next",
        check: (s) => s.followedPagination,
      },
    ],
    win: (s) =>
      s.followedPagination
        ? win("Pagination is just disciplined link following.")
        : fail("Run `next` after parsing the listing."),
  },
  {
    id: "5.2",
    world: "w5",
    worldTitle: "Real page patterns",
    title: "Tables to rows",
    concept: {
      title: "HTML tables are almost CSV",
      body:
        "`<table><tr><th>…` maps to header row + data rows. Pandas `read_html` does this in one line — but you should understand the tree walk so you can handle colspan, footers, and nested tables.",
      whatHappens:
        "`table` parses `#catalog` into header keys and row objects. `export csv` writes them out.",
      why:
        "Financial and government sites love tables. This is bread-and-butter scraping.",
    },
    goal: "Parse the product table into rows.",
    hints: ["`fetch https://shop.local/products`", "`parse`", "`table`"],
    learning: ["table parsing", "header mapping", "pandas.read_html"],
    packages: ["pandas", "lxml", "beautifulsoup"],
    steps: [
      {
        id: "tbl",
        label: "Parse table",
        detail: "Rows as objects.",
        command: "table",
        check: (s) => s.tableRows >= 3,
      },
    ],
    win: (s) =>
      s.tableRows >= 3
        ? win("Tables are structured data wearing HTML clothes.")
        : fail("Parse the catalog table with `table`."),
  },
  {
    id: "5.3",
    world: "w5",
    worldTitle: "Real page patterns",
    title: "JSON hiding in HTML",
    concept: {
      title: "Modern pages embed JSON",
      body:
        "SPA frameworks often put data in `<script type='application/json'>` or `__NEXT_DATA__`. API endpoints return JSON directly (`r.json()`). Scraping those is cleaner than fighting the DOM.",
      whatHappens:
        "`fetch https://blog.local/` then `json` pulls the `#__DATA__` script. `fetch https://shop.local/api/items` then `json` returns structured items.",
      why:
        "If the page loads data from JSON, scrape the JSON. Less breakage, cleaner types.",
    },
    goal: "Extract embedded or API JSON.",
    hints: ["`fetch https://shop.local/api/items`", "`json`"],
    learning: ["embedded JSON", "r.json()", "API-first scraping"],
    packages: ["requests", "json", "beautifulsoup"],
    steps: [
      {
        id: "j",
        label: "Extract JSON",
        detail: "API or script tag.",
        command: "json",
        check: (s) => s.jsonExtracted,
      },
    ],
    win: (s) =>
      s.jsonExtracted
        ? win("JSON endpoints are a gift. Take them.")
        : fail("Fetch an API or blog page and run `json`."),
  },
  {
    id: "5.4",
    world: "w5",
    worldTitle: "Real page patterns",
    title: "Clean and export",
    concept: {
      title: "Deduplicate, validate, write",
      body:
        "Raw extracts have dupes (page 2 repeated NW-008), empties, and type noise. Dedupe on a key, drop blanks, validate the schema, then export CSV/JSON/JSONL. Storage is part of scraping, not an afterthought.",
      whatHappens:
        "`export csv` writes unique rows and marks the session validated. Best practice: JSONL for pipelines, CSV for humans, database for production.",
      why:
        "If you cannot trust the file, the dashboard is fiction.",
    },
    goal: "Export cleaned rows as CSV or JSON.",
    hints: ["Extract rows first (table or select+extract)", "`export csv`"],
    learning: ["dedupe", "schema checks", "csv/json/jsonl"],
    packages: ["csv", "json", "pandas"],
    steps: [
      {
        id: "ex",
        label: "Export",
        detail: "csv or json.",
        command: "export csv",
        check: (s) => Boolean(s.exported),
      },
    ],
    win: (s) =>
      s.exported
        ? win("Data on disk with a schema is a product.")
        : fail("After extracting rows, `export csv` or `export json`."),
  },
  {
    id: "5.5",
    world: "w5",
    worldTitle: "Real page patterns",
    title: "Validate before you ship",
    concept: {
      title: "A row without checks is a rumor",
      body:
        "Required fields present? Prices numeric? Unique keys? Assert these in the pipeline. Fail the job loudly instead of publishing nulls. This is data engineering, not babysitting.",
      whatHappens:
        "Export runs dedupe and marks validated in the sandbox. In production this is pandera, pydantic, or a SQL constraint.",
      why:
        "Scraping without validation moves the mess downstream. Own the quality gate.",
    },
    goal: "Run an export that includes dedupe/validate semantics.",
    hints: ["`table`", "`export json`"],
    learning: ["validation gates", "dedupe keys", "fail-fast pipelines"],
    packages: ["pandas", "json"],
    steps: [
      {
        id: "v",
        label: "Validate via export",
        detail: "Dedupe + write.",
        command: "export json",
        check: (s) => s.validated && s.deduped,
      },
    ],
    win: (s) =>
      s.validated
        ? win("Quality gates are part of the scrape.")
        : fail("Export so dedupe/validate run."),
  },
];

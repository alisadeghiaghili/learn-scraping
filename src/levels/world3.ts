/** World 3 — BeautifulSoup. */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD3_LEVELS: Level[] = [
  {
    id: "3.1",
    world: "w3",
    worldTitle: "BeautifulSoup",
    title: "Parse into a soup",
    concept: {
      title: "BeautifulSoup turns text into a navigable tree",
      body:
        "`BeautifulSoup(r.text, 'html.parser')` (or `'lxml'`) builds a soup object. From there you query tags, attributes, and text. The parser choice affects speed and forgiveness of malformed HTML — lxml is fast, html.parser is fine for small pages.",
      whatHappens:
        "`parse` builds the tree. `show dom` shows the structure you will query.",
      why:
        "All of find/select/css/xpath operate on this object. Parse once, query many times.",
    },
    goal: "Parse a fetched page into a soup tree.",
    hints: ["`fetch https://shop.local/`", "`parse`", "`show dom`"],
    learning: ["BeautifulSoup", "parsers", "tree navigation"],
    packages: ["beautifulsoup", "lxml"],
    steps: [
      {
        id: "parse",
        label: "Parse HTML",
        detail: "Build soup.",
        command: "parse",
        check: (s) => s.parsed,
      },
    ],
    win: (s) => (s.parsed ? win() : fail("Fetch then `parse`.")),
  },
  {
    id: "3.2",
    world: "w3",
    worldTitle: "BeautifulSoup",
    title: "find and find_all",
    concept: {
      title: "Tag name + attributes = your first query",
      body:
        "`soup.find_all('article', class_='card')` returns every matching node. `find` returns the first. This is the blunt instrument of scraping — readable, a bit brittle when markup drifts.",
      whatHappens:
        "`select article.card` (or `find article`) collects product cards on the home page. Extract text next.",
      why:
        "find_all is still the right tool for quick scripts and teaching. Learn it, then move to CSS selectors for scale.",
    },
    goal: "Match multiple nodes on the shop home page.",
    hints: ["`fetch https://shop.local/`", "`parse`", "`select article.card`"],
    learning: ["find / find_all", "class filters", "node lists"],
    packages: ["beautifulsoup"],
    steps: [
      {
        id: "setup",
        label: "Fetch + parse",
        detail: "Home page tree.",
        command: "fetch https://shop.local/",
        check: (s) => Boolean(s.response),
      },
      {
        id: "select",
        label: "Select cards",
        detail: "article.card nodes.",
        command: "select article.card",
        check: (s) => (s.matches?.nodeIds.length ?? 0) >= 2,
      },
    ],
    win: (s) => {
      if (!s.parsed) return fail("Parse the page first.");
      if ((s.matches?.nodeIds.length ?? 0) < 2) {
        return fail("You need at least 2 article.card matches.");
      }
      return win("Node lists are your raw material.");
    },
  },
  {
    id: "3.3",
    world: "w3",
    worldTitle: "BeautifulSoup",
    title: "CSS select",
    concept: {
      title: "soup.select speaks CSS",
      body:
        "`.card h2` means an h2 inside an element with class card. CSS selectors are the best cost/benefit in scraping: short, expressive, and shared with frontend tests and browser tools.",
      whatHappens:
        "`select .featured .card h2` pulls titles from the featured section. Matched nodes light up amber in the tree.",
      why:
        "If a frontend engineer can click ‘copy selector’, you can scrape it. Prefer classes that look semantic over deep div paths.",
    },
    goal: "Extract titles using a CSS selector.",
    hints: ["`fetch https://shop.local/`", "`parse`", "`select .featured .card h2`", "`extract text`"],
    learning: ["CSS selectors", "descendant combinators", "text extraction"],
    packages: ["beautifulsoup"],
    steps: [
      {
        id: "sel",
        label: "Select titles",
        detail: ".featured .card h2",
        command: "select .featured .card h2",
        check: (s) => (s.matches?.texts.length ?? 0) >= 1,
      },
      {
        id: "ex",
        label: "Extract text",
        detail: "Pull strings.",
        command: "extract text",
        check: (s) => s.extracted.length > 0,
      },
    ],
    win: (s) => {
      if (!s.extracted.length) return fail("Select then `extract text`.");
      return win("Selectors in, strings out. That is the scraping loop.");
    },
  },
  {
    id: "3.4",
    world: "w3",
    worldTitle: "BeautifulSoup",
    title: "Walk the tree",
    concept: {
      title: "Parents, siblings, and children",
      body:
        "Sometimes the value you want is not inside the node you found. `parent`, `find_next_sibling`, and `children` let you hop. A title and a price often share a parent card — find one, walk to the other.",
      whatHappens:
        "On a product page, `.title` and `.price` are siblings under `article.product`. Select one, extract, then select the other — or walk in real BeautifulSoup with `.parent`.",
      why:
        "Layouts separate related fields. Tree walking stitches them into one record.",
    },
    goal: "Pull both a title and a price from the product page.",
    hints: [
      "`fetch https://shop.local/products/1`",
      "`parse`",
      "`select h1.title` → `extract text`",
      "`select p.price` → `extract text`",
    ],
    learning: ["tree walking", "sibling fields", "record assembly"],
    packages: ["beautifulsoup"],
    steps: [
      {
        id: "title",
        label: "Get the title",
        detail: "h1.title",
        command: "select h1.title",
        check: (s) => (s.matches?.texts.length ?? 0) >= 1,
      },
      {
        id: "price",
        label: "Get the price",
        detail: "p.price",
        check: (s) => Boolean(s.lastSelect?.includes("price")) || s.extracted.some((r) => "text" in r || "price" in r),
      },
    ],
    win: (s) => {
      const history = s.commandHistory.join(" ");
      if (!history.includes("title") && !s.matches) return fail("Start with `select h1.title`.");
      if (!history.includes("price")) return fail("Now select the price field.");
      return win("One record, several fields. That is a dataset row.");
    },
  },
  {
    id: "3.5",
    world: "w3",
    worldTitle: "BeautifulSoup",
    title: "Attributes and clean text",
    concept: {
      title: "get('href') and get_text(strip=True)",
      body:
        "Text extraction needs `strip` to kill whitespace noise. Links and IDs live in attributes. A product SKU is often `data-sku`, a link is `href`. Clean as you extract — do not scrape garbage and hope a regex will save you later.",
      whatHappens:
        "`select a.logo` then `extract attr:href` returns `/`. `extract text` returns the brand string.",
      why:
        "Dirty text is the #1 reason dashboards look wrong. Strip at the source.",
    },
    goal: "Extract both an attribute and text from the same selection.",
    hints: ["`fetch https://shop.local/`", "`parse`", "`select a.logo`", "`extract attr:href`", "`extract text`"],
    learning: ["attributes", "strip text", "href extraction"],
    packages: ["beautifulsoup"],
    steps: [
      {
        id: "href",
        label: "Extract href",
        detail: "attr:href",
        command: "extract attr:href",
        check: (s) => s.extracted.some((r) => "href" in r),
      },
      {
        id: "text",
        label: "Extract text",
        detail: "Visible label.",
        command: "extract text",
        check: (s) => s.extracted.some((r) => "text" in r),
      },
    ],
    win: (s) => {
      const hasHref = s.extracted.some((r) => "href" in r);
      const hasText = s.extracted.some((r) => "text" in r);
      if (!hasHref) return fail("Extract the href attribute.");
      if (!hasText) return fail("Extract the text too.");
      return win("Attributes and text are both data.");
    },
  },
];

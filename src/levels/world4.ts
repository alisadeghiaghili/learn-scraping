/** World 4 — Selectors deep dive (CSS / XPath / parsel). */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD4_LEVELS: Level[] = [
  {
    id: "4.1",
    world: "w4",
    worldTitle: "Selectors deep dive",
    title: "CSS power features",
    concept: {
      title: "Attributes, combinators, and :nth-child",
      body:
        "CSS can match `[data-sku]`, `a[href^='/products']`, `tr.row + tr`, and `li:nth-child(2)`. These are sharper than tag names alone. Attribute prefixes and suffixes are especially useful for href patterns.",
      whatHappens:
        "On the catalog, `select tr.row` matches rows; `[data-sku]` shows attribute presence. `select a.next` finds pagination.",
      why:
        "Stable selectors prefer data attributes and semantic classes over positional paths that break when a row is inserted.",
    },
    goal: "Select catalog rows with a class/attribute-aware selector.",
    hints: ["`fetch https://shop.local/products`", "`parse`", "`select tr.row`", "`extract text`"],
    learning: ["attribute selectors", "stability vs brittleness"],
    packages: ["beautifulsoup", "cssselect", "parsel"],
    steps: [
      {
        id: "rows",
        label: "Select rows",
        detail: "tr.row",
        command: "select tr.row",
        check: (s) => (s.matches?.nodeIds.length ?? 0) >= 3,
      },
    ],
    win: (s) =>
      (s.matches?.nodeIds.length ?? 0) >= 3
        ? win("Stable handles beat fragile paths.")
        : fail("Match at least 3 tr.row nodes."),
  },
  {
    id: "4.2",
    world: "w4",
    worldTitle: "Selectors deep dive",
    title: "XPath basics",
    concept: {
      title: "XPath navigates axes and text",
      body:
        "`//div[@class='job']` finds nodes by tag and attribute. `/text()` pulls text nodes. `//a/@href` reads attributes. XPath is more expressive than CSS (ancestor, following-sibling, contains()) and is the native language of lxml and Scrapy.",
      whatHappens:
        "`xpath //article[@class='product']` on a product page, or `//tr` on the catalog. The dock shows the lxml `tree.xpath(...)` line.",
      why:
        "When CSS cannot express ‘text contains’ or ‘ancestor of’, XPath can. Scrapy uses css and xpath equally — learn both.",
    },
    goal: "Select nodes with XPath and extract.",
    hints: ["`fetch https://shop.local/products/1`", "`parse`", "`xpath //article`", "`extract text`"],
    learning: ["XPath steps", "attribute predicates", "text() and @attr"],
    packages: ["lxml", "parsel"],
    steps: [
      {
        id: "xp",
        label: "XPath select",
        detail: "//article",
        command: "xpath //article",
        check: (s) => s.lastSelectKind === "xpath" && (s.matches?.nodeIds.length ?? 0) >= 1,
      },
    ],
    win: (s) =>
      s.lastSelectKind === "xpath" && (s.matches?.nodeIds.length ?? 0) >= 1
        ? win("XPath is a precision tool.")
        : fail("Run `xpath //article` on the product page."),
  },
  {
    id: "4.3",
    world: "w4",
    worldTitle: "Selectors deep dive",
    title: "When to choose CSS vs XPath",
    concept: {
      title: "Pick the tool that survives change",
      body:
        "CSS for simple class/structure queries (short, familiar). XPath for text predicates, axes, and complex conditions. In Scrapy, `response.css` and `response.xpath` both return SelectorLists — mix freely. Parsel is the same engine under both.",
      whatHappens:
        "Practice both on the same page: `select .title` and `xpath //h1`. Confirm they hit the same node count.",
      why:
        "Dogma about ‘CSS only’ or ‘XPath only’ is noise. Clarity and stability win.",
    },
    goal: "Run both a CSS and an XPath query on the same page.",
    hints: ["`fetch https://shop.local/products/1`", "`parse`", "`select h1.title`", "`xpath //h1`"],
    learning: ["tool selection", "parsel equivalence"],
    packages: ["beautifulsoup", "lxml", "parsel"],
    steps: [
      {
        id: "css",
        label: "CSS query",
        detail: "h1.title",
        command: "select h1.title",
        check: (s) => s.lastSelectKind === "css" && (s.matches?.nodeIds.length ?? 0) >= 1,
      },
      {
        id: "xp",
        label: "XPath query",
        detail: "//h1",
        command: "xpath //h1",
        check: (s) => s.lastSelectKind === "xpath",
      },
    ],
    win: (s) => {
      const hist = s.commandHistory.join(" ");
      if (!hist.includes("select") && !hist.includes("css")) return fail("Run a CSS select.");
      if (!hist.includes("xpath")) return fail("Run an xpath query too.");
      return win("You choose tools, not tribes.");
    },
  },
  {
    id: "4.4",
    world: "w4",
    worldTitle: "Selectors deep dive",
    title: "Scrapy and parsel selectors",
    concept: {
      title: "response.css(...).getall() is the Scrapy dialect",
      body:
        "Scrapy builds on parsel. `response.css('a::attr(href)').getall()` and `response.xpath('//a/@href').getall()` are the production forms. You already know the query languages — only the receiver name changes.",
      whatHappens:
        "`scrapy list` shows spiders. `scrapy crawl shop` runs a spider that uses these selectors internally and yields items.",
      why:
        "Learning selectors first means Scrapy does not feel like a second universe. It is a thicker client around the same tree queries.",
    },
    goal: "List spiders and crawl one.",
    hints: ["`scrapy list`", "`scrapy crawl shop`"],
    learning: ["parsel API", "Scrapy response selectors"],
    packages: ["scrapy", "parsel"],
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
        label: "Crawl shop",
        detail: "Run the spider.",
        command: "scrapy crawl shop",
        check: (s) => s.scrapyItems > 0,
      },
    ],
    win: (s) =>
      s.scrapyItems > 0
        ? win("Same selectors, thicker frame.")
        : fail("Run `scrapy crawl shop` after listing."),
  },
];

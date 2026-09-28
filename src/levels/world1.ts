/**
 * World 1 — The wire and the tree.
 * Concepts before packages: HTTP, HTML tree, URLs, status codes, politeness.
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD1_LEVELS: Level[] = [
  {
    id: "1.1",
    world: "w1",
    worldTitle: "The wire and the tree",
    title: "Request and response",
    concept: {
      title: "Scraping starts as a conversation",
      body:
        "Your program is a client. It opens a connection and sends a request: a method (usually GET), a URL, and a few headers. A server answers with a status line, headers, and a body — almost always HTML for web pages. Nothing is parsed yet. Nothing is ‘scraped’ yet. You only asked for bytes.",
      whatHappens:
        "When you run `fetch https://shop.local/`, the sandbox builds a request, shows the method and headers, then prints `HTTP 200 OK` with a latency. `show response` dumps the status, headers, and the top of the HTML body.",
      why:
        "Every later bug — empty selectors, login walls, 403s — is easier when you can look at the raw exchange. Libraries wrap this; they do not replace it.",
      callout: "If you cannot name the request and the response, you cannot debug a scraper.",
    },
    goal: "Fetch the shop home page and inspect the response.",
    hints: [
      "Try `fetch https://shop.local/`.",
      "Then `show response` — read the status line and headers.",
    ],
    learning: ["client/server", "HTTP request/response", "status line and headers"],
    packages: ["requests"],
    seedUrl: "https://shop.local/",
    steps: [
      {
        id: "fetch",
        label: "Fetch a page",
        detail: "Send GET https://shop.local/",
        command: "fetch https://shop.local/",
        check: (s) => Boolean(s.response) && s.pageFetches > 0,
      },
      {
        id: "inspect",
        label: "Inspect the response",
        detail: "Read status, headers, body preview.",
        command: "show response",
        check: (s) => s.inspectedResponse,
      },
    ],
    win: (s) => {
      if (!s.response) return fail("No response yet. Run `fetch https://shop.local/`.");
      if (s.response.status !== 200) {
        return fail(`Status is ${s.response.status}. You need a 200 from the home page.`);
      }
      if (!s.inspectedResponse) {
        return fail("Run `show response` and read the status line and headers.");
      }
      return win("You can see the wire. Status 200 is the server saying: here are your bytes.");
    },
  },
  {
    id: "1.2",
    world: "w1",
    worldTitle: "The wire and the tree",
    title: "HTML is a tree",
    concept: {
      title: "A page is not a string — it is nested nodes",
      body:
        "HTML is a document tree. Tags open and close, nest inside each other, and carry attributes. Text lives in leaf nodes. Scraping is tree surgery: find nodes, walk branches, take text or attributes. String matching on raw HTML looks clever until the page reflows.",
      whatHappens:
        "`parse` feeds the response body into a tree. `show dom` lists element tags with ids and classes. Matched nodes can be highlighted later with selectors.",
      why:
        "When you write `soup.select('.card h2')` or `tree.xpath('//tr')`, you are querying this tree. If you think in strings, every layout change breaks you. If you think in trees, you change one selector.",
      callout: "Prefer structure over substrings. Always.",
    },
    goal: "Parse the page and inspect the DOM tree.",
    hints: [
      "`fetch https://shop.local/` then `parse`.",
      "`show dom` — look for header, main, article.card.",
    ],
    learning: ["DOM tree", "elements vs text", "ids and classes as handles"],
    packages: ["beautifulsoup", "lxml"],
    steps: [
      {
        id: "parse",
        label: "Parse HTML into a tree",
        detail: "BeautifulSoup-style parse.",
        command: "parse",
        check: (s) => s.parsed,
      },
      {
        id: "dom",
        label: "Inspect the tree",
        detail: "show dom lists elements.",
        command: "show dom",
        check: (s) => s.inspectedDom,
      },
    ],
    win: (s) => {
      if (!s.parsed) return fail("Run `parse` after fetching a page.");
      if (!s.inspectedDom) return fail("Run `show dom` and read the tree.");
      return win("Tree thinking locked in. Selectors are just tree queries.");
    },
  },
  {
    id: "1.3",
    world: "w1",
    worldTitle: "The wire and the tree",
    title: "URLs and links",
    concept: {
      title: "href is a promise, not always a full URL",
      body:
        "Links in HTML are often relative: `/products`, `page=2`, `../about`. To fetch them you must resolve against the current page URL. That is `urljoin` in Python. Forget it and you crawl into the void.",
      whatHappens:
        "`resolve /products` turns a root-relative href into `https://shop.local/products` using the last fetched URL as base. `show links` lists every href on the page.",
      why:
        "Pagination, detail pages, and sitemaps are all just links. Resolving them correctly is half of a crawler.",
      formula: "urljoin(base, href) → absolute URL",
    },
    goal: "Fetch a page and resolve a relative link to an absolute URL.",
    hints: [
      "`fetch https://shop.local/` → `show links` → `resolve /products`",
    ],
    learning: ["absolute vs relative URLs", "urljoin", "link discovery"],
    packages: ["urllib", "requests"],
    steps: [
      {
        id: "fetch",
        label: "Have a base URL",
        detail: "Fetch any page.",
        command: "fetch https://shop.local/",
        check: (s) => Boolean(s.url),
      },
      {
        id: "resolve",
        label: "Resolve a relative href",
        detail: "urljoin against the current page.",
        command: "resolve /products",
        check: (s) => s.resolvedLinks > 0,
      },
    ],
    win: (s) => {
      if (!s.url) return fail("Fetch a page first so resolve has a base.");
      if (s.resolvedLinks < 1) return fail("Run `resolve /products`.");
      return win("Relative links are now real URLs you can fetch.");
    },
  },
  {
    id: "1.4",
    world: "w1",
    worldTitle: "The wire and the tree",
    title: "Status codes tell the truth",
    concept: {
      title: "Not every response is content",
      body:
        "200 means OK. 301/302 mean follow a location. 401/403 mean you are not allowed. 404 means missing. 500 means the server broke. Scrapers that only look at the body often parse an error page as if it were data. Always branch on `status_code`.",
      whatHappens:
        "Fetch `/products` (200), `/missing` (404), `/moved` (301), and `/error` (500). The stage colors the wire card green or red. Your code must treat them differently.",
      why:
        "Silent 404s produce empty datasets. Silent 302s to a login page produce HTML full of forms. Status first, parse second.",
      formula: "if r.status_code == 200: parse(r.text)",
    },
    goal: "See both a 200 and a non-200 status on purpose.",
    hints: [
      "`fetch https://shop.local/products`",
      "`fetch https://shop.local/missing` — expect 404.",
    ],
    learning: ["2xx vs 4xx vs 5xx", "redirects", "fail loudly on errors"],
    packages: ["requests"],
    steps: [
      {
        id: "ok",
        label: "Get a 200",
        detail: "Any successful page.",
        command: "fetch https://shop.local/products",
        check: (s) => s.response?.status === 200,
      },
      {
        id: "err",
        label: "Get a non-200",
        detail: "Trigger 404 or 500.",
        command: "fetch https://shop.local/missing",
        check: (s) =>
          s.commandHistory.some((c) => c.includes("missing") || c.includes("error")) &&
          (s.response?.status ?? 0) >= 400,
      },
    ],
    win: (s) => {
      const sawOk = s.commandHistory.some((c) => c.startsWith("fetch") && !c.includes("missing") && !c.includes("error"));
      const status = s.response?.status ?? 0;
      if (!sawOk) return fail("Fetch a page that returns 200 first.");
      if (status < 400) return fail("Now fetch a missing page so you see a 4xx/5xx.");
      return win("You have seen both sides of the status line. Do not parse error pages as data.");
    },
  },
  {
    id: "1.5",
    world: "w1",
    worldTitle: "The wire and the tree",
    title: "Politeness is part of the job",
    concept: {
      title: "robots.txt and rate limits are not optional",
      body:
        "A public website is not an open database. `robots.txt` tells automated clients which paths to avoid. Rate limits keep you from looking like a denial-of-service. Ignoring both gets you blocked and burns the shared resource for everyone. Ethical scraping starts here — before any selector.",
      whatHappens:
        "`robots https://shop.local/admin` reads the site policy and prints DISALLOWED. `rate 2` sets a crawl delay. Fetching a disallowed path returns 403 from the sandbox, the same way a real site would fence you out.",
      why:
        "Production scrapers identify themselves, slow down, and honor exclusions. That is the difference between a data pipeline and abuse.",
      callout: "If robots.txt says no, the answer is no — even if the page would load.",
    },
    goal: "Check robots.txt for a private path and set a rate limit.",
    hints: [
      "`robots https://shop.local/admin`",
      "`rate 2`",
      "Try `fetch https://shop.local/admin` and see the block.",
    ],
    learning: ["robots.txt", "crawl-delay / rate limiting", "legal and ethical baseline"],
    packages: ["robotparser", "requests"],
    steps: [
      {
        id: "robots",
        label: "Check robots.txt",
        detail: "See DISALLOW for /admin.",
        command: "robots https://shop.local/admin",
        check: (s) => Boolean(s.robotsChecked),
      },
      {
        id: "rate",
        label: "Set a crawl rate",
        detail: "Politeness delay.",
        command: "rate 2",
        check: (s) => Boolean(s.rateLimit && s.rateLimit > 0),
      },
    ],
    win: (s) => {
      if (!s.robotsChecked) return fail("Run `robots https://shop.local/admin`.");
      if (s.robotsAllowed !== false) {
        return fail("Admin should be DISALLOWED. Check the path carefully.");
      }
      if (!s.rateLimit) return fail("Set a rate limit: `rate 2`.");
      return win("Politeness is part of the design, not a patch at the end.");
    },
  },
];

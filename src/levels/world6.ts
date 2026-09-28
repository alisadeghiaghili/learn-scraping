/** World 6 — Dynamic pages (Selenium / Playwright). */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD6_LEVELS: Level[] = [
  {
    id: "6.1",
    world: "w6",
    worldTitle: "Dynamic pages",
    title: "Why JS rendering exists",
    concept: {
      title: "Empty HTML does not mean empty page",
      body:
        "Many sites ship a shell and fill it with JavaScript. `requests` gets the shell. A headless browser executes scripts and yields the live DOM. That is expensive — use it only when static HTML is truly empty.",
      whatHappens:
        "On `https://jobs.local/`, the raw HTML has a board and a Load more button, but more jobs appear only after click/JS. `selenium open` simulates a browser session with rendered content.",
      why:
        "Headless browsers cost CPU and flakiness. Reach for them after you have proven static HTML is insufficient.",
    },
    goal: "Open a JS page in a browser session.",
    hints: ["`selenium open https://jobs.local/`", "`selenium source`"],
    learning: ["CSR vs SSR", "when to use a browser", "cost of headless"],
    packages: ["selenium", "playwright"],
    steps: [
      {
        id: "open",
        label: "Open in browser",
        detail: "selenium open",
        command: "selenium open https://jobs.local/",
        check: (s) => Boolean(s.seleniumOpen),
      },
    ],
    win: (s) =>
      s.seleniumOpen
        ? win("Browser automation is a last-mile tool, not a default.")
        : fail("Run `selenium open https://jobs.local/`."),
  },
  {
    id: "6.2",
    world: "w6",
    worldTitle: "Dynamic pages",
    title: "Find and wait",
    concept: {
      title: "Never sleep(5) when you can wait for a selector",
      body:
        "Explicit waits block until a condition is true: presence, visibility, clickability. Fixed sleeps are slow and flaky. `WebDriverWait` in Selenium, `page.wait_for_selector` in Playwright.",
      whatHappens:
        "`selenium wait` records that you waited for `.job` before extracting. Production code always waits before query.",
      why:
        "Race conditions are the #1 source of headless flake. Wait on conditions, not clocks.",
    },
    goal: "Wait for a dynamic element after opening.",
    hints: ["`selenium open https://jobs.local/`", "`selenium wait`"],
    learning: ["explicit waits", "expected conditions", "flakiness"],
    packages: ["selenium", "playwright"],
    steps: [
      {
        id: "wait",
        label: "Explicit wait",
        detail: "for .job nodes.",
        command: "selenium wait",
        check: (s) => Boolean(s.seleniumWaited),
      },
    ],
    win: (s) =>
      s.seleniumWaited
        ? win("Wait on conditions. Sleep is not architecture.")
        : fail("Run `selenium wait` after open."),
  },
  {
    id: "6.3",
    world: "w6",
    worldTitle: "Dynamic pages",
    title: "Click, type, scroll",
    concept: {
      title: "Interaction is part of the DOM contract",
      body:
        "Load-more buttons, infinite scroll, and tabs change the tree. Automate the same way a user does: find element → click → wait → re-query. Store the post-interaction DOM, not the first snapshot.",
      whatHappens:
        "`selenium click` on `#load-more` appends another `.job` in the live page model. Re-run selectors after interaction.",
      why:
        "If the data only exists after a click, your scraper must click. Model that as a first-class step.",
    },
    goal: "Interact with the page (click) in a browser session.",
    hints: ["`selenium open https://jobs.local/`", "`selenium click`"],
    learning: ["click flows", "re-query after mutation", "infinite scroll"],
    packages: ["selenium", "playwright"],
    steps: [
      {
        id: "click",
        label: "Click load-more",
        detail: "Grow the list.",
        command: "selenium click",
        check: (s) => Boolean(s.seleniumClicked),
      },
    ],
    win: (s) =>
      s.seleniumClicked
        ? win("Interaction is just another event in the timeline.")
        : fail("Run `selenium click`."),
  },
  {
    id: "6.4",
    world: "w6",
    worldTitle: "Dynamic pages",
    title: "Playwright vs Selenium",
    concept: {
      title: "Same job, different ergonomics",
      body:
        "Selenium is the long-standing WebDriver standard (many languages, large ecosystem). Playwright is newer: auto-waiting, multiple browsers, tracing, and a cleaner API. Pick by team skill and ops constraints — both solve ‘run a real browser’.",
      whatHappens:
        "`selenium playwright` records a Playwright-style session (`page.goto`, `wait_for_selector`). The dock shows both APIs side by side for the same task.",
      why:
        "Framework wars waste time. Know both surfaces so you can maintain either codebase.",
    },
    goal: "Use a Playwright-style session after Selenium.",
    hints: ["`selenium open https://jobs.local/`", "`selenium playwright`"],
    learning: ["Playwright API", "auto-waiting", "tool choice"],
    packages: ["selenium", "playwright"],
    steps: [
      {
        id: "pw",
        label: "Playwright session",
        detail: "page.goto pattern.",
        command: "selenium playwright",
        check: (s) => Boolean(s.playwrightUsed),
      },
    ],
    win: (s) =>
      s.playwrightUsed
        ? win("Two tools, one mental model: browser automation.")
        : fail("Run `selenium playwright`."),
  },
  {
    id: "6.5",
    world: "w6",
    worldTitle: "Dynamic pages",
    title: "Artifacts: source and screenshots",
    concept: {
      title: "When things break, keep the evidence",
      body:
        "Save `page_source` / `driver.page_source` and screenshots on failure. They turn ‘it failed on CI’ into a debuggable file. Pair them with request logs and timestamps.",
      whatHappens:
        "`selenium source` dumps the rendered HTML. In production write it to an artifacts directory on error.",
      why:
        "Debuggability is a feature. Headless failures without artifacts are archaeology.",
    },
    goal: "Capture page source from the browser session.",
    hints: ["`selenium open https://jobs.local/`", "`selenium source`"],
    learning: ["page_source", "screenshots", "debug artifacts"],
    packages: ["selenium", "playwright"],
    steps: [
      {
        id: "src",
        label: "Dump source",
        detail: "Rendered HTML.",
        command: "selenium source",
        check: (s) => Boolean(s.seleniumSource || s.inspectedResponse),
      },
    ],
    win: (s) =>
      s.seleniumSource || s.inspectedResponse
        ? win("Evidence beats guessing.")
        : fail("Run `selenium source`."),
  },
];

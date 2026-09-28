# LearnScraping — Product & Design Spec

Interactive web-scraping sandbox and leveled tutorial.
Curriculum and command vocabulary map to the real Python stack
(`requests`, `BeautifulSoup`, `lxml`, `parsel`, `Scrapy`, `Selenium`,
`Playwright`, `httpx`, `pandas`). The product teaches **concepts first**,
then the library API that expresses them.

## Product thesis

Scraping is invisible until you see the request/response cycle, the DOM tree,
and what a selector actually matches. LearnScraping makes those stages visible
and challengeable.

Three modes, same shell:

1. **Sandbox** — free command play on a simulated mini-web.
2. **Levels** — short challenges with a win condition and a concept brief.
3. **Concept labs** — parameter playgrounds (selector match, rate limit,
   robots) where the lesson is watching a surface change.

Every user action is a pipeline step. The stage always shows:

- the wire (request line, headers, status, timing)
- the DOM tree (matched nodes light up)
- extraction output (rows / JSON / links)
- crawl graph when a spider is running
- the Python equivalent of the last command

## Out of scope (v1)

- Real network I/O or real CPython (Pyodide is a later backend).
- Live scraping of production sites.
- User accounts, remote progress sync.

v1 ships a faithful **scraping mental model** engine in TypeScript:
HTTP verbs + headers + cookies + sessions, a real HTML tree with CSS/XPath
selectors, a Scrapy-like spider loop, and Selenium/Playwright-style waits.
Code panels show the real Python API the learner will meet in production.

## Information architecture

```
Chrome:  LearnScraping · levels · sandbox · goal
Left:    level rail (worlds → levels, solved markers)
Center:  concept brief (paper) + visual stage (dark lab)
Bottom:  command dock + Python equivalent + status
```

### Level schema

```ts
interface Level {
  id: string;
  title: string;
  world: string;
  concept: ConceptBrief;      // why this matters
  goal: string;               // one sentence win condition
  hints: string[];
  learning: string[];
  packages: string[];         // which Python libs this level touches
  steps: GoalStep[];
  win: (session: SessionState) => WinResult;
  seedSite?: string;
}
```

### Command grammar (maps 1:1 to Python)

```
help | levels | goal | hint | reset | undo | clear | solution | sandbox
fetch <url>
show request|response|dom|data|code|links|cookies
select <css>
xpath <expr>
extract text|attr:<name>|html
resolve <href>
session
post <url> [k=v ...]
parse [html|lxml]
find <tag> [attr=value]
css <selector>
rate <n>
robots <url>
selenium open|wait|click|type|source
scrapy list|crawl <spider>
export csv|json|jsonl
run <level-id>
```

Example equivalence taught in the dock:

```text
fetch https://shop.local/products
→ r = requests.get("https://shop.local/products")
```

```text
select .product-card .title
→ soup.select(".product-card .title")
```

## Pedagogy rules

1. Concept brief opens every level in plain language (no jargon dump).
2. Win checks encode the *idea*, not a magic command sequence
   (e.g. “extract 5 titles **and** status is 200 **and** not blocked by robots”).
3. Failure feedback is diagnostic: name the misconception, not “wrong”.
4. The Python line is always visible after a DSL command.
5. Golf counters (commands used) exist as a stretch goal, not the main score.
6. Ethics and politeness are first-class levels, not a footnote.

## World map (v1 content)

**World 1 — The wire and the tree**

| id | concept | win sketch |
|----|---------|------------|
| 1.1 | Client, server, request, response | fetch a home page; read status + headers |
| 1.2 | HTML is a tree | open DOM view; name root and a child |
| 1.3 | URLs and links | resolve a relative href to an absolute URL |
| 1.4 | Status codes | distinguish 200 / 301 / 404 on purpose |
| 1.5 | Politeness baseline | robots disallow + rate limit before extract |

**World 2 — requests**

| id | concept | win sketch |
|----|---------|------------|
| 2.1 | GET and Response object | fetch + show response body/headers |
| 2.2 | Headers and User-Agent | send UA; server reflects it |
| 2.3 | Sessions and cookies | login flow sets cookie; next GET is authed |
| 2.4 | POST and forms | submit search form; read filtered results |
| 2.5 | Timeouts and errors | handle 500/timeout path without crashing |

**World 3 — BeautifulSoup**

| id | concept | win sketch |
|----|---------|------------|
| 3.1 | Parse into a soup | parse HTML; print tag tree depth |
| 3.2 | find / find_all | collect N product nodes by class |
| 3.3 | CSS select | extract titles with `.card h2` |
| 3.4 | Navigation | walk parent/sibling to reach price from title |
| 3.5 | Attributes and text | pull href + inner text cleanly |

**World 4 — Selectors deep dive (lxml / XPath / parsel)**

| id | concept | win sketch |
|----|---------|------------|
| 4.1 | CSS power features | attr selectors, combinators, nth |
| 4.2 | XPath basics | //div[@class=…]/a/text() |
| 4.3 | When CSS vs XPath | pick the right tool on a messy page |
| 4.4 | Scrapy/parsel selectors | same query via parsel Selector |

**World 5 — Real page patterns**

| id | concept | win sketch |
|----|---------|------------|
| 5.1 | Pagination | follow next links; collect all pages |
| 5.2 | Tables | parse table → rows of fields |
| 5.3 | JSON in HTML | pull `__NEXT_DATA__` / data-attrs |
| 5.4 | Clean and export | export CSV/JSON of extracted rows |
| 5.5 | Deduplicate and validate | drop empties/dupes; schema check |

**World 6 — Dynamic pages (Selenium / Playwright)**

| id | concept | win sketch |
|----|---------|------------|
| 6.1 | Why JS rendering | page empty without execute; full after |
| 6.2 | Find and wait | wait for selector, then extract |
| 6.3 | Interact | click load-more; count grows |
| 6.4 | Playwright vs Selenium | same task, both APIs in the dock |
| 6.5 | Screenshot / page_source | capture artifacts |

**World 7 — Scrapy**

| id | concept | win sketch |
|----|---------|------------|
| 7.1 | Spider anatomy | `scrapy list` + first parse |
| 7.2 | yield Request / Item | follow detail pages |
| 7.3 | Callbacks and selectors | extract fields in callback |
| 7.4 | Pipelines and export | clean + write feed |
| 7.5 | Settings, concurrency, throttle | polite crawl at N rps |

**World 8 — Production scraping**

| id | concept | win sketch |
|----|---------|------------|
| 8.1 | Caching | second fetch hits cache, not wire |
| 8.2 | Retries and idempotency | fail once, succeed on retry |
| 8.3 | Architecture | queue → fetch → parse → store diagram |
| 8.4 | Respect boundaries | honor robots + rate + identify yourself |
| 8.5 | Capstone | end-to-end crawl → clean dataset |

## Visual system

**Style anchor:** network packet lab + cool HTML blueprint notebook.
Not SaaS cards, not warm cream editorial, not neon-on-black.

**Palette**

| token | hex | role |
|-------|-----|------|
| void | `#0B1219` | stage / terminal ground |
| surface | `#13202B` | elevated dark panels |
| paper | `#E7EBE8` | concept brief (cool sage paper) |
| ink | `#0F1518` | text on paper |
| chalk | `#C7D0D8` | text on dark |
| wire | `#3DB8FF` | primary accent — request in flight |
| amber | `#F0B429` | selected DOM node / active |
| alarm | `#E23D51` | errors, blocked, 4xx/5xx |
| calm | `#2A9D8F` | solved, 200 OK, extracted |
| tag | `#9B7EDE` | HTML tag names |
| attr | `#E8A87C` | attributes |

**Typography**

- Display / concept titles: `Newsreader`
- UI / body labels: `IBM Plex Sans`
- Code / terminal / metrics: `IBM Plex Mono`

Scale: concept title 28–32px / 500; brief body 16px / 1.55; UI 13–14px;
mono 12–13px. Max measure for brief text ≈ 62ch.

**Layout rhythm**

8px base. Shell is a full-viewport instrument panel:

```
┌──────────────────────────────────────────────────┐
│ top chrome (48px)                                │
├──────────┬───────────────────────────────────────┤
│ rail     │ brief (auto, paper)                   │
│ 220px    ├───────────────────────────────────────┤
│          │ stage (flex, void)  wire + DOM + out   │
├──────────┴───────────────────────────────────────┤
│ dock (132px) command · Python equivalent         │
└──────────────────────────────────────────────────┘
```

**Signature moments**

1. **Fetch flyout** — on `fetch`, a request card travels the wire strip,
   status ignites `calm`/`alarm`, and the DOM tree blooms open.
2. **Selector spotlight** — on `select`/`css`/`xpath`, matched nodes pulse
   `amber` and the extraction panel fills with rows.

Motion respects `prefers-reduced-motion`. Focus rings are 2px `wire`.

## Architecture

```
src/engine   pure TS state machine (sites, http, dom, selectors,
             spiders, command parser). No DOM.
src/ui       DOM renderers (terminal, wire, tree, extraction, goal).
src/levels   level definitions + win predicates.
tests/       engine unit tests (vitest).
```

Dependency inversion: UI depends on `engine` public API only. Levels depend on
`SessionState` read model. Engine never imports UI.

## Tech

- Vite + TypeScript (strict)
- Vitest for engine tests
- No UI framework — terminal + tree control matters more than component
  bookkeeping; keeps the bundle close to the rest of the learn family.
- Fonts via Google Fonts with system stack fallback.

## Success criteria for v1

1. Sandbox usable end-to-end (fetch → parse → select → export).
2. Worlds 1–3 completable with concept briefs and honest win checks.
3. Every command prints its Python equivalent.
4. Package coverage named in each level (`packages` field).
5. `npm test` green; `npm run build` produces a static `dist/`.
6. README explains pedagogy and how to add a level.

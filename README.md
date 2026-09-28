# LearnScraping

Interactive web scraping sandbox and leveled tutorial. Concepts first, then the
Python stack that expresses them: `requests`, `BeautifulSoup`, `lxml`, `parsel`,
`Scrapy`, `Selenium`, `Playwright`, `pandas`, and production habits.

**Live mental model:** every command prints its real Python equivalent. The stage
shows the wire (request/response), the DOM tree (matched nodes light up), and
extracted rows.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # static dist/
```

## How learning works

1. **Concept brief** opens each level in plain language.
2. You run commands in the terminal (`fetch`, `parse`, `select`, `export`, …).
3. The **goal checklist** tracks real state (status 200, N matches, export written) —
   not a magic command string.
4. The dock shows the **Python line** (`requests.get(...)`, `soup.select(...)`) and
   which packages you just touched.
5. Sandbox mode is free play on a simulated mini-web:
   - `shop.local` — catalog, pagination, login, admin, robots
   - `blog.local` — posts and embedded JSON
   - `jobs.local` — JS-heavy board (Selenium/Playwright)

## Worlds

| World | Theme | Packages |
|------|--------|----------|
| 1 | The wire and the tree | requests, robotparser |
| 2 | requests | requests |
| 3 | BeautifulSoup | beautifulsoup, lxml |
| 4 | Selectors (CSS / XPath / parsel) | lxml, parsel, scrapy |
| 5 | Pagination, tables, JSON, export | pandas, csv, json |
| 6 | Dynamic pages | selenium, playwright |
| 7 | Scrapy | scrapy, parsel |
| 8 | Production (cache, retries, ethics, capstone) | requests, scrapy, pandas |

## Command cheatsheet

```
fetch <url> | post <url> k=v
show request|response|dom|data|links|cookies|code
parse | select <css> | xpath <expr> | find <sel> | extract text|attr:<name>
table | json | next | resolve <href>
session | ua <s> | rate <n> | robots <url>
selenium open|wait|click|type|source|playwright
scrapy list|crawl <spider>
export csv|json|jsonl
levels | goal | hint | solution | sandbox | run <id>
reset | undo | help
```

## Architecture

```
src/engine   pure TS: sites, http, dom/selectors, session, commands
src/ui       terminal, dialogs, DOM tree, confetti, share, progress
src/levels   worlds 1–8 with win predicates
tests/       vitest engine + level tests
```

UI never reaches into engine internals; levels only read `SessionSnapshot`.

## Adding a level

1. Add an entry in `src/levels/worldN.ts` with `concept`, `goal`, `hints`,
   `packages`, `steps`, and a `win(snapshot)` predicate.
2. Export it from that world array (`levels/index.ts` concatenates worlds).
3. Add a test that solves the level through `dispatch` if it is deterministic.

## Design

See [DESIGN.md](./DESIGN.md) for palette, layout, pedagogy rules, and the world map.

## License

Apache-2.0

/**
 * Session state machine: fetch → parse → select → extract → export.
 * Mirrors the scraping mental model without real network I/O.
 */

import type {
  CommandResult,
  DomNode,
  ExtractedRow,
  HttpHeaders,
  HttpMethod,
  HttpResponse,
  PythonHint,
  SelectorMatch,
  SessionSnapshot,
  ToolName,
} from "./types";
import { listSites, normalizeUrl, parseUrl, resolveHref } from "./sites";
import {
  DEFAULT_UA,
  fetchSimulated,
  formatRequest,
  formatResponse,
  robotsAllows,
} from "./http";
import {
  extractAttr,
  extractTexts,
  matchSelector,
  parseHtml,
  queryCss,
  textOf,
  outerHtml,
  flatten,
} from "./dom";

interface HistoryEntry {
  snapshot: SessionSnapshot;
  response?: HttpResponse;
  dom?: DomNode;
  matches?: SelectorMatch;
  extracted: ExtractedRow[];
}

export class Session {
  private url?: string;
  private method: HttpMethod = "GET";
  private requestHeaders: HttpHeaders = {};
  private requestBody?: string;
  private response?: HttpResponse;
  private dom?: DomNode;
  private parsed = false;
  private parser: "html" | "lxml" = "html";
  private lastSelect?: string;
  private lastSelectKind?: "css" | "xpath" | "find";
  private matches?: SelectorMatch;
  private extracted: ExtractedRow[] = [];
  private exported?: "csv" | "json" | "jsonl";
  private cookies: Record<string, string> = {};
  private sessionEnabled = false;
  private userAgent?: string;
  private rateLimit?: number;
  private robotsChecked = false;
  private robotsAllowed?: boolean;
  private seleniumOpen = false;
  private seleniumWaited = false;
  private seleniumClicked = false;
  private seleniumTyped = false;
  private seleniumSource = false;
  private playwrightUsed = false;
  private scrapyRan?: string;
  private scrapyItems = 0;
  private cache = new Map<string, HttpResponse>();
  private cacheHits = 0;
  private retries = 0;
  private commandHistory: string[] = [];
  private toolsUsed = new Set<ToolName>();
  private lastPython?: PythonHint;
  private inspectedResponse = false;
  private inspectedDom = false;
  private inspectedData = false;
  private resolvedLinks = 0;
  private followedPagination = false;
  private tableRows = 0;
  private jsonExtracted = false;
  private deduped = false;
  private validated = false;
  private pageFetches = 0;
  private blocks: string[] = [];
  private history: HistoryEntry[] = [];

  snapshot(): SessionSnapshot {
    return {
      url: this.url,
      method: this.method,
      requestHeaders: { ...this.requestHeaders },
      requestBody: this.requestBody,
      response: this.response ? { ...this.response } : undefined,
      parsed: this.parsed,
      parser: this.parser,
      dom: this.dom,
      lastSelect: this.lastSelect,
      lastSelectKind: this.lastSelectKind,
      matches: this.matches,
      extracted: [...this.extracted],
      exported: this.exported,
      cookies: { ...this.cookies },
      sessionEnabled: this.sessionEnabled,
      userAgent: this.userAgent,
      rateLimit: this.rateLimit,
      robotsChecked: this.robotsChecked,
      robotsAllowed: this.robotsAllowed,
      seleniumOpen: this.seleniumOpen,
      seleniumWaited: this.seleniumWaited,
      seleniumClicked: this.seleniumClicked,
      seleniumTyped: this.seleniumTyped,
      seleniumSource: this.seleniumSource,
      playwrightUsed: this.playwrightUsed,
      scrapySpiders: listSites().map((s) => s.host.replace(".local", "")),
      scrapyRan: this.scrapyRan,
      scrapyItems: this.scrapyItems,
      cacheHits: this.cacheHits,
      retries: this.retries,
      commandHistory: [...this.commandHistory],
      toolsUsed: [...this.toolsUsed],
      lastPython: this.lastPython,
      inspectedResponse: this.inspectedResponse,
      inspectedDom: this.inspectedDom,
      inspectedData: this.inspectedData,
      resolvedLinks: this.resolvedLinks,
      followedPagination: this.followedPagination,
      tableRows: this.tableRows,
      jsonExtracted: this.jsonExtracted,
      deduped: this.deduped,
      validated: this.validated,
      pageFetches: this.pageFetches,
      blocks: [...this.blocks],
    };
  }

  private pushHistory(): void {
    this.history.push({
      snapshot: this.snapshot(),
      response: this.response,
      dom: this.dom,
      matches: this.matches,
      extracted: [...this.extracted],
    });
    if (this.history.length > 30) this.history.shift();
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.restore(prev);
    return true;
  }

  private restore(entry: HistoryEntry): void {
    const s = entry.snapshot;
    this.url = s.url;
    this.method = s.method;
    this.requestHeaders = { ...s.requestHeaders };
    this.requestBody = s.requestBody;
    this.response = entry.response;
    this.dom = entry.dom;
    this.parsed = s.parsed;
    this.parser = s.parser ?? "html";
    this.lastSelect = s.lastSelect;
    this.lastSelectKind = s.lastSelectKind;
    this.matches = entry.matches;
    this.extracted = [...entry.extracted];
    this.exported = s.exported;
    this.cookies = { ...s.cookies };
    this.sessionEnabled = s.sessionEnabled;
    this.userAgent = s.userAgent;
    this.rateLimit = s.rateLimit;
    this.robotsChecked = s.robotsChecked ?? false;
    this.robotsAllowed = s.robotsAllowed;
    this.inspectedResponse = s.inspectedResponse;
    this.inspectedDom = s.inspectedDom;
    this.inspectedData = s.inspectedData;
  }

  reset(): void {
    this.pushHistory();
    this.url = undefined;
    this.method = "GET";
    this.requestHeaders = {};
    this.requestBody = undefined;
    this.response = undefined;
    this.dom = undefined;
    this.parsed = false;
    this.matches = undefined;
    this.extracted = [];
    this.exported = undefined;
    this.cookies = {};
    this.lastSelect = undefined;
    this.cache.clear();
    this.pageFetches = 0;
    this.cacheHits = 0;
    this.inspectedResponse = false;
    this.inspectedDom = false;
    this.inspectedData = false;
  }

  private use(tool: ToolName): void {
    this.toolsUsed.add(tool);
  }

  private note(python: PythonHint): PythonHint {
    this.lastPython = python;
    for (const p of python.packages) this.use(p);
    return python;
  }

  fetch(url: string, opts: { method?: HttpMethod; body?: string; headers?: HttpHeaders } = {}): CommandResult {
    this.pushHistory();
    const full = normalizeUrl(url);
    this.url = full;
    this.method = opts.method ?? "GET";
    this.requestBody = opts.body;
    this.requestHeaders = {
      "user-agent": this.userAgent ?? DEFAULT_UA,
      ...(opts.headers ?? {}),
    };
    if (this.sessionEnabled && Object.keys(this.cookies).length) {
      this.requestHeaders.cookie = Object.entries(this.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    }

    const outcome = fetchSimulated(full, {
      method: this.method,
      headers: this.requestHeaders,
      body: opts.body,
      cookies: this.cookies,
      sessionEnabled: this.sessionEnabled,
      rateLimit: this.rateLimit,
      cache: this.cache,
      useJsRender: this.seleniumOpen,
    });

    this.pageFetches += 1;
    if (outcome.response.fromCache) this.cacheHits += 1;
    if (outcome.robotsBlocked) {
      this.blocks.push(`robots ${full}`);
      this.robotsChecked = true;
      this.robotsAllowed = false;
    }
    Object.assign(this.cookies, outcome.setCookies);
    this.response = outcome.response;
    this.parsed = false;
    this.dom = undefined;
    this.matches = undefined;

    const python = this.note({
      code:
        this.method === "GET"
          ? `r = requests.get(${pyStr(full)})`
          : `r = requests.post(${pyStr(full)}, data=${pyStr(opts.body ?? "")})`,
      packages: this.sessionEnabled ? ["requests"] : ["requests"],
    });

    const lines = [
      `${this.method} ${full}`,
      `← HTTP ${outcome.response.status} ${outcome.response.statusText} · ${outcome.response.latencyMs}ms${
        outcome.response.fromCache ? " · cache" : ""
      }${outcome.robotsBlocked ? " · blocked by robots.txt" : ""}`,
    ];
    if (outcome.redirectedTo) {
      lines.push(`↳ redirect → ${outcome.redirectedTo}`);
    }
    if (outcome.response.status >= 400) {
      lines.push(`status ${outcome.response.status}: inspect with \`show response\``);
    }

    return {
      ok: outcome.response.status < 400,
      output: lines.join("\n"),
      error: outcome.response.status >= 400 ? `HTTP ${outcome.response.status}` : undefined,
      python,
      snapshot: this.snapshot(),
    };
  }

  show(what: string): CommandResult {
    switch (what) {
      case "request":
        if (!this.url) return this.errSnap("Nothing fetched yet.");
        this.inspectedResponse = true;
        return this.okSnap(formatRequest({
          method: this.method,
          url: this.url,
          headers: this.requestHeaders,
          body: this.requestBody,
        }).join("\n"), {
          code: `print(r.request.method, r.request.url, r.request.headers)`,
          packages: ["requests"],
        });
      case "response":
        if (!this.response) return this.errSnap("No response. Run `fetch` first.");
        this.inspectedResponse = true;
        return this.okSnap(formatResponse(this.response).join("\n"), {
          code: `print(r.status_code, r.headers); print(r.text)`,
          packages: ["requests"],
        });
      case "dom":
        if (!this.dom) return this.errSnap("Parse first: `parse`.");
        this.inspectedDom = true;
        const els = flatten(this.dom).filter((n) => n.type === "element" && n.tag !== "#document");
        return this.okSnap(
          els.slice(0, 40).map((n) => describeNode(n)).join("\n"),
          {
            code: `print(soup.prettify()[:2000])`,
            packages: ["beautifulsoup", "lxml"],
          },
        );
      case "data":
        this.inspectedData = true;
        if (!this.extracted.length) {
          return this.okSnap("(no rows extracted yet)\nUse `select` then `extract`.", {
            code: `print(rows)`,
            packages: [],
          });
        }
        return this.okSnap(
          this.extracted.map((r, i) => `${i + 1}. ${JSON.stringify(r)}`).join("\n"),
          {
            code: `print(rows)  # or pandas.DataFrame(rows)`,
            packages: ["json", "pandas"],
          },
        );
      case "links":
        if (!this.dom) return this.errSnap("Parse first.");
        const links = queryCss(this.dom, "a[href]").map((n) => n.attrs.href ?? "");
        return this.okSnap(links.join("\n") || "(none)", {
          code: `[a.get("href") for a in soup.select("a[href]")]`,
          packages: ["beautifulsoup"],
        });
      case "cookies":
        return this.okSnap(
          Object.keys(this.cookies).length
            ? Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("\n")
            : "(no cookies)",
          {
            code: `print(r.cookies); print(s.cookies)`,
            packages: ["requests"],
          },
        );
      case "code":
        return this.okSnap(this.lastPython?.code ?? "(no command yet)", {
          code: this.lastPython?.code ?? "",
          packages: this.lastPython?.packages ?? [],
        });
      default:
        return this.errSnap(`Unknown show target: ${what}. Try request|response|dom|data|links|cookies|code`);
    }
  }

  parse(parser: "html" | "lxml" = "html"): CommandResult {
    this.pushHistory();
    if (!this.response) return this.errSnap("Nothing to parse. `fetch` a page first.");
    this.parser = parser;
    this.dom = parseHtml(this.response.body);
    this.parsed = true;
    this.use("beautifulsoup");
    this.use(parser === "lxml" ? "lxml" : "beautifulsoup");
    const count = flatten(this.dom).filter((n) => n.type === "element").length;
    return {
      ok: true,
      output: `Parsed ${count} elements with parser=${parser}.`,
      python: this.note({
        code:
          parser === "lxml"
            ? `soup = BeautifulSoup(r.text, "lxml")`
            : `soup = BeautifulSoup(r.text, "html.parser")`,
        packages: (parser === "lxml" ? (["beautifulsoup", "lxml"] as const) : (["beautifulsoup"] as const)) as never,
      }),
      snapshot: this.snapshot(),
    };
  }

  select(expr: string, kind: "css" | "xpath" | "find" = "css"): CommandResult {
    this.pushHistory();
    if (!this.dom) return this.errSnap("Parse first: `parse`.");
    this.lastSelect = expr;
    this.lastSelectKind = kind;
    this.matches = matchSelector(this.dom, kind, expr);
    const n = this.matches.nodeIds.length;
    const python: PythonHint =
      kind === "xpath"
        ? {
            code: `nodes = tree.xpath(${pyStr(expr)})  # lxml`,
            packages: ["lxml"],
          }
        : kind === "find"
          ? {
              code: `nodes = soup.find_all(${pyStr(expr)})`,
              packages: ["beautifulsoup"],
            }
          : {
              code: `nodes = soup.select(${pyStr(expr)})`,
              packages: ["beautifulsoup"],
            };
    const head = this.matches.texts.slice(0, 8);
    return {
      ok: true,
      output: [
        `${n} match(es) for ${kind} ${expr}`,
        ...head.map((t, i) => `  [${i}] ${t.slice(0, 80)}`),
        n > head.length ? `  … +${n - head.length} more` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      python: this.note(python),
      snapshot: this.snapshot(),
    };
  }

  extract(what: string): CommandResult {
    this.pushHistory();
    if (!this.matches) return this.errSnap("Select something first: `select .title`.");
    if (what === "text" || what === "texts") {
      const texts = extractTexts(this.matches);
      this.extracted = texts.map((t) => ({ text: t }));
      return {
        ok: true,
        output: texts.map((t, i) => `${i + 1}. ${t}`).join("\n") || "(empty)",
        python: this.note({
          code: `[n.get_text(strip=True) for n in nodes]`,
          packages: ["beautifulsoup"],
        }),
        snapshot: this.snapshot(),
      };
    }
    const attrMatch = /^attr:(.+)$/.exec(what);
    if (attrMatch) {
      const name = attrMatch[1];
      const vals = extractAttr(this.matches, name);
      this.extracted = vals.map((v) => ({ [name]: v }));
      return {
        ok: true,
        output: vals.map((v, i) => `${i + 1}. ${v}`).join("\n") || "(empty)",
        python: this.note({
          code: `[n.get(${pyStr(name)}) for n in nodes]`,
          packages: ["beautifulsoup"],
        }),
        snapshot: this.snapshot(),
      };
    }
    if (what === "html") {
      const nodes = (this.matches?.nodeIds ?? [])
        .map((id) => (this.dom ? flatten(this.dom).find((n) => n.id === id) : undefined))
        .filter((n): n is DomNode => Boolean(n));
      const htmls = nodes.map(outerHtml);
      this.extracted = htmls.map((h) => ({ html: h.slice(0, 120) }));
      return {
        ok: true,
        output: htmls.join("\n").slice(0, 800),
        python: this.note({
          code: `[str(n) for n in nodes]`,
          packages: ["beautifulsoup"],
        }),
        snapshot: this.snapshot(),
      };
    }
    return this.errSnap(`Unknown extract: ${what}. Use text | attr:<name> | html`);
  }

  resolve(href: string): CommandResult {
    this.pushHistory();
    if (!this.url) return this.errSnap("Fetch a page first so resolve has a base URL.");
    const abs = resolveHref(this.url, href);
    this.resolvedLinks += 1;
    return {
      ok: true,
      output: `${href} → ${abs}`,
      python: this.note({
        code: `from urllib.parse import urljoin\nurljoin(r.url, ${pyStr(href)})`,
        packages: ["urllib"],
      }),
      snapshot: this.snapshot(),
    };
  }

  setUserAgent(ua: string): CommandResult {
    this.pushHistory();
    this.userAgent = ua;
    return {
      ok: true,
      output: `User-Agent set to ${ua}`,
      python: this.note({
        code: `requests.get(url, headers={"User-Agent": ${pyStr(ua)}})`,
        packages: ["requests"],
      }),
      snapshot: this.snapshot(),
    };
  }

  setSession(on: boolean): CommandResult {
    this.pushHistory();
    this.sessionEnabled = on;
    return {
      ok: true,
      output: on ? "Session enabled (cookies persist)." : "Session disabled.",
      python: this.note({
        code: on ? `s = requests.Session()\nr = s.get(url)` : `r = requests.get(url)`,
        packages: ["requests"],
      }),
      snapshot: this.snapshot(),
    };
  }

  setRate(n: number): CommandResult {
    this.pushHistory();
    this.rateLimit = n;
    return {
      ok: true,
      output: `Rate limit ${n} req/s.`,
      python: this.note({
        code: `# scrapy: DOWNLOAD_DELAY = 1 / ${n}\n# or time.sleep(1 / ${n})`,
        packages: ["scrapy"],
      }),
      snapshot: this.snapshot(),
    };
  }

  checkRobots(url: string): CommandResult {
    this.pushHistory();
    const full = normalizeUrl(url);
    const { host, path } = parseUrl(full);
    const site = listSites().find((s) => s.host === host);
    if (!site) return this.errSnap(`Unknown host ${host}`);
    const allowed = robotsAllows(site.robotsTxt, path);
    this.robotsChecked = true;
    this.robotsAllowed = allowed;
    if (!allowed) this.blocks.push(`robots ${full}`);
    return {
      ok: true,
      output: [
        `robots.txt for ${host}:`,
        site.robotsTxt.trim(),
        "",
        `${path} → ${allowed ? "ALLOWED" : "DISALLOWED"}`,
      ].join("\n"),
      python: this.note({
        code: `from urllib.robotparser import RobotFileParser\nrp = RobotFileParser(); rp.set_url(${pyStr(`https://${host}/robots.txt`)}); rp.read()\nrp.can_fetch("*", ${pyStr(full)})`,
        packages: ["robotparser"],
      }),
      snapshot: this.snapshot(),
    };
  }

  selenium(action: string, arg?: string): CommandResult {
    this.pushHistory();
    this.use("selenium");
    switch (action) {
      case "open": {
        const url = arg ?? "https://jobs.local/";
        this.seleniumOpen = true;
        const r = this.fetch(url, { method: "GET" });
        // re-label as selenium
        return {
          ...r,
          output: `browser.get(${url})\n` + r.output,
          python: this.note({
            code: `driver.get(${pyStr(url)})`,
            packages: ["selenium"],
          }),
        };
      }
      case "wait":
        this.seleniumWaited = true;
        return {
          ok: true,
          output: "waited for .ready / selector",
          python: this.note({
            code: `WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, ".job")))`,
            packages: ["selenium"],
          }),
          snapshot: this.snapshot(),
        };
      case "click":
        this.seleniumClicked = true;
        this.playwrightUsed = this.playwrightUsed || false;
        return {
          ok: true,
          output: "clicked load-more",
          python: this.note({
            code: `driver.find_element(By.ID, "load-more").click()`,
            packages: ["selenium"],
          }),
          snapshot: this.snapshot(),
        };
      case "type":
        this.seleniumTyped = true;
        return {
          ok: true,
          output: `typed ${arg ?? ""}`,
          python: this.note({
            code: `el.send_keys(${pyStr(arg ?? "")})`,
            packages: ["selenium"],
          }),
          snapshot: this.snapshot(),
        };
      case "source":
        this.seleniumSource = true;
        this.inspectedResponse = true;
        return {
          ok: true,
          output: (this.response?.body ?? "").slice(0, 400),
          python: this.note({
            code: `print(driver.page_source)`,
            packages: ["selenium"],
          }),
          snapshot: this.snapshot(),
        };
      case "playwright":
        this.playwrightUsed = true;
        this.seleniumOpen = true;
        return {
          ok: true,
          output: "playwright session ready",
          python: this.note({
            code: `page.goto(url); page.wait_for_selector(".job")`,
            packages: ["playwright"],
          }),
          snapshot: this.snapshot(),
        };
      default:
        return this.errSnap(`selenium ${action} unknown. Try open|wait|click|type|source|playwright`);
    }
  }

  scrapy(action: string, arg?: string): CommandResult {
    this.pushHistory();
    this.use("scrapy");
    if (action === "list") {
      return {
        ok: true,
        output: listSites().map((s) => s.host.replace(".local", "")).join("\n"),
        python: this.note({
          code: `# scrapy list`,
          packages: ["scrapy"],
        }),
        snapshot: this.snapshot(),
      };
    }
    if (action === "crawl") {
      const spider = arg ?? "shop";
      this.scrapyRan = spider;
      // simulate crawl of listing pages
      const base =
        spider === "blog"
          ? "https://blog.local/"
          : spider === "jobs"
            ? "https://jobs.local/"
            : "https://shop.local/products";
      const first = fetchSimulated(base, { cache: this.cache });
      this.pageFetches += 1;
      this.response = first.response;
      this.dom = parseHtml(first.response.body);
      this.parsed = true;
      let items = 0;
      if (spider === "shop") {
        const rows = queryCss(this.dom, "tr.row");
        items = rows.length;
        this.extracted = rows.map((r) => {
          const tds = r.children.filter((c) => c.type === "element");
          return {
            sku: textOf(tds[0] ?? r),
            name: textOf(tds[1] ?? r),
            price: textOf(tds[2] ?? r),
          };
        });
        // page 2
        const p2 = fetchSimulated("https://shop.local/products?page=2", { cache: this.cache });
        this.pageFetches += 1;
        const dom2 = parseHtml(p2.response.body);
        for (const r of queryCss(dom2, "tr.row")) {
          const tds = r.children.filter((c) => c.type === "element");
          this.extracted.push({
            sku: textOf(tds[0] ?? r),
            name: textOf(tds[1] ?? r),
            price: textOf(tds[2] ?? r),
          });
        }
        items = this.extracted.length;
        this.followedPagination = true;
        this.tableRows = items;
      } else if (spider === "blog") {
        const posts = queryCss(this.dom, "li.post");
        items = posts.length;
        this.extracted = posts.map((p) => ({ text: textOf(p) }));
      } else {
        items = queryCss(this.dom, ".job").length;
        this.extracted = queryCss(this.dom, ".job").map((j) => ({
          role: textOf(j),
        }));
      }
      this.scrapyItems = items;
      return {
        ok: true,
        output: `crawled ${spider} · ${items} items`,
        python: this.note({
          code: `scrapy crawl ${spider} -o items.jsonl`,
          packages: ["scrapy"],
        }),
        snapshot: this.snapshot(),
      };
    }
    return this.errSnap(`scrapy ${action} unknown. Try list|crawl <spider>`);
  }

  export(fmt: "csv" | "json" | "jsonl"): CommandResult {
    this.pushHistory();
    if (!this.extracted.length) return this.errSnap("Nothing to export. Extract rows first.");
    this.exported = fmt;
    this.deduped = true;
    this.validated = true;
    // unique rows
    const seen = new Set<string>();
    const rows = this.extracted.filter((r) => {
      const k = JSON.stringify(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    this.extracted = rows;
    let body = "";
    if (fmt === "json") body = JSON.stringify(rows, null, 2);
    else if (fmt === "jsonl") body = rows.map((r) => JSON.stringify(r)).join("\n");
    else {
      const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
      body = [keys.join(","), ...rows.map((r) => keys.map((k) => r[k] ?? "").join(","))].join("\n");
    }
    return {
      ok: true,
      output: `exported ${rows.length} rows as ${fmt}\n${body.slice(0, 400)}`,
      python: this.note({
        code:
          fmt === "csv"
            ? `import csv\n# write rows to out.csv`
            : fmt === "json"
              ? `import json\njson.dump(rows, open("out.json","w"))`
              : `# JSONL: one object per line`,
        packages: [fmt === "csv" ? "csv" : "json", "pandas"],
      }),
      snapshot: this.snapshot(),
    };
  }

  table(): CommandResult {
    this.pushHistory();
    if (!this.dom) return this.errSnap("Parse first.");
    const rows = queryCss(this.dom, "table tr");
    const parsed = rows
      .map((tr) => tr.children.filter((c) => c.type === "element").map(textOf))
      .filter((cells) => cells.length && cells.some((c) => c.trim()));
    this.tableRows = Math.max(0, parsed.length - 1);
    this.extracted = parsed.slice(1).map((cells) => {
      const obj: ExtractedRow = {};
      const header = parsed[0] ?? [];
      cells.forEach((c, i) => {
        obj[header[i] ?? `c${i}`] = c;
      });
      return obj;
    });
    this.validated = true;
    return {
      ok: true,
      output: parsed.map((c) => c.join(" | ")).join("\n"),
      python: this.note({
        code: `import pandas as pd\ndf = pd.read_html(r.text)[0]`,
        packages: ["pandas", "lxml"],
      }),
      snapshot: this.snapshot(),
    };
  }

  jsonExtract(): CommandResult {
    this.pushHistory();
    if (!this.response) return this.errSnap("Fetch first.");
    const m = /<script[^>]*id=["']__DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(this.response.body);
    if (m) {
      this.jsonExtracted = true;
      return {
        ok: true,
        output: m[1].trim(),
        python: this.note({
          code: `import json\ndata = json.loads(soup.select_one("#__DATA__").string)`,
          packages: ["json", "beautifulsoup"],
        }),
        snapshot: this.snapshot(),
      };
    }
    // API body
    try {
      const obj = JSON.parse(this.response.body);
      this.jsonExtracted = true;
      this.extracted = Array.isArray(obj.items)
        ? (obj.items as Array<Record<string, string>>).map((x) => ({ ...x }))
        : [{ data: this.response.body.slice(0, 80) }];
      return {
        ok: true,
        output: JSON.stringify(obj, null, 2).slice(0, 400),
        python: this.note({
          code: `r.json()`,
          packages: ["requests"],
        }),
        snapshot: this.snapshot(),
      };
    } catch {
      return this.errSnap("No embedded JSON found on this page.");
    }
  }

  followPagination(): CommandResult {
    this.pushHistory();
    if (!this.dom || !this.url) return this.errSnap("Parse a listing page first.");
    const next = queryCss(this.dom, "a.next")[0]?.attrs.href;
    if (!next) return this.errSnap("No next link (.next) on this page.");
    const abs = resolveHref(this.url, next);
    this.followedPagination = true;
    return this.fetch(abs);
  }

  cacheClear(): CommandResult {
    this.pushHistory();
    this.cache.clear();
    return {
      ok: true,
      output: "cache cleared",
      python: this.note({ code: `cache.clear()`, packages: [] }),
      snapshot: this.snapshot(),
    };
  }

  markRetry(): CommandResult {
    this.pushHistory();
    this.retries += 1;
    return {
      ok: true,
      output: `retry #${this.retries}`,
      python: this.note({
        code: `# tenacity or requests adapter retries`,
        packages: ["requests"],
      }),
      snapshot: this.snapshot(),
    };
  }

  logCommand(line: string): void {
    this.commandHistory.push(line);
  }

  okSnap(output: string, python?: PythonHint): CommandResult {
    return {
      ok: true,
      output,
      python,
      snapshot: this.snapshot(),
    };
  }

  errSnap(message: string): CommandResult {
    return {
      ok: false,
      output: message,
      error: message,
      snapshot: this.snapshot(),
    };
  }

  result(lines: string, python?: PythonHint): CommandResult {
    return {
      ok: true,
      output: lines,
      python: python ?? this.lastPython,
      snapshot: this.snapshot(),
    };
  }

  fail(message: string): CommandResult {
    return {
      ok: false,
      output: message,
      error: message,
      snapshot: this.snapshot(),
    };
  }
}

function describeNode(n: DomNode): string {
  const id = n.attrs.id ? `#${n.attrs.id}` : "";
  const cls = n.attrs.class ? `.${n.attrs.class.split(/\s+/).join(".")}` : "";
  const text = textOf(n).slice(0, 40);
  return `<${n.tag}${id}${cls}> ${text}`;
}

function pyStr(s: string): string {
  return JSON.stringify(s);
}

export function withSnapshot(res: CommandResult, snap: SessionSnapshot): CommandResult {
  return { ...res, snapshot: snap };
}

/**
 * Command DSL parser → Session methods + Python equivalents.
 */

import type { CommandResult, PythonHint } from "./types";
import type { Session } from "./session";

export interface DispatchExtras {
  onShowLevels?: () => string[];
  onShowGoal?: () => string[];
  onHint?: () => string[];
  onRunLevel?: (id: string) => string[];
  onShow?: (what: string) => string[];
  onHelp?: () => string[];
  onSandbox?: () => string[];
  onSolution?: () => string[];
}

export const HELP_TEXT = `LearnScraping commands
  fetch <url>              GET a page
  post <url> [k=v ...]     POST a form
  show request|response|dom|data|links|cookies|code
  parse [html|lxml]        BeautifulSoup parse
  select <css>             CSS select
  xpath <expr>             XPath select
  find <tag|class>         find_all
  extract text|attr:<name>|html
  resolve <href>           urljoin
  session                  toggle requests.Session
  ua <string>              set User-Agent
  rate <n>                 requests per second
  robots <url>             check robots.txt
  table                    parse HTML table → rows
  json                     pull embedded / API JSON
  next                     follow pagination link
  cache clear
  retry                    simulate retry
  selenium open|wait|click|type|source|playwright
  scrapy list|crawl <spider>
  export csv|json|jsonl
  levels | goal | hint | solution | sandbox
  run <level-id>
  reset | undo | clear | help`;

export function dispatch(
  session: Session,
  line: string,
  extras: DispatchExtras = {},
): CommandResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return session.result("");
  }
  session.logCommand(trimmed);
  const tokens = tokenize(trimmed);
  const cmd = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  switch (cmd) {
    case "help":
      return session.okSnap(extras.onHelp?.().join("\n") ?? HELP_TEXT);
    case "levels": {
      const rows = extras.onShowLevels?.() ?? [];
      return session.okSnap(rows.join("\n") || "(no levels)");
    }
    case "goal": {
      const rows = extras.onShowGoal?.() ?? [];
      return session.okSnap(rows.join("\n"));
    }
    case "hint": {
      const rows = extras.onHint?.() ?? [];
      return session.okSnap(rows.join("\n") || "No hints left.");
    }
    case "solution": {
      const rows = extras.onSolution?.() ?? [];
      return session.okSnap(rows.join("\n") || "No solution recorded.");
    }
    case "sandbox": {
      const rows = extras.onSandbox?.() ?? ["Sandbox mode."];
      return session.okSnap(rows.join("\n"));
    }
    case "run": {
      const id = args[0];
      if (!id) return session.errSnap("Usage: run <level-id>");
      const rows = extras.onRunLevel?.(id) ?? [];
      return session.okSnap(rows.join("\n") || `Opened level ${id}`);
    }
    case "clear":
    case "cls":
      return session.result("\n".repeat(2));
    case "reset":
      session.reset();
      return session.okSnap("Session reset.");
    case "undo":
      return session.undo()
        ? session.okSnap("Undid last command.")
        : session.errSnap("Nothing to undo.");
    case "fetch":
    case "get": {
      const url = args[0];
      if (!url) return session.errSnap("Usage: fetch <url>");
      return session.fetch(url);
    }
    case "post": {
      const url = args[0];
      if (!url) return session.errSnap("Usage: post <url> k=v ...");
      const body = parseKv(args.slice(1));
      return session.fetch(url, {
        method: "POST",
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
    }
    case "show": {
      const what = args[0] ?? "response";
      return session.show(what);
    }
    case "parse":
      return session.parse((args[0] as "html" | "lxml") ?? "html");
    case "select":
    case "css":
      return session.select(args.join(" "), "css");
    case "xpath":
      return session.select(args.join(" "), "xpath");
    case "find":
      return session.select(args.join(" "), "find");
    case "extract":
      return session.extract(args.join(" ") || "text");
    case "resolve":
      return session.resolve(args[0] ?? "");
    case "session":
      return session.setSession(true);
    case "ua":
      return session.setUserAgent(args.join(" ") || "Mozilla/5.0");
    case "rate": {
      const n = Number(args[0]);
      if (!Number.isFinite(n)) return session.errSnap("Usage: rate <n>");
      return session.setRate(n);
    }
    case "robots":
      return session.checkRobots(args[0] ?? "https://shop.local/admin");
    case "table":
      return session.table();
    case "json":
      return session.jsonExtract();
    case "next":
    case "page":
      return session.followPagination();
    case "cache":
      return session.cacheClear();
    case "retry":
      return session.markRetry();
    case "selenium":
    case "playwright":
      if (cmd === "playwright") return session.selenium("playwright");
      return session.selenium(args[0] ?? "open", args[1]);
    case "scrapy":
      return session.scrapy(args[0] ?? "list", args[1]);
    case "export":
      return session.export((args[0] as "csv" | "json" | "jsonl") ?? "json");
    case "status":
      return session.show("response");
    default:
      return session.errSnap(`Unknown command: ${cmd}. Type \`help\`.`);
  }
}

function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function parseKv(pairs: string[]): string {
  const params = new URLSearchParams();
  for (const p of pairs) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    params.set(p.slice(0, eq), p.slice(eq + 1));
  }
  return params.toString();
}

export function pythonForCommand(line: string): PythonHint | null {
  const cmd = line.trim().split(/\s+/)[0]?.toLowerCase();
  switch (cmd) {
    case "fetch":
      return { code: `r = requests.get(url)`, packages: ["requests"] };
    case "select":
      return { code: `soup.select(sel)`, packages: ["beautifulsoup"] };
    case "scrapy":
      return { code: `scrapy crawl spider`, packages: ["scrapy"] };
    default:
      return null;
  }
}

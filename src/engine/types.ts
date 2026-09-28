/**
 * Core simulation types for LearnScraping.
 * Pure data model — no DOM, no side effects.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD";

export interface HttpHeaders {
  [name: string]: string;
}

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers: HttpHeaders;
  body?: string;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: HttpHeaders;
  body: string;
  /** Simulated latency in ms (display only). */
  latencyMs: number;
  /** True when served from the session cache. */
  fromCache?: boolean;
  /** Set when the request was blocked by robots.txt. */
  blockedBy?: "robots" | "auth" | "rate";
}

export interface DomNode {
  id: string;
  type: "element" | "text";
  tag?: string;
  attrs: Record<string, string>;
  text?: string;
  children: DomNode[];
  parentId?: string;
}

export interface SelectorMatch {
  nodeIds: string[];
  texts: string[];
  attrs: Array<Record<string, string>>;
}

export interface ExtractedRow {
  [field: string]: string;
}

export type ToolName =
  | "requests"
  | "urllib"
  | "httpx"
  | "beautifulsoup"
  | "lxml"
  | "cssselect"
  | "parsel"
  | "scrapy"
  | "selenium"
  | "playwright"
  | "pandas"
  | "csv"
  | "json"
  | "robotparser";

export interface PythonHint {
  /** One-line Python equivalent. */
  code: string;
  packages: ToolName[];
}

export interface ConceptBrief {
  title: string;
  body: string;
  whatHappens: string;
  why: string;
  callout?: string;
  formula?: string;
}

export interface GoalStep {
  id: string;
  label: string;
  detail: string;
  command?: string;
  check: (s: SessionSnapshot) => boolean;
}

export interface WinResult {
  won: boolean;
  feedback: string;
}

export interface Level {
  id: string;
  title: string;
  world: string;
  worldTitle: string;
  concept: ConceptBrief;
  goal: string;
  hints: string[];
  learning: string[];
  packages: ToolName[];
  steps: GoalStep[];
  win: (s: SessionSnapshot) => WinResult;
  seedSite?: string;
  seedUrl?: string;
}

/** Read model exposed to levels and UI. */
export interface SessionSnapshot {
  url?: string;
  method: HttpMethod;
  requestHeaders: HttpHeaders;
  requestBody?: string;
  response?: HttpResponse;
  parsed: boolean;
  parser?: "html" | "lxml";
  dom?: DomNode;
  lastSelect?: string;
  lastSelectKind?: "css" | "xpath" | "find";
  matches?: SelectorMatch;
  extracted: ExtractedRow[];
  exported?: "csv" | "json" | "jsonl";
  cookies: Record<string, string>;
  sessionEnabled: boolean;
  userAgent?: string;
  rateLimit?: number;
  robotsChecked?: boolean;
  robotsAllowed?: boolean;
  seleniumOpen?: boolean;
  seleniumWaited?: boolean;
  seleniumClicked?: boolean;
  seleniumTyped?: boolean;
  seleniumSource?: boolean;
  playwrightUsed?: boolean;
  scrapySpiders: string[];
  scrapyRan?: string;
  scrapyItems: number;
  cacheHits: number;
  retries: number;
  commandHistory: string[];
  toolsUsed: ToolName[];
  lastPython?: PythonHint;
  inspectedResponse: boolean;
  inspectedDom: boolean;
  inspectedData: boolean;
  resolvedLinks: number;
  followedPagination: boolean;
  tableRows: number;
  jsonExtracted: boolean;
  deduped: boolean;
  validated: boolean;
  pageFetches: number;
  blocks: string[];
}

export interface CommandResult {
  ok: boolean;
  output: string;
  error?: string;
  python?: PythonHint;
  snapshot: SessionSnapshot;
}

export interface SitePage {
  path: string;
  status: number;
  statusText?: string;
  headers: HttpHeaders;
  body: string;
  /** Requires session cookie to return 200. */
  authRequired?: boolean;
  /** Page content only appears after JS "renders". */
  needsJs?: boolean;
  /** JS-rendered body used when selenium/playwright is open. */
  renderedBody?: string;
  /** Linked paths discovered on this page. */
  links?: string[];
  /** Disallow prefix in robots.txt terms. */
  isPrivate?: boolean;
}

export interface Site {
  host: string;
  pages: Record<string, SitePage>;
  robotsTxt: string;
  /** Login credentials for the fake auth cookie. */
  auth?: { user: string; pass: string; cookieName: string; cookieValue: string };
}

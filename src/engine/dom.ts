/**
 * Minimal HTML tree + CSS / XPath subset for the scraping sandbox.
 * Intentionally incomplete vs a browser — covers the selectors taught in levels.
 */

import type { DomNode, SelectorMatch } from "./types";

let idSeq = 0;

function nid(): string {
  idSeq += 1;
  return `n${idSeq}`;
}

export function resetDomIds(): void {
  idSeq = 0;
}

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

interface Token {
  kind: "tag" | "text" | "comment";
  value: string;
  closing?: boolean;
  selfClose?: boolean;
}

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      const text = html.slice(i);
      if (text.trim()) tokens.push({ kind: "text", value: text });
      break;
    }
    if (lt > i) {
      const text = html.slice(i, lt);
      if (text.trim()) tokens.push({ kind: "text", value: text });
    }
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt);
      const stop = end === -1 ? html.length : end + 3;
      tokens.push({ kind: "comment", value: html.slice(lt, stop) });
      i = stop;
      continue;
    }
    const gt = html.indexOf(">", lt);
    if (gt === -1) {
      tokens.push({ kind: "text", value: html.slice(lt) });
      break;
    }
    const raw = html.slice(lt + 1, gt).trim();
    if (raw.startsWith("!")) {
      // doctype etc.
      i = gt + 1;
      continue;
    }
    const selfClose = raw.endsWith("/");
    const body = selfClose ? raw.slice(0, -1).trim() : raw;
    const closing = body.startsWith("/");
    tokens.push({
      kind: "tag",
      value: closing ? body.slice(1).trim() : body,
      closing,
      selfClose,
    });
    i = gt + 1;
  }
  return tokens;
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    const val = m[2] ?? m[3] ?? m[4] ?? "";
    attrs[name] = val;
  }
  return attrs;
}

function parseTag(raw: string): { tag: string; attrs: Record<string, string> } {
  const space = raw.search(/\s/);
  if (space === -1) return { tag: raw.toLowerCase(), attrs: {} };
  return {
    tag: raw.slice(0, space).toLowerCase(),
    attrs: parseAttrs(raw.slice(space + 1)),
  };
}

export function parseHtml(html: string): DomNode {
  resetDomIds();
  const root: DomNode = {
    id: nid(),
    type: "element",
    tag: "#document",
    attrs: {},
    children: [],
  };
  const stack: DomNode[] = [root];
  for (const tok of tokenize(html)) {
    if (tok.kind === "comment") continue;
    if (tok.kind === "text") {
      const parent = stack[stack.length - 1];
      parent.children.push({
        id: nid(),
        type: "text",
        attrs: {},
        text: tok.value.replace(/\s+/g, " ").trim(),
        children: [],
        parentId: parent.id,
      });
      continue;
    }
    const { tag, attrs } = parseTag(tok.value);
    if (tok.closing) {
      // pop until matching tag
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const parent = stack[stack.length - 1];
    const node: DomNode = {
      id: nid(),
      type: "element",
      tag,
      attrs,
      children: [],
      parentId: parent.id,
    };
    parent.children.push(node);
    if (!tok.selfClose && !VOID_TAGS.has(tag) && tag !== "script" && tag !== "style") {
      stack.push(node);
    } else if (!tok.selfClose && (tag === "script" || tag === "style")) {
      // keep raw text inside script/style until closing — simplified: treat as leaf
    }
  }
  return root;
}

export function flatten(node: DomNode, acc: DomNode[] = []): DomNode[] {
  acc.push(node);
  for (const c of node.children) flatten(c, acc);
  return acc;
}

export function findNode(root: DomNode, id: string): DomNode | undefined {
  return flatten(root).find((n) => n.id === id);
}

export function textOf(node: DomNode): string {
  if (node.type === "text") return node.text ?? "";
  return node.children.map(textOf).join("").replace(/\s+/g, " ").trim();
}

export function outerHtml(node: DomNode): string {
  if (node.type === "text") return node.text ?? "";
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${v}"`))
    .join("");
  const inner = node.children.map(outerHtml).join("");
  if (VOID_TAGS.has(node.tag ?? "")) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}

function classesOf(node: DomNode): string[] {
  return (node.attrs.class ?? "").split(/\s+/).filter(Boolean);
}

function matchSimple(node: DomNode, simple: string): boolean {
  if (node.type !== "element" || !node.tag || node.tag === "#document") return false;
  // strip pseudo-classes we ignore except :first-child handled elsewhere
  let sel = simple.replace(/::?[-\w]+(\([^)]*\))?/g, (m) => {
    // keep :not() for later — simple drop for now
    return m.startsWith(":not") ? m : "";
  });

  const notParts: string[] = [];
  sel = sel.replace(/:not\(([^)]+)\)/g, (_m, inner: string) => {
    notParts.push(inner);
    return "";
  });

  if (sel.startsWith("*")) sel = sel.slice(1);

  // tag
  const tagMatch = /^[a-zA-Z][-a-zA-Z0-9]*/.exec(sel);
  if (tagMatch) {
    if (node.tag !== tagMatch[0].toLowerCase()) return false;
    sel = sel.slice(tagMatch[0].length);
  } else if (sel.startsWith("#") || sel.startsWith(".") || sel.startsWith("[")) {
    // universal implied
  }

  // id
  const idMatch = /^#([A-Za-z_][\w-]*)/.exec(sel);
  if (idMatch) {
    if (node.attrs.id !== idMatch[1]) return false;
    sel = sel.slice(idMatch[0].length);
  }

  // classes
  const classRe = /\.([A-Za-z_][\w-]*)/g;
  let cm: RegExpExecArray | null;
  const nodeClasses = classesOf(node);
  while ((cm = classRe.exec(sel))) {
    if (!nodeClasses.includes(cm[1])) return false;
  }

  // attributes
  const attrRe = /\[([a-zA-Z_][\w:-]*)(?:([~^|$*]?=)"?([^\]"]*)"?)?\]/g;
  let am: RegExpExecArray | null;
  while ((am = attrRe.exec(sel))) {
    const [, name, op, val] = am;
    const actual = node.attrs[name.toLowerCase()];
    if (actual === undefined) return false;
    if (!op) continue;
    if (op === "=" && actual !== val) return false;
    if (op === "*=" && !actual.includes(val ?? "")) return false;
    if (op === "^=" && !actual.startsWith(val ?? "")) return false;
    if (op === "$=" && !actual.endsWith(val ?? "")) return false;
    if (op === "~=" && !actual.split(/\s+/).includes(val ?? "")) return false;
    if (op === "|=" && actual !== val && !actual.startsWith(`${val}-`)) return false;
  }

  for (const notSel of notParts) {
    if (matchSimple(node, notSel.trim())) return false;
  }
  return true;
}

type Combinator = " " | ">" | "+" | "~";

interface Compound {
  simple: string;
  combinatorBefore: Combinator;
}

function splitCompound(selector: string): Compound[] {
  const parts: Compound[] = [];
  let buf = "";
  let comb: Combinator = " ";
  let depth = 0;
  const flush = (): void => {
    if (buf.trim()) {
      parts.push({ simple: buf.trim(), combinatorBefore: comb });
      buf = "";
      comb = " ";
    }
  };
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && (ch === " " || ch === ">" || ch === "+" || ch === "~")) {
      flush();
      if (ch === ">") comb = ">";
      else if (ch === "+") comb = "+";
      else if (ch === "~") comb = "~";
      else comb = " ";
      // skip extra whitespace
      while (i + 1 < selector.length && /\s/.test(selector[i + 1])) i++;
      continue;
    }
    buf += ch;
  }
  flush();
  return parts;
}

function matchesChain(node: DomNode, parts: Compound[], idx: number, root: DomNode): boolean {
  if (idx < 0) return true;
  const part = parts[idx];
  if (!matchSimple(node, part.simple)) return false;
  if (idx === 0) return true;

  const parent = node.parentId ? findNode(root, node.parentId) : undefined;
  const prev = parts[idx - 1];

  if (prev.combinatorBefore === ">") {
    return parent ? matchesChain(parent, parts, idx - 1, root) : false;
  }
  if (prev.combinatorBefore === "+") {
    if (!parent) return false;
    const siblings = parent.children.filter((c) => c.type === "element");
    const i = siblings.findIndex((c) => c.id === node.id);
    const before = i > 0 ? siblings[i - 1] : undefined;
    return before ? matchesChain(before, parts, idx - 1, root) : false;
  }
  if (prev.combinatorBefore === "~") {
    if (!parent) return false;
    const siblings = parent.children.filter((c) => c.type === "element");
    const i = siblings.findIndex((c) => c.id === node.id);
    for (let j = 0; j < i; j++) {
      if (matchesChain(siblings[j], parts, idx - 1, root)) return true;
    }
    return false;
  }
  // descendant
  let p = parent;
  while (p) {
    if (matchesChain(p, parts, idx - 1, root)) return true;
    p = p.parentId ? findNode(root, p.parentId) : undefined;
  }
  return false;
}

export function queryCss(root: DomNode, selector: string): DomNode[] {
  const groups = selector.split(",").map((s) => s.trim()).filter(Boolean);
  const out: DomNode[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const parts = splitCompound(group);
    if (!parts.length) continue;
    for (const node of flatten(root)) {
      if (node.type !== "element" || node.tag === "#document") continue;
      if (matchesChain(node, parts, parts.length - 1, root) && !seen.has(node.id)) {
        seen.add(node.id);
        out.push(node);
      }
    }
  }
  return out;
}

/** Very small XPath subset: //tag, //tag[@attr='v'], //tag/text(), //tag/@attr, /descendant paths. */
export function queryXPath(root: DomNode, expr: string): DomNode[] {
  const cleaned = expr.trim().replace(/^\.\//, "/").replace(/^\/\//, "//");
  // //tag[@class='x'] | //tag/text() | //a/@href | //div/ul/li
  const attrAxis = /@([\w-]+)$/.exec(cleaned);
  const textAxis = /\/text\(\)$/.test(cleaned);

  let path = cleaned
    .replace(/\/text\(\)/g, "")
    .replace(/\/@[\w-]+/g, "");

  // strip attribute predicates for matching, store them
  const predicates: Array<{ attr: string; value: string }> = [];
  path = path.replace(/\[@([\w-]+)=['"]([^'"]*)['"]\]/g, (_m, attr: string, value: string) => {
    predicates.push({ attr: attr.toLowerCase(), value });
    return "";
  });
  path = path.replace(/\[1\]/g, "");

  const segments = path
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s && s !== "." && s !== "..");

  let current: DomNode[] = [root];
  for (const seg of segments) {
    const tag = seg.replace(/^\*/, "*").toLowerCase();
    const next: DomNode[] = [];
    const seen = new Set<string>();
    for (const node of current) {
      for (const desc of flatten(node)) {
        if (desc === node && seg.startsWith("/") === false && path.startsWith("//") === false) {
          // allow root match for first absolute step later
        }
        if (desc.type !== "element" || !desc.tag || desc.tag === "#document") continue;
        if (tag !== "*" && desc.tag !== tag) continue;
        if (predicates.length && !predicates.every((p) => (desc.attrs[p.attr] ?? "") === p.value)) {
          continue;
        }
        if (!seen.has(desc.id)) {
          seen.add(desc.id);
          next.push(desc);
        }
      }
    }
    current = next;
    // only apply predicates to last segment
    predicates.length = 0;
  }

  if (attrAxis) {
    // return nodes — caller uses attrs; we return nodes that have the attr
    const attr = attrAxis[1].toLowerCase();
    return current.filter((n) => n.attrs[attr] !== undefined);
  }
  if (textAxis) {
    return current;
  }
  return current;
}

export function toMatch(nodes: DomNode[], kind: "css" | "xpath" | "find", expr: string): SelectorMatch {
  return {
    nodeIds: nodes.map((n) => n.id),
    texts: nodes.map(textOf),
    attrs: nodes.map((n) => ({ ...n.attrs })),
    // kind/expr stored by session
    ...(kind && expr ? {} : {}),
  };
}

export function matchSelector(root: DomNode, kind: "css" | "xpath" | "find", expr: string): SelectorMatch {
  let nodes: DomNode[];
  if (kind === "css") nodes = queryCss(root, expr);
  else if (kind === "xpath") nodes = queryXPath(root, expr);
  else {
    // find: simple "tag" or "tag.cls" or ".cls"
    const sel = expr.trim();
    if (sel.startsWith(".")) nodes = queryCss(root, sel);
    else nodes = queryCss(root, sel);
  }
  return {
    nodeIds: nodes.map((n) => n.id),
    texts: nodes.map(textOf),
    attrs: nodes.map((n) => ({ ...n.attrs })),
  };
}

export function extractTexts(match: SelectorMatch): string[] {
  return match.texts;
}

export function extractAttr(match: SelectorMatch, name: string): string[] {
  return match.attrs.map((a) => a[name] ?? "");
}

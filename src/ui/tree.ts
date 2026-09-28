/** DOM tree renderer for the stage. */

import type { DomNode, SelectorMatch } from "../engine/types";
import { flatten, textOf } from "../engine/dom";

export function renderDomTree(
  root: DomNode,
  match?: SelectorMatch,
  maxNodes = 80,
): string {
  const matched = new Set(match?.nodeIds ?? []);
  let count = 0;
  const walk = (node: DomNode, depth: number): string => {
    if (count > maxNodes) return "";
    if (node.tag === "#document") {
      return node.children.map((c) => walk(c, depth)).join("");
    }
    if (node.type === "text") {
      const t = textOf(node);
      if (!t) return "";
      count += 1;
      return `<div class="dom-node" data-id="${node.id}"><span class="dom-text">${escapeHtml(t.slice(0, 80))}</span></div>`;
    }
    count += 1;
    const cls = matched.has(node.id) ? " is-match" : "";
    const attrs = Object.entries(node.attrs)
      .slice(0, 4)
      .map(([k, v]) => ` <span class="dom-attr">${escapeHtml(k)}="${escapeHtml(v.slice(0, 24))}"</span>`)
      .join("");
    const kids = node.children.map((c) => walk(c, depth + 1)).join("");
    return `
      <div class="dom-node${cls}" data-id="${node.id}">
        <span class="dom-tag">&lt;${escapeHtml(node.tag ?? "")}${attrs}&gt;</span>
        ${kids ? `<div class="dom-kids">${kids}</div>` : ""}
      </div>
    `;
  };
  return `<div class="dom-tree">${walk(root, 0)}</div>`;
}

export function countElements(root: DomNode): number {
  return flatten(root).filter((n) => n.type === "element" && n.tag !== "#document").length;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

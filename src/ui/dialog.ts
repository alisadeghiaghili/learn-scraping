/** Minimal markdown + modal helpers. */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inCode = false;
  let inList = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        out.push("<pre><code>");
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s/, "");
      out.push(`<h${level + 1}>${inline(text)}</h${level + 1}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    if (!line.trim()) {
      out.push("");
      continue;
    }
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inCode) out.push("</code></pre>");
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function inline(s: string): string {
  let t = escapeHtml(s);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return t;
}

export interface ModalAction {
  label: string;
  className?: string;
  onClick: () => void;
}

export interface ModalOptions {
  title?: string;
  bodyHtml: string;
  actions?: ModalAction[];
  variant?: "default" | "celebrate";
  onClose?: () => void;
}

export function showModal(opts: ModalOptions): () => void {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="modal ${opts.variant === "celebrate" ? "celebrate-pop" : ""}" role="dialog" aria-modal="true">
      ${opts.title ? `<h2>${escapeHtml(opts.title)}</h2>` : ""}
      <div class="markdown">${opts.bodyHtml}</div>
      <div class="modal-actions"></div>
    </div>
  `;
  const actions = overlay.querySelector(".modal-actions") as HTMLElement;
  const close = (): void => {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
    opts.onClose?.();
  };

  for (const a of opts.actions ?? []) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = a.className ?? "";
    btn.textContent = a.label;
    btn.addEventListener("click", () => {
      a.onClick();
      close();
    });
    actions.appendChild(btn);
  }
  if (!(opts.actions ?? []).length) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary";
    btn.textContent = "Close";
    btn.addEventListener("click", () => close());
    actions.appendChild(btn);
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") close();
    if (e.key === "Enter" || e.key === "Tab") {
      e.stopPropagation();
    }
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  return close;
}

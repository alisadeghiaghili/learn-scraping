/** Terminal log + history + Tab ghost completion. */

export type LogKind = "cmd" | "out" | "err" | "meta" | "ok" | "sk";

export interface LogLine {
  kind: LogKind;
  text: string;
}

export class TerminalView {
  private root: HTMLElement;
  private logEl: HTMLElement;
  private input: HTMLInputElement;
  private ghost: HTMLElement;
  private hintEl: HTMLElement;
  private history: string[] = [];
  private histIdx = -1;
  private onRun: (line: string) => void;
  private extraCompletions: string[] = [];
  private baseCommands = [
    "fetch",
    "post",
    "show",
    "parse",
    "select",
    "xpath",
    "find",
    "extract",
    "resolve",
    "session",
    "ua",
    "rate",
    "robots",
    "table",
    "json",
    "next",
    "cache",
    "retry",
    "selenium",
    "scrapy",
    "export",
    "levels",
    "goal",
    "hint",
    "solution",
    "sandbox",
    "run",
    "reset",
    "undo",
    "clear",
    "help",
  ];

  constructor(root: HTMLElement, onRun: (line: string) => void) {
    this.root = root;
    this.onRun = onRun;
    root.innerHTML = `
      <div id="term-log" class="term-log" role="log" aria-live="polite"></div>
      <div>
        <div id="term-hint" class="term-hint" hidden></div>
        <div id="term-input-wrap" class="term-input-wrap">
          <span class="prompt">scrape $</span>
          <span id="term-ghost" class="term-ghost" aria-hidden="true" data-visible="0"></span>
          <input id="term-input" class="term-input" type="text" autocomplete="off" spellcheck="false"
            aria-label="command" placeholder="fetch https://shop.local/" />
        </div>
      </div>
    `;
    this.logEl = root.querySelector("#term-log") as HTMLElement;
    this.input = root.querySelector("#term-input") as HTMLInputElement;
    this.ghost = root.querySelector("#term-ghost") as HTMLElement;
    this.hintEl = root.querySelector("#term-hint") as HTMLElement;

    this.input.addEventListener("keydown", (e) => this.onKey(e));
    this.input.addEventListener("input", () => this.updateGhost());
    this.root.addEventListener("click", () => this.focus());
  }

  focus(): void {
    this.input.focus();
  }

  setExtraCompletions(list: string[]): void {
    this.extraCompletions = list;
    this.updateGhost();
  }

  setHint(command: string | undefined): void {
    if (!command) {
      this.hintEl.hidden = true;
      this.input.placeholder = "fetch https://shop.local/";
      this.updateGhost();
      return;
    }
    this.hintEl.hidden = false;
    this.hintEl.innerHTML = `Next: <code>${escapeHtml(command)}</code> · Tab completes one word`;
    this.input.placeholder = command;
    this.updateGhost();
  }

  push(kind: LogKind, text: string): void {
    const div = document.createElement("div");
    div.className = kind;
    div.textContent = kind === "cmd" ? `scrape $ ${text}` : text;
    this.logEl.appendChild(div);
    while (this.logEl.children.length > 400) {
      this.logEl.removeChild(this.logEl.firstChild!);
    }
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  clearLog(): void {
    this.logEl.innerHTML = "";
  }

  private candidates(): string[] {
    return [...this.baseCommands, ...this.extraCompletions, ...this.history];
  }

  private updateGhost(): void {
    const val = this.input.value;
    const match = this.ghostMatch(val);
    if (!match) {
      this.ghost.dataset.visible = "0";
      this.ghost.textContent = "";
      return;
    }
    this.ghost.dataset.visible = "1";
    this.ghost.textContent = val + match;
    // align after typed prefix
    this.ghost.style.left = `calc(64px + ${val.length}ch)`;
  }

  private ghostMatch(val: string): string | null {
    if (!val) return null;
    const parts = val.split(/\s+/);
    const last = parts[parts.length - 1];
    if (!last) return null;
    const pool = this.candidates();
    if (parts.length === 1) {
      const hit = pool.find((c) => c.startsWith(last) && c !== last);
      return hit ? hit.slice(last.length) : null;
    }
    // command already typed — suggest level commands / urls lightly
    const hit = pool.find((c) => c.startsWith(val) && c !== val);
    return hit ? hit.slice(val.length) : null;
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      const line = this.input.value;
      if (!line.trim()) return;
      this.push("cmd", line);
      this.history.push(line);
      this.histIdx = this.history.length;
      this.input.value = "";
      this.updateGhost();
      this.onRun(line);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.histIdx > 0) {
        this.histIdx -= 1;
        this.input.value = this.history[this.histIdx] ?? "";
        this.updateGhost();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.histIdx < this.history.length - 1) {
        this.histIdx += 1;
        this.input.value = this.history[this.histIdx] ?? "";
      } else {
        this.histIdx = this.history.length;
        this.input.value = "";
      }
      this.updateGhost();
      return;
    }
    if (e.key === "Escape") {
      this.input.value = "";
      this.updateGhost();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const val = this.input.value;
      const match = this.ghostMatch(val);
      if (match) {
        this.input.value = val + match;
        this.updateGhost();
      } else {
        // complete first word
        const parts = val.split(/\s+/);
        const last = parts[parts.length - 1];
        const hit = this.candidates().find((c) => c.startsWith(last) && c !== last);
        if (hit) {
          parts[parts.length - 1] = hit;
          this.input.value = parts.join(" ");
          this.updateGhost();
        }
      }
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

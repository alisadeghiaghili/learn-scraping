/**
 * LearnScraping shell: chrome, level rail, concept brief, stage, command dock,
 * goal checklist, and level-complete celebration.
 */

import "./styles/app.css";
import { Session, dispatch, type CommandResult, type Level, type SessionSnapshot } from "./engine";
import { ALL_LEVELS, findLevel, levelIds, worlds } from "./levels";
import { TerminalView } from "./ui/terminal";
import { escapeHtml, renderMarkdown, showModal } from "./ui/dialog";
import { launchConfetti, playFanfare } from "./ui/confetti";
import {
  buildShareTargets,
  shareWithClipboard,
  COFFEE_BUTTON_HTML,
  REPO_URL,
  LIVE_URL,
} from "./ui/share";
import {
  loadProgress,
  saveProgress,
  summarizeCurriculum,
  resumeLine,
  type LevelProgress,
} from "./ui/progress";
import { renderDomTree } from "./ui/tree";

type Mode = "level" | "sandbox";

const CHEERS = [
  "Locked in. That concept is yours now.",
  "Clean win. The wire and the tree told the truth.",
  "Good — you read the status line before the body.",
  "Nice. That is production hygiene, not notebook luck.",
];

export function mount(root: HTMLElement): void {
  const progress: Record<string, LevelProgress> = loadProgress();
  let mode: Mode = "level";
  let levelId = ALL_LEVELS[0]?.id ?? "1.1";
  let session = new Session();
  let winFeedback: string | null = null;
  let winOk = false;
  let celebratedFor = "";

  function currentLevel(): Level | null {
    return findLevel(levelId) ?? null;
  }

  function persistProgress(id: string, cmds: number): void {
    const prev = progress[id] ?? { solved: false };
    progress[id] = {
      solved: true,
      bestCommands: prev.bestCommands === undefined ? cmds : Math.min(prev.bestCommands, cmds),
      solvedAt: prev.solvedAt ?? new Date().toISOString(),
    };
    saveProgress(progress);
  }

  const elChrome = document.createElement("header");
  elChrome.className = "chrome";
  elChrome.innerHTML = `
    <div class="brand">
      <img class="brand-logo" src="logo.svg" alt="" width="28" height="28" />
      <div>Learn<span>Scraping</span></div>
      <div class="brand-sub">WIRE + TREE LAB</div>
    </div>
    <nav class="chrome-nav">
      <button type="button" data-nav="levels" class="is-active">levels</button>
      <button type="button" data-nav="sandbox">sandbox</button>
      <button type="button" data-nav="help">help</button>
    </nav>
    <div class="chrome-meta">Python scraping mental model · progress in cookie</div>
  `;

  const elBody = document.createElement("div");
  elBody.className = "body";
  const elRail = document.createElement("aside");
  elRail.className = "rail";
  const elMain = document.createElement("div");
  elMain.className = "main";
  elBody.append(elRail, elMain);

  const elBrief = document.createElement("section");
  elBrief.className = "brief";
  const elStage = document.createElement("section");
  elStage.className = "stage";
  elMain.append(elBrief, elStage);

  const elViz = document.createElement("div");
  elViz.className = "stage-viz";
  const elSide = document.createElement("div");
  elSide.className = "stage-side";
  elStage.append(elViz, elSide);

  const elDock = document.createElement("footer");
  elDock.className = "dock";
  const elTerm = document.createElement("div");
  elTerm.className = "term-root";
  const elPy = document.createElement("div");
  elPy.className = "dock-py";
  elPy.innerHTML = `
    <div class="lbl">PYTHON EQUIVALENT</div>
    <div class="code" id="py-code"># run a command</div>
    <div class="pkgs" id="py-pkgs"></div>
  `;
  elDock.append(elTerm, elPy);

  const elShell = document.createElement("div");
  elShell.className = "shell";
  elShell.append(elChrome, elBody, elDock);
  root.appendChild(elShell);

  const terminal = new TerminalView(elTerm, (line) => runCommand(line));

  function setPython(code: string, packages: string[]): void {
    const codeEl = elPy.querySelector("#py-code") as HTMLElement;
    const pkgsEl = elPy.querySelector("#py-pkgs") as HTMLElement;
    codeEl.textContent = code;
    pkgsEl.innerHTML = packages.map((p) => `<span class="pkg">${escapeHtml(p)}</span>`).join("");
  }

  function renderRail(): void {
    const parts: string[] = [];
    for (const w of worlds()) {
      parts.push(`<div class="rail-world">${escapeHtml(w.title)}</div>`);
      for (const lv of w.levels) {
        const solved = progress[lv.id]?.solved;
        parts.push(`
          <button type="button" class="level-btn ${lv.id === levelId && mode === "level" ? "is-active" : ""} ${solved ? "is-solved" : ""}" data-level="${lv.id}">
            <span class="id">${lv.id}</span>
            <span class="title">${escapeHtml(lv.title)}</span>
            <span class="mark">${solved ? "✓" : ""}</span>
          </button>
        `);
      }
    }
    elRail.innerHTML = parts.join("");
    elRail.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((btn) => {
      btn.addEventListener("click", () => openLevel(btn.dataset.level!));
    });
  }

  function renderBrief(_snap: SessionSnapshot): void {
    if (mode === "sandbox") {
      elBrief.innerHTML = `
        <div class="brief-kicker">SANDBOX</div>
        <h1>Free play on the mini-web</h1>
        <p class="brief-body">
          Hosts: <code>shop.local</code>, <code>blog.local</code>, <code>jobs.local</code>.
          Fetch, parse, select, extract. Every command shows its Python equivalent.
          Try <code>fetch https://shop.local/products</code> then <code>parse</code> then <code>table</code>.
        </p>
        <div class="brief-goal"><span class="goal-chip">no win condition</span>
          <span class="win-feedback">Explore freely. Type <code>levels</code> to return to challenges.</span>
        </div>
      `;
      return;
    }
    const lv = currentLevel();
    if (!lv) return;
    const packages = lv.packages.map((p) => `<span class="pkg-chip">${escapeHtml(p)}</span>`).join("");
    elBrief.innerHTML = `
      <div class="brief-kicker">${escapeHtml(lv.worldTitle)} · level ${lv.id}</div>
      <h1>${escapeHtml(lv.concept.title)}</h1>
      <div class="pkg-row">${packages}</div>
      <p class="brief-body">${escapeHtml(lv.concept.body)}</p>
      <p class="brief-body"><strong>In the sandbox:</strong> ${escapeHtml(lv.concept.whatHappens)}</p>
      <p class="brief-body"><strong>Why it matters:</strong> ${escapeHtml(lv.concept.why)}</p>
      ${lv.concept.formula ? `<div class="brief-formula">${escapeHtml(lv.concept.formula)}</div>` : ""}
      ${lv.concept.callout ? `<div class="brief-callout">${escapeHtml(lv.concept.callout)}</div>` : ""}
      <div class="brief-goal">
        <span class="goal-chip">Goal</span>
        <span>${escapeHtml(lv.goal)}</span>
        ${winFeedback ? `<div class="win-feedback ${winOk ? "is-win" : "is-fail"}">${escapeHtml(winFeedback)}</div>` : ""}
      </div>
    `;
  }

  function renderSide(snap: SessionSnapshot): void {
    const lv = currentLevel();
    const goalHtml =
      mode === "level" && lv
        ? lv.steps
            .map((st) => {
              const met = st.check(snap);
              const isCurrent = !met && lv.steps.find((x) => !x.check(snap))?.id === st.id;
              return `
                <li class="${met ? "met" : ""} ${isCurrent ? "current" : ""}">
                  <span class="g-label">${met ? "✓" : "○"} ${escapeHtml(st.label)}</span>
                  <div class="g-detail">${escapeHtml(st.detail)}</div>
                  ${st.command ? `<code class="g-cmd">${escapeHtml(st.command)}</code>` : ""}
                </li>
              `;
            })
            .join("")
        : `<li><span class="g-label">Sandbox</span><div class="g-detail">No checklist. Explore.</div></li>`;

    const tools = [
      "requests",
      "beautifulsoup",
      "lxml",
      "parsel",
      "scrapy",
      "selenium",
      "playwright",
      "pandas",
      "robotparser",
    ];
    const used = new Set(snap.toolsUsed);
    const toolsHtml = tools
      .map(
        (t) =>
          `<li class="${used.has(t as never) ? "is-on" : ""}"><span class="tool-dot"></span>${escapeHtml(t)}</li>`,
      )
      .join("");

    elSide.innerHTML = `
      <div class="panel">
        <div class="panel-title">GOAL</div>
        <ol class="goal-list">${goalHtml}</ol>
      </div>
      <div class="panel">
        <div class="panel-title">PACKAGES</div>
        <ul class="tool-list">${toolsHtml}</ul>
      </div>
      <div class="panel">
        <div class="panel-title">HINTS</div>
        <ul class="hint-list">
          ${(mode === "level" && lv ? lv.hints : ["Try `help`.", "Hosts: shop.local / blog.local / jobs.local."])
            .map((h) => `<li>${escapeHtml(h)}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  function renderViz(snap: SessionSnapshot): void {
    const blocks: string[] = [];
    const status = snap.response?.status;
    const statusCls = status && status < 400 ? "is-ok" : status ? "is-err" : "";
    blocks.push(`
      <div class="wire-strip">
        <div class="wire-card">
          <div class="method">${escapeHtml(snap.method)}</div>
          <div>${escapeHtml(snap.url ?? "(no url)")}</div>
          <pre>${escapeHtml(
            Object.entries(snap.requestHeaders)
              .slice(0, 6)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n") || "(no headers)",
          )}</pre>
        </div>
        <div class="wire-card ${statusCls}">
          <div class="${status && status < 400 ? "status-ok" : "status-err"}">
            ${snap.response ? `HTTP ${snap.response.status} ${snap.response.statusText}` : "— no response —"}
            ${snap.response?.fromCache ? " · cache" : ""}
            ${snap.response?.blockedBy ? ` · ${snap.response.blockedBy}` : ""}
          </div>
          <div>${snap.response ? `${snap.response.latencyMs}ms · ${snap.response.body.length} bytes` : ""}</div>
          <pre>${escapeHtml(snap.response ? snap.response.body.slice(0, 180) : "")}</pre>
        </div>
      </div>
    `);

    if (snap.dom) {
      blocks.push(renderDomTree(snap.dom, snap.matches));
    } else {
      blocks.push(`<div class="wire-card">Parse a response to see the DOM tree.</div>`);
    }

    if (snap.extracted.length) {
      blocks.push(`
        <div class="panel" style="margin-top:16px">
          <div class="panel-title">EXTRACTED · ${snap.extracted.length} rows</div>
          <ul class="extract-list">
            ${snap.extracted
              .slice(0, 12)
              .map((r) => `<li>${escapeHtml(JSON.stringify(r).slice(0, 120))}</li>`)
              .join("")}
          </ul>
        </div>
      `);
    }
    elViz.innerHTML = blocks.join("");
  }

  function refreshHint(snap: SessionSnapshot): void {
    if (mode !== "level") {
      terminal.setHint(undefined);
      terminal.setExtraCompletions(["https://shop.local/", "https://shop.local/products", "https://blog.local/"]);
      return;
    }
    const lv = currentLevel();
    if (!lv) return;
    const next = lv.steps.find((st) => !st.check(snap));
    terminal.setHint(next?.command);
    terminal.setExtraCompletions(lv.steps.map((s) => s.command ?? "").filter(Boolean));
  }

  function renderAll(): void {
    const snap = session.snapshot();
    renderRail();
    renderBrief(snap);
    renderSide(snap);
    renderViz(snap);
    refreshHint(snap);
  }

  function maybeCelebrate(snap: SessionSnapshot): void {
    if (mode !== "level") return;
    const lv = currentLevel();
    if (!lv) return;
    const result = lv.win(snap);
    winFeedback = result.feedback;
    winOk = result.won;
    renderBrief(snap);
    if (result.won && celebratedFor !== lv.id) {
      celebratedFor = lv.id;
      persistProgress(lv.id, snap.commandHistory.length);
      offerCelebration(lv, snap);
    }
  }

  function offerCelebration(lv: Level, snap: SessionSnapshot): void {
    const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    const sum = summarizeCurriculum(progress, levelIds());
    const idx = ALL_LEVELS.findIndex((l) => l.id === lv.id);
    const next = ALL_LEVELS[idx + 1];
    const targets = buildShareTargets({
      title: lv.title,
      learned: lv.learning,
      solvedCount: sum.solvedCount,
      total: sum.total,
    });

    showModal({
      variant: "celebrate",
      title: `Level ${lv.id} clear`,
      bodyHtml: `
        <div class="celebrate-badge">SOLVED</div>
        <p>${escapeHtml(cheer)}</p>
        <p>Commands used: <code>${snap.commandHistory.length}</code></p>
        <p>Curriculum: ${sum.solvedCount}/${sum.total} (${sum.percent}%)</p>
        <div class="prog-track"><div class="prog-fill" style="width:${sum.percent}%"></div></div>
        <div class="share-row">
          ${targets
            .map(
              (t) =>
                `<button type="button" class="${t.className}" data-share="${escapeHtml(t.label)}">${escapeHtml(t.label)}</button>`,
            )
            .join("")}
        </div>
      `,
      actions: [
        {
          label: "Sandbox",
          className: "ghost",
          onClick: () => openSandbox(),
        },
        {
          label: next ? `Next: ${next.id} ${next.title}` : "Done",
          className: "primary",
          onClick: () => {
            if (next) openLevel(next.id);
          },
        },
      ],
      onClose: () => renderAll(),
    });

    // wire share buttons inside modal
    setTimeout(() => {
      document.querySelectorAll<HTMLButtonElement>("[data-share]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const label = btn.dataset.share;
          const target = targets.find((t) => t.label === label);
          if (!target) return;
          if (label === "Copy") await shareWithClipboard(target.text);
          else window.open(target.href, "_blank", "noopener");
        });
      });
    }, 0);

    launchConfetti(4200);
    playFanfare();
  }

  function openLevel(id: string): void {
    const lv = findLevel(id);
    if (!lv) {
      terminal.push("err", `Unknown level ${id}`);
      return;
    }
    mode = "level";
    levelId = id;
    session = new Session();
    winFeedback = null;
    winOk = false;
    celebratedFor = celebratedFor === id ? celebratedFor : "";
    setPython("# run a command", []);
    terminal.push("meta", `— Level ${lv.id}: ${lv.title} —`);
    terminal.push("meta", lv.goal);
    if (lv.seedUrl) {
      const r = session.fetch(lv.seedUrl);
      terminal.push("out", r.output);
      if (r.python) setPython(r.python.code, r.python.packages);
    }
    // show intro once per level visit
    if (!progress[lv.id]?.solved) {
      showModal({
        title: `${lv.id} · ${lv.title}`,
        bodyHtml: renderMarkdown(
          [
            `**${lv.concept.title}**`,
            "",
            lv.concept.body,
            "",
            `**Goal:** ${lv.goal}`,
            "",
            ...lv.hints.map((h) => `- ${h}`),
            "",
            COFFEE_BUTTON_HTML,
          ].join("\n"),
        ),
        actions: [
          {
            label: "Start",
            className: "primary",
            onClick: () => {
              /* close via overlay click handled */
            },
          },
        ],
      });
    }
    chromeNav("levels");
    renderAll();
    terminal.focus();
  }

  function openSandbox(): void {
    mode = "sandbox";
    session = new Session();
    winFeedback = null;
    chromeNav("sandbox");
    renderAll();
    terminal.push("meta", "Sandbox mode. Hosts: shop.local, blog.local, jobs.local.");
    terminal.focus();
  }

  function chromeNav(which: "levels" | "sandbox" | "help"): void {
    elChrome.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.nav === which);
    });
  }

  function runCommand(line: string): void {
    const result: CommandResult = dispatch(session, line, {
      onShowLevels: () => [
        ...ALL_LEVELS.map(
          (l) =>
            `${progress[l.id]?.solved ? "✓" : "○"} ${l.id.padEnd(5)} ${l.title}  [${l.packages.slice(0, 3).join(", ")}]`,
        ),
      ],
      onShowGoal: () => {
        const lv = currentLevel();
        if (!lv || mode !== "level") return ["Sandbox mode — no goal."];
        return [lv.goal, ...lv.steps.map((st) => `${st.check(session.snapshot()) ? "✓" : "○"} ${st.label}: ${st.detail}`)];
      },
      onHint: () => {
        const lv = currentLevel();
        return lv?.hints ?? ["Try `help`."];
      },
      onSolution: () => {
        const lv = currentLevel();
        return lv?.steps.map((st) => st.command ?? st.label) ?? [];
      },
      onSandbox: () => {
        openSandbox();
        return ["Sandbox mode."];
      },
      onRunLevel: (id) => {
        openLevel(id);
        return [`Opened ${id}`];
      },
      onHelp: () => {
        const lines = [
          "LearnScraping — interactive web scraping lab",
          "Hosts: shop.local · blog.local · jobs.local",
          "",
          "fetch <url>           requests.get",
          "post <url> k=v        requests.post form",
          "show request|response|dom|data|links|cookies|code",
          "parse | select <css> | xpath <e> | extract text|attr:..",
          "table | json | next | resolve <href>",
          "session | ua <s> | rate <n> | robots <url>",
          "selenium open|wait|click|source|playwright",
          "scrapy list|crawl <spider>",
          "export csv|json|jsonl",
          "levels | goal | hint | solution | sandbox | run <id>",
          "reset | undo | help",
          "",
          `Docs: ${REPO_URL}`,
          `Live: ${LIVE_URL}`,
        ];
        return lines;
      },
    });

    if (result.output.trim()) {
      terminal.push(result.ok ? "out" : "err", result.output);
    }
    if (result.python) {
      setPython(result.python.code, result.python.packages);
      terminal.push("sk", `→ ${result.python.code.split("\n")[0]}`);
    }
    if (result.error && !result.ok) {
      // already printed
    }
    renderAll();
    maybeCelebrate(session.snapshot());
  }

  // chrome nav
  elChrome.querySelector('[data-nav="levels"]')!.addEventListener("click", () => {
    chromeNav("levels");
    if (mode !== "level") openLevel(levelId);
    showModal({
      title: "Levels",
      bodyHtml: `
        <div class="level-list">
          ${ALL_LEVELS.map(
            (l) => `
              <button type="button" class="level-btn ${progress[l.id]?.solved ? "is-solved" : ""}" data-open="${l.id}" style="width:100%;margin:4px 0;text-align:left;background:transparent;border:1px solid var(--line);color:var(--chalk);padding:8px 10px;border-radius:4px;cursor:pointer">
                <span class="id">${l.id}</span>
                <span class="title"> ${escapeHtml(l.title)}</span>
                <span class="mark">${progress[l.id]?.solved ? "✓" : ""}</span>
              </button>
            `,
          ).join("")}
        </div>
      `,
      actions: [{ label: "Close", className: "ghost", onClick: () => undefined }],
    });
    setTimeout(() => {
      document.querySelectorAll<HTMLButtonElement>("[data-open]").forEach((btn) => {
        btn.addEventListener("click", () => {
          openLevel(btn.dataset.open!);
          document.querySelector(".overlay")?.remove();
        });
      });
    }, 0);
  });
  elChrome.querySelector('[data-nav="sandbox"]')!.addEventListener("click", () => openSandbox());
  elChrome.querySelector('[data-nav="help"]')!.addEventListener("click", () => {
    runCommand("help");
  });

  // boot
  renderAll();
  const resume = resumeLine(progress, ALL_LEVELS.length);
  if (resume) terminal.push("meta", resume);

  const params = new URLSearchParams(window.location.search);
  if (!params.has("NODEMO")) {
    showModal({
      title: "LearnScraping",
      bodyHtml: renderMarkdown(
        [
          "Learn web scraping **from the wire up**: HTTP, HTML trees, selectors, requests, BeautifulSoup, Selenium, Playwright, Scrapy, and production habits.",
          "",
          "**How it works**",
          "- Levels teach a concept, then make you use it.",
          "- Every command shows the real Python line (`requests.get`, `soup.select`, …).",
          "- The stage shows the request, the DOM tree, and extracted rows.",
          "",
          `**${ALL_LEVELS.length} levels** across 8 worlds.`,
          "",
          "Hosts in the sandbox: `shop.local`, `blog.local`, `jobs.local`.",
          "",
          COFFEE_BUTTON_HTML,
        ].join("\n"),
      ),
      actions: [
        { label: "Sandbox", className: "ghost", onClick: () => openSandbox() },
        {
          label: "Open levels",
          className: "primary",
          onClick: () => openLevel(ALL_LEVELS[0].id),
        },
      ],
    });
  } else {
    openLevel(ALL_LEVELS[0].id);
  }
}

const appRoot = document.querySelector("#app");
if (appRoot) mount(appRoot as HTMLElement);

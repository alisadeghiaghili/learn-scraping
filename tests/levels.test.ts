/**
 * Level pack coverage — each world's flagship path is executable.
 */

import { describe, expect, it } from "vitest";
import { Session } from "../src/engine/session";
import { dispatch } from "../src/engine/commands";
import { ALL_LEVELS, worlds } from "../src/levels";

function runCommands(s: Session, lines: string[]): void {
  for (const line of lines) dispatch(s, line);
}

describe("world coverage", () => {
  it("every world has at least 4 levels", () => {
    for (const w of worlds()) {
      expect(w.levels.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("packages across curriculum cover the major stack", () => {
    const pkgs = new Set(ALL_LEVELS.flatMap((l) => l.packages));
    for (const need of [
      "requests",
      "beautifulsoup",
      "lxml",
      "parsel",
      "scrapy",
      "selenium",
      "playwright",
      "pandas",
      "robotparser",
      "csv",
      "json",
      "urllib",
    ]) {
      expect(pkgs.has(need as never)).toBe(true);
    }
  });

  it("world 2 session login is solvable", () => {
    const s = new Session();
    runCommands(s, [
      "session",
      "post https://shop.local/login user=analyst pass=catalog",
      "fetch https://shop.local/account",
    ]);
    const snap = s.snapshot();
    expect(snap.cookies.session).toBeTruthy();
    expect(snap.response?.status).toBe(200);
    expect(snap.url).toContain("account");
  });

  it("world 5 table + export is solvable", () => {
    const s = new Session();
    runCommands(s, [
      "fetch https://shop.local/products",
      "parse",
      "table",
      "export csv",
    ]);
    const snap = s.snapshot();
    expect(snap.tableRows).toBeGreaterThanOrEqual(3);
    expect(snap.exported).toBe("csv");
  });

  it("world 7 scrapy crawl shop gathers multi-page items", () => {
    const s = new Session();
    runCommands(s, ["scrapy crawl shop", "export jsonl"]);
    const snap = s.snapshot();
    expect(snap.scrapyItems).toBeGreaterThanOrEqual(5);
    expect(snap.followedPagination).toBe(true);
    expect(snap.exported).toBe("jsonl");
  });

  it("world 8 capstone path works", () => {
    const s = new Session();
    runCommands(s, [
      "rate 1",
      "fetch https://shop.local/products",
      "parse",
      "table",
      "export csv",
    ]);
    const snap = s.snapshot();
    expect(snap.extracted.length).toBeGreaterThanOrEqual(3);
    expect(snap.exported).toBeTruthy();
    expect(snap.rateLimit).toBe(1);
  });

  it("robots blocks admin fetch", () => {
    const s = new Session();
    runCommands(s, ["fetch https://shop.local/admin"]);
    expect(s.snapshot().response?.status).toBe(403);
    expect(s.snapshot().robotsAllowed).toBe(false);
  });
});

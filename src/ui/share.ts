/** Share targets + coffee button. */

export const REPO_URL = "https://github.com/alisadeghiaghili/learn-scraping";
export const LIVE_URL = "https://alisadeghiaghili.github.io/learn-scraping/";
export const SHARE_URL = LIVE_URL;
export const COFFEE_URL = "https://linktr.ee/aliaghili";

export const COFFEE_BUTTON_HTML = `<p><a href="${COFFEE_URL}" target="_blank" rel="noopener">Support this project</a></p>`;

export interface ShareCtx {
  title: string;
  learned: string[];
  solvedCount: number;
  total: number;
}

export function buildShareTargets(ctx: ShareCtx): {
  label: string;
  href: string;
  text: string;
  className: string;
}[] {
  const text = [
    `I just finished "${ctx.title}" on LearnScraping.`,
    ctx.learned.length ? `Learned: ${ctx.learned.slice(0, 3).join("; ")}.` : "",
    `${ctx.solvedCount}/${ctx.total} levels solved.`,
    SHARE_URL,
  ]
    .filter(Boolean)
    .join(" ");

  const enc = encodeURIComponent(text);
  const url = encodeURIComponent(SHARE_URL);
  return [
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      text,
      className: "share-btn linkedin",
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${enc}`,
      text,
      className: "share-btn x",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      text,
      className: "share-btn facebook",
    },
    {
      label: "Copy",
      href: "#",
      text,
      className: "share-btn copy",
    },
  ];
}

export async function shareWithClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

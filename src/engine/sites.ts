/**
 * Simulated mini-web used by the sandbox and levels.
 * Deterministic HTML fixtures — no real network.
 */

import type { Site, SitePage } from "./types";

function page(
  path: string,
  body: string,
  extra: Partial<SitePage> = {},
): SitePage {
  return {
    path,
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "server": "LearnScraping-Sim/1.0",
    },
    body,
    links: extra.links ?? [],
    ...extra,
  };
}

const SHOP_HOME = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Northwind Supply — Home</title>
  <link rel="stylesheet" href="/static/shop.css" />
</head>
<body>
  <header class="site-header">
    <a class="logo" href="/">Northwind</a>
    <nav class="nav">
      <a href="/products">Products</a>
      <a href="/about">About</a>
      <a href="/login">Login</a>
    </nav>
  </header>
  <main>
    <h1>Industrial supplies, catalogued</h1>
    <p class="lede">Browse the catalog or <a href="/products">jump to products</a>.</p>
    <section class="featured">
      <article class="card">
        <h2><a href="/products/1">Hex Bolt M8</a></h2>
        <p class="price">$2.40</p>
      </article>
      <article class="card">
        <h2><a href="/products/2">Nylon Washer</a></h2>
        <p class="price">$0.18</p>
      </article>
    </section>
  </main>
  <footer>
    <p><a href="/robots.txt">robots</a> · <a href="/legal/terms">terms</a></p>
  </footer>
</body>
</html>`;

const SHOP_PRODUCTS = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Products — page 1</title>
</head>
<body>
  <header class="site-header">
    <a class="logo" href="/">Northwind</a>
    <nav class="nav">
      <a class="active" href="/products">Products</a>
      <a href="/login">Login</a>
    </nav>
  </header>
  <main>
    <h1>Products</h1>
    <table class="catalog" id="catalog">
      <thead>
        <tr><th>SKU</th><th>Name</th><th>Price</th><th>Stock</th></tr>
      </thead>
      <tbody>
        <tr class="row" data-sku="NW-001"><td>NW-001</td><td class="name">Hex Bolt M8</td><td class="price">2.40</td><td>120</td></tr>
        <tr class="row" data-sku="NW-002"><td>NW-002</td><td class="name">Nylon Washer</td><td class="price">0.18</td><td>400</td></tr>
        <tr class="row" data-sku="NW-003"><td>NW-003</td><td class="name">Steel Bracket</td><td class="price">4.10</td><td>35</td></tr>
        <tr class="row" data-sku="NW-004"><td>NW-004</td><td class="name">Rubber Gasket</td><td class="price">0.95</td><td>210</td></tr>
        <tr class="row" data-sku="NW-005"><td>NW-005</td><td class="name">Copper Lug</td><td class="price">1.25</td><td>88</td></tr>
      </tbody>
    </table>
    <nav class="pagination">
      <span class="page-num">1</span>
      <a class="next" href="/products?page=2">Next</a>
    </nav>
  </main>
</body>
</html>`;

const SHOP_PRODUCTS_2 = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Products — page 2</title>
</head>
<body>
  <header class="site-header">
    <a class="logo" href="/">Northwind</a>
    <nav class="nav"><a href="/products">Products</a></nav>
  </header>
  <main>
    <h1>Products</h1>
    <table class="catalog" id="catalog">
      <thead>
        <tr><th>SKU</th><th>Name</th><th>Price</th><th>Stock</th></tr>
      </thead>
      <tbody>
        <tr class="row" data-sku="NW-006"><td>NW-006</td><td class="name">M6 Nut</td><td class="price">0.12</td><td>900</td></tr>
        <tr class="row" data-sku="NW-007"><td>NW-007</td><td class="name">Spring Clip</td><td class="price">0.40</td><td>150</td></tr>
        <tr class="row" data-sku="NW-008"><td>NW-008</td><td class="name">Hex Bolt M8</td><td class="price">2.40</td><td>120</td></tr>
      </tbody>
    </table>
    <nav class="pagination">
      <a class="prev" href="/products">Prev</a>
      <span class="page-num">2</span>
    </nav>
  </main>
</html>`;

const SHOP_PRODUCT_1 = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Hex Bolt M8</title></head>
<body>
  <article class="product" itemscope>
    <h1 class="title" itemprop="name">Hex Bolt M8</h1>
    <p class="sku">SKU: <span itemprop="sku">NW-001</span></p>
    <p class="price" itemprop="price">2.40</p>
    <p class="stock">In stock: 120</p>
    <div class="desc">High-tensile hex bolt, zinc plated.</div>
    <a class="back" href="/products">Back to catalog</a>
  </article>
</body>
</html>`;

const SHOP_ABOUT = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>About</title></head>
<body>
  <h1>About Northwind</h1>
  <p>We stock industrial fasteners since 1998.</p>
  <p>Contact: <a href="mailto:ops@northwind.example">ops@northwind.example</a></p>
</body>
</html>`;

const SHOP_LOGIN = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Login</title></head>
<body>
  <h1>Login</h1>
  <form method="post" action="/login">
    <label>User <input name="user" type="text" /></label>
    <label>Pass <input name="pass" type="password" /></label>
    <button type="submit">Sign in</button>
  </form>
  <p class="hint">demo: analyst / catalog</p>
</body>
</html>`;

const SHOP_ADMIN = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Admin dashboard</title></head>
<body>
  <h1>Admin</h1>
  <p class="secret">Q3 restock plan: NW-003 priority.</p>
  <ul class="notes">
    <li>Reorder NW-003</li>
    <li>Discontinue NW-007</li>
    <li>Audit NW-008 duplicates</li>
  </ul>
</body>
</html>`;

const BLOG_HOME = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Parse &amp; Payload</title></head>
<body>
  <h1>Parse &amp; Payload</h1>
  <ul class="posts">
    <li class="post"><a href="/blog/selectors">CSS selectors that scale</a><span class="date">2024-01-12</span></li>
    <li class="post"><a href="/blog/xpath">XPath when CSS is not enough</a><span class="date">2024-02-03</span></li>
    <li class="post"><a href="/blog/rate">Rate limits without tears</a><span class="date">2024-03-18</span></li>
    <li class="post"><a href="/blog/scrapy">Scrapy spiders in production</a><span class="date">2024-04-02</span></li>
    <li class="post"><a href="/blog/headless">Headless browsers, honest tradeoffs</a><span class="date">2024-05-09</span></li>
  </ul>
  <script type="application/json" id="__DATA__">
    {"posts": 5, "theme": "engineering"}
  </script>
</body>
</html>`;

const JOBS_HOME = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Payload Jobs</title></head>
<body>
  <h1>Open roles</h1>
  <div class="board" id="job-board">
    <div class="job" data-id="1">
      <h2 class="role">Data Engineer</h2>
      <span class="loc">Berlin</span>
    </div>
    <div class="job" data-id="2">
      <h2 class="role">ML Engineer</h2>
      <span class="loc">Remote</span>
    </div>
    <div class="job" data-id="3">
      <h2 class="role">Scrapy Contractor</h2>
      <span class="loc">Tehran</span>
    </div>
  </div>
  <button id="load-more" class="load-more">Load more</button>
  <script>
    // Client-side only — invisible to plain HTTP.
    document.getElementById('load-more').addEventListener('click', function () {
      var board = document.getElementById('job-board');
      var el = document.createElement('div');
      el.className = 'job';
      el.setAttribute('data-id', '4');
      el.innerHTML = '<h2 class="role">Platform SRE</h2><span class="loc">Amsterdam</span>';
      board.appendChild(el);
    });
  </script>
</body>
</html>`;

const JOBS_RENDERED = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Payload Jobs</title></head>
<body>
  <h1>Open roles</h1>
  <div class="board" id="job-board">
    <div class="job" data-id="1"><h2 class="role">Data Engineer</h2><span class="loc">Berlin</span></div>
    <div class="job" data-id="2"><h2 class="role">ML Engineer</h2><span class="loc">Remote</span></div>
    <div class="job" data-id="3"><h2 class="role">Scrapy Contractor</h2><span class="loc">Tehran</span></div>
  </div>
  <button id="load-more" class="load-more">Load more</button>
</body>
</html>`;

const SHOP_ROBOTS = `User-agent: *
Disallow: /admin
Disallow: /login
Allow: /

Crawl-delay: 1
`;

const SHOP: Site = {
  host: "shop.local",
  robotsTxt: SHOP_ROBOTS,
  auth: {
    user: "analyst",
    pass: "catalog",
    cookieName: "session",
    cookieValue: "sess_demo_42",
  },
  pages: {
    "/": page("/", SHOP_HOME, { links: ["/products", "/about", "/login", "/products/1"] }),
    "/products": page("/products", SHOP_PRODUCTS, {
      links: ["/products?page=2", "/products/1", "/login"],
    }),
    "/products?page=2": page("/products?page=2", SHOP_PRODUCTS_2, {
      links: ["/products"],
    }),
    "/products/1": page("/products/1", SHOP_PRODUCT_1, {
      links: ["/products"],
    }),
    "/about": page("/about", SHOP_ABOUT, { links: ["/"] }),
    "/login": page("/login", SHOP_LOGIN, {
      links: ["/admin"],
    }),
    "/admin": page("/admin", SHOP_ADMIN, {
      authRequired: true,
      isPrivate: true,
    }),
    "/account": page(
      "/account",
      `<!doctype html><html><head><meta charset="utf-8" /><title>Account</title></head>
<body>
  <h1>Account</h1>
  <p class="secret">Q3 restock plan: NW-003 priority.</p>
  <ul class="notes">
    <li>Reorder NW-003</li>
    <li>Discontinue NW-007</li>
    <li>Audit NW-008 duplicates</li>
  </ul>
</body></html>`,
      { authRequired: true, links: ["/"] },
    ),
    "/legal/terms": page("/legal/terms", "<!doctype html><html><body><h1>Terms</h1></body></html>"),
    "/robots.txt": page("/robots.txt", SHOP_ROBOTS, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
    "/search": page(
      "/search",
      `<!doctype html><html><body><h1>Search</h1><form method="post" action="/search"><input name="q" /><button>Go</button></form></body></html>`,
      { links: ["/"] },
    ),
    "/error": page("/error", "<!doctype html><html><body><h1>boom</h1></body></html>", {
      status: 500,
      statusText: "Internal Server Error",
    }),
    "/missing": page("/missing", "<!doctype html><html><body><h1>not found</h1></body></html>", {
      status: 404,
      statusText: "Not Found",
    }),
    "/moved": page("/moved", "", {
      status: 301,
      statusText: "Moved Permanently",
      headers: {
        location: "/products",
        "content-type": "text/html",
      },
    }),
    "/redirect-me": page("/redirect-me", "", {
      status: 302,
      statusText: "Found",
      headers: { location: "/products", "content-type": "text/html" },
    }),
    "/api/items": page(
      "/api/items",
      JSON.stringify({
        items: [
          { sku: "NW-001", name: "Hex Bolt M8", price: 2.4 },
          { sku: "NW-002", name: "Nylon Washer", price: 0.18 },
          { sku: "NW-003", name: "Steel Bracket", price: 4.1 },
        ],
      }),
      { headers: { "content-type": "application/json" } },
    ),
    "/search-results": page(
      "/search-results",
      `<!doctype html><html><body><h1>Results</h1><ul class="results"><li>bolt</li><li>bracket</li></ul></body></html>`,
    ),
  },
};

const BLOG: Site = {
  host: "blog.local",
  robotsTxt: `User-agent: *
Disallow: /drafts
`,
  pages: {
    "/": page("/", BLOG_HOME, {
      links: ["/blog/selectors", "/blog/xpath", "/blog/rate", "/blog/scrapy", "/blog/headless"],
    }),
    "/blog/selectors": page(
      "/blog/selectors",
      `<!doctype html><html><body><article class="post"><h1>CSS selectors that scale</h1><p class="body">Prefer classes over deep paths.</p></article></body></html>`,
    ),
    "/blog/xpath": page(
      "/blog/xpath",
      `<!doctype html><html><body><article class="post"><h1>XPath when CSS is not enough</h1><p class="body">Text nodes and axes.</p></article></body></html>`,
    ),
    "/blog/rate": page(
      "/blog/rate",
      `<!doctype html><html><body><article class="post"><h1>Rate limits without tears</h1><p class="body">Be a good citizen.</p></article></body></html>`,
    ),
    "/blog/scrapy": page(
      "/blog/scrapy",
      `<!doctype html><html><body><article class="post"><h1>Scrapy spiders in production</h1><p class="body">Pipelines matter.</p></article></body></html>`,
    ),
    "/blog/headless": page(
      "/blog/headless",
      `<!doctype html><html><body><article class="post"><h1>Headless browsers, honest tradeoffs</h1><p class="body">Heavy but sometimes necessary.</p></article></body></html>`,
    ),
  },
};

const JOBS: Site = {
  host: "jobs.local",
  robotsTxt: `User-agent: *
Allow: /
`,
  pages: {
    "/": page("/", JOBS_HOME, {
      needsJs: true,
      renderedBody: JOBS_RENDERED,
      links: ["/"],
    }),
  },
};

const sites: Record<string, Site> = {
  "shop.local": SHOP,
  "blog.local": BLOG,
  "jobs.local": JOBS,
};

export function listSites(): Site[] {
  return Object.values(sites);
}

export function getSite(host: string): Site | undefined {
  return sites[host];
}

export function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, "") || url;
}

export function parseUrl(raw: string): { host: string; path: string; query: string } {
  const url = normalizeUrl(raw);
  const withoutProtocol = url.replace(/^https?:\/\//i, "");
  const slash = withoutProtocol.indexOf("/");
  const host = (slash === -1 ? withoutProtocol : withoutProtocol.slice(0, slash)).toLowerCase();
  const rest = slash === -1 ? "/" : withoutProtocol.slice(slash);
  const q = rest.indexOf("?");
  if (q === -1) return { host, path: rest || "/", query: "" };
  return { host, path: rest.slice(0, q) || "/", query: rest.slice(q + 1) };
}

export function resolveHref(base: string, href: string): string {
  if (!href) return base;
  if (/^https?:\/\//i.test(href)) return normalizeUrl(href);
  if (href.startsWith("//")) return normalizeUrl(`https:${href}`);
  const { host, path } = parseUrl(base);
  if (href.startsWith("?")) {
    return normalizeUrl(`https://${host}${path}${href}`);
  }
  if (href.startsWith("/")) return normalizeUrl(`https://${host}${href}`);
  const dir = path.endsWith("/") ? path : path.slice(0, path.lastIndexOf("/") + 1);
  const joined = `${dir}${href}`;
  // normalize .. and .
  const parts: string[] = [];
  for (const seg of joined.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return normalizeUrl(`https://${host}/${parts.join("/")}`);
}

export function lookupPage(url: string): {
  site: Site;
  page: SitePage;
  fullUrl: string;
} | null {
  const { host, path, query } = parseUrl(url);
  const site = sites[host];
  if (!site) return null;
  const key = query ? `${path}?${query}` : path;
  const pg = site.pages[key] ?? site.pages[path];
  if (!pg) return null;
  return { site, page: pg, fullUrl: normalizeUrl(url) };
}

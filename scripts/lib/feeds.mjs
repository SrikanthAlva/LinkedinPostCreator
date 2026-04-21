import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; LinkedinPostCreator/1.0; +https://github.com/)"
  }
});

const HOUR = 60 * 60 * 1000;

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function canonicalUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    [...u.searchParams.keys()]
      .filter((k) => k.toLowerCase().startsWith("utm_"))
      .forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url;
  }
}

function trimSnippet(text, max = 280) {
  if (!text) return "";
  const cleaned = String(text).replace(/\s+/g, " ").trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1).trimEnd() + "…" : cleaned;
}

async function fetchOne(url) {
  try {
    const feed = await parser.parseURL(url);
    const source = feed.title || hostname(url);
    return (feed.items || []).map((item) => {
      const link = canonicalUrl(item.link || item.guid || "");
      const pubDate = item.isoDate || item.pubDate;
      const date = pubDate ? new Date(pubDate) : null;
      return {
        title: (item.title || "").trim(),
        url: link,
        source,
        snippet: trimSnippet(item.contentSnippet || item.summary || item.content || ""),
        publishedAt: date && !Number.isNaN(date.getTime()) ? date : null
      };
    });
  } catch (err) {
    console.warn(`[feeds] skipping ${url}: ${err.message}`);
    return [];
  }
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.url || `${item.source}::${item.title}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function withinWindow(items, hours) {
  const cutoff = Date.now() - hours * HOUR;
  return items.filter((i) => i.publishedAt && i.publishedAt.getTime() >= cutoff);
}

/**
 * Fetch every feed in `urls` in parallel, drop dead feeds, dedupe by URL,
 * filter to the last 72h. If we end up with fewer than `minItems`, widen
 * the window to 7 days as a safety fallback.
 */
export async function collectArticles(urls, { topN = 8, minItems = 4 } = {}) {
  const settled = await Promise.allSettled(urls.map(fetchOne));
  const all = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const deduped = dedupe(all).filter((i) => i.title && i.url);

  let recent = withinWindow(deduped, 72);
  if (recent.length < minItems) {
    console.warn(
      `[feeds] only ${recent.length} items in last 72h, widening to 7d`
    );
    recent = withinWindow(deduped, 24 * 7);
  }
  if (recent.length === 0) {
    recent = deduped
      .filter((i) => i.publishedAt)
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, topN);
  }

  return recent
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, topN);
}

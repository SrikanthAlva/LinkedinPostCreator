import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { collectArticles } from "./lib/feeds.mjs";
import { generatePosts } from "./lib/openai.mjs";
import { upsertPosts } from "./lib/supabase.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function todayInIST() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return fmt.format(now);
}

async function loadFeeds() {
  const raw = await readFile(resolve(__dirname, "feeds.json"), "utf8");
  return JSON.parse(raw);
}

async function main() {
  const feeds = await loadFeeds();

  console.log("[generate] fetching AI feeds…");
  const aiArticles = await collectArticles(feeds.ai);
  console.log(`[generate] ${aiArticles.length} AI articles selected`);

  console.log("[generate] fetching Web3 feeds…");
  const web3Articles = await collectArticles(feeds.web3);
  console.log(`[generate] ${web3Articles.length} Web3 articles selected`);

  if (aiArticles.length === 0 || web3Articles.length === 0) {
    throw new Error("Not enough articles to generate posts (one or both categories empty).");
  }

  console.log("[generate] calling OpenAI…");
  const { ai_post, web3_post } = await generatePosts({ aiArticles, web3Articles });

  const postDate = todayInIST();
  console.log(`[generate] upserting posts for ${postDate}…`);
  const row = await upsertPosts({
    postDate,
    aiPost: ai_post,
    web3Post: web3_post,
    aiArticles,
    web3Articles
  });

  console.log(`[generate] done. id=${row.id} date=${row.post_date}`);
  console.log("\n----- AI POST -----\n" + ai_post);
  console.log("\n----- WEB3 POST -----\n" + web3_post);
}

main().catch((err) => {
  console.error("[generate] FAILED:", err);
  process.exitCode = 1;
});

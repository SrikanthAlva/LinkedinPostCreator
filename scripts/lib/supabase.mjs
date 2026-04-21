import { createClient } from "@supabase/supabase-js";

let cached;

function client() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("SUPABASE_URL is not set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  cached = createClient(url, key, {
    auth: { persistSession: false }
  });
  return cached;
}

function toSourceList(articles) {
  return articles.map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source,
    published_at: a.publishedAt ? a.publishedAt.toISOString() : null
  }));
}

export async function upsertPosts({ postDate, aiPost, web3Post, aiArticles, web3Articles }) {
  const row = {
    post_date: postDate,
    ai_post: aiPost,
    web3_post: web3Post,
    ai_sources: toSourceList(aiArticles),
    web3_sources: toSourceList(web3Articles)
  };

  const { data, error } = await client()
    .from("posts")
    .upsert(row, { onConflict: "post_date" })
    .select()
    .single();

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return data;
}

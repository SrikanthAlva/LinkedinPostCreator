import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: { persistSession: false }
});

export type SourceLink = {
  title: string;
  url: string;
  source: string;
  published_at: string | null;
};

export type PostRow = {
  id: string;
  post_date: string;
  ai_post: string;
  web3_post: string;
  ai_sources: SourceLink[];
  web3_sources: SourceLink[];
  created_at: string;
};

export async function fetchPosts(limit = 20): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("post_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PostRow[];
}

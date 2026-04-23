import { useEffect, useState } from "react";
import { fetchPosts, type PostRow } from "./lib/supabase";
import { PostCard } from "./components/PostCard";
import { Archive } from "./components/Archive";

function formatLongDate(d: string) {
  const date = new Date(`${d}T00:00:00Z`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default function App() {
  const [rows, setRows] = useState<PostRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPosts(20)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError(err.message ?? "Failed to load posts");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = rows && rows.length > 0 ? rows[0] : null;
  const past = rows && rows.length > 1 ? rows.slice(1) : [];

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1 className="header__title">LinkedIn Post Creator</h1>
          <p className="header__subtitle">
            Weekly AI and Web3 posts, generated every Wednesday at 9:00 AM IST.
          </p>
          {latest && (
            <p className="header__meta">
              Latest update: {formatLongDate(latest.post_date)}
            </p>
          )}
        </div>
      </header>

      <main className="main">
        <div className="container">
          {error && (
            <div className="error" role="alert">
              <strong>Couldn't load posts.</strong> {error}
            </div>
          )}

          {!error && rows === null && (
            <div className="posts-grid" aria-busy="true">
              <div className="card">
                <div className="skeleton skeleton--line" style={{ width: "30%" }} />
                <div className="skeleton skeleton--card" />
              </div>
              <div className="card">
                <div className="skeleton skeleton--line" style={{ width: "30%" }} />
                <div className="skeleton skeleton--card" />
              </div>
            </div>
          )}

          {!error && rows && rows.length === 0 && (
            <div className="state">
              <p className="state__title">No posts yet.</p>
              <p>The first run of the weekly job will populate this page.</p>
            </div>
          )}

          {latest && (
            <>
              <h2 className="section-title">This week</h2>
              <p className="section-hint">
                Review each draft on this page, then use{" "}
                <strong>Open LinkedIn</strong> to finish in LinkedIn’s composer
                (edit if you like, then post). <strong>Copy</strong> is there if
                you prefer to paste manually or if the draft is too long to
                prefill from the link.
              </p>
              <div className="posts-grid">
                <PostCard
                  topic="AI"
                  body={latest.ai_post}
                  sources={latest.ai_sources}
                />
                <PostCard
                  topic="Web3"
                  body={latest.web3_post}
                  sources={latest.web3_sources}
                />
              </div>
              <Archive rows={past} />
            </>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          Generated weekly via GitHub Actions. No tracking, no ads.
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import type { SourceLink } from "../lib/supabase";

type Props = {
  topic: "AI" | "Web3";
  body: string;
  sources?: SourceLink[];
};

export function PostCard({ topic, body, sources = [] }: Props) {
  const [copied, setCopied] = useState(false);

  const tagClass = topic === "AI" ? "tag tag--ai" : "tag tag--web3";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("clipboard write failed", err);
    }
  }

  return (
    <article className="card" aria-label={`${topic} post`}>
      <header className="card__head">
        <span className={tagClass}>{topic}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={copied ? "copy-btn copy-btn--success" : "copy-btn"}
          aria-live="polite"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </header>

      <p className="post-body">{body}</p>

      {sources.length > 0 && (
        <details className="sources">
          <summary>Sources ({sources.length})</summary>
          <ul>
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.title}
                </a>
                <span> — {s.source}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

import { useState } from "react";
import type { SourceLink } from "../lib/supabase";

/** Max length of encoded `text` query; above this, open composer without prefill (user pastes from Copy). */
const LINKEDIN_TEXT_PARAM_MAX = 2000;

const LINKEDIN_COMPOSER_BASE =
  "https://www.linkedin.com/feed/?shareActive=true";

function linkedInComposerHrefAndTitle(body: string): { href: string; title: string } {
  const encoded = encodeURIComponent(body);
  if (encoded.length <= LINKEDIN_TEXT_PARAM_MAX) {
    return {
      href: `${LINKEDIN_COMPOSER_BASE}&text=${encoded}`,
      title:
        "Opens LinkedIn with this text in the composer. Review, edit, then post."
    };
  }
  return {
    href: LINKEDIN_COMPOSER_BASE,
    title:
      "Opens LinkedIn composer. Copy the post first, then paste here—draft is too long to prefill via link."
  };
}

type Props = {
  topic: "AI" | "Web3";
  body: string;
  sources?: SourceLink[];
};

export function PostCard({ topic, body, sources = [] }: Props) {
  const [copied, setCopied] = useState(false);

  const tagClass = topic === "AI" ? "tag tag--ai" : "tag tag--web3";
  const { href: linkedInHref, title: linkedInTitle } =
    linkedInComposerHrefAndTitle(body);

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
        <div className="card__actions">
          <button
            type="button"
            onClick={handleCopy}
            className={copied ? "copy-btn copy-btn--success" : "copy-btn"}
            aria-live="polite"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={linkedInHref}
            target="_blank"
            rel="noopener noreferrer"
            className="copy-btn copy-btn--linkedin"
            title={linkedInTitle}
          >
            Open LinkedIn
          </a>
        </div>
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

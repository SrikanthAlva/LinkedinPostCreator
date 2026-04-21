import type { PostRow } from "../lib/supabase";
import { PostCard } from "./PostCard";

type Props = {
  rows: PostRow[];
};

function formatDate(d: string) {
  const date = new Date(`${d}T00:00:00Z`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function Archive({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <section className="archive" aria-labelledby="archive-title">
      <h2 className="section-title" id="archive-title">
        Past weeks
      </h2>
      <ul className="archive__list">
        {rows.map((row) => (
          <li key={row.id}>
            <details className="archive__item">
              <summary>
                <span className="archive__date">{formatDate(row.post_date)}</span>
                <span className="archive__chevron" aria-hidden>
                  ›
                </span>
              </summary>
              <div className="archive__body">
                <PostCard topic="AI" body={row.ai_post} sources={row.ai_sources} />
                <PostCard
                  topic="Web3"
                  body={row.web3_post}
                  sources={row.web3_sources}
                />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

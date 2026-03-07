import { Link } from "react-router-dom";

import type { NewsItem } from "../../types/api";

interface NewsFeedPanelProps {
  categoryLabel: string;
  news: NewsItem[];
}

export function NewsFeedPanel({ categoryLabel, news }: NewsFeedPanelProps) {
  return (
    <section className="content-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">관련 뉴스</p>
          <h3>{categoryLabel} 뉴스 플로우</h3>
        </div>
      </div>
      <div className="stack">
        {news.map((item) => (
          <article key={item.id} className="news-card">
            <div className="list-item-body">
              <div className="news-topline">
                <span className="badge">{item.analysis_status}</span>
                <span className="muted">{item.source}</span>
              </div>
              <strong className="item-title">{item.title}</strong>
              <p className="muted">{item.summary}</p>
            </div>
            <Link className="text-link" to={`/news/${item.id}`}>
              상세 보기
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

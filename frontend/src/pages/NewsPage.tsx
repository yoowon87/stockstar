import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { analyzeNewsItem, getNewsList } from "../services/api";
import type { NewsItem } from "../types/api";

export function NewsPage() {
  const { newsId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    getNewsList()
      .then((response) => {
        setItems(response);
        setSelectedId(
          response.find((item) => item.id === newsId)?.id ?? response[0]?.id ?? null,
        );
      })
      .catch(console.error);
  }, [newsId]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  async function handleAnalyze() {
    if (!selected) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const updated = await analyzeNewsItem(selected.id);
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!selected) {
    return <div className="content-card">뉴스를 불러오는 중입니다...</div>;
  }

  return (
    <div className="news-page-shell">
      <section className="content-card news-queue-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">News Queue</p>
            <h3>카테고리별 뉴스 탐색</h3>
          </div>
        </div>
        <div className="stack">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                item.id === selected.id
                  ? "news-list-item selected"
                  : "news-list-item"
              }
              onClick={() => {
                setSelectedId(item.id);
                navigate(`/news/${item.id}`);
              }}
            >
              <span className="badge">{item.analysis_status}</span>
              <strong>{item.title}</strong>
              <span className="muted">
                {item.source} · {new Date(item.published_at).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="content-card news-detail-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{selected.event_type}</p>
            <h2>{selected.title}</h2>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "분석 중..." : "이 뉴스 분석"}
          </button>
        </div>

        <p className="news-summary-copy">{selected.summary}</p>

        <div className="chip-row">
          {selected.countries.map((country) => (
            <span key={country} className="chip">
              {country}
            </span>
          ))}
          {selected.positive_industries.map((industry) => (
            <span key={industry} className="chip chip-positive">
              {industry}
            </span>
          ))}
          {selected.negative_industries.map((industry) => (
            <span key={industry} className="chip chip-risk">
              {industry}
            </span>
          ))}
        </div>

        <div className="news-detail-grid">
          <article className="detail-card">
            <h4>AI 해석</h4>
            <p>{selected.ai_summary}</p>
          </article>
          <article className="detail-card">
            <h4>반대 논리</h4>
            <ul className="flat-list">
              {selected.counter_arguments.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
          <article className="detail-card">
            <h4>관련 종목</h4>
            <div className="tag-row">
              {selected.related_symbols.map((symbol) => (
                <span key={symbol} className="mini-tag">
                  {symbol}
                </span>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

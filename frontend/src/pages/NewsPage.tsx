import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { NewsItem } from "../types/api";

export function NewsPage() {
  const { newsId } = useParams<{ newsId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!newsId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    fetch(`/api/news/${encodeURIComponent(newsId)}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((data) => {
        if (data) setItem(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [newsId]);

  return (
    <div
      className="p-6 max-w-3xl mx-auto"
      style={{
        color: "var(--text-primary)",
        fontFamily: "DM Sans",
        background: "var(--bg-deep)",
        minHeight: "100%",
      }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{
          fontFamily: "Outfit",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: 20,
        }}
      >
        ← 뒤로
      </button>
      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>불러오는 중…</div>
      ) : notFound || !item ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
          뉴스를 찾을 수 없습니다.
        </div>
      ) : (
        <>
          <div
            style={{
              fontFamily: "Outfit",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--gold)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {item.source} · {item.published_at}
          </div>
          <h1
            style={{
              fontFamily: "Outfit",
              fontWeight: 700,
              fontSize: 24,
              lineHeight: 1.3,
              marginBottom: 16,
            }}
          >
            {item.title}
          </h1>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>
            {item.summary}
          </div>
          {item.body && (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                marginTop: 20,
                whiteSpace: "pre-wrap",
              }}
            >
              {item.body}
            </div>
          )}
          {item.ai_summary && (
            <div
              style={{
                marginTop: 24,
                padding: 14,
                borderRadius: 10,
                background: "rgba(212, 165, 116, 0.06)",
                border: "1px solid rgba(212, 165, 116, 0.2)",
                color: "var(--gold-bright)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              🤖 {item.ai_summary}
            </div>
          )}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 20,
                fontFamily: "Outfit",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--blue)",
              }}
            >
              원문 보기 →
            </a>
          )}
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "./_shared";
import { StockChartModal } from "../components/StockChartModal";
import { getThemeByCode, type ThemeDetail } from "../services/themeApi";

export function ThemeDetailPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ThemeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStock, setSelectedStock] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    getThemeByCode(code)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="p-6" style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>
        불러오는 중…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-6" style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 13 }}>
        {error || "테마를 찾을 수 없습니다."}
      </div>
    );
  }

  const t = data.theme;
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow={`🎯 ${t.code} · ${t.category_name}`}
        title={t.name}
        subtitle={t.description ?? `${t.stock_count}종목 매핑됨 · 종목 클릭 시 일봉 차트`}
        right={
          <button onClick={() => navigate(-1)} style={backBtn}>
            ← 뒤로
          </button>
        }
      />
      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-3xl mx-auto w-full space-y-4">
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "rgba(18, 20, 28, 0.6)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 8 }}>
            매핑 종목 ({data.stocks.length})
          </div>
          <div className="space-y-1">
            {data.stocks.map((s) => (
              <button
                key={s.stock_code}
                onClick={() => setSelectedStock({ code: s.stock_code, name: s.stock_name })}
                className="w-full flex items-center gap-3 flex-wrap"
                style={{
                  padding: "8px 6px",
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "transparent",
                  border: "none",
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--border-subtle)",
                  borderBottomWidth: 1,
                  cursor: "pointer",
                  textAlign: "left" as const,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212, 165, 116, 0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {s.is_leader && <span style={{ color: "var(--gold-bright)" }}>★</span>}
                <span style={{ fontFamily: "DM Sans", fontWeight: s.is_leader ? 700 : 500, color: "var(--text-primary)" }}>
                  {s.stock_name}
                </span>
                <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "var(--text-muted)" }}>{s.stock_code}</span>
                <span
                  style={{
                    fontFamily: "Outfit",
                    fontSize: 9,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-muted)",
                  }}
                >
                  weight {s.weight}
                </span>
                {s.note && (
                  <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "var(--down)" }}>⚠️ {s.note}</span>
                )}
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "Outfit",
                    fontSize: 10,
                    color: "var(--blue)",
                  }}
                >
                  📈 차트
                </span>
              </button>
            ))}
          </div>
        </div>

        {t.keywords.length > 0 && (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "rgba(212, 165, 116, 0.04)",
              border: "1px solid rgba(212, 165, 116, 0.2)",
            }}
          >
            <div style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 6 }}>
              테마 키워드
            </div>
            <div className="flex flex-wrap gap-2">
              {t.keywords.map((kw) => (
                <span
                  key={kw}
                  style={{
                    fontFamily: "Outfit",
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(212, 165, 116, 0.1)",
                    border: "1px solid rgba(212, 165, 116, 0.3)",
                    color: "var(--gold-bright)",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedStock && (
        <StockChartModal
          stockCode={selectedStock.code}
          stockName={selectedStock.name}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 11,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-default)",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

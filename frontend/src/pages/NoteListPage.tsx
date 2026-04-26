import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./_shared";
import {
  getTags,
  listNotes,
  pctChange,
  verificationBadge,
  type Note,
  type NoteType,
  type VerificationStatus,
} from "../services/notesApi";

const TYPE_OPTIONS: Array<{ code: NoteType | ""; label: string }> = [
  { code: "", label: "전체 종류" },
  { code: "news_analysis", label: "뉴스 분석" },
  { code: "memo", label: "메모" },
  { code: "observation", label: "관찰" },
];

const VERIF_OPTIONS: Array<{ code: VerificationStatus | ""; label: string }> = [
  { code: "", label: "전체 상태" },
  { code: "pending", label: "대기" },
  { code: "verified_hit", label: "적중" },
  { code: "verified_miss", label: "실패" },
  { code: "expired", label: "만료" },
];

export function NoteListPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [type, setType] = useState<NoteType | "">("");
  const [verification, setVerification] = useState<VerificationStatus | "">("");
  const [stockCode, setStockCode] = useState("");

  async function reload() {
    setLoading(true);
    try {
      const [n, t] = await Promise.all([
        listNotes({
          q: q || undefined,
          tag: tag || undefined,
          stock_code: stockCode || undefined,
          type: type || undefined,
          verification: verification || undefined,
          limit: 50,
        }),
        getTags(),
      ]);
      setNotes(n.notes);
      setTags(t.tags);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, [tag, type, verification]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="📚 NEWS VAULT"
        title="분석·메모·관찰 저장소"
        subtitle="검색 가능한 영구 노트 + 종목 역인덱스 + 자동 가격 추적"
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/news")} style={btnSecondary}>← News</button>
            <button onClick={() => navigate("/notes/new")} style={btnPrimary}>+ 새 노트</button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-4xl mx-auto w-full space-y-3">
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(18, 20, 28, 0.6)",
            border: "1px solid var(--border-default)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            placeholder="🔎 제목 / 본문 / 출처 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            style={inputStyle}
          />
          <input
            placeholder="종목코드"
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            style={{ ...inputStyle, width: 110 }}
          />
          <select value={type} onChange={(e) => setType(e.target.value as any)} style={selectStyle}>
            {TYPE_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
          <select value={verification} onChange={(e) => setVerification(e.target.value as any)} style={selectStyle}>
            {VERIF_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
          <button onClick={reload} style={btnSecondary}>🔍 적용</button>
        </div>

        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              onClick={() => setTag("")}
              style={{
                ...chipStyle,
                background: tag === "" ? "rgba(212, 165, 116, 0.15)" : "transparent",
                color: tag === "" ? "var(--gold-bright)" : "var(--text-muted)",
              }}
            >
              전체 태그
            </button>
            {tags.map((t) => (
              <button
                key={t.tag}
                onClick={() => setTag(t.tag === tag ? "" : t.tag)}
                style={{
                  ...chipStyle,
                  background: tag === t.tag ? "rgba(212, 165, 116, 0.15)" : "transparent",
                  color: tag === t.tag ? "var(--gold-bright)" : "var(--text-secondary)",
                }}
              >
                #{t.tag} <span style={{ fontSize: 9, color: "var(--text-muted)" }}>({t.count})</span>
              </button>
            ))}
          </div>
        )}

        {loading && <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>불러오는 중…</div>}

        {!loading && notes.length === 0 && (
          <div
            style={{
              padding: 32,
              borderRadius: 12,
              border: "1px dashed var(--border-default)",
              background: "rgba(212, 165, 116, 0.03)",
              textAlign: "center" as const,
              fontFamily: "DM Sans",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.7,
            }}
          >
            저장된 노트가 없습니다. 우상단 <b style={{ color: "var(--gold-bright)" }}>+ 새 노트</b>에서 첫 메모를 작성하세요.
          </div>
        )}

        {notes.map((n) => <NoteCard key={n.id} note={n} onClick={() => navigate(`/notes/${n.id}`)} />)}
      </div>
    </div>
  );
}

function NoteCard({ note, onClick }: { note: Note; onClick: () => void }) {
  const v = verificationBadge(note.verification_status);
  const topStocks = note.stocks.slice(0, 3);
  const typeLabel: Record<NoteType, string> = {
    news_analysis: "뉴스",
    memo: "메모",
    observation: "관찰",
  };

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 12,
        background: "rgba(18, 20, 28, 0.6)",
        border: "1px solid var(--border-default)",
        textAlign: "left" as const,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column" as const,
        gap: 6,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          style={{
            fontFamily: "Outfit",
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            background: "rgba(212, 165, 116, 0.08)",
            color: "var(--gold)",
            letterSpacing: "0.05em",
          }}
        >
          {typeLabel[note.type]}
        </span>
        <span
          style={{
            fontFamily: "Outfit",
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            background: v.bg,
            color: v.color,
            border: `1px solid ${v.color}`,
            letterSpacing: "0.05em",
          }}
        >
          {v.label}
        </span>
        <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
          📅 {note.created_at?.slice(0, 10)}
        </span>
      </div>

      <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
        {note.title}
      </div>

      {note.tags.length > 0 && (
        <div style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)" }}>
          {note.tags.map((t) => `#${t}`).join(" ")}
        </div>
      )}

      {topStocks.length > 0 && (
        <div className="flex gap-2 flex-wrap" style={{ fontFamily: "DM Sans", fontSize: 12 }}>
          {topStocks.map((s) => {
            const pct = pctChange(s.price_at_note, s.price_after_7d);
            return (
              <span key={s.stock_code} style={{ color: "var(--text-secondary)" }}>
                {s.stock_name}
                {s.confidence && (
                  <span style={{ color: "var(--gold-bright)", marginLeft: 3 }}>
                    {"⭐".repeat(s.confidence)}
                  </span>
                )}
                {pct != null && (
                  <span style={{ color: pct >= 0 ? "var(--up)" : "var(--down)", marginLeft: 3 }}>
                    {pct >= 0 ? "+" : ""}
                    {pct.toFixed(1)}%(7d)
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {note.content && (
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
          }}
        >
          {note.content}
        </div>
      )}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 180,
  fontFamily: "DM Sans",
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 8,
  background: "rgba(8, 9, 13, 0.6)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-primary)",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  background: "rgba(8, 9, 13, 0.6)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-primary)",
};

const chipStyle: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid var(--border-subtle)",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 14px",
  borderRadius: 8,
  background: "linear-gradient(135deg, var(--gold), var(--gold-bright))",
  color: "var(--bg-deep)",
  border: "none",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
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

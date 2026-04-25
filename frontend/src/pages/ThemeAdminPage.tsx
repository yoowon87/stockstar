import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./_shared";
import {
  addThemeStock,
  listAdminThemes,
  removeThemeStock,
  type AdminTheme,
} from "../services/themeApi";

const CATEGORIES = ["전체", "A", "B", "C", "D", "E"];

export function ThemeAdminPage() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<AdminTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("전체");
  const [openCode, setOpenCode] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    setError("");
    listAdminThemes()
      .then((r) => setThemes(r.themes))
      .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  const visible = useMemo(
    () => (filter === "전체" ? themes : themes.filter((t) => t.category === filter)),
    [themes, filter],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="⚙️ THEME ADMIN"
        title="테마 / 종목 매핑 관리"
        subtitle="Owner 전용 — 변경은 즉시 cron 결과에 반영됩니다"
        right={
          <button onClick={() => navigate("/theme-radar")} style={btn}>
            ← Radar
          </button>
        }
      />
      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-5xl mx-auto w-full space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              style={{
                fontFamily: "Outfit",
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 999,
                background: filter === c ? "rgba(212, 165, 116, 0.15)" : "rgba(255,255,255,0.02)",
                border: filter === c ? "1px solid rgba(212, 165, 116, 0.5)" : "1px solid var(--border-subtle)",
                color: filter === c ? "var(--gold-bright)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {loading && <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>불러오는 중…</div>}
        {error && <div style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12 }}>{error}</div>}

        {visible.map((t) => (
          <ThemeRow
            key={t.code}
            theme={t}
            isOpen={openCode === t.code}
            onToggle={() => setOpenCode((x) => (x === t.code ? null : t.code))}
            onChanged={reload}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeRow({
  theme,
  isOpen,
  onToggle,
  onChanged,
}: {
  theme: AdminTheme;
  isOpen: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        background: "rgba(18, 20, 28, 0.6)",
        border: "1px solid var(--border-default)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{ fontFamily: "Outfit", fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(212, 165, 116, 0.1)", color: "var(--gold)" }}>
            {theme.category}
          </span>
          <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: "var(--gold-bright)" }}>{theme.code}</span>
          <span style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{theme.name}</span>
          <span style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)" }}>{theme.stock_count}종목</span>
          <span
            style={{
              fontFamily: "Outfit",
              fontSize: 9,
              padding: "2px 6px",
              borderRadius: 4,
              background: theme.is_active ? "rgba(56, 217, 169, 0.1)" : "rgba(244, 77, 93, 0.1)",
              color: theme.is_active ? "var(--up)" : "var(--down)",
            }}
          >
            {theme.is_active ? "활성" : "비활성"}
          </span>
        </div>
        <span style={{ fontFamily: "Outfit", fontSize: 12, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border-default)" }}>
          <StockEditor themeCode={theme.code} stocks={theme.stocks} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

function StockEditor({
  themeCode,
  stocks,
  onChanged,
}: {
  themeCode: string;
  stocks: AdminTheme["stocks"];
  onChanged: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isLeader, setIsLeader] = useState(false);
  const [weight, setWeight] = useState(2);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!code.trim() || !name.trim()) {
      setError("코드와 이름은 필수입니다.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addThemeStock(themeCode, {
        stock_code: code.trim(),
        stock_name: name.trim(),
        is_leader: isLeader,
        weight,
        note: note || undefined,
      });
      setCode(""); setName(""); setIsLeader(false); setWeight(2); setNote("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(stockCode: string) {
    try {
      await removeThemeStock(themeCode, stockCode);
      onChanged();
    } catch {}
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-1">
        {stocks.map((s) => (
          <div
            key={s.stock_code}
            className="flex items-center gap-2 flex-wrap"
            style={{ padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}
          >
            {s.is_leader && <span style={{ color: "var(--gold-bright)" }}>★</span>}
            <span style={{ fontFamily: "DM Sans", fontWeight: s.is_leader ? 700 : 500, color: "var(--text-primary)", minWidth: 120 }}>
              {s.stock_name}
            </span>
            <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "var(--text-muted)" }}>{s.stock_code}</span>
            <span style={{ fontFamily: "Outfit", fontSize: 9, color: "var(--text-muted)" }}>w{s.weight}</span>
            {s.note && <span style={{ fontFamily: "DM Sans", fontSize: 10, color: "var(--down)" }}>{s.note}</span>}
            <button
              onClick={() => handleRemove(s.stock_code)}
              style={{
                marginLeft: "auto",
                fontFamily: "Outfit",
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 5,
                background: "rgba(244, 77, 93, 0.06)",
                border: "1px solid rgba(244, 77, 93, 0.25)",
                color: "var(--down)",
                cursor: "pointer",
              }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: 12,
          borderRadius: 8,
          background: "rgba(212, 165, 116, 0.04)",
          border: "1px solid rgba(212, 165, 116, 0.2)",
        }}
      >
        <div style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 6 }}>
          + 종목 추가
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="종목코드 (예: 000660)" style={inputStyle} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="종목명" style={inputStyle} />
          <label style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={isLeader} onChange={(e) => setIsLeader(e.target.checked)} />
            대장주
          </label>
          <select value={weight} onChange={(e) => setWeight(Number(e.target.value))} style={inputStyle}>
            <option value={1}>1 주력</option>
            <option value={2}>2 핵심</option>
            <option value={3}>3 관전</option>
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모(선택)" style={inputStyle} />
          <button onClick={handleAdd} disabled={saving} style={{ ...btn, color: "var(--bg-deep)", background: "linear-gradient(135deg, var(--gold), var(--gold-bright))", border: "none", fontWeight: 700 }}>
            {saving ? "…" : "추가"}
          </button>
        </div>
        {error && <div style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 11, marginTop: 6 }}>{error}</div>}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 11,
  fontWeight: 600,
  padding: "5px 12px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-default)",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "DM Sans",
  fontSize: 12,
  padding: "5px 10px",
  borderRadius: 6,
  background: "rgba(8, 9, 13, 0.6)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-primary)",
  outline: "none",
  minWidth: 100,
};

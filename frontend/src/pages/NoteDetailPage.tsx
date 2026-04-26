import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "./_shared";
import {
  deleteNote,
  getNote,
  pctChange,
  updateNote,
  verificationBadge,
  type Note,
} from "../services/notesApi";

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingComment, setEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function reload() {
    if (!id) return;
    setLoading(true);
    getNote(id)
      .then((n) => {
        setNote(n);
        setCommentDraft(n.content);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, [id]);

  async function saveComment() {
    if (!note) return;
    setSaving(true);
    try {
      const updated = await updateNote(note.id, { content: commentDraft });
      setNote(updated);
      setEditingComment(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!note) return;
    try {
      await deleteNote(note.id);
      navigate("/notes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  if (loading) {
    return (
      <div className="p-6" style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>
        불러오는 중…
      </div>
    );
  }
  if (error || !note) {
    return (
      <div className="p-6" style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 13 }}>
        {error || "노트를 찾을 수 없습니다."}
      </div>
    );
  }

  const v = verificationBadge(note.verification_status);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow={`📝 ${note.created_at?.slice(0, 10)}`}
        title={note.title}
        subtitle={note.tags.length ? note.tags.map((t) => `#${t}`).join(" ") : undefined}
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/notes")} style={btnSec}>← 목록</button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{ ...btnSec, color: "var(--down)" }}>삭제</button>
            ) : (
              <>
                <button onClick={handleDelete} style={{ ...btnSec, background: "var(--down)", color: "white" }}>확인</button>
                <button onClick={() => setConfirmDelete(false)} style={btnSec}>취소</button>
              </>
            )}
          </div>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-3xl mx-auto w-full space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge text={typeLabel(note.type)} color="var(--gold)" bg="rgba(212, 165, 116, 0.08)" />
          <Badge text={v.label} color={v.color} bg={v.bg} />
          {note.action_window_until && (
            <Badge
              text={`만료 ${new Date(note.action_window_until).toLocaleDateString("ko-KR")}`}
              color="var(--text-muted)"
              bg="rgba(255,255,255,0.04)"
            />
          )}
        </div>

        {note.source_url && (
          <Card title="📎 출처">
            <a
              href={note.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--blue)", wordBreak: "break-all" }}
            >
              {note.source_name && <b style={{ color: "var(--gold-bright)", marginRight: 6 }}>{note.source_name}</b>}
              {note.source_url} ↗
            </a>
            {note.source_excerpt && (
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 8,
                  background: "rgba(8, 9, 13, 0.6)",
                  fontFamily: "DM Sans",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  maxHeight: 240,
                  overflow: "auto",
                }}
              >
                {note.source_excerpt}
              </div>
            )}
          </Card>
        )}

        <Card
          title="💭 내 코멘트"
          action={
            editingComment
              ? { label: saving ? "저장 중…" : "저장", onClick: saveComment }
              : { label: "수정", onClick: () => setEditingComment(true) }
          }
        >
          {editingComment ? (
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={6}
              style={textarea}
            />
          ) : (
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: 13,
                color: "var(--text-primary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                minHeight: 24,
              }}
            >
              {note.content || <span style={{ color: "var(--text-muted)" }}>(코멘트 없음)</span>}
            </div>
          )}
        </Card>

        {note.stocks.length > 0 && (
          <Card title={`📈 관련 종목 (${note.stocks.length})`}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "DM Sans", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 10, letterSpacing: "0.08em" }}>
                    <Th>종목</Th><Th>역할</Th><Th>확신</Th><Th align="right">진입가</Th><Th align="right">+1d</Th><Th align="right">+7d</Th><Th align="right">+30d</Th>
                  </tr>
                </thead>
                <tbody>
                  {note.stocks.map((s) => {
                    const p1 = pctChange(s.price_at_note, s.price_after_1d);
                    const p7 = pctChange(s.price_at_note, s.price_after_7d);
                    const p30 = pctChange(s.price_at_note, s.price_after_30d);
                    return (
                      <tr key={s.stock_code}>
                        <Td>
                          <b style={{ color: "var(--text-primary)" }}>{s.stock_name}</b>
                          <span style={{ marginLeft: 6, color: "var(--text-muted)", fontSize: 10 }}>{s.stock_code}</span>
                          {s.rationale && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.rationale}</div>
                          )}
                        </Td>
                        <Td>{roleLabel(s.role)}</Td>
                        <Td>{s.confidence ? "⭐".repeat(s.confidence) : "—"}</Td>
                        <TdR>{s.price_at_note?.toLocaleString("ko-KR") || "—"}</TdR>
                        <TdR>{pctCell(p1)}</TdR>
                        <TdR>{pctCell(p7)}</TdR>
                        <TdR>{pctCell(p30)}</TdR>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>
              가격은 매일 16:35 KST cron이 자동 갱신
            </div>
          </Card>
        )}

        {note.analysis_result && (
          <Card title="🤖 Claude 분석 결과">
            <pre
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                color: "var(--text-muted)",
                background: "rgba(8, 9, 13, 0.6)",
                padding: 10,
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 360,
              }}
            >
              {JSON.stringify(note.analysis_result, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, borderRadius: 12, background: "rgba(18, 20, 28, 0.6)", border: "1px solid var(--border-default)" }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 12, color: "var(--text-primary)" }}>{title}</span>
        {action && (
          <button onClick={action.onClick} style={{ fontFamily: "Outfit", fontSize: 11, fontWeight: 600, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{ fontFamily: "Outfit", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: bg, color, border: `1px solid ${color}`, letterSpacing: "0.05em" }}>
      {text}
    </span>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th style={{ textAlign: align, padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "8px", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>{children}</td>;
}
function TdR({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "8px", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>{children}</td>;
}

function pctCell(p: number | null) {
  if (p == null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return (
    <span style={{ color: p >= 0 ? "var(--up)" : "var(--down)", fontWeight: 600 }}>
      {p >= 0 ? "+" : ""}
      {p.toFixed(2)}%
    </span>
  );
}

function roleLabel(role: string) {
  if (role === "beneficiary") return <span style={{ color: "var(--up)" }}>수혜</span>;
  if (role === "victim") return <span style={{ color: "var(--down)" }}>피해</span>;
  return <span style={{ color: "var(--text-secondary)" }}>언급</span>;
}

function typeLabel(t: string) {
  if (t === "news_analysis") return "뉴스 분석";
  if (t === "memo") return "메모";
  return "관찰";
}

const textarea: React.CSSProperties = {
  fontFamily: "DM Sans",
  fontSize: 13,
  padding: "10px 12px",
  borderRadius: 8,
  background: "rgba(8, 9, 13, 0.6)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-primary)",
  outline: "none",
  resize: "vertical" as const,
  width: "100%",
};

const btnSec: React.CSSProperties = {
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

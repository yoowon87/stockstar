interface Props {
  label: string;
  url: string;
  hint?: string;
  emoji?: string;
  size?: "sm" | "md";
}

export function NewsButton({ label, url, hint, emoji, size = "md" }: Props) {
  const fontSize = size === "sm" ? 11 : 12;
  const padY = size === "sm" ? 6 : 8;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: `${padY}px 12px`,
        borderRadius: 999,
        background: "rgba(212, 165, 116, 0.06)",
        border: "1px solid rgba(212, 165, 116, 0.25)",
        color: "var(--gold-bright)",
        fontFamily: "Outfit",
        fontSize,
        fontWeight: 600,
        textDecoration: "none",
        transition: "background 0.15s, border-color 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(212, 165, 116, 0.14)";
        e.currentTarget.style.borderColor = "rgba(212, 165, 116, 0.55)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(212, 165, 116, 0.06)";
        e.currentTarget.style.borderColor = "rgba(212, 165, 116, 0.25)";
      }}
      title={hint}
    >
      {emoji && <span>{emoji}</span>}
      <span>{label}</span>
      {hint && size === "md" && (
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>{hint}</span>
      )}
      <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 2 }}>↗</span>
    </a>
  );
}

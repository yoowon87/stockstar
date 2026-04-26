import { NEWS_SECTIONS } from "./data/news-sources";
import { BIGKINDS_KEYWORDS, bigkindsSearchUrl } from "./data/keywords";
import { NewsButton } from "./NewsButton";
import { NewsSection } from "./NewsSection";

interface Props {
  /** Compact mode hides subtitles + uses smaller chips (for sidebars/home widget). */
  compact?: boolean;
}

export function NewsHub({ compact = false }: Props) {
  const size = compact ? "sm" : "md";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {NEWS_SECTIONS.map((section) => (
        <NewsSection
          key={section.id}
          title={section.title}
          subtitle={compact ? undefined : section.subtitle}
        >
          {section.sources.map((s) => (
            <NewsButton
              key={s.url}
              label={s.label}
              url={s.url}
              hint={compact ? undefined : s.hint}
              size={size}
            />
          ))}
        </NewsSection>
      ))}

      <NewsSection
        title="키워드 원클릭 검색"
        subtitle={compact ? undefined : "BIGKinds로 즉시 점프"}
      >
        {BIGKINDS_KEYWORDS.map((k) => (
          <NewsButton
            key={k.keyword}
            label={k.keyword}
            url={bigkindsSearchUrl(k.keyword)}
            emoji={k.emoji}
            size={size}
          />
        ))}
      </NewsSection>
    </div>
  );
}

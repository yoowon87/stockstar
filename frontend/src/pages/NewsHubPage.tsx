import { PageHeader } from "./_shared";
import { NewsHub } from "../components/news-hub/NewsHub";

export function NewsHubPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="📰 NEWS HUB"
        title="외부 뉴스 · 캘린더 · 키워드 점프"
        subtitle="아침/저녁 한 번씩 쓱 훑고 점프 — 클릭은 모두 새 탭"
      />
      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-4xl mx-auto w-full">
        <NewsHub />
      </div>
    </div>
  );
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { initialDashboardData, initialNewsItems, syncNewsPool } from "../data/mockContentData";
import { db } from "../firebase";
import type { DashboardData, NewsItem, StockDetail, SyncNewsResponse } from "../types/api";

const dashboardRef = doc(db, "app_state", "dashboard");
const newsCollectionRef = collection(db, "news");

let seedPromise: Promise<void> | null = null;

async function ensureSeeded() {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    const [dashboardSnapshot, newsSnapshot] = await Promise.all([
      getDoc(dashboardRef),
      getDocs(query(newsCollectionRef, limit(1))),
    ]);

    if (dashboardSnapshot.exists() && !newsSnapshot.empty) {
      return;
    }

    const batch = writeBatch(db);

    if (!dashboardSnapshot.exists()) {
      batch.set(dashboardRef, initialDashboardData);
    }

    if (newsSnapshot.empty) {
      initialNewsItems.forEach((item) => {
        batch.set(doc(newsCollectionRef, item.id), item);
      });
    }

    await batch.commit();
  })().finally(() => {
    seedPromise = null;
  });

  return seedPromise;
}

async function readNews() {
  await ensureSeeded();
  const snapshot = await getDocs(query(newsCollectionRef, orderBy("published_at", "desc")));
  return snapshot.docs.map((item) => item.data() as NewsItem);
}

function aggregateTopTerms(
  items: NewsItem[],
  key: "positive_industries" | "negative_industries",
) {
  const counter = new Map<string, number>();

  items.forEach((item) => {
    item[key].forEach((value) => {
      counter.set(value, (counter.get(value) ?? 0) + 1);
    });
  });

  return [...counter.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label);
}

function createHeadlineNews(items: NewsItem[]) {
  return items.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.title,
    importance: item.importance,
    published_at: item.published_at,
  }));
}

export async function getDashboard() {
  await ensureSeeded();
  const snapshot = await getDoc(dashboardRef);
  return (snapshot.data() as DashboardData | undefined) ?? initialDashboardData;
}

export function getNewsList() {
  return readNews();
}

export async function getStockDetail(_: string) {
  return null as unknown as StockDetail;
}

export async function generateDashboardBriefing() {
  await ensureSeeded();

  const [dashboard, newsItems] = await Promise.all([getDashboard(), readNews()]);
  const positive = aggregateTopTerms(newsItems, "positive_industries");
  const negative = aggregateTopTerms(newsItems, "negative_industries");

  const updated: DashboardData = {
    ...dashboard,
    date: new Date().toISOString().slice(0, 10),
    last_analysis_at: new Date().toISOString(),
    briefing_summary: `상위 테마는 ${positive[0] ?? "반도체"}입니다. 리스크 구간은 ${
      negative[0] ?? "거시 변수"
    }이며, 최근 기사 ${newsItems.length}건을 기준으로 브리핑을 갱신했습니다.`,
    headline_news: createHeadlineNews(newsItems),
    insights: {
      ...dashboard.insights,
      positive_industries: positive.slice(0, 3),
      risk_industries: negative.slice(0, 3),
    },
  };

  await setDoc(dashboardRef, updated);
  return updated;
}

export async function analyzeNewsItem(newsId: string) {
  await ensureSeeded();

  const newsRef = doc(newsCollectionRef, newsId);
  const snapshot = await getDoc(newsRef);
  const current = snapshot.data() as NewsItem | undefined;

  if (!current) {
    throw new Error(`News item not found: ${newsId}`);
  }

  const updated: NewsItem = {
    ...current,
    analysis_status: "분석 완료",
    ai_summary: `${current.ai_summary} Firestore 기준 최신 상태로 다시 저장했습니다.`,
  };

  await setDoc(newsRef, updated);
  return updated;
}

export async function analyzeStockItem(_: string) {
  return null as unknown as StockDetail;
}

export async function syncNewsFeed() {
  await ensureSeeded();

  const currentNews = await readNews();
  const existingIds = new Set(currentNews.map((item) => item.id));
  const inserts = syncNewsPool.filter((item) => !existingIds.has(item.id));

  if (inserts.length > 0) {
    const batch = writeBatch(db);

    inserts.forEach((item) => {
      batch.set(doc(newsCollectionRef, item.id), item);
    });

    await batch.commit();
  }

  const updatedNews = [...inserts, ...currentNews].sort((left, right) =>
    right.published_at.localeCompare(left.published_at),
  );

  await updateDoc(dashboardRef, {
    headline_news: createHeadlineNews(updatedNews),
  });

  return {
    inserted_count: inserts.length,
    total_count: updatedNews.length,
  } satisfies SyncNewsResponse;
}

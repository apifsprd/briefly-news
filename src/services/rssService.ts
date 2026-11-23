import {
  ArticleItem,
  FeedApiResponse,
  RSSCategory,
  RSSDirectory,
  RSSSource,
} from '../types/rss';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function fetchRSSDirectory(): Promise<{
  categories: RSSCategory[];
  sources: RSSSource[];
}> {
  const response = await fetch('/rss.json');
  if (!response.ok) {
    throw new Error('Failed to load RSS directory configuration.');
  }
  const data = (await response.json()) as RSSDirectory;
  const categories = data.categories || [];
  const sources: RSSSource[] = [];

  for (const cat of categories) {
    for (const feed of cat.feeds) {
      sources.push({
        id: `${cat.id}-${slugify(feed.name)}`,
        name: feed.name,
        categoryId: cat.id,
        categoryName: cat.name,
        url: feed.url,
      });
    }
  }

  return { categories, sources };
}

export async function fetchSourceArticles(
  source: RSSSource,
  forceRefresh = false
): Promise<ArticleItem[]> {
  const params = new URLSearchParams({
    url: source.url,
    sourceId: source.id,
    sourceName: source.name,
    categoryId: source.categoryId,
    categoryName: source.categoryName,
  });

  if (forceRefresh) {
    params.set('refresh', '1');
  }

  const response = await fetch(`/api/feed?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${source.name}`);
  }

  const payload = (await response.json()) as FeedApiResponse;
  if (payload.status !== 'ok' || !payload.items) {
    throw new Error(payload.message || `Unable to parse ${source.name}`);
  }

  return payload.items;
}

export function getCuratedAllSources(
  categories: RSSCategory[],
  allSources: RSSSource[],
  perCategoryLimit = 2
): RSSSource[] {
  const selected: RSSSource[] = [];
  for (const category of categories) {
    const matching = allSources
      .filter((src) => src.categoryId === category.id)
      .slice(0, perCategoryLimit);
    selected.push(...matching);
  }
  return selected;
}

export async function fetchBatchSources(
  sources: RSSSource[],
  forceRefresh = false
): Promise<{
  articles: ArticleItem[];
  failedSources: string[];
}> {
  const results = await Promise.allSettled(
    sources.map((source) => fetchSourceArticles(source, forceRefresh))
  );

  const articles: ArticleItem[] = [];
  const failedSources: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    } else {
      failedSources.push(sources[index].name);
    }
  });

  // Deduplicate by article link and sort newest first
  const seenLinks = new Set<string>();
  const uniqueArticles = articles
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((article) => {
      const key = `${article.link}::${article.title}`;
      if (seenLinks.has(key)) return false;
      seenLinks.add(key);
      return true;
    });

  return { articles: uniqueArticles, failedSources };
}

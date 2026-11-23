export interface RSSFeedEntry {
  name: string;
  url: string;
}

export interface RSSCategory {
  id: string;
  name: string;
  feeds: RSSFeedEntry[];
}

export interface RSSDirectory {
  categories: RSSCategory[];
}

export interface RSSSource {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  url: string;
}

export interface ArticleItem {
  id: string;
  title: string;
  link: string;
  description: string;
  imageUrl?: string;
  pubDate: string;
  timestamp: number;
  sourceId: string;
  sourceName: string;
  categoryId: string;
  categoryName: string;
}

export interface FeedApiResponse {
  status: 'ok' | 'error';
  message?: string;
  items?: ArticleItem[];
}

export type ThemeMode = 'light' | 'dark';

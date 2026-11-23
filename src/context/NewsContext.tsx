import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArticleItem,
  RSSCategory,
  RSSSource,
  ThemeMode,
} from '../types/rss';
import {
  fetchBatchSources,
  fetchRSSDirectory,
  getCuratedAllSources,
} from '../services/rssService';
import { showMonochromeAlert, showMonochromeToast } from '../utils/alert';

interface NewsContextValue {
  categories: RSSCategory[];
  sources: RSSSource[];
  activeCategory: string;
  activeSource: string;
  searchQuery: string;
  articles: ArticleItem[];
  filteredArticles: ArticleItem[];
  availableSourcesInView: RSSSource[];
  loading: boolean;
  isRefreshing: boolean;
  selectedArticle: ArticleItem | null;
  theme: ThemeMode;
  setActiveCategory: (categoryId: string) => void;
  setActiveSource: (sourceId: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedArticle: (article: ArticleItem | null) => void;
  toggleTheme: () => void;
  refreshCurrentView: () => Promise<void>;
}

const NewsContext = createContext<NewsContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'briefly-theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return 'light';
}

export const NewsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [categories, setCategories] = useState<RSSCategory[]>([]);
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [activeCategory, setActiveCategoryState] = useState<string>('all');
  const [activeSource, setActiveSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [articlesByCategory, setArticlesByCategory] = useState<
    Record<string, ArticleItem[]>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(
    null
  );
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  const cacheRef = useRef<Record<string, ArticleItem[]>>({});

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Network offline alert per BRD/PRD
  useEffect(() => {
    const handleOffline = () => {
      showMonochromeAlert(
        'Connection Lost',
        'You appear to be offline. Cached headlines remain visible, and live updates will resume once reconnected.',
        'warning'
      );
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);

  const loadCategoryFeeds = useCallback(
    async (
      categoryId: string,
      loadedCategories: RSSCategory[],
      loadedSources: RSSSource[],
      options?: { forceRefresh?: boolean }
    ) => {
      const force = Boolean(options?.forceRefresh);

      if (!force && cacheRef.current[categoryId]) {
        setLoading(false);
        return;
      }

      if (force) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const targetSources =
          categoryId === 'all'
            ? getCuratedAllSources(loadedCategories, loadedSources, 3)
            : loadedSources.filter((src) => src.categoryId === categoryId);

        if (targetSources.length === 0) {
          cacheRef.current[categoryId] = [];
          setArticlesByCategory((prev) => ({ ...prev, [categoryId]: [] }));
          return;
        }

        const { articles, failedSources } = await fetchBatchSources(
          targetSources,
          force
        );

        cacheRef.current[categoryId] = articles;
        setArticlesByCategory((prev) => ({
          ...prev,
          [categoryId]: articles,
        }));

        if (articles.length === 0 && failedSources.length > 0) {
          showMonochromeAlert(
            'Unable to Load Feeds',
            'None of the publishers in this category responded in time. Please check your connection or try refreshing.',
            'error'
          );
        } else if (failedSources.length > 0) {
          const summary =
            failedSources.length === 1
              ? `${failedSources[0]} could not be reached`
              : `${failedSources.length} feeds did not respond`;
          showMonochromeToast(summary, 'warning');
        } else if (force) {
          showMonochromeToast('Headlines updated', 'success');
        }
      } catch {
        showMonochromeAlert(
          'Feed Error',
          'An unexpected error occurred while fetching RSS headlines.',
          'error'
        );
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // Initial load of rss.json and curated 'all' feed
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { categories: dirs, sources: flatSources } =
          await fetchRSSDirectory();
        if (!active) return;
        setCategories(dirs);
        setSources(flatSources);
        await loadCategoryFeeds('all', dirs, flatSources);
      } catch {
        if (!active) return;
        setLoading(false);
        showMonochromeAlert(
          'Configuration Error',
          'Unable to load the RSS feed directory.',
          'error'
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [loadCategoryFeeds]);

  const setActiveCategory = useCallback(
    (categoryId: string) => {
      setActiveCategoryState(categoryId);
      setActiveSource('all');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (categories.length > 0) {
        void loadCategoryFeeds(categoryId, categories, sources);
      }
    },
    [categories, sources, loadCategoryFeeds]
  );

  const refreshCurrentView = useCallback(async () => {
    if (categories.length === 0) return;
    await loadCategoryFeeds(activeCategory, categories, sources, {
      forceRefresh: true,
    });
  }, [activeCategory, categories, sources, loadCategoryFeeds]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const articles = useMemo(
    () => articlesByCategory[activeCategory] || [],
    [articlesByCategory, activeCategory]
  );

  const availableSourcesInView = useMemo(() => {
    if (activeCategory === 'all') {
      return getCuratedAllSources(categories, sources, 3);
    }
    return sources.filter((src) => src.categoryId === activeCategory);
  }, [activeCategory, categories, sources]);

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return articles.filter((item) => {
      if (activeSource !== 'all' && item.sourceId !== activeSource) {
        return false;
      }
      if (query && !item.title.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [articles, activeSource, searchQuery]);

  const value = useMemo<NewsContextValue>(
    () => ({
      categories,
      sources,
      activeCategory,
      activeSource,
      searchQuery,
      articles,
      filteredArticles,
      availableSourcesInView,
      loading,
      isRefreshing,
      selectedArticle,
      theme,
      setActiveCategory,
      setActiveSource,
      setSearchQuery,
      setSelectedArticle,
      toggleTheme,
      refreshCurrentView,
    }),
    [
      categories,
      sources,
      activeCategory,
      activeSource,
      searchQuery,
      articles,
      filteredArticles,
      availableSourcesInView,
      loading,
      isRefreshing,
      selectedArticle,
      theme,
      setActiveCategory,
      refreshCurrentView,
      toggleTheme,
    ]
  );

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
};

export function useNews(): NewsContextValue {
  const ctx = useContext(NewsContext);
  if (!ctx) {
    throw new Error('useNews must be used inside NewsProvider');
  }
  return ctx;
}

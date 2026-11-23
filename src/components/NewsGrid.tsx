import React, { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowDown,
  faArrowRight,
  faArrowUpRightFromSquare,
  faNewspaper,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { useNews } from '../context/NewsContext';
import { NewsCard } from './NewsCard';
import { ArticleImage } from './ArticleImage';
import { formatRelativeTime } from '../utils/date';

const PULL_THRESHOLD = 68;
const MAX_PULL_DISTANCE = 112;
const TOP_LATEST_LIMIT = 10;
const PER_CATEGORY_LIMIT = 5;

export const NewsGrid: React.FC = () => {
  const {
    categories,
    activeCategory,
    activeSource,
    searchQuery,
    filteredArticles,
    availableSourcesInView,
    loading,
    isRefreshing,
    selectedArticle,
    setActiveCategory,
    setSelectedArticle,
    setSearchQuery,
    setActiveSource,
    refreshCurrentView,
  } = useNews();

  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const isFrontPageMode =
    activeCategory === 'all' &&
    activeSource === 'all' &&
    searchQuery.trim() === '';

  const latestTenArticles = useMemo(
    () => filteredArticles.slice(0, TOP_LATEST_LIMIT),
    [filteredArticles]
  );

  const categorySections = useMemo(() => {
    if (!isFrontPageMode) return [];
    return categories
      .map((category) => ({
        category,
        articles: filteredArticles
          .filter((item) => item.categoryId === category.id)
          .slice(0, PER_CATEGORY_LIMIT),
      }))
      .filter((section) => section.articles.length > 0);
  }, [categories, filteredArticles, isFrontPageMode]);

  const activeCategoryLabel =
    activeCategory === 'all'
      ? searchQuery.trim() || activeSource !== 'all'
        ? 'Filtered Headlines'
        : 'Latest Headlines'
      : categories.find((c) => c.id === activeCategory)?.name || 'News';

  const canStartPull = useCallback(
    (target: EventTarget | null) => {
      if (loading || isRefreshing || selectedArticle) return false;
      if (window.scrollY > 2) return false;
      if (
        target instanceof Element &&
        target.closest('button, a, input, textarea, select')
      ) {
        return false;
      }
      return true;
    },
    [loading, isRefreshing, selectedArticle]
  );

  const beginGesture = useCallback(
    (clientX: number, clientY: number, target: EventTarget | null) => {
      if (!canStartPull(target)) return;
      startXRef.current = clientX;
      startYRef.current = clientY;
      isTrackingRef.current = true;
      pullDistanceRef.current = 0;
    },
    [canStartPull]
  );

  const moveGesture = useCallback((clientX: number, clientY: number) => {
    if (
      !isTrackingRef.current ||
      startYRef.current === null ||
      startXRef.current === null
    ) {
      return;
    }

    const deltaY = clientY - startYRef.current;
    const deltaX = clientX - startXRef.current;

    if (
      deltaY <= 0 ||
      (pullDistanceRef.current === 0 && Math.abs(deltaX) > Math.abs(deltaY))
    ) {
      if (pullDistanceRef.current > 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
      if (deltaY < -8 || Math.abs(deltaX) > 12) {
        isTrackingRef.current = false;
        setIsPulling(false);
      }
      return;
    }

    if (window.scrollY > 2) {
      isTrackingRef.current = false;
      setIsPulling(false);
      pullDistanceRef.current = 0;
      setPullDistance(0);
      return;
    }

    if (deltaY < 8 && pullDistanceRef.current === 0) return;

    const damped = Math.round(
      MAX_PULL_DISTANCE * (1 - Math.exp(-deltaY / 160))
    );
    pullDistanceRef.current = damped;
    setIsPulling(true);
    setPullDistance(damped);
  }, []);

  const endGesture = useCallback(() => {
    if (!isTrackingRef.current) return;

    const finalPull = pullDistanceRef.current;
    isTrackingRef.current = false;
    startXRef.current = null;
    startYRef.current = null;
    pullDistanceRef.current = 0;

    setIsPulling(false);
    setPullDistance(0);

    if (finalPull >= PULL_THRESHOLD && !loading && !isRefreshing) {
      void refreshCurrentView();
    }
  }, [loading, isRefreshing, refreshCurrentView]);

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    beginGesture(touch.clientX, touch.clientY, e.target);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    moveGesture(touch.clientX, touch.clientY);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    if (
      e.target instanceof Element &&
      e.target.closest('article, button, a, input, textarea, select')
    ) {
      return;
    }
    beginGesture(e.clientX, e.clientY, e.target);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    moveGesture(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    endGesture();
  };

  const isArmed = pullDistance >= PULL_THRESHOLD;
  const showPullBanner = isPulling && pullDistance > 6;
  const contentTranslateY = isPulling
    ? pullDistance
    : isRefreshing
    ? 44
    : 0;

  return (
    <main
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={endGesture}
      onTouchCancel={endGesture}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 select-none sm:select-auto"
    >
      {/* Pull-to-Refresh & Refreshing Status Indicator */}
      <AnimatePresence>
        {(showPullBanner || isRefreshing) && (
          <motion.div
            key="pull-indicator"
            initial={{ opacity: 0, y: -12 }}
            animate={{
              opacity: isRefreshing
                ? 1
                : Math.min(1, pullDistance / PULL_THRESHOLD),
              y: isRefreshing
                ? 0
                : Math.max(-16, pullDistance * 0.45 - 24),
            }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.16 }}
            aria-live="polite"
            className="pointer-events-none absolute left-0 right-0 top-3 z-10 flex items-center justify-center px-4"
          >
            <div className="inline-flex items-center gap-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 py-1.5 px-3">
              {isRefreshing ? (
                <>
                  <FontAwesomeIcon
                    icon={faRotateRight}
                    className="text-xs animate-spin text-zinc-900 dark:text-zinc-100"
                  />
                  <span>Refreshing headlines...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon
                    icon={faArrowDown}
                    className={`text-xs transition-transform duration-150 ${
                      isArmed
                        ? 'rotate-180 text-zinc-950 dark:text-white'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  />
                  <span>
                    {isArmed ? 'Release to refresh' : 'Pull down to refresh'}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pull-translated feed wrapper */}
      <div
        style={{
          transform:
            contentTranslateY > 0
              ? `translateY(${contentTranslateY}px)`
              : undefined,
        }}
        className={
          isPulling
            ? 'will-change-transform'
            : 'transition-transform duration-200 ease-out'
        }
      >
        {/* Top Section Editorial Header */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-5 mb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {activeCategoryLabel}
          </h1>
          <p className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            {loading
              ? 'Loading feeds...'
              : isFrontPageMode
              ? `Top ${latestTenArticles.length} newest · ${categorySections.length} categories`
              : `${filteredArticles.length} ${
                  filteredArticles.length === 1 ? 'article' : 'articles'
                } · ${availableSourcesInView.length} ${
                  availableSourcesInView.length === 1 ? 'source' : 'sources'
                }`}
          </p>
        </div>

        {/* Loading Skeleton State */}
        {loading ? (
          <div
            aria-busy="true"
            aria-label="Loading news headlines"
            className="space-y-6"
          >
            {isFrontPageMode && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 p-6 space-y-3 animate-pulse">
                <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-7 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded" />
                <div className="h-4 w-2/3 bg-zinc-200/80 dark:bg-zinc-800/80 rounded" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 p-5 space-y-3 animate-pulse"
                >
                  <div className="h-3 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-5 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-5 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="space-y-2 pt-2">
                    <div className="h-3 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded" />
                    <div className="h-3 w-11/12 bg-zinc-200/80 dark:bg-zinc-800/80 rounded" />
                  </div>
                  <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex justify-between">
                    <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredArticles.length === 0 ? (
          /* Empty Search / Filter State */
          <div className="py-16 px-4 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4 text-zinc-400 dark:text-zinc-500">
              <FontAwesomeIcon icon={faNewspaper} className="text-lg" />
            </div>
            <h2 className="font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              No matching headlines
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              {searchQuery
                ? `No articles matched "${searchQuery}" in this view.`
                : 'No articles are currently available from the selected source.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Clear search
                </button>
              )}
              {activeSource !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveSource('all')}
                  className="min-h-[44px] px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  Show all sources
                </button>
              )}
              {!searchQuery && activeSource === 'all' && (
                <button
                  type="button"
                  onClick={() => void refreshCurrentView()}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Retry loading
                </button>
              )}
            </div>
          </div>
        ) : isFrontPageMode ? (
          /* Front Page Mode: Top 10 Latest + 5 Latest Per Category Below */
          <div className="space-y-12">
            {/* Top Section: 10 Latest Headlines (1 Lead Story + 9 Grid Cards) */}
            <section aria-label="Latest headlines" className="space-y-5">
              {latestTenArticles[0] && (
                <motion.article
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => setSelectedArticle(latestTenArticles[0])}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedArticle(latestTenArticles[0]);
                    }
                  }}
                  aria-label={`Read brief: ${latestTenArticles[0].title}`}
                  className="group bg-zinc-50/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl p-5 sm:p-7 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row items-stretch gap-5 sm:gap-6">
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-3 flex-wrap">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {latestTenArticles[0].sourceName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{latestTenArticles[0].categoryName}</span>
                          <span aria-hidden="true">·</span>
                          <time
                            dateTime={latestTenArticles[0].pubDate}
                            className="font-mono tabular-nums"
                          >
                            {formatRelativeTime(latestTenArticles[0].timestamp)}
                          </time>
                        </div>

                        <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold leading-snug text-zinc-900 dark:text-zinc-50 [text-wrap:balance] group-hover:underline decoration-zinc-400 dark:decoration-zinc-600 underline-offset-4 mb-3">
                          {latestTenArticles[0].title}
                        </h2>

                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
                          {latestTenArticles[0].description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-200/70 dark:border-zinc-800/80">
                        <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                          Read brief
                        </span>
                        <a
                          href={latestTenArticles[0].link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Open original article: ${latestTenArticles[0].title}`}
                          title="Open original article"
                          className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <FontAwesomeIcon
                            icon={faArrowUpRightFromSquare}
                            className="text-xs"
                          />
                        </a>
                      </div>
                    </div>

                    <ArticleImage
                      src={latestTenArticles[0].imageUrl}
                      alt={latestTenArticles[0].title}
                      className="w-full md:w-[38%] lg:w-[40%] aspect-[16/10] md:aspect-auto md:min-h-[220px] rounded-lg shrink-0"
                    />
                  </div>
                </motion.article>
              )}

              {latestTenArticles.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {latestTenArticles.slice(1).map((article, index) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      index={index + 1}
                      onSelect={setSelectedArticle}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Editorial Divider Between Top Latest and Per-Category Sections */}
            {categorySections.length > 0 && (
              <div className="pt-8 border-t border-zinc-300 dark:border-zinc-700 space-y-10">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    By Category
                  </h2>
                  <p className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                    5 latest stories per desk
                  </p>
                </div>

                <div className="space-y-10">
                  {categorySections.map(({ category, articles: catArticles }) => {
                    const [leadArticle, ...restArticles] = catArticles;
                    return (
                      <section
                        key={category.id}
                        aria-label={`${category.name} latest news`}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-baseline gap-3">
                            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                              {category.name}
                            </h3>
                            <span className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                              {catArticles.length} latest
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveCategory(category.id)}
                            className="min-h-[44px] px-3 -mr-3 inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>View all</span>
                            <FontAwesomeIcon
                              icon={faArrowRight}
                              className="text-xs"
                            />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
                          {leadArticle && (
                            <div className="lg:col-span-5">
                              <NewsCard
                                article={leadArticle}
                                index={0}
                                onSelect={setSelectedArticle}
                                className="h-full"
                              />
                            </div>
                          )}

                          {restArticles.length > 0 && (
                            <div className="lg:col-span-7 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden flex flex-col justify-between">
                              {restArticles.map((article) => (
                                <div
                                  key={article.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setSelectedArticle(article)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setSelectedArticle(article);
                                    }
                                  }}
                                  aria-label={`Read brief: ${article.title}`}
                                  className="group p-4 sm:px-5 sm:py-4 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer flex items-start justify-between gap-3.5 flex-1"
                                >
                                  <ArticleImage
                                    src={article.imageUrl}
                                    alt={article.title}
                                    compact
                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg shrink-0 mt-0.5"
                                  />

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 flex-wrap">
                                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                        {article.sourceName}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <time
                                        dateTime={article.pubDate}
                                        className="font-mono tabular-nums"
                                      >
                                        {formatRelativeTime(article.timestamp)}
                                      </time>
                                    </div>

                                    <h4 className="font-serif text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50 group-hover:underline decoration-zinc-400 dark:decoration-zinc-600 underline-offset-4 mb-1">
                                      {article.title}
                                    </h4>

                                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                                      {article.description}
                                    </p>
                                  </div>

                                  <a
                                    href={article.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Open original article: ${article.title}`}
                                    title="Open original article"
                                    className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-950 dark:text-zinc-500 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors shrink-0"
                                  >
                                    <FontAwesomeIcon
                                      icon={faArrowUpRightFromSquare}
                                      className="text-xs"
                                    />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Single Category / Filtered Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredArticles.map((article, index) => (
              <NewsCard
                key={article.id}
                article={article}
                index={index}
                onSelect={setSelectedArticle}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

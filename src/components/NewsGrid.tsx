import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowDown,
  faNewspaper,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { useNews } from '../context/NewsContext';
import { NewsCard } from './NewsCard';

const PULL_THRESHOLD = 68;
const MAX_PULL_DISTANCE = 112;

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

  const activeCategoryLabel =
    activeCategory === 'all'
      ? 'Curated Mix'
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
    if (!isTrackingRef.current || startYRef.current === null || startXRef.current === null) {
      return;
    }

    const deltaY = clientY - startYRef.current;
    const deltaX = clientX - startXRef.current;

    // Abort pull-to-refresh if scrolling upward or swiping horizontally
    if (deltaY <= 0 || (pullDistanceRef.current === 0 && Math.abs(deltaX) > Math.abs(deltaY))) {
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

    // Ignore micro-jitter on mouse click
    if (deltaY < 8 && pullDistanceRef.current === 0) return;

    // Asymptotic rubber-band damping
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
    // Touch is handled by native touch events; for mouse, avoid hijacking text selection inside cards
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
        {/* Section editorial bar */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-5 mb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {activeCategoryLabel}
          </h1>
          <p className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            {loading
              ? 'Loading feeds...'
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          >
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
        ) : (
          /* Responsive News Card Grid */
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

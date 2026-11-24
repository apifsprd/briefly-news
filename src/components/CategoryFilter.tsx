import React, { useEffect, useRef } from 'react';
import { useNews } from '../context/NewsContext';

export const CategoryFilter: React.FC = () => {
  const {
    categories,
    activeCategory,
    setActiveCategory,
    activeSource,
    setActiveSource,
    availableSourcesInView,
  } = useNews();

  const categoryTrackRef = useRef<HTMLDivElement>(null);
  const sourceTrackRef = useRef<HTMLDivElement>(null);

  const scrollActiveIntoTrack = (
    container: HTMLDivElement | null,
    selector: string
  ) => {
    if (!container) return;
    const activeBtn = container.querySelector<HTMLElement>(selector);
    if (!activeBtn) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    if (
      btnRect.left >= containerRect.left &&
      btnRect.right <= containerRect.right
    ) {
      return;
    }

    const delta =
      btnRect.left -
      containerRect.left -
      containerRect.width / 2 +
      btnRect.width / 2;
    container.scrollTo({
      left: Math.max(0, container.scrollLeft + delta),
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    scrollActiveIntoTrack(categoryTrackRef.current, '[aria-selected="true"]');
  }, [activeCategory, categories.length]);

  useEffect(() => {
    scrollActiveIntoTrack(sourceTrackRef.current, '[aria-pressed="true"]');
  }, [activeSource, activeCategory, availableSourcesInView.length]);

  const trackClassName =
    'relative w-full min-w-0 flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar';

  const getTextLinkClassName = (isActive: boolean) => {
    const base =
      'min-h-[44px] px-0.5 text-xs sm:text-sm whitespace-nowrap shrink-0 inline-flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 underline-offset-[6px]';

    if (isActive) {
      return `${base} font-semibold text-zinc-950 dark:text-zinc-50 underline decoration-2 decoration-zinc-900 dark:decoration-zinc-100`;
    }

    return `${base} font-medium text-zinc-500 hover:text-zinc-950 hover:underline decoration-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:underline dark:decoration-zinc-700`;
  };

  return (
    <section
      aria-label="News filters"
      className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 sm:py-2 grid grid-cols-1 lg:grid-cols-2 gap-1 lg:gap-6 items-center">
        {/* Column 1 / Row 1: Categories */}
        <div
          ref={categoryTrackRef}
          role="tablist"
          aria-label="Categories"
          className={`${trackClassName} border-b border-zinc-100 dark:border-zinc-900 lg:border-b-0`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
            className={getTextLinkClassName(activeCategory === 'all')}
          >
            All
          </button>

          {categories.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(category.id)}
                className={getTextLinkClassName(isActive)}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Column 2 / Row 2: Sources */}
        <div
          ref={sourceTrackRef}
          role="group"
          aria-label="Sources"
          className={`${trackClassName} lg:border-l lg:border-zinc-200 lg:dark:border-zinc-800 lg:pl-6`}
        >
          <button
            type="button"
            aria-pressed={activeSource === 'all'}
            onClick={() => setActiveSource('all')}
            className={getTextLinkClassName(activeSource === 'all')}
          >
            All Sources
          </button>

          {availableSourcesInView.map((source) => {
            const isSelected = activeSource === source.id;
            return (
              <button
                key={source.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setActiveSource(source.id)}
                className={getTextLinkClassName(isSelected)}
              >
                {source.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

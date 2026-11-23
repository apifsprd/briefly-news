import React from 'react';
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

  return (
    <section
      aria-label="News filters"
      className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-2.5">
        {/* Primary Category Tabs */}
        <div
          role="tablist"
          aria-label="Categories"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
            className={`min-h-[44px] px-4 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
              activeCategory === 'all'
                ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950'
                : 'bg-zinc-50 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 dark:border-zinc-800'
            }`}
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
                className={`min-h-[44px] px-4 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950'
                    : 'bg-zinc-50 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 dark:border-zinc-800'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Secondary Source Filter Row */}
        {availableSourcesInView.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <button
              type="button"
              onClick={() => setActiveSource('all')}
              className={`min-h-[36px] px-3 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeSource === 'all'
                  ? 'bg-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              All Sources
            </button>

            {availableSourcesInView.map((source) => {
              const isSelected = activeSource === source.id;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setActiveSource(source.id)}
                  className={`min-h-[36px] px-3 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  {source.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

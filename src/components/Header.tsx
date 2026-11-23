import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoon,
  faNewspaper,
  faRotateRight,
  faSearch,
  faSun,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useNews } from '../context/NewsContext';

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    theme,
    toggleTheme,
    refreshCurrentView,
    isRefreshing,
    setActiveCategory,
  } = useNews();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => {
            setActiveCategory('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2.5 text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 rounded-lg"
          aria-label="Briefly home"
        >
          <FontAwesomeIcon icon={faNewspaper} className="text-base sm:text-lg" />
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
            Briefly
          </span>
        </button>

        {/* Zone 2: Desktop headline search */}
        <div className="hidden md:flex flex-1 max-w-md items-center relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3.5 text-xs text-zinc-400 dark:text-zinc-500 pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headlines..."
            aria-label="Search headlines"
            className="w-full h-10 pl-9 pr-9 text-sm bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          )}
        </div>

        {/* Zone 3: Utility controls (mobile search trigger, refresh, theme toggle) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label={mobileSearchOpen ? 'Close search' : 'Search headlines'}
            aria-expanded={mobileSearchOpen}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <FontAwesomeIcon
              icon={mobileSearchOpen ? faXmark : faSearch}
              className="text-sm"
            />
          </button>

          <button
            type="button"
            onClick={() => void refreshCurrentView()}
            disabled={isRefreshing}
            aria-label="Refresh headlines"
            title="Refresh headlines"
            className="min-h-[44px] min-w-[44px] sm:px-3.5 inline-flex items-center justify-center gap-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <FontAwesomeIcon
              icon={faRotateRight}
              className={`text-sm ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
            title={
              theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors"
          >
            <FontAwesomeIcon
              icon={theme === 'dark' ? faSun : faMoon}
              className="text-sm"
            />
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Search Input */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 px-4 py-2.5 bg-white dark:bg-zinc-950">
          <div className="relative flex items-center">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3.5 text-xs text-zinc-400 dark:text-zinc-500 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search headlines..."
              autoFocus
              aria-label="Search headlines"
              className="w-full h-11 pl-9 pr-9 text-sm bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 min-h-[40px] min-w-[40px] flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

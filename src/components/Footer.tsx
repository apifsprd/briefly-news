import React from 'react';
import { useNews } from '../context/NewsContext';

export const Footer: React.FC = () => {
  const { categories, sources } = useNews();

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">
          Briefly · Minimalist Mobile-First News Aggregator
        </p>
        <p className="font-mono tabular-nums">
          {categories.length} categories · {sources.length} official RSS feeds
        </p>
      </div>
    </footer>
  );
};

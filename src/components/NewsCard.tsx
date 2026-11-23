import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { ArticleItem } from '../types/rss';
import { formatRelativeTime } from '../utils/date';
import { ArticleImage } from './ArticleImage';

interface NewsCardProps {
  article: ArticleItem;
  index: number;
  onSelect: (article: ArticleItem) => void;
  className?: string;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  article,
  index,
  onSelect,
  className = '',
}) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.025, 0.25),
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={{ scale: 0.99 }}
      className={`group flex flex-col justify-between bg-zinc-50/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl p-5 transition-colors cursor-pointer ${className}`}
      onClick={() => onSelect(article)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(article);
        }
      }}
      aria-label={`Read brief: ${article.title}`}
    >
      <div>
        <ArticleImage
          src={article.imageUrl}
          alt={article.title}
          className="aspect-[16/9] w-full rounded-lg mb-4"
        />

        {/* Unboxed typographic metadata */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2.5 flex-wrap">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {article.sourceName}
          </span>
          <span aria-hidden="true">·</span>
          <span>{article.categoryName}</span>
          <span aria-hidden="true">·</span>
          <time
            dateTime={article.pubDate}
            className="font-mono tabular-nums"
          >
            {formatRelativeTime(article.timestamp)}
          </time>
        </div>

        <h2 className="font-serif text-lg sm:text-xl font-semibold leading-snug text-zinc-900 dark:text-zinc-50 [text-wrap:balance] group-hover:underline decoration-zinc-400 dark:decoration-zinc-600 underline-offset-4 mb-2.5">
          {article.title}
        </h2>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {article.description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-200/70 dark:border-zinc-800/80">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
          Read brief
        </span>

        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open original article: ${article.title}`}
          title="Open original article"
          className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
        >
          <FontAwesomeIcon
            icon={faArrowUpRightFromSquare}
            className="text-xs"
          />
        </a>
      </div>
    </motion.article>
  );
};

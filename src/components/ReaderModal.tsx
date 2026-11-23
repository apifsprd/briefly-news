import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRightFromSquare,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { ArticleItem } from '../types/rss';
import { formatFullDate } from '../utils/date';
import { ArticleImage } from './ArticleImage';

interface ReaderModalProps {
  article: ArticleItem | null;
  onClose: () => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({
  article,
  onClose,
}) => {
  useEffect(() => {
    if (!article) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [article, onClose]);

  return (
    <AnimatePresence>
      {article && (
        <motion.div
          key="reader-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reader-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            key="reader-sheet"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] sm:max-h-[82vh] overflow-y-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-t-2xl sm:rounded-2xl p-5 sm:p-7 shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            {/* Mobile drag affordance */}
            <div
              aria-hidden="true"
              className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-4 sm:hidden"
            />

            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-5">
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {article.sourceName}
                </span>
                <span aria-hidden="true">·</span>
                <span>{article.categoryName}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close reader mode"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="text-base" />
              </button>
            </div>

            <h2
              id="reader-modal-title"
              className="font-serif text-xl sm:text-2xl font-bold leading-snug text-zinc-900 dark:text-zinc-50 [text-wrap:balance] mb-3"
            >
              {article.title}
            </h2>

            <p className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400 mb-5">
              Published {formatFullDate(article.pubDate)}
            </p>

            <ArticleImage
              src={article.imageUrl}
              alt={article.title}
              className="aspect-[16/9] max-h-64 w-full rounded-xl mb-5"
            />

            <div className="text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300 mb-8 max-w-prose">
              {article.description}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 font-semibold py-3 px-5 rounded-xl hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
              >
                Read Original Article
                <FontAwesomeIcon
                  icon={faArrowUpRightFromSquare}
                  className="text-xs"
                />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] py-3 px-5 rounded-xl border border-zinc-200 dark:border-zinc-800 font-semibold text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

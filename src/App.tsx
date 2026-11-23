/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MotionConfig } from 'framer-motion';
import { NewsProvider, useNews } from './context/NewsContext';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { NewsGrid } from './components/NewsGrid';
import { ReaderModal } from './components/ReaderModal';
import { Footer } from './components/Footer';

const BrieflyLayout: React.FC = () => {
  const { selectedArticle, setSelectedArticle } = useNews();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors">
      <Header />
      <CategoryFilter />
      <NewsGrid />
      <Footer />
      <ReaderModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <NewsProvider>
        <BrieflyLayout />
      </NewsProvider>
    </MotionConfig>
  );
}

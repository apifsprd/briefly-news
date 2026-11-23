# Technical Specification Document (TSD) — Briefly

**Nama Aplikasi:** Briefly — Minimalist Mobile-First Web News Aggregator  
**Versi Dokumen:** 1.0  
**Stack Teknologi:** ReactJS 18+ + TypeScript 5+ + Tailwind CSS v3/v4 + Framer Motion + FontAwesome Free + SweetAlert2 + Cloudflare Pages Functions  

---

## 1. Struktur Proyek & Repositori (Project Directory Structure)

```
briefly/
├── functions/
│   └── api/
│       └── feed.ts                 # Cloudflare Pages Function (Edge Proxy & Parser)
├── public/
│   ├── rss.json                    # Direktori Feed RSS & Kategori Resmi
│   ├── favicon.ico
│   └── manifest.json               # Web App Manifest (PWA-Ready)
├── src/
│   ├── assets/                     # Graphic Assets & Styles
│   │   └── index.css               # Import Tailwind CSS & Custom Utility Classes
│   ├── components/
│   │   ├── Header.tsx              # Mobile-First Header & Navbar
│   │   ├── CategoryFilter.tsx      # Horizontal Scrollable Category Chips
│   │   ├── SearchBar.tsx           # Mobile Search Bar Component
│   │   ├── NewsCard.tsx            # News Item Card Component
│   │   ├── NewsGrid.tsx            # Grid Layout with Framer Motion Stagger
│   │   ├── ReaderModal.tsx         # Framer Motion Animated Reader Modal
│   │   └── Footer.tsx              # Minimalist Footer
│   ├── context/
│   │   └── NewsContext.tsx         # State Management (Feeds, Categories, Active Theme)
│   ├── services/
│   │   └── rssService.ts           # API Fetcher Service (/api/feed)
│   ├── types/
│   │   └── rss.ts                  # TypeScript Interfaces (Source, Article, FeedResponse)
│   ├── utils/
│   │   └── alert.ts                # SweetAlert2 Monochrome Wrapper Helper
│   ├── App.tsx                     # Main Application Root
│   └── main.tsx                    # Entry Point
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── wrangler.toml                   # Cloudflare Wrangler Configuration
```

---

## 2. Dependencies & File `package.json`

```json
{
  "name": "briefly",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "pages:dev": "wrangler pages dev -- vite"
  },
  "dependencies": {
    "@fortawesome/fontawesome-svg-core": "^6.5.1",
    "@fortawesome/free-solid-svg-icons": "^6.5.1",
    "@fortawesome/react-fontawesome": "^0.2.0",
    "framer-motion": "^11.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "sweetalert2": "^11.10.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240208.0",
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "fast-xml-parser": "^4.3.4",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.0",
    "wrangler": "^3.28.1"
  }
}
```

---

## 3. Spesifikasi TypeScript Interfaces (`src/types/rss.ts`)

```typescript
export interface RSSSource {
  id: string;
  name: string;
  category: string;
  url: string;
}

export interface RSSDirectory {
  sources: RSSSource[];
}

export interface ArticleItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceId: string;
  sourceName: string;
  category: string;
}

export interface FeedApiResponse {
  status: 'ok' | 'error';
  message?: string;
  items?: ArticleItem[];
}
```

---

## 4. Cloudflare Pages Function Code (`functions/api/feed.ts`)

```typescript
import { XMLParser } from 'fast-xml-parser';

interface Env {}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const urlParams = new URL(context.request.url).searchParams;
  const feedUrl = urlParams.get('url');
  const sourceId = urlParams.get('sourceId') || 'unknown';
  const sourceName = urlParams.get('sourceName') || 'Unknown Source';
  const category = urlParams.get('category') || 'Umum';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, s-maxage=60',
  };

  if (!feedUrl) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'URL parameter is missing' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'BrieflyNewsBot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.statusText}`);
    }

    const xmlData = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsedObj = parser.parse(xmlData);

    const channel = parsedObj?.rss?.channel || parsedObj?.feed;
    const rawItems = channel?.item || channel?.entry || [];
    const itemsArray = Array.isArray(rawItems) ? rawItems : [rawItems];

    const cleanItems = itemsArray.map((item: any, index: number) => {
      const title = item.title?.['#text'] || item.title || 'Tanpa Judul';
      const link = item.link?.['@_href'] || item.link || '#';
      const description =
        item.description?.['#text'] ||
        item.description ||
        item.summary ||
        '';
      const pubDate =
        item.pubDate || item.published || new Date().toISOString();

      return {
        id: `${sourceId}-${index}-${Date.now()}`,
        title: typeof title === 'string' ? title.trim() : String(title),
        link: typeof link === 'string' ? link : '#',
        description:
          typeof description === 'string'
            ? description.replace(/<[^>]*>?/gm, '').slice(0, 200) + '...'
            : '',
        pubDate: String(pubDate),
        sourceId,
        sourceName,
        category,
      };
    });

    return new Response(
      JSON.stringify({ status: 'ok', items: cleanItems }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};
```

---

## 5. Wrapper SweetAlert2 Monokrom (`src/utils/alert.ts`)

```typescript
import Swal from 'sweetalert2';

export const showMonochromeAlert = (title: string, text: string, icon: 'error' | 'warning' | 'info' | 'success' = 'info') => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: 'Tutup',
    customClass: {
      popup: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-xl',
      title: 'text-lg font-bold text-zinc-900 dark:text-zinc-100',
      htmlContainer: 'text-sm text-zinc-600 dark:text-zinc-400',
      confirmButton: 'bg-black dark:bg-white text-white dark:text-black font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity',
    },
    buttonsStyling: false,
  });
};
```

---

## 6. Framer Motion Modal Reader Specs (`src/components/ReaderModal.tsx`)

```typescript
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { ArticleItem } from '../types/rss';

interface ReaderModalProps {
  article: ArticleItem | null;
  onClose: () => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({ article, onClose }) => {
  if (!article) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {article.sourceName} • {article.category}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <FontAwesomeIcon icon={faXmark} className="text-lg" />
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold leading-snug mb-3">
            {article.title}
          </h2>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            Dipublikasikan: {new Date(article.pubDate).toLocaleString('id-ID')}
          </p>

          <div className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 mb-8 whitespace-pre-line">
            {article.description}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              Baca Artikel Asli
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
            </a>
            <button
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 font-semibold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
```

---

## 7. Panduan Build & Deployment di Cloudflare Pages

1. **Inisialisasi Project**:
   ```bash
   npm create vite@latest briefly -- --template react-ts
   cd briefly
   npm install framer-motion sweetalert2 @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome
   npm install -D tailwindcss postcss autoprefixer fast-xml-parser @cloudflare/workers-types wrangler
   npx tailwindcss init -p
   ```
2. **Pengujian Lokal (Local Dev)**:
   ```bash
   npx wrangler pages dev -- vite
   ```
3. **Deploy ke Cloudflare Pages**:
   - Hubungkan repositori Git ke Cloudflare Pages Dashboard.
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Compatibility flag: `nodejs_compat` (jika diperlukan untuk XML parsing).

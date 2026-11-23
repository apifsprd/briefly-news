import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RSSFeedEntry {
  name: string;
  url: string;
}

interface RSSCategory {
  id: string;
  name: string;
  feeds: RSSFeedEntry[];
}

interface RSSDirectory {
  categories: RSSCategory[];
}

interface NormalizedArticle {
  id: string;
  title: string;
  link: string;
  description: string;
  imageUrl?: string;
  pubDate: string;
  timestamp: number;
  sourceId: string;
  sourceName: string;
  categoryId: string;
  categoryName: string;
}

interface CacheEntry {
  expiresAt: number;
  items: NormalizedArticle[];
}

const CACHE_TTL_MS = 60 * 1000;
const feedCache = new Map<string, CacheEntry>();

function loadAllowedUrls(): Set<string> {
  const candidates = [
    path.resolve(__dirname, 'public/rss.json'),
    path.resolve(__dirname, 'dist/rss.json'),
  ];
  for (const rssPath of candidates) {
    try {
      if (!fs.existsSync(rssPath)) continue;
      const raw = fs.readFileSync(rssPath, 'utf-8');
      const directory = JSON.parse(raw) as RSSDirectory;
      const urls = new Set<string>();
      for (const category of directory.categories || []) {
        for (const feed of category.feeds || []) {
          if (feed.url) {
            urls.add(feed.url);
          }
        }
      }
      if (urls.size > 0) return urls;
    } catch {
      // Try next candidate
    }
  }
  return new Set<string>();
}

const allowedFeedUrls = loadAllowedUrls();

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    });
}

function cleanPlainText(raw: unknown): string {
  if (!raw) return '';
  const str =
    typeof raw === 'string'
      ? raw
      : typeof raw === 'object' && raw !== null && '#text' in raw
      ? String((raw as Record<string, unknown>)['#text'] ?? '')
      : String(raw);

  const decoded = decodeEntities(str);
  return decoded
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateBrief(text: string, maxLength = 200): string {
  if (!text) return 'No summary available for this headline.';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

function sanitizeHttpUrl(raw: unknown): string {
  let candidate = '';
  if (typeof raw === 'string') {
    candidate = raw.trim();
  } else if (Array.isArray(raw)) {
    const htmlLink = raw.find(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        ((entry as Record<string, unknown>)['@_rel'] === 'alternate' ||
          !(entry as Record<string, unknown>)['@_rel'])
    ) as Record<string, unknown> | undefined;
    const first = htmlLink || (raw[0] as Record<string, unknown> | undefined);
    candidate = String(first?.['@_href'] ?? first?.['#text'] ?? '').trim();
  } else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    candidate = String(obj['@_href'] ?? obj['#text'] ?? '').trim();
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Fallback below
  }
  return '#';
}

function extractRawItems(parsedObj: Record<string, any>): any[] {
  // Standard RSS 2.0
  if (parsedObj?.rss?.channel?.item) {
    const items = parsedObj.rss.channel.item;
    return Array.isArray(items) ? items : [items];
  }
  // Atom
  if (parsedObj?.feed?.entry) {
    const entries = parsedObj.feed.entry;
    return Array.isArray(entries) ? entries : [entries];
  }
  // RDF / RSS 1.0 (e.g., DW)
  if (parsedObj?.['rdf:RDF']?.item) {
    const items = parsedObj['rdf:RDF'].item;
    return Array.isArray(items) ? items : [items];
  }
  // Google News Sitemap (e.g., Sky Sports)
  if (parsedObj?.urlset?.url) {
    const urls = parsedObj.urlset.url;
    return Array.isArray(urls) ? urls : [urls];
  }
  return [];
}

function isLikelyTrackingImage(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('feedburner.com') ||
    lower.includes('doubleclick.net') ||
    lower.includes('1x1') ||
    lower.includes('/pixel') ||
    lower.includes('stat.') ||
    lower.endsWith('.svg')
  );
}

function validateImageCandidate(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = decodeEntities(raw).trim();
  if (!trimmed || isLikelyTrackingImage(trimmed)) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Ignore invalid URL
  }
  return undefined;
}

function pickUrlFromMediaNode(node: unknown): string | undefined {
  if (!node) return undefined;
  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = pickUrlFromMediaNode(entry);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const type = String(obj['@_type'] ?? '').toLowerCase();
    const medium = String(obj['@_medium'] ?? '').toLowerCase();
    const url = String(obj['@_url'] ?? obj['@_href'] ?? obj['url'] ?? obj['#text'] ?? '');
    if (
      !type ||
      type.startsWith('image/') ||
      medium === 'image' ||
      /\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(url)
    ) {
      return validateImageCandidate(url);
    }
  }
  if (typeof node === 'string') {
    return validateImageCandidate(node);
  }
  return undefined;
}

function extractImageFromHtml(rawHtml: unknown): string | undefined {
  if (!rawHtml) return undefined;
  const html =
    typeof rawHtml === 'string'
      ? rawHtml
      : typeof rawHtml === 'object' && rawHtml !== null && '#text' in rawHtml
      ? String((rawHtml as Record<string, unknown>)['#text'] ?? '')
      : '';
  if (!html) return undefined;

  const imgRegex = /<img[^>]+?(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    if (/\b(?:width|height)=["']?1["']?\b/i.test(tag)) continue;
    const valid = validateImageCandidate(match[1]);
    if (valid) return valid;
  }
  return undefined;
}

function extractImageUrl(item: Record<string, any>): string | undefined {
  const mediaGroup = item?.['media:group'];
  const candidates = [
    pickUrlFromMediaNode(item?.['media:content']),
    pickUrlFromMediaNode(mediaGroup?.['media:content']),
    pickUrlFromMediaNode(item?.['media:thumbnail']),
    pickUrlFromMediaNode(mediaGroup?.['media:thumbnail']),
    pickUrlFromMediaNode(item?.enclosure),
    pickUrlFromMediaNode(item?.['itunes:image']),
    pickUrlFromMediaNode(item?.['image:image']?.['image:loc']),
    pickUrlFromMediaNode(item?.image),
    extractImageFromHtml(item?.['content:encoded']),
    extractImageFromHtml(item?.content),
    extractImageFromHtml(item?.description),
    extractImageFromHtml(item?.summary),
  ];

  return candidates.find((url): url is string => Boolean(url));
}

function parseTimestamp(rawDate: unknown): { iso: string; ms: number } {
  const str = cleanPlainText(rawDate);
  if (str) {
    const parsed = Date.parse(str);
    if (!Number.isNaN(parsed)) {
      return { iso: new Date(parsed).toISOString(), ms: parsed };
    }
  }
  const now = Date.now();
  return { iso: new Date(now).toISOString(), ms: now };
}

function parseXmlToArticles(
  xmlData: string,
  meta: {
    sourceId: string;
    sourceName: string;
    categoryId: string;
    categoryName: string;
  }
): NormalizedArticle[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });

  const parsedObj = parser.parse(xmlData) as Record<string, any>;
  const rawItems = extractRawItems(parsedObj).slice(0, 25);

  return rawItems
    .map((item: any, index: number) => {
      // Handle news sitemap format vs RSS/Atom
      const newsNode = item?.['news:news'];
      const rawTitle =
        newsNode?.['news:title'] ?? item?.title ?? 'Untitled';
      const title = cleanPlainText(rawTitle) || 'Untitled';

      const link = sanitizeHttpUrl(
        item?.loc ?? item?.link ?? item?.guid
      );

      const rawDesc =
        item?.description ??
        item?.summary ??
        item?.content ??
        item?.['content:encoded'] ??
        newsNode?.['news:keywords'] ??
        '';
      const description = truncateBrief(cleanPlainText(rawDesc), 200);

      const rawDate =
        item?.pubDate ??
        item?.published ??
        item?.updated ??
        item?.['dc:date'] ??
        newsNode?.['news:publication_date'];
      const { iso, ms } = parseTimestamp(rawDate);

      const imageUrl = extractImageUrl(item);

      return {
        id: `${meta.sourceId}-${index}-${Buffer.from(link).toString('base64').slice(0, 12)}`,
        title,
        link,
        description,
        ...(imageUrl ? { imageUrl } : {}),
        pubDate: iso,
        timestamp: ms,
        sourceId: meta.sourceId,
        sourceName: meta.sourceName,
        categoryId: meta.categoryId,
        categoryName: meta.categoryName,
      };
    })
    .filter((article) => article.title && article.link !== '#');
}

async function createServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.get('/api/feed', async (req, res) => {
    const feedUrl = String(req.query.url || '').trim();
    const sourceId = String(req.query.sourceId || 'unknown').trim();
    const sourceName = String(req.query.sourceName || 'Unknown Source').trim();
    const categoryId = String(req.query.categoryId || 'general').trim();
    const categoryName = String(req.query.categoryName || 'General').trim();
    const forceRefresh = req.query.refresh === '1';

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');

    if (!feedUrl) {
      res.status(400).json({ status: 'error', message: 'Missing feed URL parameter.' });
      return;
    }

    if (allowedFeedUrls.size > 0 && !allowedFeedUrls.has(feedUrl)) {
      res.status(403).json({ status: 'error', message: 'Feed URL is not in the configured directory.' });
      return;
    }

    const cacheKey = `${feedUrl}::${sourceId}`;
    const cached = feedCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      res.status(200).json({ status: 'ok', items: cached.items });
      return;
    }

    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BrieflyReader/1.0)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`Publisher responded with ${response.status}`);
      }

      const xmlData = await response.text();
      const items = parseXmlToArticles(xmlData, {
        sourceId,
        sourceName,
        categoryId,
        categoryName,
      });

      feedCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        items,
      });

      res.status(200).json({ status: 'ok', items });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to fetch RSS feed.';
      res.status(502).json({ status: 'error', message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Briefly server listening on http://localhost:${PORT}`);
  });
}

createServer();

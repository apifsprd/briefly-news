import { XMLParser } from 'fast-xml-parser';

interface Env {}

interface PagesContext<TEnv = Env> {
  request: Request;
  env: TEnv;
}

type PagesFunction<TEnv = Env> = (
  context: PagesContext<TEnv>
) => Promise<Response> | Response;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60, s-maxage=60',
};

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

  return decodeEntities(str)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    // Ignore invalid URL
  }
  return '#';
}

function validateImageCandidate(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = decodeEntities(raw).trim();
  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    lower.includes('feedburner.com') ||
    lower.includes('doubleclick.net') ||
    lower.includes('1x1') ||
    lower.includes('/pixel') ||
    lower.includes('stat.') ||
    lower.endsWith('.svg')
  ) {
    return undefined;
  }
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

function pickMediaImage(node: unknown): string | undefined {
  if (!node) return undefined;
  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = pickMediaImage(entry);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const type = String(obj['@_type'] ?? '').toLowerCase();
    const medium = String(obj['@_medium'] ?? '').toLowerCase();
    const url = String(
      obj['@_url'] ?? obj['@_href'] ?? obj['url'] ?? obj['#text'] ?? ''
    );
    if (
      !type ||
      type.startsWith('image/') ||
      medium === 'image' ||
      /\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(url)
    ) {
      return validateImageCandidate(url);
    }
  }
  if (typeof node === 'string') return validateImageCandidate(node);
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
    if (/\b(?:width|height)=["']?1["']?\b/i.test(match[0])) continue;
    const valid = validateImageCandidate(match[1]);
    if (valid) return valid;
  }
  return undefined;
}

function extractImageUrl(item: Record<string, any>): string | undefined {
  const mediaGroup = item?.['media:group'];
  return [
    pickMediaImage(item?.['media:content']),
    pickMediaImage(mediaGroup?.['media:content']),
    pickMediaImage(item?.['media:thumbnail']),
    pickMediaImage(mediaGroup?.['media:thumbnail']),
    pickMediaImage(item?.enclosure),
    pickMediaImage(item?.['itunes:image']),
    pickMediaImage(item?.['image:image']?.['image:loc']),
    pickMediaImage(item?.image),
    extractImageFromHtml(item?.['content:encoded']),
    extractImageFromHtml(item?.content),
    extractImageFromHtml(item?.description),
    extractImageFromHtml(item?.summary),
  ].find((url): url is string => Boolean(url));
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const urlParams = new URL(context.request.url).searchParams;
  const feedUrl = (urlParams.get('url') || '').trim();
  const sourceId = urlParams.get('sourceId') || 'unknown';
  const sourceName = urlParams.get('sourceName') || 'Unknown Source';
  const categoryId = urlParams.get('categoryId') || 'general';
  const categoryName = urlParams.get('categoryName') || 'General';

  if (!feedUrl) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Missing feed URL parameter.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  let validatedUrl: URL;
  try {
    validatedUrl = new URL(feedUrl);
    if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }
  } catch {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Invalid feed URL.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(validatedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrieflyReader/1.0)',
        Accept:
          'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status}`);
    }

    const xmlData = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
    });
    const parsedObj = parser.parse(xmlData) as Record<string, any>;

    const channel =
      parsedObj?.rss?.channel || parsedObj?.feed || parsedObj?.['rdf:RDF'];
    const rawItems =
      channel?.item || channel?.entry || parsedObj?.urlset?.url || [];
    const itemsArray = (
      Array.isArray(rawItems) ? rawItems : [rawItems]
    ).slice(0, 25);

    const cleanItems = itemsArray
      .map((item: any, index: number) => {
        const newsNode = item?.['news:news'];
        const title =
          cleanPlainText(newsNode?.['news:title'] ?? item?.title) || 'Untitled';
        const link = sanitizeHttpUrl(item?.loc ?? item?.link ?? item?.guid);
        const rawDesc = cleanPlainText(
          item?.description ??
            item?.summary ??
            item?.content ??
            item?.['content:encoded'] ??
            newsNode?.['news:keywords'] ??
            ''
        );
        const description =
          rawDesc.length > 200
            ? rawDesc.slice(0, 200).trimEnd() + '...'
            : rawDesc || 'No summary available for this headline.';
        const rawDate = cleanPlainText(
          item?.pubDate ??
            item?.published ??
            item?.updated ??
            item?.['dc:date'] ??
            newsNode?.['news:publication_date']
        );
        const parsedMs = rawDate ? Date.parse(rawDate) : NaN;
        const timestamp = Number.isNaN(parsedMs) ? Date.now() : parsedMs;
        const imageUrl = extractImageUrl(item);

        return {
          id: `${sourceId}-${index}-${timestamp}`,
          title,
          link,
          description,
          ...(imageUrl ? { imageUrl } : {}),
          pubDate: new Date(timestamp).toISOString(),
          timestamp,
          sourceId,
          sourceName,
          categoryId,
          categoryName,
        };
      })
      .filter((item) => item.link !== '#');

    return new Response(
      JSON.stringify({ status: 'ok', items: cleanItems }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch feed.';
    return new Response(
      JSON.stringify({ status: 'error', message }),
      { status: 502, headers: corsHeaders }
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

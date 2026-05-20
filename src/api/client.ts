import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
} from 'axios';

/**
 * ==================================================
 * API CONFIG
 * ==================================================
 */

const API_BASE = '/api/v2';

const API_KEY = import.meta.env.VITE_API_KEY;

/**
 * ==================================================
 * AXIOS INSTANCE
 * ==================================================
 */

interface RetryAxiosRequestConfig extends AxiosRequestConfig {
  _retryCount?: number;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * ==================================================
 * REQUEST INTERCEPTOR
 * ==================================================
 */

api.interceptors.request.use(
  (config) => {
    config.headers.Authorization = `Bearer ${API_KEY}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ==================================================
 * RESPONSE INTERCEPTOR
 * ==================================================
 */

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const config = error.config as RetryAxiosRequestConfig;

    /**
     * Ignore retries for:
     * - no config
     * - aborted requests
     * - 4xx errors
     */

    if (
      !config ||
      error.code === 'ERR_CANCELED' ||
      (error.response &&
        error.response.status >= 400 &&
        error.response.status < 500)
    ) {
      return Promise.reject(error);
    }

    config._retryCount = config._retryCount || 0;

    /**
     * Max retries
     */

    if (config._retryCount >= 2) {
      return Promise.reject(error);
    }

    config._retryCount += 1;

    /**
     * Exponential backoff
     */

    const delay = 1000 * config._retryCount;

    await new Promise((resolve) =>
      setTimeout(resolve, delay)
    );

    return api(config);
  }
);

/**
 * ==================================================
 * TYPES
 * ==================================================
 */

export interface Pager {
  hasMore: boolean;
  nextPage: string;
  page: string;
  perPage: number;
  totalCount: number;
}

export interface SearchItem {
  subjectId: string;
  subjectType: number;
  title?: string;
  name?: string;
  cover?: string;
  rating?: number;
  releaseDate?: string;
  [key: string]: any;
}

export interface SearchResponse {
  items: SearchItem[];
  pager: Pager;
}

export interface SourceItem {
  id?: string;
  quality?: string;
  download_url?: string;
  stream_url?: string;
  size?: string;
  format?: string;
  [key: string]: any;
}

export interface SubtitleItem {
  language?: string;
  url?: string;
  [key: string]: any;
}

export interface SourcesResponse {
  sources: SourceItem[];
  subtitles: SubtitleItem[];
}

export interface BatchEpisodeResult {
  episode: number;
  sources: SourceItem[];
  subtitles: SubtitleItem[];
  error?: string;
}

/**
 * ==================================================
 * HELPERS
 * ==================================================
 */

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function safeObject<T>(
  value: unknown,
  fallback: T
): T {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value)
    ? (value as T)
    : fallback;
}

/**
 * Deduplicate items by subjectId and combine seasons into the title.
 */
function deduplicateAndClean(items: any[]): any[] {
  if (!items || !Array.isArray(items)) return [];

  const groups = new Map<string, { item: any; seasons: Set<number> }>();
  const unmerged: any[] = [];

  for (const item of items) {
    if (!item?.subjectId) {
      unmerged.push(item);
      continue;
    }
    const id = String(item.subjectId);

    // Try to extract season number from title or name
    let seasonMatch = null;
    if (item.title && typeof item.title === 'string') {
      seasonMatch = item.title.match(/(?:\s|-|\()*s(?:eason)?\s*0?(\d+)/i);
    }
    if (!seasonMatch && item.name && typeof item.name === 'string') {
      seasonMatch = item.name.match(/(?:\s|-|\()*s(?:eason)?\s*0?(\d+)/i);
    }

    let season: number | null = null;
    if (seasonMatch) {
      season = parseInt(seasonMatch[1], 10);
    }

    if (!groups.has(id)) {
      const sSet = new Set<number>();
      if (season !== null) sSet.add(season);
      groups.set(id, { item: { ...item }, seasons: sSet });
    } else {
      if (season !== null) groups.get(id)!.seasons.add(season);
    }
  }

  const merged = Array.from(groups.values()).map(({ item, seasons }) => {
    // Clean up the base title
    const seasonRegex = /(?:\s|-|\()*s(?:eason)?\s*0?\d+(?:\)|\s*$)?/gi;
    if (item.title && typeof item.title === 'string') {
      item.title = item.title.replace(seasonRegex, '').replace(/[:\-]\s*$/, '').trim();
    }
    if (item.name && typeof item.name === 'string') {
      item.name = item.name.replace(seasonRegex, '').replace(/[:\-]\s*$/, '').trim();
    }

    // Append merged season range if any seasons were found
    if (seasons.size > 0) {
      const sArray = Array.from(seasons);
      const minS = Math.min(...sArray);
      const maxS = Math.max(...sArray);

      const suffix = minS === maxS ? ` S${minS}` : ` S${minS} - S${maxS}`;
      if (item.title) item.title += suffix;
      if (item.name) item.name += suffix;
    }

    return item;
  });

  return [...unmerged, ...merged];
}

/**
 * ==================================================
 * API METHODS
 * ==================================================
 */

/**
 * Homepage
 */

export const fetchHomepage = async () => {
  const { data } = await api.get('/homepage');
  const results = safeObject<any>(data?.results, {});

  // Deeply deduplicate and clean any nested subjectList arrays in homepage sections
  if (results.popularRow && Array.isArray(results.popularRow.subjects)) {
    results.popularRow.subjects = deduplicateAndClean(results.popularRow.subjects);
  }
  if (Array.isArray(results.otherMovieRows)) {
    results.otherMovieRows.forEach((row: any) => {
      if (Array.isArray(row.subjects)) {
        row.subjects = deduplicateAndClean(row.subjects);
      }
    });
  }

  return results;
};

/**
 * Trending
 */

export const fetchTrending = async () => {
  const { data } = await api.get('/trending');

  return deduplicateAndClean(
    safeArray<SearchItem>(data?.results?.subjectList)
  );
};

/**
 * Search
 */

export const fetchSearch = async (
  query: string,
  page = 1
): Promise<SearchResponse> => {
  if (!query.trim()) {
    return {
      items: [],
      pager: {
        hasMore: false,
        nextPage: '1',
        page: '1',
        perPage: 24,
        totalCount: 0,
      },
    };
  }

  const { data } = await api.get(
    `/search/${encodeURIComponent(query)}?page=${page}`
  );

  const results = safeObject<any>(data?.results, {});

  const items = deduplicateAndClean(
    safeArray<SearchItem>(results.items).filter(
      (item) => item?.subjectType === 1 || item?.subjectType === 2
    )
  );

  return {
    items,

    pager: safeObject<Pager>(results.pager, {
      hasMore: false,
      nextPage: '1',
      page: '1',
      perPage: 24,
      totalCount: 0,
    }),
  };
};

/**
 * Movie / TV Info
 */

export const fetchInfo = async (
  id: string
) => {
  if (!id) {
    throw new Error('Missing movie ID');
  }

  const { data } = await api.get(
    `/info/${id}`
  );

  return safeObject(data?.results, {});
};

/**
 * Sources
 */

export const fetchSources = async (
  id: string,
  season?: number,
  episode?: number
): Promise<SourcesResponse> => {
  if (!id) {
    throw new Error('Missing source ID');
  }

  let url = `/sources/${id}`;

  if (
    typeof season === 'number' &&
    typeof episode === 'number' &&
    season > 0 &&
    episode > 0
  ) {
    url += `?season=${season}&episode=${episode}`;
  }

  const { data } = await api.get(url);

  return {
    sources: safeArray<SourceItem>(
      data?.results
    ),

    subtitles: safeArray<SubtitleItem>(
      data?.subtitles
    ),
  };
};

/**
 * Batch episode fetch
 */

export const fetchBatchSources = async (
  id: string,
  season: number,
  maxEpisode: number
): Promise<BatchEpisodeResult[]> => {
  if (!id || season <= 0 || maxEpisode <= 0) {
    return [];
  }

  const requests = Array.from(
    { length: maxEpisode },
    (_, index) => index + 1
  ).map(async (episode) => {
    try {
      const result = await fetchSources(
        id,
        season,
        episode
      );

      return {
        episode,
        sources: result.sources,
        subtitles: result.subtitles,
      };
    } catch (err: unknown) {
      return {
        episode,
        sources: [],
        subtitles: [],
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch episode',
      };
    }
  });

  return Promise.all(requests);
};

/**
 * ==================================================
 * EXPORT
 * ==================================================
 */

export default api;
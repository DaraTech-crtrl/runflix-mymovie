import { useState, useRef, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchSearch, type SearchResponse } from '../api/client';
import { Search as SearchIcon, X, Loader2, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDebounce } from '../hooks/useDebounce';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { MovieCardGrid } from '../components/MovieCard';
import { GridSkeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';
import AISearchPanel from '../components/AISearchPanel';

const TRENDING_TAGS = ['Batman', 'Spiderman', 'Avengers', 'Horror', 'Action', 'Sci-Fi', 'Marvel', 'Anime', 'Korean', 'Comedy', 'Thriller', 'Romance'];

export default function Search() {
  useSEO({ title: 'Search', description: 'Search for any movie or TV series' });

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 180);
  const inputRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>('rf-recent-searches', []);

  // Sync debounced query to URL
  useEffect(() => {
    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [debouncedQuery, setSearchParams]);

  // Sync URL to query when URL changes externally
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q && q !== query) {
      setQuery(q);
    }
  }, [searchParams.get('q')]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery],
    queryFn: ({ pageParam }) => fetchSearch(debouncedQuery, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pager.hasMore) return Number(lastPage.pager.nextPage);
      return undefined;
    },
    enabled: debouncedQuery.length > 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const rawResults = data?.pages.flatMap((page) => page.items) || [];
  const totalCount = data?.pages[0]?.pager?.totalCount || 0;

  // Sort results by title similarity to query (closest match first)
  const results = [...rawResults].sort((a, b) => {
    const q = debouncedQuery.toLowerCase().trim();
    const tA = (a.title || '').toLowerCase();
    const tB = (b.title || '').toLowerCase();

    const scoreTitle = (t: string): number => {
      if (t === q) return 100;                        // exact match
      if (t.startsWith(q)) return 80;                 // starts with query
      if (t.includes(q)) return 60;                   // contains query
      // word-level partial matching
      const qWords = q.split(/\s+/);
      const matchedWords = qWords.filter(w => t.includes(w)).length;
      if (matchedWords > 0) return 20 + (matchedWords / qWords.length) * 30;
      return 0;
    };

    const scoreA = scoreTitle(tA);
    const scoreB = scoreTitle(tB);

    if (scoreA !== scoreB) return scoreB - scoreA;     // higher similarity first
    // Tiebreak by rating
    return (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0);
  });

  // Save to recent searches when results load
  useEffect(() => {
    if (debouncedQuery.length > 2 && results.length > 0) {
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.toLowerCase() !== debouncedQuery.toLowerCase());
        return [debouncedQuery, ...filtered].slice(0, 8);
      });
    }
  }, [debouncedQuery, results.length]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleTagClick = useCallback((tag: string) => {
    setQuery(tag);
    inputRef.current?.focus();
  }, []);

  const handleAISearchTitle = useCallback((title: string) => {
    setQuery(title);
    inputRef.current?.focus();
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, [setRecentSearches]);

  const showSuggestions = query.length <= 2 && isFocused;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 max-w-[1600px] mx-auto w-full py-4 md:py-8"
    >
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Search</h1>
        <p className="text-sm text-[var(--rf-text-dim)]">Find movies, TV shows, and more</p>
      </div>

      {/* ============ SEARCH BAR ============ */}
      <div className="relative mb-6 max-w-3xl">
        <div
          className={`relative rounded-2xl transition-all duration-300 ${
            isFocused
              ? 'ring-2 ring-[var(--rf-red)]/40 bg-white/[0.06]'
              : 'bg-white/[0.04]'
          }`}
        >
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <SearchIcon size={18} className={isFocused ? 'text-[var(--rf-red)]' : 'text-[var(--rf-text-dim)]'} />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search movies, TV shows, genres..."
            className="w-full bg-transparent border border-[var(--rf-border)] rounded-2xl py-4 pl-13 pr-12 text-white placeholder-[var(--rf-text-dim)] focus:outline-none transition-all text-base font-medium"
            aria-label="Search movies and TV shows"
            autoComplete="off"
            id="search-input"
          />

          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute inset-y-0 right-3 flex items-center text-[var(--rf-text-dim)] hover:text-white p-2 rounded-lg transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && recentSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-2 rounded-2xl glass-3 overflow-hidden z-30 shadow-xl"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[var(--rf-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} />
                    Recent Searches
                  </span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-[10px] text-[var(--rf-red)] font-bold hover:text-[var(--rf-red)]/80 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleTagClick(search)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--rf-text)] hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Clock size={12} className="text-[var(--rf-text-dim)]" />
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============ LOADING SKELETONS ============ */}
      {isLoading && debouncedQuery.length > 2 && (
        <div className="pt-2">
          <GridSkeleton count={10} />
        </div>
      )}

      {/* ============ RESULTS ============ */}
      {!isLoading && results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-[var(--rf-text-dim)] font-medium">
              {totalCount > 0 ? `${totalCount.toLocaleString()} results` : `${results.length} results`}
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
          >
            {results.map((movie: any, idx: number) => (
              <MovieCardGrid
                key={`${movie.subjectId}-${idx}`}
                movie={movie}
                index={idx}
              />
            ))}
          </motion.div>

          {/* Load More */}
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2.5 text-[var(--rf-text-dim)]">
                <Loader2 size={18} className="animate-spin text-[var(--rf-red)]" />
                <span className="text-xs font-medium">Loading more...</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ ERROR STATE ============ */}
      {error && debouncedQuery.length > 2 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-4 text-[var(--rf-red)]">
            <SearchIcon size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Search Error</h3>
          <p className="text-sm text-[var(--rf-text-dim)]">{String((error as any)?.message)}</p>
        </div>
      )}

      {/* ============ EMPTY RESULTS ============ */}
      {debouncedQuery.length > 2 && !isLoading && !error && results.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-4 text-[var(--rf-text-dim)]">
            <SearchIcon size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No results found</h3>
          <p className="text-sm text-[var(--rf-text-dim)]">
            Try a different search term or browse popular categories
          </p>
        </div>
      )}

      {/* ============ DEFAULT LANDING (No query) ============ */}
      {debouncedQuery.length <= 2 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8 pt-2"
        >
          {/* AI Search Panel */}
          <AISearchPanel onSearchTitle={handleAISearchTitle} />

          {/* Trending Searches */}
          <div>
            <h3 className="text-xs font-bold text-[var(--rf-text-muted)] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <TrendingUp size={13} />
              Trending Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="px-4 py-2 glass-2 rounded-full text-sm font-medium text-[var(--rf-text-muted)] hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Discover Prompt */}
          <div className="glass-2 rounded-2xl p-6 md:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--rf-red)]/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-[var(--rf-red)]" />
            </div>
            <h3 className="text-lg font-bold mb-2">Discover Something New</h3>
            <p className="text-sm text-[var(--rf-text-dim)] max-w-md mx-auto">
              Search for your favorite movies, TV shows, actors, or genres. Start typing above to explore our entire library.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

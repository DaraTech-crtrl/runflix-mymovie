import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrending } from '../../../api/client';
import { MovieCard } from '../../../components/MovieCard';
import { MovieRow } from '../../../components/MovieRow';

interface SimilarMoviesProps {
  currentId: string;
  genre?: string;
  subjectType?: number;
  countryName?: string;
}

/**
 * "More Like This" section on the movie detail page.
 * Filters trending movies by matching genre, type, or country.
 */
export const SimilarMovies = memo(({ currentId, genre, subjectType, countryName }: SimilarMoviesProps) => {
  const { data: trending } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    staleTime: 10 * 60 * 1000,
  });

  const similar = useMemo(() => {
    if (!trending || trending.length === 0) return [];

    const currentGenres = genre
      ? genre.split(',').map((g: string) => g.trim().toLowerCase())
      : [];

    // Score each movie by similarity
    const scored = trending
      .filter((m: any) => m.subjectId !== currentId)
      .map((m: any) => {
        let score = 0;

        // Genre match (strongest signal)
        if (m.genre && currentGenres.length > 0) {
          const movieGenres = m.genre.split(',').map((g: string) => g.trim().toLowerCase());
          const genreOverlap = movieGenres.filter((g: string) => currentGenres.includes(g)).length;
          score += genreOverlap * 3;
        }

        // Same type (movie vs series)
        if (subjectType && m.subjectType === subjectType) {
          score += 2;
        }

        // Same country
        if (countryName && m.countryName === countryName) {
          score += 1;
        }

        return { movie: m, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map((item) => item.movie);

    // If not enough similar, pad with random trending
    if (scored.length < 6) {
      const remaining = trending
        .filter((m: any) => m.subjectId !== currentId && !scored.some((s: any) => s.subjectId === m.subjectId))
        .slice(0, 15 - scored.length);
      return [...scored, ...remaining];
    }

    return scored;
  }, [trending, currentId, genre, subjectType, countryName]);

  if (similar.length === 0) return null;

  return (
    <div className="mt-10 md:mt-14 -mx-4 md:-mx-10">
      <MovieRow title="🎬 More Like This" subtitle="Based on genre and type">
        {similar.map((movie: any, idx: number) => (
          <div key={`similar-${movie.subjectId}-${idx}`} className="snap-start">
            <MovieCard movie={movie} index={idx} size="md" />
          </div>
        ))}
      </MovieRow>
    </div>
  );
});

SimilarMovies.displayName = 'SimilarMovies';

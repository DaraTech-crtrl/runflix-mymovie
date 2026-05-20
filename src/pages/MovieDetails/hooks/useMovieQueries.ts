import { useQuery } from '@tanstack/react-query';
import { fetchInfo, fetchSources } from '../../../api/client';
import { MovieInfoResponse, SourcesResponse } from '../types';

const QUERY_DEFAULTS = {
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 30,
  retry: 2,
  refetchOnWindowFocus: false,
};

export const useMovieInfo = (id?: string) => {
  return useQuery<MovieInfoResponse>({
    queryKey: ['info', id],
    queryFn: () => fetchInfo(id!) as Promise<MovieInfoResponse>,
    enabled: !!id,
    ...QUERY_DEFAULTS,
  });
};

export const useMovieSources = (
  id: string | undefined,
  downloadModalOpen: boolean,
  isTvSeries: boolean,
  selectedSeason: number,
  selectedEpisode: number
) => {
  const shouldPassSeasonEp = isTvSeries && selectedSeason > 0;

  return useQuery<SourcesResponse>({
    queryKey: ['sources', id, shouldPassSeasonEp ? selectedSeason : undefined, shouldPassSeasonEp ? selectedEpisode : undefined],
    queryFn: () =>
      fetchSources(
        id!,
        shouldPassSeasonEp ? selectedSeason : undefined,
        shouldPassSeasonEp ? selectedEpisode : undefined
      ) as Promise<SourcesResponse>,
    enabled: !!id && downloadModalOpen && (!isTvSeries || selectedSeason > 0),
    ...QUERY_DEFAULTS,
  });
};

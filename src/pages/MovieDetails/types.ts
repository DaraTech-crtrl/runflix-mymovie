export interface Season {
  se: number;
  maxEp: number;
}

export interface Star {
  staffId: string;
  avatarUrl?: string;
  name: string;
  character?: string;
}

export interface MovieMetadata {
  image?: string;
  description?: string;
}

export interface SubjectInfo {
  subjectId?: string;
  subjectType: number; // 2 for TV, 1 for Movie
  title: string;
  releaseDate?: string;
  imdbRatingValue: number;
  duration: number;
  genre?: string;
  countryName?: string;
  imdbRatingCount: number;
  description?: string;
  cover?: { url: string };
  stills?: { url: string };
}

export interface MovieInfoResponse {
  subject: SubjectInfo;
  stars: Star[];
  metadata?: MovieMetadata;
  resource?: {
    seasons?: Season[];
  };
}

export interface SourceItem {
  id: string;
  quality: string;
  download_url: string;
  stream_url: string;
  size: string;
  format: string;
}

export interface SourcesResponse {
  sources: SourceItem[];
  subtitles: any[];
}

export interface BatchEpisodeResult {
  episode: number;
  sources: SourceItem[];
  subtitles: any[];
  error?: string;
}

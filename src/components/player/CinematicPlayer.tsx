import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings,
  RotateCcw, SkipForward, Info, Eye, Sliders, Shield, RefreshCw,
  Globe, Languages, Flame, Lock, Unlock, Monitor, Captions,
  Camera, Sparkles, Upload, Check, Plus, Minus, Tv, SkipBack,
  ChevronLeft, List, X, Brain, Loader2
} from 'lucide-react';
import Hls from 'hls.js';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { useProgressStore } from '../../stores/useProgressStore';
import { aiRecap } from '../../api/ai';
import {
  isElementFullscreen,
  toggleElementFullscreen,
} from '../../utils/fullscreen';
import { isMobileDevice } from '../../utils/platform';
import { useVideoRotationFit } from '../../hooks/useVideoRotationFit';
import './player-rotation.css';

interface SourceItem {
  id: string;
  quality: string;
  download_url: string;
  stream_url: string;
  size: string;
  format: string;
}

interface StarItem {
  staffId: string | number;
  name: string;
  avatarUrl?: string;
  character?: string;
}

interface CinematicPlayerProps {
  sources: SourceItem[];
  subtitles?: any[];
  title: string;
  backdropUrl?: string;
  stars?: StarItem[];
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  onPrevEpisode?: () => void;
  hasPrevEpisode?: boolean;
  subjectId?: string;
  season?: number;
  episode?: number;
  className?: string;
  onBack?: () => void;
  onShowEpisodes?: () => void;
  seasons?: { se: number; maxEp: number }[];
  onEpisodeSelect?: (season: number, episode: number) => void;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

interface LocalSubtitleTrack {
  language: string;
  label: string;
  blobUrl: string;
}

// Helper functions for parsing VTT & SRT subtitles
function parseTimestamp(timeStr: string): number {
  const parts = timeStr.trim().replace(',', '.').split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseFloat(parts[0]);
    minutes = parseFloat(parts[1]);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]);
    seconds = parseFloat(parts[1]);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function parseSubtitles(text: string): SubtitleCue[] {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = cleanText.split('\n\n');
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const [startStr, endStr] = timeLine.split('-->');
    if (!startStr || !endStr) continue;

    const start = parseTimestamp(startStr);
    const end = parseTimestamp(endStr);

    const textLines = lines.slice(timeLineIdx + 1);
    const textVal = textLines
      .join('\n')
      .replace(/<[^>]*>/g, '')
      .replace(/^[0-9]+$/, '')
      .trim();

    if (!isNaN(start) && !isNaN(end) && textVal) {
      cues.push({ start, end, text: textVal });
    }
  }
  return cues;
}

export default function CinematicPlayer({
  sources,
  subtitles = [],
  title,
  backdropUrl,
  stars = [],
  onNextEpisode,
  hasNextEpisode = false,
  onPrevEpisode,
  hasPrevEpisode = false,
  subjectId,
  season,
  episode,
  className,
  onBack,
  onShowEpisodes,
  seasons = [],
  onEpisodeSelect
}: CinematicPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Core Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState<[number, number][]>([]);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Premium Features Settings States
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'original' | '16:9' | '4:3' | 'stretch' | 'zoom'>('original');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [ambientGlow, setAmbientGlow] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'main' | 'quality' | 'speed' | 'subtitles' | 'subtitles-style' | 'audio' | 'telemetry' | 'adjustments' | 'autoskip'>('main');

  // Subtitles / Captions custom overrides
  const [selectedSubtitleIdx, setSelectedSubtitleIdx] = useState(-1); // -1 = Off
  const [subTextSize, setSubTextSize] = useState(100); // 100%
  const [subDelay, setSubDelay] = useState(0); // Offset delay in seconds
  const [subBackground, setSubBackground] = useState<'translucent' | 'solid' | 'shadow'>('translucent');
  const [subColor, setSubColor] = useState<'white' | 'yellow' | 'cyan' | 'green'>('white');
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>('');
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const [localSubTracks, setLocalSubTracks] = useState<LocalSubtitleTrack[]>([]);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  // Auto-select English subtitles on load
  useEffect(() => {
    if (subtitles && subtitles.length > 0) {
      const engIdx = subtitles.findIndex(
        (sub) =>
          sub?.lanName?.toLowerCase().includes('eng') ||
          sub?.language?.toLowerCase().includes('eng') ||
          sub?.label?.toLowerCase().includes('eng')
      );
      if (engIdx !== -1) {
        setSelectedSubtitleIdx(engIdx);
      }
    } else {
      setSelectedSubtitleIdx(-1);
    }
  }, [subtitles]);

  // Video filter adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [cinematicFilter, setCinematicFilter] = useState<'normal' | 'cinematic' | 'vibrant' | 'warm' | 'cool' | 'noir'>('normal');

  // Amazon Prime style X-Ray Overlay States
  const [showXRay, setShowXRay] = useState(false);
  const [activeXRayTab, setActiveXRayTab] = useState<'cast' | 'music' | 'trivia'>('cast');

  // Premium Toast Notification system
  const [playerNotification, setPlayerNotification] = useState<string | null>(null);

  // AI Recap State
  const [showRecap, setShowRecap] = useState(false);
  const [recapText, setRecapText] = useState('');
  const [recapLoading, setRecapLoading] = useState(false);

  const [videoCrossOrigin, setVideoCrossOrigin] = useState<'anonymous' | undefined>('anonymous');

  // Auto skip state
  const [autoSkipIntro, setAutoSkipIntro] = useState(false);
  const [autoSkipOutro, setAutoSkipOutro] = useState(false);
  const [showOutroSkip, setShowOutroSkip] = useState(false);

  const hasSkippedIntroRef = useRef(false);
  const hasSkippedOutroRef = useRef(false);

  // Interactive Overlays
  const [showNextEpCountdown, setShowNextEpCountdown] = useState(false);
  const [nextEpCountdown, setNextEpCountdown] = useState(10);
  const [showIntroSkip, setShowIntroSkip] = useState(false);

  // QoS / Telemetry (Mock Metrics)
  const [metrics, setMetrics] = useState({
    vst: 0, // Video Start Time (ms)
    bufferingRatio: 0.1,
    bitrate: 'Auto',
    fps: 60,
    droppedFrames: 0,
    latency: 'Low (0.8s)',
    loudness: 'Normalized',
    codec: 'AV1 / AAC'
  });
  const [showTelemetryOverlay, setShowTelemetryOverlay] = useState(false);

  // Fluctuating Telemetry QoS Metrics Effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setMetrics((prev) => {
        // Random bitrate fluctuation
        const speed = (20 + Math.random() * 25).toFixed(1);
        // Occasionally drop an FPS frame
        const currentFps = Math.random() > 0.95 ? 58 : 60;
        const extraDrops = currentFps < 60 ? 1 : 0;
        // Latency jitter
        const ping = Math.floor(10 + Math.random() * 8);

        return {
          ...prev,
          vst: prev.vst === 0 ? Math.floor(180 + Math.random() * 120) : prev.vst,
          bitrate: `${speed} Mbps`,
          fps: currentFps,
          droppedFrames: prev.droppedFrames + extraDrops,
          latency: `Ultra-Low (${ping}ms)`,
          codec: prev.codec
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Premium Toast Notification Timer
  useEffect(() => {
    if (!playerNotification) return;
    const timer = setTimeout(() => setPlayerNotification(null), 1800);
    return () => clearTimeout(timer);
  }, [playerNotification]);

  const showToast = (msg: string) => {
    setPlayerNotification(msg);
  };

  // Security / DRM Mock Warning overlay
  const [drmVerified, setDrmVerified] = useState(true);
  const [showDrmPopup, setShowDrmPopup] = useState(false);

  // Ad Block Check
  const [adBlockCounter, setAdBlockCounter] = useState(false);

  // Hover Thumbnail seek preview
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState(0);

  // Episodes Overlay Inside Player
  const [showEpisodesOverlay, setShowEpisodesOverlay] = useState(false);
  const [epViewingSeason, setEpViewingSeason] = useState(season || 1);
  useEffect(() => {
    if (season) setEpViewingSeason(season);
  }, [season]);

  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(0);
  const triggerInteraction = useCallback(() => {
    setShowControls(true);
    setLastInteraction(Date.now());
  }, []);

  // Auto resume
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const savedTimeRef = useRef(0); // keep in sync for use inside event handlers
  const pendingResumeRef = useRef(false); // true when we want to auto-seek on loadedmetadata
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);

  // Auto-dismiss resume overlay after 5 seconds of no click
  useEffect(() => {
    if (!hasSavedProgress) return;
    const timer = setTimeout(() => {
      setHasSavedProgress(false);
      pendingResumeRef.current = false;
    }, 5000);
    return () => clearTimeout(timer);
  }, [hasSavedProgress]);

  const lastPlaybackTimeRef = useRef<number | null>(null);
  const lastTitleRef = useRef<string>('');

  // Auto select quality based on network status
  useEffect(() => {
    if (sources.length <= 1) return;

    const connection = (navigator as any).connection;
    if (connection) {
      const speed = connection.effectiveType || '4g';
      const downlink = connection.downlink || 10;

      let targetQuality = '1080p';
      if (speed === '2g' || speed === 'slow-2g' || downlink < 1.5) {
        targetQuality = '360p';
      } else if (speed === '3g' || downlink < 4) {
        targetQuality = '720p';
      }

      // Find best matching source quality
      let bestIdx = 0;
      let minDiff = Infinity;

      sources.forEach((src, idx) => {
        const qualNum = parseInt(src.quality, 10);
        const targetNum = parseInt(targetQuality, 10);
        if (!isNaN(qualNum)) {
          const diff = Math.abs(qualNum - targetNum);
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = idx;
          }
        }
      });

      setSelectedSourceIdx(bestIdx);
    }
  }, [sources]);

  const selectedSource = sources[selectedSourceIdx] || null;

  // Reset CORS fallback on source change
  useEffect(() => {
    setVideoCrossOrigin('anonymous');
  }, [selectedSourceIdx]);

  // Reset resume state whenever the episode/title changes
  useEffect(() => {
    setHasSavedProgress(false);
    setSavedTime(0);
    savedTimeRef.current = 0;
    pendingResumeRef.current = false;
    setHasPlayedOnce(false);

    // Check if there is saved progress for this title
    const progressKey = `rf_progress_${title}`;
    const saved = localStorage.getItem(progressKey);
    if (saved) {
      const parsedTime = parseFloat(saved);
      if (parsedTime > 5) {
        setSavedTime(parsedTime);
        savedTimeRef.current = parsedTime;
        // We will seek once the video reports loadedmetadata
        pendingResumeRef.current = true;
      }
    }
  }, [title]);

  // Initialize playback and Hls
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedSource) return;

    const tStart = performance.now();

    // Seek to saved progress once metadata is available
    const onLoadedMetadata = () => {
      if (lastTitleRef.current === title && lastPlaybackTimeRef.current !== null && lastPlaybackTimeRef.current > 0) {
        video.currentTime = lastPlaybackTimeRef.current;
        lastPlaybackTimeRef.current = null;
      } else if (pendingResumeRef.current && savedTimeRef.current > 5) {
        // Only seek if saved time is meaningfully before the end
        if (video.duration && savedTimeRef.current < video.duration - 10) {
          video.currentTime = savedTimeRef.current;
          const mins = Math.floor(savedTimeRef.current / 60);
          const secs = Math.round(savedTimeRef.current % 60);
          showToast(`🍿 Resumed playback from ${mins}m ${secs}s`);
        }
        pendingResumeRef.current = false;
        setHasSavedProgress(false);
      }
      setMetrics(prev => ({
        ...prev,
        vst: Math.round(performance.now() - tStart)
      }));
    };

    const attemptPlay = () => {
      video.play().catch((err) => {
        console.warn('Autoplay blocked. User gesture required for playback.', err);
      });
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);

    if (Hls.isSupported() && selectedSource.stream_url.endsWith('.m3u8')) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        maxBufferSize: 80 * 1000 * 1000, // Developer control over local buffer limit (80MB)
        maxBufferLength: 60, // Forward buffer length: 60s to cushion against network speed drops
        maxMaxBufferLength: 120, // Max buffer length ceiling
        backBufferLength: 30, // Limit back buffer to 30s to prevent memory accumulation / general page lag
        enableWorker: true,
        lowLatencyMode: false, // Disable lowLatencyMode for VOD streaming (minimizes redundant requests & pings)
        
        // Resilience: Retry settings to recover from network fluctuations quickly
        manifestLoadingMaxRetry: 8,
        levelLoadingMaxRetry: 8,
        fragLoadingMaxRetry: 8,
        manifestLoadingRetryDelay: 500,
        levelLoadingRetryDelay: 500,
        fragLoadingRetryDelay: 500,
        manifestLoadingMaxRetryDelay: 4000,
        levelLoadingMaxRetryDelay: 4000,
        fragLoadingMaxRetryDelay: 4000,
        highBufferWatchdogPeriod: 2,
        appendErrorMaxRetry: 5
      });

      hlsRef.current = hls;
      hls.loadSource(selectedSource.stream_url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        attemptPlay();
        setMetrics(prev => ({
          ...prev,
          vst: Math.round(performance.now() - tStart),
          bitrate: `${(hls.levels[hls.currentLevel]?.bitrate / 1000000 || 2.4).toFixed(1)} Mbps`
        }));
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal media error encountered, recovering...', data);
              hls.recoverMediaError();
              break;
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error encountered, reloading...', data);
              hls.startLoad();
              break;
            default:
              console.error('Unrecoverable fatal Hls error, destroying instance.', data);
              hls.destroy();
              break;
          }
        }
      });
    } else {
      video.src = selectedSource.stream_url || selectedSource.download_url;
      video.load();
      attemptPlay();
    }

    const onError = (e: Event) => {
      console.warn('Video load/CORS error occurred. Retrying without CORS settings...', e);
      if (videoCrossOrigin === 'anonymous') {
        setVideoCrossOrigin(undefined);
      }
    };
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
      if (video.currentTime > 0) {
        lastPlaybackTimeRef.current = video.currentTime;
        lastTitleRef.current = title;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [selectedSourceIdx, sources, videoCrossOrigin, title]);

  // Load subtitles from network
  useEffect(() => {
    // 999 is custom uploaded subtitles
    if (selectedSubtitleIdx === 999) {
      setSubtitleError(null);
      setSubtitleLoading(false);
      return;
    }

    if (selectedSubtitleIdx === -1 || !subtitles || subtitles.length === 0) {
      setSubtitleCues([]);
      setCurrentSubtitleText('');
      return;
    }

    const subItem = subtitles[selectedSubtitleIdx];
    if (!subItem || !subItem.url) {
      setSubtitleCues([]);
      setCurrentSubtitleText('');
      return;
    }

    setSubtitleLoading(true);
    setSubtitleError(null);
    setSubtitleCues([]);
    setCurrentSubtitleText('');

    fetch(subItem.url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch subtitle file');
        return res.text();
      })
      .then((text) => {
        const parsed = parseSubtitles(text);
        setSubtitleCues(parsed);
        setSubtitleLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching subtitles:', err);
        setSubtitleError('Failed to load subtitles (CORS/Network)');
        setSubtitleLoading(false);
      });
  }, [selectedSubtitleIdx, subtitles]);

  // Sync active subtitle text
  useEffect(() => {
    if (subtitleCues.length === 0 || selectedSubtitleIdx === -1) {
      setCurrentSubtitleText('');
      return;
    }

    const adjustedTime = currentTime + subDelay;
    const activeCue = subtitleCues.find(
      (cue) => adjustedTime >= cue.start && adjustedTime <= cue.end
    );

    if (activeCue) {
      setCurrentSubtitleText(activeCue.text);
    } else {
      setCurrentSubtitleText('');
    }
  }, [currentTime, subtitleCues, subDelay, selectedSubtitleIdx]);

  // Prevent duplicate native subtitles on standard browsers while allowing native iOS fullscreen parsing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hideNativeTracks = () => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        // Disable native text tracks so custom HTML rendering handles it, leaving them accessible to native iOS fullscreen
        tracks[i].mode = 'disabled';
      }
    };

    hideNativeTracks();
    video.addEventListener('loadedmetadata', hideNativeTracks);
    return () => {
      video.removeEventListener('loadedmetadata', hideNativeTracks);
    };
  }, [subtitles, selectedSubtitleIdx]);

  // MediaSession API integration for Lockscreen and Control Center on iOS/Mobile
  useEffect(() => {
    if (!('mediaSession' in navigator) || !videoRef.current) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !videoRef.current) return;

    // Configure Lockscreen Media Metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: 'Runflix Entertainment Premium Streaming',
      album: season !== undefined && episode !== undefined ? `Season ${season} • Episode ${episode}` : 'Cinematic Movies',
      artwork: [
        {
          src: backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
          sizes: '512x512',
          type: 'image/jpeg'
        }
      ]
    });

    // Native iOS Play/Pause actions
    navigator.mediaSession.setActionHandler('play', () => {
      videoRef.current?.play().catch(() => { });
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      videoRef.current?.pause();
      setIsPlaying(false);
    });

    // Native iOS Skip Forward/Backward actions (Lock screen skip controls!)
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const offset = details.seekOffset || 10;
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(videoRef.current.currentTime - offset, 0);
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const offset = details.seekOffset || 10;
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(videoRef.current.currentTime + offset, videoRef.current.duration || 0);
      }
    });

    // Native iOS Next/Previous Episode tracks integration!
    if (hasNextEpisode && onNextEpisode) {
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        onNextEpisode();
      });
    } else {
      navigator.mediaSession.setActionHandler('nexttrack', null);
    }

    if (hasPrevEpisode && onPrevEpisode) {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        onPrevEpisode();
      });
    } else {
      navigator.mediaSession.setActionHandler('previoustrack', null);
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    };
  }, [title, season, episode, backdropUrl, hasNextEpisode, hasPrevEpisode, onNextEpisode, onPrevEpisode]);

  // Sync MediaSession position state for Lock Screen scrubber!
  useEffect(() => {
    if (!('mediaSession' in navigator) || !videoRef.current) return;

    const video = videoRef.current;
    const updatePositionState = () => {
      if (video.duration && !isNaN(video.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: video.duration,
            playbackRate: video.playbackRate || 1,
            position: video.currentTime
          });
        } catch (err) {
          // Ignores standard range bounds warning on loading transitions
        }
      }
    };

    video.addEventListener('timeupdate', updatePositionState);
    return () => {
      video.removeEventListener('timeupdate', updatePositionState);
    };
  }, [duration]);

  // Pre-process all subtitles into same-origin WebVTT Blobs to bypass iOS Safari fullscreen CORS & format blocks
  useEffect(() => {
    if (!subtitles || subtitles.length === 0) {
      setLocalSubTracks([]);
      return;
    }

    let active = true;
    const tracksToRevoke: string[] = [];

    const formatVttTime = (secs: number) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = Math.floor(secs % 60);
      const ms = Math.floor((secs % 1) * 1000);
      const pad = (n: number, z = 2) => ('00' + n).slice(-z);
      return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
    };

    const loadAllSubtitles = async () => {
      const promises = subtitles.map(async (sub, idx) => {
        try {
          const res = await fetch(sub.url);
          if (!res.ok) throw new Error("Failed to fetch subtitle track");
          const text = await res.text();
          const cues = parseSubtitles(text);

          let vtt = "WEBVTT\n\n";
          cues.forEach((cue, cIdx) => {
            vtt += `${cIdx + 1}\n${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}\n${cue.text}\n\n`;
          });

          const blob = new Blob([vtt], { type: 'text/vtt' });
          const blobUrl = URL.createObjectURL(blob);
          tracksToRevoke.push(blobUrl);

          return {
            language: sub.language || 'en',
            label: sub.lanName || sub.language || `Track ${idx + 1}`,
            blobUrl
          };
        } catch (err) {
          console.error("Local track generation error:", err);
          return {
            language: sub.language || 'en',
            label: sub.lanName || sub.language || `Track ${idx + 1}`,
            blobUrl: sub.url
          };
        }
      });

      const loadedTracks = await Promise.all(promises);
      if (active) {
        setLocalSubTracks(loadedTracks);
      }
    };

    loadAllSubtitles();

    return () => {
      active = false;
      tracksToRevoke.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [subtitles]);

  const handleLocalSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const parsed = parseSubtitles(text);
          if (parsed.length === 0) {
            alert('Could not find any subtitle cues. Make sure the file is valid SRT or WebVTT.');
            return;
          }
          setSubtitleCues(parsed);
          setSelectedSubtitleIdx(999); // local custom upload
          setShowSettings(false);
        } catch (err) {
          alert('Error parsing subtitle file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const takeScreenshot = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || video.clientWidth || 1920;
      canvas.height = video.videoHeight || video.clientHeight || 1080;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_Scene_${Math.round(video.currentTime)}s.png`;
      link.href = dataUrl;
      link.click();
      showToast("📸 Screenshot Captured!");
    } catch (err) {
      console.error('Failed to take screenshot (likely CORS issue):', err);
      showToast("🔒 Screenshot blocked by stream CORS protection");
    }
  };

  const getVideoFilterStyle = () => {
    let baseFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    switch (cinematicFilter) {
      case 'cinematic':
        baseFilter += ' contrast(1.1) saturate(1.15) brightness(0.95)';
        break;
      case 'vibrant':
        baseFilter += ' saturate(1.4) contrast(1.05)';
        break;
      case 'warm':
        baseFilter += ' sepia(0.15) hue-rotate(-10deg) saturate(1.1)';
        break;
      case 'cool':
        baseFilter += ' hue-rotate(10deg) saturate(1.05) brightness(1.02)';
        break;
      case 'noir':
        baseFilter += ' grayscale(1) contrast(1.2)';
        break;
      default:
        break;
    }
    return baseFilter;
  };

  // Reset auto skip locks when source changes
  useEffect(() => {
    hasSkippedIntroRef.current = false;
    hasSkippedOutroRef.current = false;
  }, [selectedSourceIdx]);

  // Ambient Cinematic Lighting effect (Throttled & Paused when not playing for maximum performance)
  useEffect(() => {
    if (!ambientGlow || !videoRef.current || !ambientCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = ambientCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let lastRenderTime = 0;
    const THROTTLE_MS = 120; // 8.3 FPS is perfect for blurred glow, saving 90% GPU/CPU overhead!

    const renderAmbient = () => {
      // Completely halt frame requests if video is paused/ended to save 100% CPU overhead
      if (video.paused || video.ended) {
        animId = null;
        return;
      }

      const now = Date.now();
      if (now - lastRenderTime >= THROTTLE_MS) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          lastRenderTime = now;
        } catch (err) {
          // Silence potential canvas security/rendering exceptions
        }
      }
      animId = requestAnimationFrame(renderAmbient);
    };

    const startLoop = () => {
      if (!animId) {
        animId = requestAnimationFrame(renderAmbient);
      }
    };

    const stopLoop = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    // Listeners to start and stop the animation loop dynamically
    video.addEventListener('play', startLoop);
    video.addEventListener('pause', stopLoop);
    video.addEventListener('ended', stopLoop);

    // Initial run check
    if (!video.paused) {
      startLoop();
    } else {
      // Draw single initial static frame
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (err) { }
    }

    return () => {
      video.removeEventListener('play', startLoop);
      video.removeEventListener('pause', stopLoop);
      video.removeEventListener('ended', stopLoop);
      stopLoop();
    };
  }, [ambientGlow]);

  // Auto Hide Controls
  useEffect(() => {
    if (!showControls || isLocked || !isPlaying || (isHoveringControls && !isMobileDevice())) return;

    const CONTROLS_HIDE_DELAY = isMobileDevice() ? 6000 : 10000;

    const timer = setTimeout(() => {
      setShowControls(false);
      setShowSettings(false);
    }, CONTROLS_HIDE_DELAY);

    return () => clearTimeout(timer);
  }, [showControls, isPlaying, isLocked, isHoveringControls, lastInteraction]);

  // Video Events Listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      setHasPlayedOnce(true);
    };
    const lastUiTickRef = { current: 0 };
    const lastSaveTickRef = { current: 0 };

    const persistProgress = () => {
      if (video.currentTime <= 5) return;
      try {
        localStorage.setItem(`rf_progress_${title}`, String(video.currentTime));
        if (video.duration) {
          localStorage.setItem(`rf_progress_${title}_duration`, String(video.duration));
        }
      } catch {
        /* ignore quota errors */
      }
      if (subjectId) {
        useProgressStore.getState().saveProgress(
          String(subjectId),
          season || 1,
          episode || 1,
          video.currentTime,
          video.duration || 0
        );
        if (video.duration && video.currentTime >= video.duration * 0.9) {
          useProgressStore.getState().markEpisodeComplete(
            String(subjectId),
            season || 1,
            episode || 1
          );
        }
      }
    };

    const onPause = () => {
      setIsPlaying(false);
      persistProgress();
      setCurrentTime(video.currentTime);
    };
    const onEnded = () => {
      setIsPlaying(false);
      persistProgress();
      setCurrentTime(video.currentTime);
      if (subjectId) {
        useProgressStore.getState().markEpisodeComplete(
          String(subjectId),
          season || 1,
          episode || 1
        );
      }
    };

    const onTimeUpdate = () => {
      const now = Date.now();
      const t = video.currentTime;

      if (now - lastUiTickRef.current >= 300) {
        lastUiTickRef.current = now;
        setCurrentTime(t);
      }

      if (now - lastSaveTickRef.current >= 5000) {
        lastSaveTickRef.current = now;
        persistProgress();
      }

      // Check Skip Intro trigger (e.g. 5s to 95s)
      if (t >= 5 && t <= 95) {
        setShowIntroSkip(true);
        if (autoSkipIntro && !hasSkippedIntroRef.current) {
          hasSkippedIntroRef.current = true;
          video.currentTime = 95;
        }
      } else {
        setShowIntroSkip(false);
        if (video.currentTime < 5) {
          hasSkippedIntroRef.current = false;
        }
      }

      // Next Episode Outro Trigger (90s before end)
      if (video.duration && video.currentTime >= video.duration - 90) {
        setShowOutroSkip(true);

        // Show Binge Autoplay countdown 20s before end
        if (hasNextEpisode && video.currentTime >= video.duration - 20) {
          setShowNextEpCountdown(true);
          if (autoSkipOutro && !hasSkippedOutroRef.current) {
            hasSkippedOutroRef.current = true;
            if (subjectId) {
              useProgressStore.getState().markEpisodeComplete(
                String(subjectId),
                season || 1,
                episode || 1
              );
            }
            onNextEpisode?.();
          }
        } else {
          setShowNextEpCountdown(false);
        }
      } else {
        setShowOutroSkip(false);
        setShowNextEpCountdown(false);
        if (video.duration && video.currentTime < video.duration - 90) {
          hasSkippedOutroRef.current = false;
        }
      }
    };
    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => {
      const ranges: [number, number][] = [];
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push([video.buffered.start(i), video.buffered.end(i)]);
      }
      setBuffered(ranges);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('progress', onProgress);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('progress', onProgress);
    };
  }, [title, hasNextEpisode, autoSkipIntro, autoSkipOutro, subjectId, season, episode]);

  // Handle Controls toggle
  const togglePlay = () => {
    if (isLocked) return;
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (isMuted) {
        setIsMuted(false);
        video.muted = false;
      }
      video.play().catch(() => { });
    }
  };

  // Skip 10s
  const skip = (seconds: number) => {
    if (isLocked || !videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked || !videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Keep keydown handler updated with latest state/functions to prevent stale closure issues
  const handleKeyDownRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  handleKeyDownRef.current = (e: KeyboardEvent) => {
    const activeEl = document.activeElement as HTMLElement | null;
    if (
      activeEl?.tagName === 'INPUT' ||
      activeEl?.tagName === 'TEXTAREA' ||
      activeEl?.isContentEditable ||
      isLocked
    ) {
      return;
    }
    triggerInteraction();

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        showToast(!isPlaying ? "Playing" : "Paused");
        break;
      case 'ArrowRight':
        e.preventDefault();
        skip(10);
        showToast("Seek Forward +10s");
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skip(-10);
        showToast("Seek Backward -10s");
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsMuted(false);
        setVolume(prev => {
          const nextVol = Math.min(prev + 0.1, 1);
          showToast(`Volume: ${Math.round(nextVol * 100)}%`);
          return nextVol;
        });
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(prev => {
          const nextVol = Math.max(prev - 0.1, 0);
          showToast(`Volume: ${Math.round(nextVol * 100)}%`);
          return nextVol;
        });
        break;
      case 'KeyF':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'KeyM':
        e.preventDefault();
        setIsMuted(prev => {
          showToast(!prev ? "Muted" : "Unmuted");
          return !prev;
        });
        break;
      case 'KeyX':
        e.preventDefault();
        setShowXRay(prev => {
          showToast(!prev ? "X-Ray Overlay Enabled" : "X-Ray Overlay Disabled");
          return !prev;
        });
        break;
      case 'KeyS':
        e.preventDefault();
        takeScreenshot();
        break;
      case 'KeyJ':
        e.preventDefault();
        setSubDelay(prev => {
          const nextDelay = prev + 0.5;
          showToast(`Sub Delay: +${nextDelay.toFixed(1)}s`);
          return nextDelay;
        });
        break;
      case 'KeyH':
        e.preventDefault();
        setSubDelay(prev => {
          const nextDelay = prev - 0.5;
          showToast(`Sub Delay: ${nextDelay.toFixed(1)}s`);
          return nextDelay;
        });
        break;
      case 'BracketRight':
        e.preventDefault();
        setPlaybackRate(prev => {
          const nextRate = Math.min(prev + 0.25, 2);
          showToast(`Speed: ${nextRate.toFixed(2)}x`);
          return nextRate;
        });
        break;
      case 'BracketLeft':
        e.preventDefault();
        setPlaybackRate(prev => {
          const nextRate = Math.max(prev - 0.25, 0.5);
          showToast(`Speed: ${nextRate.toFixed(2)}x`);
          return nextRate;
        });
        break;
      default:
        break;
    }
  };

  // Keyboard navigation & Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleKeyDownRef.current?.(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync Volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Synchronize playbackRate property directly on HTML5 video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Volume Scroll Control (Solving passive listener issue)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (isLocked) return;
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.05 : -0.05;
      if (e.deltaY < 0) {
        setIsMuted(false);
      }
      setVolume(prev => {
        return Math.min(Math.max(prev + step, 0), 1);
      });
    };

    video.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      video.removeEventListener('wheel', handleWheelEvent);
    };
  }, [isLocked, setIsMuted]);

  // Fullscreen on the wrapper container with fallbacks (video fullscreen, pseudo-fullscreen)
  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      setIsFullscreen(false);
      showToast('Exited fullscreen');
      return;
    }

    try {
      const entering = await toggleElementFullscreen(container);
      setIsFullscreen(entering);
      showToast(entering ? 'Fullscreen' : 'Exited fullscreen');
    } catch (err) {
      console.warn('Native container fullscreen failed, trying native video fullscreen...', err);

      // iOS iPhone Safari Fallback: supports webkitEnterFullscreen on video directly
      if (video && (video as any).webkitEnterFullscreen) {
        try {
          (video as any).webkitEnterFullscreen();
          setIsFullscreen(true);
          showToast('Fullscreen');
          return;
        } catch (videoErr) {
          console.error('Video webkitEnterFullscreen failed:', videoErr);
        }
      }

      // Interactive Pseudo-Fullscreen fallback (always supported on any browser/restricted iframe)
      setIsPseudoFullscreen(true);
      setIsFullscreen(true);
      showToast('Fullscreen');
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncFullscreen = () => {
      const active = isElementFullscreen(container);
      setIsFullscreen(active);
      if (!active) {
        setIsPseudoFullscreen(false);
      }
      container.setAttribute('data-fullscreen', active ? 'true' : 'false');
    };

    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen as EventListener);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (e.key === 'Escape') {
        if (isPseudoFullscreen) {
          setIsPseudoFullscreen(false);
          setIsFullscreen(false);
          showToast('Exited fullscreen');
        } else if (container && isElementFullscreen(container)) {
          void toggleElementFullscreen(container).catch(() => { });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen, isPseudoFullscreen]);

  // PIP floating mode
  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video || document.pictureInPictureElement) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      return;
    }
    try {
      await video.requestPictureInPicture();
    } catch (err) {
      console.error(err);
    }
  };

  // Aspect ratio class selection
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video object-contain';
      case '4:3': return 'aspect-[4/3] object-contain';
      case 'stretch': return 'w-full h-full object-fill';
      case 'zoom': return 'w-full h-full object-cover scale-110';
      default: return 'w-full h-full object-contain';
    }
  };

  // Next episode countdown logic
  useEffect(() => {
    if (!showNextEpCountdown) return;
    const timer = setInterval(() => {
      setNextEpCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (subjectId) {
            useProgressStore.getState().markEpisodeComplete(
              String(subjectId),
              season || 1,
              episode || 1
            );
          }
          onNextEpisode?.();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showNextEpCountdown, subjectId, season, episode]);

  const rotationFitScale = useVideoRotationFit(
    containerRef,
    videoRef,
    rotation,
    isFullscreen
  );

  const videoTransform =
    rotation === 0
      ? undefined
      : rotation === 180
        ? 'rotate(180deg)'
        : `rotate(${rotation}deg) scale(${rotationFitScale})`;

  const mobile = isMobileDevice();

  return (
    <motion.div
      id="playerContainer"
      ref={containerRef}
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      data-rotation={String(rotation)}
      onClick={() => {
        setShowControls(prev => !prev);
        setLastInteraction(Date.now());
      }}
      onMouseMove={triggerInteraction}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onTouchStart={mobile ? undefined : triggerInteraction}
      className={cn(
        'rf-player-container relative w-full h-[65vh] md:h-[75vh] bg-black rounded-3xl overflow-hidden border border-white/8 flex items-center justify-center group/player',
        isPseudoFullscreen && 'rf-pseudo-fullscreen',
        !showControls && 'cursor-none',
        className
      )}
    >
      {/* ============ CINEMATIC AMBIENT LIGHTING BACKGROUND ============ */}
      {ambientGlow && (
        <canvas
          ref={ambientCanvasRef}
          width={16}
          height={9}
          className="absolute inset-0 w-full h-full opacity-50 blur-[80px] pointer-events-none scale-125 z-0"
        />
      )}

      {/* ============ PRIMARY VIDEO (rotation applied here; fullscreen is on container) ============ */}
      <div className="rf-player-stage">
        <video
          ref={videoRef}
          autoPlay
          onClick={(e) => {
            e.stopPropagation();
            setShowControls(prev => !prev);
            if (isMuted) {
              setIsMuted(false);
              if (videoRef.current) {
                videoRef.current.muted = false;
              }
              showToast('🔊 Audio Unmuted');
            } else if (!isMobileDevice()) {
              togglePlay();
            }
          }}
          style={{
            filter: getVideoFilterStyle(),
            transform: isFullscreen ? undefined : videoTransform,
          }}
          data-rotation={String(rotation)}
          crossOrigin={videoCrossOrigin}
          className={cn(
            'rf-player-video w-full h-full select-none pointer-events-auto',
            getAspectClass()
          )}
          playsInline
        >
          {localSubTracks.length > 0 ? (
            localSubTracks.map((track, i) => (
              <track
                key={i}
                kind="subtitles"
                src={track.blobUrl}
                srcLang={track.language}
                label={track.label}
                default={selectedSubtitleIdx === i}
              />
            ))
          ) : (
            subtitles && subtitles.map((sub, i) => (
              <track
                key={sub.id || i}
                kind="subtitles"
                src={sub.url}
                srcLang={sub.language || 'en'}
                label={sub.lanName || sub.language || `Track ${i + 1}`}
                default={selectedSubtitleIdx === i}
              />
            ))
          )}
        </video>

        {/* ============ AUDIO DESCRIPTION / ROTATING SUBTITLES RENDERER ============ */}
        {selectedSubtitleIdx >= 0 && (
          <div
            style={{
              transform: isFullscreen ? undefined : videoTransform,
            }}
            data-rotation={String(rotation)}
            className={cn(
              'rf-player-subtitles-wrapper absolute inset-0 pointer-events-none z-20 flex items-end justify-center pb-[8%]',
              getAspectClass()
            )}
          >
            <div className="text-center w-[90%] max-w-2xl flex flex-col items-center">
              {subtitleLoading && (
                <div className="bg-black/60 backdrop-blur-sm text-white/70 px-4 py-1.5 rounded-lg text-xs inline-block">
                  Loading subtitles...
                </div>
              )}
              {subtitleError && (
                <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/40 text-red-200 px-4 py-1.5 rounded-lg text-xs inline-block">
                  {subtitleError}
                </div>
              )}
              {currentSubtitleText && (
                <div
                  style={{
                    fontSize: `${subTextSize}%`,
                    color: subColor === 'yellow' ? '#fde047' : subColor === 'cyan' ? '#22d3ee' : subColor === 'green' ? '#4ade80' : '#ffffff',
                    textShadow: subBackground === 'shadow' ? '0 2px 4px rgba(0,0,0,0.9), -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 1px 1px 0px #000, -2px 2px 0px #000, 2px -2px 0px #000' : 'none',
                  }}
                  className={cn(
                    "px-4 py-1.5 transition-all font-sans font-extrabold tracking-wide leading-relaxed inline-block whitespace-pre-line text-center text-white",
                    subBackground === 'translucent' && "bg-black/60 backdrop-blur-[2px] rounded-xl border border-white/5",
                    subBackground === 'solid' && "bg-black rounded-lg",
                    subBackground === 'shadow' && "bg-transparent border-none"
                  )}
                >
                  {currentSubtitleText}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============ GIANT PLAY BUTTON OVERLAY (FOR PAUSED INITS / BLOCKED AUTOPLAY ONLY) ============ */}
      {!isPlaying && !hasPlayedOnce && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-15 flex items-center justify-center cursor-pointer pointer-events-auto transition-all"
        >
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 rounded-full bg-(--rf-red) hover:bg-(--rf-red-deep) flex items-center justify-center text-white shadow-2xl shadow-(--rf-red)/35 border border-white/10 active:scale-95 transition-transform"
            aria-label="Play Movie"
          >
            <Play size={32} className="fill-current ml-2 text-white" />
          </motion.button>
        </div>
      )}



      {/* Tiny Elegant Unlock Button when Locked (doesn't overlay or block movie view) */}
      {isLocked && (
        <div className="absolute top-4 right-4 z-40 pointer-events-auto">
          <button
            onClick={() => {
              setIsLocked(false);
              showToast("🔓 Controls Unlocked");
            }}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-xl"
            title="Unlock Controls"
          >
            <Lock size={18} className="animate-pulse" />
          </button>
        </div>
      )}

      {/* ============ ON-SCREEN DISPLAY (OSD) TOAST NOTIFICATION ============ */}
      {playerNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-2xl animate-[bounce_0.8s_infinite] select-none pointer-events-none">
          <Sparkles size={12} className="text-(--rf-red) animate-pulse" />
          <span>{playerNotification}</span>
        </div>
      )}

      {/* ============ WATERMARK OVERLAY ============ */}
      <div className="absolute top-8 left-8 z-20 pointer-events-none opacity-20 select-none text-[10px] font-mono text-white tracking-widest uppercase">
        Runflix Entertainment Client // Anonymous Stream
      </div>

      {/* ============ RESUME AUTO-PLAY SPOT PROMPT ============ */}
      {hasSavedProgress && (
        <div className="absolute bottom-20 left-6 z-40 bg-black/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3.5 text-xs font-bold text-white shadow-2xl select-none animate-[fadeIn_0.3s_ease]">
          <RotateCcw className="text-(--rf-red) animate-pulse" size={14} />
          <span className="text-(--rf-text-muted) font-medium">
            Resume from <span className="text-white font-bold">{Math.floor(savedTime / 60)}m {Math.round(savedTime % 60)}s</span>?
          </span>
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <button
              onClick={() => {
                pendingResumeRef.current = false;
                if (videoRef.current) videoRef.current.currentTime = savedTime;
                setHasSavedProgress(false);
              }}
              className="bg-(--rf-red) hover:bg-(--rf-red)/80 hover:scale-105 active:scale-95 text-white px-3 py-1.5 rounded-xl transition-all font-semibold"
            >
              Resume
            </button>
            <button
              onClick={() => {
                pendingResumeRef.current = false;
                if (videoRef.current) videoRef.current.currentTime = 0;
                setHasSavedProgress(false);
              }}
              className="bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 text-white/80 hover:text-white px-3 py-1.5 rounded-xl transition-all font-semibold"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* ============ TELEMETRY/QOS OVERLAY ============ */}
      {showTelemetryOverlay && (
        <div className="absolute top-16 right-4 z-40 bg-black/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl w-64 shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-black text-white flex items-center gap-1.5 animate-pulse">
              <Sliders size={12} className="text-(--rf-red)" /> Telemetry Monitor
            </span>
            <button
              onClick={() => setShowTelemetryOverlay(false)}
              className="text-[10px] text-(--rf-text-muted) hover:text-white"
            >
              Close
            </button>
          </div>

          {/* Real-time Network Pulse visualization */}
          <div className="flex items-end justify-between h-8 bg-white/2 border border-white/5 rounded-lg px-2.5 py-1 mb-3">
            <span className="text-[9px] font-black uppercase text-white/40 mb-1 font-mono">QoS Engine</span>
            <div className="flex gap-0.5 items-end h-full">
              <span className="w-0.75 bg-red-500/20 rounded-full h-2"></span>
              <span className="w-0.75 bg-red-500/40 rounded-full h-4"></span>
              <span className="w-0.75 bg-red-500/60 rounded-full h-3"></span>
              <span className="w-0.75 bg-red-500/70 rounded-full h-5"></span>
              <span className="w-0.75 bg-red-500/80 rounded-full h-4.5"></span>
              <span className="w-0.75 bg-(--rf-red) rounded-full h-6 animate-[pulse_0.4s_infinite_alternate]"></span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono text-(--rf-text-muted)">
            <div className="flex justify-between"><span>Startup Time (VST)</span><span className="text-white">{metrics.vst} ms</span></div>
            <div className="flex justify-between"><span>Active Bitrate</span><span className="font-bold text-(--rf-red)">{metrics.bitrate}</span></div>
            <div className="flex justify-between"><span>Active Resolution</span><span className="text-white">{videoRef.current ? `${videoRef.current.videoWidth || 1920}x${videoRef.current.videoHeight || 1080}` : '1920x1080'}</span></div>
            <div className="flex justify-between"><span>Buffer Load</span><span className="text-white">{videoRef.current?.buffered.length ? `${((videoRef.current.buffered.end(videoRef.current.buffered.length - 1) / (videoRef.current.duration || 1)) * 100).toFixed(0)}%` : '0%'}</span></div>
            <div className="flex justify-between"><span>Engine Codec</span><span className="text-white">{metrics.codec}</span></div>
            <div className="flex justify-between"><span>Latency Buffer</span><span className="text-white">{metrics.latency}</span></div>
            <div className="flex justify-between"><span>Dropped Frames</span><span className="font-bold text-yellow-500">{metrics.droppedFrames}</span></div>
            <div className="flex justify-between"><span>Active FPS</span><span className="text-white">{metrics.fps} FPS</span></div>
          </div>
        </div>
      )}

      {/* ============ AD BLOCK countermeasures MOCK ============ */}
      {adBlockCounter && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-8 text-center">
          <Shield className="text-(--rf-red) mb-4 animate-bounce" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">Adblocker Detected</h3>
          <p className="text-sm text-(--rf-text-muted) max-w-md mb-6">
            Please disable your browser's Adblock extension to unlock streaming now. Our server network relies on sponsored cookies to deliver free streams.
          </p>
          <button
            onClick={() => setAdBlockCounter(false)}
            className="btn-primary px-6 py-3"
          >
            I've Disabled It
          </button>
        </div>
      )}

      {/* ============ SKIP INTRO OVERLAY CARD ============ */}
      {showIntroSkip && (
        <button
          onClick={() => {
            if (videoRef.current) videoRef.current.currentTime = 95;
            setShowIntroSkip(false);
          }}
          className="absolute bottom-20 right-6 z-40 bg-black/90 backdrop-blur-xl border border-white/10 hover:border-(--rf-red)/50 px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-white transition-all shadow-2xl active:scale-95"
        >
          <SkipForward size={14} /> Skip Intro / Recap
        </button>
      )}

      {/* ============ SKIP OUTRO OVERLAY CARD ============ */}
      {showOutroSkip && !showNextEpCountdown && (
        <button
          onClick={() => {
            if (subjectId) {
              useProgressStore.getState().markEpisodeComplete(
                String(subjectId),
                season || 1,
                episode || 1
              );
            }
            if (hasNextEpisode) {
              onNextEpisode?.();
            } else if (videoRef.current) {
              videoRef.current.currentTime = videoRef.current.duration - 5;
            }
          }}
          className="absolute bottom-20 right-6 z-40 bg-black/90 backdrop-blur-xl border border-white/10 hover:border-(--rf-red)/50 px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-white transition-all shadow-2xl active:scale-95"
        >
          <SkipForward size={14} /> {hasNextEpisode ? 'Skip Outro / Play Next' : 'Skip Outro / Credits'}
        </button>
      )}

      {/* ============ AI RECAP OVERLAY ============ */}
      {showRecap && (
        <div className="absolute top-24 left-6 z-40 bg-black/95 backdrop-blur-2xl border border-(--rf-red)/20 p-5 rounded-3xl w-80 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain size={16} className="text-(--rf-red)" />
              AI Episode Recap
            </h4>
            <button
              onClick={() => setShowRecap(false)}
              className="text-(--rf-text-muted) hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <div className="text-xs text-(--rf-text-muted) leading-relaxed">
            {recapLoading ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 size={24} className="animate-spin text-(--rf-red) mb-2" />
                <span className="text-[10px] uppercase tracking-wider animate-pulse">Generating recap...</span>
              </div>
            ) : recapText ? (
              <p>{recapText}</p>
            ) : (
              <p className="text-red-400">Failed to generate recap. Please try again.</p>
            )}
          </div>
        </div>
      )}

      {/* ============ NEXT EPISODE COUNTDOWN OVERLAY ============ */}
      {showNextEpCountdown && (
        <div className="absolute bottom-24 right-6 z-40 bg-black/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl w-64 shadow-2xl flex flex-col">
          <span className="text-[10px] font-black text-(--rf-red) uppercase tracking-wider mb-1">
            Binge Autoplay
          </span>
          <h6 className="text-xs font-bold text-white line-clamp-1 mb-3">Up Next in {nextEpCountdown}s...</h6>
          <div className="flex gap-2">
            <button
              onClick={() => onNextEpisode?.()}
              className="btn-primary text-[10px] flex-1 py-2"
            >
              Play Now
            </button>
            <button
              onClick={() => setShowNextEpCountdown(false)}
              className="btn-glass text-[10px] flex-1 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}





      {/* ============ CUSTOM VIEW CONTROLS SKIN (not rotated — stays readable) ============ */}
      <div
        className={cn(
          'rf-player-controls absolute inset-0 z-20 flex flex-col justify-between transition-all duration-300 pointer-events-none bg-linear-to-t from-black/80 via-transparent to-black/60',
          showControls && !isLocked ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Top Header Controls */}
        <div
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
          onClick={(e) => e.stopPropagation()}
          className="p-4 flex items-center justify-between pointer-events-auto w-full"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
            {onBack && (
              <button
                onClick={onBack}
                className="text-white/80 hover:text-white transition-colors w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 shrink-0"
                title="Back"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-white truncate max-w-30 sm:max-w-xs">{title}</span>
              {selectedSource && (
                <span className="text-[8px] sm:text-[9px] font-black bg-white/10 px-1.5 py-0.5 rounded text-white/70 uppercase w-max">
                  {selectedSource.quality}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Show Episodes Button Toggle */}
            {onShowEpisodes && (
              <button
                onClick={() => {
                  if (document.fullscreenElement || window.innerWidth < 1024) {
                    setShowEpisodesOverlay(true);
                  } else {
                    onShowEpisodes();
                  }
                }}
                className="text-white/60 hover:text-white transition-colors w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                title="Episodes List"
              >
                <List size={16} />
              </button>
            )}

            {/* X-Ray Button Toggle */}
            {stars.length > 0 && (
              <button
                onClick={() => setShowXRay(!showXRay)}
                className={cn(
                  "text-[10px] font-bold h-8 px-2 rounded-lg border transition-all flex items-center gap-1",
                  showXRay
                    ? "bg-(--rf-red) border-none text-white shadow-lg shadow-(--rf-red)/20"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                )}
                title="Toggle Amazon X-Ray Overlay"
              >
                <Sparkles size={12} />
                <span className="hidden sm:inline">X-Ray</span>
              </button>
            )}

            {/* AI Recap Button (TV Series Only) */}
            {season !== undefined && episode !== undefined && episode > 1 && (
              <button
                onClick={async () => {
                  setShowRecap(true);
                  if (!recapText && !recapLoading) {
                    setRecapLoading(true);
                    try {
                      const text = await aiRecap(title, season, episode);
                      setRecapText(text);
                    } catch (err) {
                      console.error('Recap error:', err);
                      setRecapText('');
                    } finally {
                      setRecapLoading(false);
                    }
                  }
                }}
                className={cn(
                  "text-[10px] font-bold h-8 px-2 rounded-lg border transition-all flex items-center gap-1.5",
                  showRecap
                    ? "bg-(--rf-red) border-(--rf-red) text-white shadow-lg shadow-(--rf-red)/20"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-(--rf-red)/20 hover:border-(--rf-red)/30 hover:text-(--rf-red)"
                )}
                title="AI Episode Recap"
              >
                <Brain size={12} className={showRecap ? 'animate-pulse' : ''} />
                <span className="hidden sm:inline">Recap</span>
              </button>
            )}

            {/* Picture In Picture Floating Player */}
            <button
              onClick={togglePictureInPicture}
              className="text-white/60 hover:text-white transition-colors w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              title="Picture In Picture Mini Window"
            >
              <Monitor size={16} />
            </button>

            {/* Settings Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setActiveMenu('main');
                }}
                className="text-white/60 hover:text-white transition-colors relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              >
                <Settings size={16} />
              </button>

              {/* Glassmorphic Settings popout */}
              {showSettings && (
                <div className="absolute top-10 right-0 z-50 w-64 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-1 max-h-[85vh] overflow-y-auto">
                  {activeMenu === 'main' && (
                    <>
                      <button
                        onClick={() => setActiveMenu('quality')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Monitor size={14} /> Quality</span>
                        <span className="text-[10px] text-(--rf-text-muted) uppercase">Auto ({selectedSource?.quality})</span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('speed')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Flame size={14} /> Speed</span>
                        <span className="text-[10px] text-(--rf-text-muted)">{playbackRate}x</span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('subtitles')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Captions size={14} /> Subtitles Track</span>
                        <span className="text-[10px] text-(--rf-text-muted)">
                          {selectedSubtitleIdx === -1 ? 'Off' : selectedSubtitleIdx === 999 ? 'Custom' : (subtitles[selectedSubtitleIdx]?.lanName || subtitles[selectedSubtitleIdx]?.language || `Track ${selectedSubtitleIdx + 1}`)}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('subtitles-style')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Sliders size={14} /> Subtitle Style</span>
                        <span className="text-[10px] text-(--rf-text-muted)">Customize</span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('adjustments')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Sparkles size={14} /> Adjustments</span>
                        <span className="text-[10px] text-(--rf-text-muted) capitalize">{cinematicFilter === 'normal' ? 'Normal' : cinematicFilter}</span>
                      </button>
                      <button
                        onClick={() => setActiveMenu('autoskip')}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Tv size={14} /> Auto Skip</span>
                        <span className="text-[10px] text-(--rf-text-muted)">
                          {autoSkipIntro || autoSkipOutro ? 'Active' : 'Off'}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setAspectRatio(prev => {
                            const list: typeof aspectRatio[] = ['original', '16:9', '4:3', 'stretch', 'zoom'];
                            const idx = (list.indexOf(prev) + 1) % list.length;
                            return list[idx];
                          });
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Sliders size={14} /> Aspect Ratio</span>
                        <span className="text-[10px] text-(--rf-text-muted) capitalize">{aspectRatio}</span>
                      </button>



                      <button
                        onClick={() => {
                          setAmbientGlow(prev => !prev);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Flame size={14} /> Ambient Lighting</span>
                        <span className="text-[10px] text-(--rf-text-muted)">{ambientGlow ? 'ON' : 'OFF'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowTelemetryOverlay(prev => !prev);
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Info size={14} /> Telemetry Monitor</span>
                        <span className="text-[10px] text-(--rf-text-muted)">{showTelemetryOverlay ? 'Active' : 'Show'}</span>
                      </button>

                      <button
                        onClick={() => {
                          takeScreenshot();
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Camera size={14} /> Screen Capture</span>
                        <span className="text-[10px] text-(--rf-text-muted)">Snap</span>
                      </button>

                      <button
                        onClick={() => {
                          setAdBlockCounter(true);
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl transition-all"
                      >
                        <span className="flex items-center gap-2"><Shield size={14} /> Security Protection</span>
                        <span className="text-[10px] text-green-400 font-bold">SECURE</span>
                      </button>
                    </>
                  )}

                  {activeMenu === 'quality' && (
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-(--rf-red) uppercase border-b border-white/5 mb-1"
                      >
                        ← Back
                      </button>
                      {sources.map((src, i) => (
                        <button
                          key={src.id || i}
                          onClick={() => {
                            setSelectedSourceIdx(i);
                            setShowSettings(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                            selectedSourceIdx === i ? "bg-(--rf-red) text-white" : "text-white/70 hover:bg-white/10"
                          )}
                        >
                          {src.quality} ({src.size})
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === 'speed' && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-(--rf-red) uppercase border-b border-white/5 mb-1"
                      >
                        ← Back
                      </button>
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map(rate => (
                        <button
                          key={rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            setShowSettings(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                            playbackRate === rate ? "bg-(--rf-red) text-white" : "text-white/70 hover:bg-white/10"
                          )}
                        >
                          {rate === 1 ? 'Normal' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === 'subtitles' && (
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-(--rf-red) uppercase border-b border-white/5 mb-1"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSubtitleIdx(-1);
                          setShowSettings(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                          selectedSubtitleIdx === -1 ? "bg-(--rf-red) text-white" : "text-white/70 hover:bg-white/10"
                        )}
                      >
                        Off (None)
                      </button>
                      {subtitles.map((sub, i) => (
                        <button
                          key={sub.id || i}
                          onClick={() => {
                            setSelectedSubtitleIdx(i);
                            setShowSettings(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                            selectedSubtitleIdx === i ? "bg-(--rf-red) text-white" : "text-white/70 hover:bg-white/10"
                          )}
                        >
                          {sub.lanName || sub.language || `Track ${i + 1}`}
                        </button>
                      ))}
                      <label className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/10 rounded-xl cursor-pointer transition-colors border-t border-white/5 mt-1 pt-2">
                        <Upload size={12} className="text-(--rf-red)" />
                        <span>Upload SRT/VTT</span>
                        <input
                          type="file"
                          accept=".srt,.vtt"
                          onChange={handleLocalSubtitleUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {activeMenu === 'subtitles-style' && (
                    <div className="flex flex-col gap-3 p-1">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left py-1 text-[10px] font-bold text-(--rf-red) uppercase border-b border-white/5"
                      >
                        ← Back
                      </button>

                      {/* Font Size */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] text-white/80 font-bold uppercase tracking-wider">
                          <span>Text Size</span>
                          <span className="text-(--rf-red)">{subTextSize}%</span>
                        </div>
                        <div className="flex gap-1">
                          {[75, 100, 125, 150].map((size) => (
                            <button
                              key={size}
                              onClick={() => setSubTextSize(size)}
                              className={cn(
                                "flex-1 py-1 text-[10px] rounded-lg border font-bold transition-all",
                                subTextSize === size
                                  ? "bg-(--rf-red) border-none text-white"
                                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                              )}
                            >
                              {size}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Color */}
                      <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2">
                        <div className="flex justify-between items-center text-[10px] text-white/80 font-bold uppercase tracking-wider">
                          <span>Text Color</span>
                          <span className="text-(--rf-red) capitalize">{subColor}</span>
                        </div>
                        <div className="flex gap-1">
                          {(['white', 'yellow', 'cyan', 'green'] as const).map((color) => (
                            <button
                              key={color}
                              onClick={() => setSubColor(color)}
                              className={cn(
                                "flex-1 py-1 text-[10px] rounded-lg border font-bold transition-all capitalize",
                                subColor === color
                                  ? "bg-(--rf-red) border-none text-white"
                                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                              )}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Background Style */}
                      <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2">
                        <div className="flex justify-between items-center text-[10px] text-white/80 font-bold uppercase tracking-wider">
                          <span>Background</span>
                          <span className="text-(--rf-red) capitalize">{subBackground}</span>
                        </div>
                        <div className="flex gap-1">
                          {(['translucent', 'solid', 'shadow'] as const).map((bg) => (
                            <button
                              key={bg}
                              onClick={() => setSubBackground(bg)}
                              className={cn(
                                "flex-1 py-1 text-[10px] rounded-lg border font-bold transition-all capitalize",
                                subBackground === bg
                                  ? "bg-(--rf-red) border-none text-white"
                                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                              )}
                            >
                              {bg}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Subtitle Delay */}
                      <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2">
                        <div className="flex justify-between items-center text-[10px] text-white/80 font-bold uppercase tracking-wider">
                          <span>Sync Delay</span>
                          <span className="text-(--rf-red)">{subDelay >= 0 ? `+${subDelay.toFixed(1)}s` : `${subDelay.toFixed(1)}s`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSubDelay(prev => prev - 0.5)}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white text-xs font-bold"
                          >
                            -0.5s
                          </button>
                          <button
                            onClick={() => setSubDelay(0)}
                            className="flex-1 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => setSubDelay(prev => prev + 0.5)}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white text-xs font-bold"
                          >
                            +0.5s
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMenu === 'adjustments' && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left px-3 py-1.5 text-[10px] font-bold text-(--rf-red) uppercase border-b border-white/5 mb-1"
                      >
                        ← Back
                      </button>
                      {['normal', 'cinematic', 'warm', 'noir', 'vibrant'].map(filter => (
                        <button
                          key={filter}
                          onClick={() => {
                            setCinematicFilter(filter as any);
                            setShowSettings(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors capitalize",
                            cinematicFilter === filter ? "bg-(--rf-red) text-white" : "text-white/70 hover:bg-white/10"
                          )}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === 'autoskip' && (
                    <div className="flex flex-col gap-3 p-1">
                      <button
                        onClick={() => setActiveMenu('main')}
                        className="text-left py-1 text-[10px] font-bold text-(--rf-red) uppercase border-b border-white/5"
                      >
                        ← Back
                      </button>

                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Skip Intro Section</span>
                          <button
                            onClick={() => setAutoSkipIntro(!autoSkipIntro)}
                            className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded border transition-all",
                              autoSkipIntro
                                ? "bg-green-500/25 border-green-500/50 text-green-400"
                                : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {autoSkipIntro ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                          <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Skip Outro/Credits</span>
                          <button
                            onClick={() => setAutoSkipOutro(!autoSkipOutro)}
                            className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded border transition-all",
                              autoSkipOutro
                                ? "bg-green-500/25 border-green-500/50 text-green-400"
                                : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {autoSkipOutro ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                        <p className="text-[10px] text-(--rf-text-muted) leading-relaxed border-t border-white/5 pt-2 mt-1">
                          Bridges the gap during binge sessions. Intro sections are jumped through instantly, and the next episode will start automatically as credits begin rolling.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center play buttons overlay */}
        <div
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-6 pointer-events-auto"
        >
          <button
            onClick={() => skip(-10)}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-(--rf-red) hover:bg-(--rf-red-deep) flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
          >
            {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
          </button>
          <button
            onClick={() => skip(10)}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Bottom controls panel */}
        <div
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
          onClick={(e) => e.stopPropagation()}
          className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3 pointer-events-auto"
        >
          {/* Custom seekbar progress timeline */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-xs text-(--rf-text-muted) select-none">
              {(() => {
                const h = Math.floor(currentTime / 3600);
                const m = Math.floor((currentTime % 3600) / 60);
                const s = Math.floor(currentTime % 60);
                return h > 0
                  ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
                  : `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
              })()}
            </span>
            <div className="relative flex-1 group/timeline flex items-center h-4 cursor-pointer">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-(--rf-red) h-1 rounded bg-white/10 cursor-pointer appearance-none outline-none group-hover/timeline:h-1.5 transition-all"
              />
            </div>
            <span className="text-xs text-(--rf-text-muted) select-none">
              {(() => {
                const d = duration || 0;
                const h = Math.floor(d / 3600);
                const m = Math.floor((d % 3600) / 60);
                const s = Math.floor(d % 60);
                return h > 0
                  ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
                  : `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
              })()}
            </span>
          </div>

          {/* Controls Bar Row */}
          <div className="flex items-center justify-between mt-3 sm:mt-0 pt-1 sm:pt-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Previous Episode */}
              {hasPrevEpisode && onPrevEpisode && (
                <button
                  onClick={onPrevEpisode}
                  className="text-white/60 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent shrink-0"
                  title="Previous Episode"
                >
                  <SkipBack className="w-5 h-5 md:w-4.5 md:h-4.5" />
                </button>
              )}

              {/* Play Pause */}
              <button
                onClick={togglePlay}
                className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent shrink-0"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-5 h-5 md:w-4.5 md:h-4.5" /> : <Play className="w-5 h-5 md:w-4.5 md:h-4.5" />}
              </button>

              {/* Next Episode */}
              {hasNextEpisode && onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  className="text-white/60 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent shrink-0"
                  title="Next Episode"
                >
                  <SkipForward className="w-5 h-5 md:w-4.5 md:h-4.5" />
                </button>
              )}

              {/* Volume Controls */}
              <div className="flex items-center gap-1 group/volume shrink-0">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent"
                  title="Mute/Unmute"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 md:w-4.5 md:h-4.5" /> : <Volume2 className="w-5 h-5 md:w-4.5 md:h-4.5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-0 group-hover/volume:w-16 h-1 rounded bg-white/20 cursor-pointer accent-white transition-all appearance-none outline-none hidden md:block"
                />
              </div>
            </div>

            {/* Right Buttons settings */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              {/* Rotation control */}
              <button
                onClick={() => {
                  setRotation((prev) => {
                    const next = ((prev + 90) % 360) as 0 | 90 | 180 | 270;
                    showToast(`Rotated ${next}°`);
                    return next;
                  });
                }}
                className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent"
                title={`Rotate video (${rotation}°)`}
              >
                <RefreshCw className={cn("transition-transform duration-500 w-5 h-5 md:w-4.5 md:h-4.5", rotation === 90 ? "rotate-90" : rotation === 180 ? "rotate-180" : rotation === 270 ? "rotate-270" : "rotate-0")} />
              </button>

              {/* Fullscreen control */}
              <button
                onClick={toggleFullscreen}
                className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-5 h-5 md:w-4.5 md:h-4.5" /> : <Maximize className="w-5 h-5 md:w-4.5 md:h-4.5" />}
              </button>

              {/* Locked Player Interface control */}
              <button
                onClick={() => setIsLocked(true)}
                className="text-white/80 hover:text-white transition-all duration-300 w-12 h-12 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 bg-white/5 md:bg-transparent shadow-md md:shadow-none border border-white/5 md:border-transparent"
                title="Lock Controls UI"
              >
                <Unlock className="w-5 h-5 md:w-4.5 md:h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sliding sidebar container for Episodes inside Player Viewport (for Mobile and Fullscreen) */}
      <AnimatePresence>
        {showEpisodesOverlay && seasons && seasons.length > 0 && (
          <>
            {/* Backdrop overlay inside player */}
            <div
              onClick={() => setShowEpisodesOverlay(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 cursor-pointer pointer-events-auto select-none"
            />
            <div className="absolute inset-y-0 right-0 z-40 w-72 sm:w-80 h-full bg-black/95 backdrop-blur-2xl border-l border-white/10 p-4 flex flex-col gap-3 pointer-events-auto select-none overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                <span className="text-[10px] font-black text-(--rf-red) uppercase tracking-wider">Episodes Menu</span>
                <button
                  onClick={() => setShowEpisodesOverlay(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Season Selection */}
              <div>
                <label className="block text-[8px] font-bold text-(--rf-text-dim) mb-1 uppercase tracking-wider">
                  Select Season
                </label>
                <div className="flex flex-wrap gap-1">
                  {seasons
                    .filter((s) => s.se > 0)
                    .map((s) => (
                      <button
                        key={s.se}
                        onClick={() => setEpViewingSeason(s.se)}
                        className={cn(
                          "px-2 py-1 text-[10px] font-bold rounded-lg border transition-all flex-1 text-center min-w-12.5",
                          epViewingSeason === s.se
                            ? "bg-(--rf-red) border-none text-white shadow-lg shadow-(--rf-red)/20"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-white/60"
                        )}
                      >
                        S{s.se}
                      </button>
                    ))}
                </div>
              </div>

              <div className="border-t border-white/5 my-0.5"></div>

              {/* Episodes list */}
              <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1 scrollbar-hide">
                <span className="text-[8px] font-bold text-(--rf-text-dim) uppercase tracking-wider mb-0.5 block">
                  Episodes in Season {epViewingSeason}
                </span>

                <div className="space-y-1 pb-4">
                  {Array.from({ length: seasons.find(s => s.se === epViewingSeason)?.maxEp || 0 }, (_, i) => i + 1).map((ep) => {
                    const isCurrent = ep === episode && epViewingSeason === season;
                    const isCompleted = subjectId && useProgressStore.getState().isEpisodeComplete(subjectId, epViewingSeason, ep);

                    // Dynamic Episode Progress tracking
                    let realEpProgress = 0;
                    if (isCompleted) {
                      realEpProgress = 100;
                    } else {
                      const epTitle = `${title.split(' - ')[0]} - S${epViewingSeason}E${ep}`;
                      const savedTimeVal = localStorage.getItem(`rf_progress_${epTitle}`);
                      const durationVal = localStorage.getItem(`rf_progress_${epTitle}_duration`);
                      if (savedTimeVal && durationVal) {
                        const t = parseFloat(savedTimeVal);
                        const d = parseFloat(durationVal);
                        if (d > 0) {
                          realEpProgress = Math.min((t / d) * 100, 100);
                        }
                      }
                    }

                    return (
                      <button
                        key={`s${epViewingSeason}-e${ep}`}
                        onClick={() => {
                          onEpisodeSelect?.(epViewingSeason, ep);
                          setShowEpisodesOverlay(false);
                        }}
                        className={cn(
                          "w-full text-left p-1.5 rounded-xl border transition-all duration-300 flex gap-2 relative overflow-hidden group",
                          isCurrent
                            ? "bg-white/4 border-(--rf-red)/40 shadow-lg shadow-(--rf-red)/5"
                            : "bg-white/1 border-white/5 hover:border-white/10 hover:bg-white/3"
                        )}
                      >
                        {/* 16:9 Mini Thumbnail */}
                        <div className="relative w-16 aspect-video rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/10">
                          {backdropUrl && (
                            <img
                              src={backdropUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-500"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            {isCurrent ? (
                              <div className="flex gap-0.5 items-end justify-center h-3 w-5">
                                <span className="w-0.5 bg-(--rf-red) animate-[pulse_0.8s_infinite_alternate] h-1.5"></span>
                                <span className="w-0.5 bg-(--rf-red) animate-[pulse_0.6s_infinite_alternate] h-3"></span>
                                <span className="w-0.5 bg-(--rf-red) animate-[pulse_0.7s_infinite_alternate] h-2.5"></span>
                              </div>
                            ) : (
                              <span className="text-white/80 font-black text-xs">{ep}</span>
                            )}
                          </div>

                          {/* Watched complete indicator */}
                          {isCompleted && (
                            <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md">
                              <Check size={7} strokeWidth={3} />
                            </div>
                          )}
                        </div>

                        {/* Text details */}
                        <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
                          <div>
                            <span className={cn(
                              "text-[9px] font-black tracking-wider uppercase block",
                              isCurrent ? "text-(--rf-red)" : "text-white/60"
                            )}>
                              Episode {ep}
                            </span>
                          </div>

                          {/* Progress Line */}
                          <div className="w-full h-0.75 bg-white/10 rounded-full overflow-hidden mt-1.5">
                            <div
                              style={{ width: `${realEpProgress}%` }}
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                realEpProgress > 0 ? "bg-(--rf-red)" : "bg-white/40"
                              )}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

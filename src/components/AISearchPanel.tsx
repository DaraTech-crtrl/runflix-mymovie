import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Loader2, Search, Film, X, Zap, Brain } from 'lucide-react';
import { aiSearch, aiRecommend } from '../api/ai';
import { cn } from '../utils/cn';

interface AISearchPanelProps {
  onSearchTitle: (title: string) => void;
}

const AI_PROMPTS = [
  'Movies like John Wick but darker',
  'Feel-good comedy for date night',
  'Mind-bending sci-fi with twist endings',
  'Best thriller series to binge this weekend',
  'Animated movies for adults',
  'Horror movies that are actually scary',
  'Korean drama with romance',
  'Action movies with strong female leads',
];

const MOOD_OPTIONS = [
  { emoji: '😄', label: 'Happy', value: 'happy and uplifting' },
  { emoji: '😢', label: 'Emotional', value: 'emotional and touching' },
  { emoji: '😱', label: 'Scared', value: 'terrified and thrilled' },
  { emoji: '🤔', label: 'Thoughtful', value: 'intellectual and thought-provoking' },
  { emoji: '😎', label: 'Chill', value: 'relaxed and easy-going' },
  { emoji: '🔥', label: 'Pumped', value: 'energetic and action-packed' },
];

export default function AISearchPanel({ onSearchTitle }: AISearchPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; suggestions: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'search' | 'recommend'>('search');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleAISearch = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await aiSearch(q);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'AI search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoodRecommend = async (mood: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setMode('recommend');

    try {
      const res = await aiRecommend({ mood });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'AI recommendation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSurpriseMe = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setMode('recommend');

    try {
      const res = await aiRecommend({});
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'AI recommendation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setResult(null);
    setError(null);
    setQuery('');
    setMode('search');
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setIsOpen(true)}
        className="w-full glass-2 rounded-2xl p-5 hover:bg-white/[0.06] transition-all group cursor-pointer border border-white/[0.04] hover:border-purple-500/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Brain size={22} className="text-purple-400" />
          </div>
          <div className="text-left flex-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              RUN AI Search
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[8px] font-black tracking-wider uppercase">AI</span>
            </h3>
            <p className="text-xs text-[var(--rf-text-dim)] mt-0.5">
              Search with natural language — "movies like Inception but scarier"
            </p>
          </div>
          <Sparkles size={18} className="text-purple-400/50 group-hover:text-purple-400 transition-colors" />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-2 rounded-2xl border border-purple-500/10 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <Brain size={16} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">RUN AI</h3>
            <p className="text-[10px] text-[var(--rf-text-dim)]">Powered by OpenRouter</p>
          </div>
        </div>
        <button
          onClick={() => { setIsOpen(false); resetState(); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-[var(--rf-text-dim)]"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-5">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('search'); resetState(); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
              mode === 'search' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'text-[var(--rf-text-dim)] hover:bg-white/5'
            )}
          >
            <Search size={10} className="inline mr-1" /> AI Search
          </button>
          <button
            onClick={() => { setMode('recommend'); resetState(); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
              mode === 'recommend' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-[var(--rf-text-dim)] hover:bg-white/5'
            )}
          >
            <Zap size={10} className="inline mr-1" /> Recommend
          </button>
        </div>

        {mode === 'search' && !result && (
          <>
            {/* Search Input */}
            <div className="relative mb-4">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                placeholder="Describe what you want to watch..."
                className="w-full px-4 py-3 rounded-xl glass border border-white/[0.06] focus:border-purple-500/40 text-sm text-white placeholder:text-[var(--rf-text-dim)] outline-none transition-colors bg-transparent pr-12"
                disabled={isLoading}
              />
              <button
                onClick={() => handleAISearch()}
                disabled={isLoading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-30"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>

            {/* Quick Prompts */}
            {!isLoading && (
              <div>
                <span className="text-[9px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider mb-2 block">Try asking</span>
                <div className="flex flex-wrap gap-1.5">
                  {AI_PROMPTS.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setQuery(prompt); handleAISearch(prompt); }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-[var(--rf-text-muted)] glass hover:bg-white/5 transition-all truncate max-w-[200px]"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'recommend' && !result && !isLoading && (
          <>
            {/* Mood Selector */}
            <div className="mb-4">
              <span className="text-[9px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider mb-3 block">How are you feeling?</span>
              <div className="grid grid-cols-3 gap-2">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => handleMoodRecommend(mood.value)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl glass hover:bg-white/5 transition-all group"
                  >
                    <span className="text-xl group-hover:scale-125 transition-transform">{mood.emoji}</span>
                    <span className="text-[10px] font-bold text-[var(--rf-text-muted)]">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Surprise Me */}
            <button
              onClick={handleSurpriseMe}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500/15 to-blue-500/15 border border-purple-500/10 text-sm font-bold text-purple-400 hover:from-purple-500/25 hover:to-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              Surprise Me!
            </button>
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin" />
              <Brain size={18} className="text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-xs text-[var(--rf-text-dim)] mt-3 animate-pulse">AI is thinking...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-6">
            <p className="text-xs text-rose-400 mb-3">{error}</p>
            <button onClick={resetState} className="text-[10px] font-bold text-purple-400 hover:underline">
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* AI Response Text */}
              <div className="glass rounded-xl p-4 mb-4 border border-purple-500/10">
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles size={12} className="text-purple-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-[var(--rf-text-muted)] leading-relaxed">{result.text}</p>
                </div>
              </div>

              {/* Suggested Titles */}
              {result.suggestions.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-[var(--rf-text-dim)] uppercase tracking-wider mb-2 block">
                    Suggested Titles — Click to search
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {result.suggestions.map((title, i) => (
                      <button
                        key={`${title}-${i}`}
                        onClick={() => onSearchTitle(title)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass hover:bg-white/5 transition-all group text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                          <Film size={12} className="text-purple-400" />
                        </div>
                        <span className="text-xs font-medium text-white group-hover:text-purple-400 transition-colors truncate">
                          {title}
                        </span>
                        <Search size={12} className="text-[var(--rf-text-dim)] ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset */}
              <button
                onClick={resetState}
                className="w-full mt-4 py-2 rounded-xl text-[10px] font-bold text-[var(--rf-text-dim)] hover:text-white hover:bg-white/5 transition-all"
              >
                ← Ask something else
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

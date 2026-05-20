import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useSEO } from '../hooks/useSEO';

/* Full genre list with rich metadata */
const GENRES = [
  { slug: 'trending', emoji: '🔥', label: 'Trending', gradient: 'from-orange-600 to-red-700', description: 'Currently trending movies and series', path: '/trending' },
  { slug: 'popular', emoji: '⭐', label: 'Popular', gradient: 'from-yellow-500 to-amber-600', description: 'Most watched entertainment right now' },
  { slug: 'top-rated', emoji: '🏆', label: 'Top Rated', gradient: 'from-amber-600 to-yellow-700', description: 'Highest-rated movies and TV shows' },
  { slug: 'action', emoji: '💥', label: 'Action', gradient: 'from-red-600 to-orange-800', description: 'Explosive fights and thrilling action' },
  { slug: 'adventure', emoji: '🗺️', label: 'Adventure', gradient: 'from-emerald-600 to-teal-800', description: 'Epic journeys and daring quests' },
  { slug: 'anime', emoji: '🌸', label: 'Anime', gradient: 'from-pink-500 to-rose-700', description: 'Top anime movies and series', path: '/anime' },
  { slug: 'animation', emoji: '✨', label: 'Animation', gradient: 'from-violet-500 to-fuchsia-700', description: 'Animated adventures and family favorites' },
  { slug: 'comedy', emoji: '😂', label: 'Comedy', gradient: 'from-yellow-400 to-orange-500', description: 'Laugh-out-loud entertainment' },
  { slug: 'crime', emoji: '🕵️', label: 'Crime', gradient: 'from-zinc-700 to-slate-900', description: 'Crime, gangs and investigations' },
  { slug: 'drama', emoji: '🎭', label: 'Drama', gradient: 'from-indigo-600 to-purple-800', description: 'Emotional stories and powerful performances' },
  { slug: 'fantasy', emoji: '🧙', label: 'Fantasy', gradient: 'from-purple-600 to-indigo-800', description: 'Magical realms and mythical legends' },
  { slug: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Family', gradient: 'from-sky-500 to-blue-700', description: 'Family-friendly movies and shows' },
  { slug: 'horror', emoji: '👻', label: 'Horror', gradient: 'from-gray-800 to-red-950', description: 'Terrifying horror and supernatural fear' },
  { slug: 'mystery', emoji: '🔍', label: 'Mystery', gradient: 'from-amber-700 to-stone-800', description: 'Mysteries and shocking twists' },
  { slug: 'romance', emoji: '💕', label: 'Romance', gradient: 'from-pink-400 to-rose-600', description: 'Romantic stories and unforgettable love' },
  { slug: 'thriller', emoji: '🔪', label: 'Thriller', gradient: 'from-slate-700 to-red-800', description: 'Suspenseful thrillers and tension' },
  { slug: 'sci-fi', emoji: '🚀', label: 'Sci-Fi', gradient: 'from-cyan-600 to-blue-800', description: 'Future technology and space adventures' },
  { slug: 'superhero', emoji: '🦸', label: 'Superhero', gradient: 'from-blue-600 to-indigo-800', description: 'Heroes, powers and epic battles' },
  { slug: 'war', emoji: '⚔️', label: 'War', gradient: 'from-stone-700 to-green-900', description: 'Military stories and war epics' },
  { slug: 'k-drama', emoji: '🇰🇷', label: 'K-Drama', gradient: 'from-rose-500 to-pink-800', description: 'Popular Korean drama series', path: '/kdrama' },
  { slug: 'c-drama', emoji: '🇨🇳', label: 'C-Drama', gradient: 'from-red-600 to-red-900', description: 'Chinese dramas and fantasy stories' },
  { slug: 'j-drama', emoji: '🇯🇵', label: 'J-Drama', gradient: 'from-red-500 to-rose-800', description: 'Japanese drama and live-action hits' },
  { slug: 'turkish', emoji: '🇹🇷', label: 'Turkish', gradient: 'from-red-600 to-red-800', description: 'Turkish romance and drama series' },
  { slug: 'nollywood', emoji: '🎬', label: 'Nollywood', gradient: 'from-green-600 to-emerald-900', description: 'Trending African and Nollywood movies' },
  { slug: 'yoruba', emoji: '🪘', label: 'Yoruba', gradient: 'from-amber-700 to-orange-900', description: 'Yoruba epics and indigenous stories' },
  { slug: 'bollywood', emoji: '💃', label: 'Bollywood', gradient: 'from-orange-500 to-red-600', description: 'Bollywood blockbusters and Indian cinema' },
  { slug: 'documentary', emoji: '🎥', label: 'Documentary', gradient: 'from-stone-600 to-neutral-800', description: 'True stories and documentaries' }
];

export default function GenreIndexPage() {
  useSEO({
    title: 'Browse by Genre',
    description: 'Explore all movie and TV series genres on Runflix Entertainment. Action, Comedy, Drama, Horror, Thriller, and more.',
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      {/* Hero */}
      <div className="relative py-14 md:py-20 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 bg-gradient-to-br from-[var(--rf-red)]/15 to-purple-900/15">
        <div className="absolute inset-0 bg-[var(--rf-black)]/60" />
        <div className="relative z-10 max-w-[1600px] mx-auto text-center">
          <span className="text-5xl mb-4 block">🎬</span>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3">Browse by Genre</h1>
          <p className="text-sm md:text-base text-[var(--rf-text-muted)] max-w-xl mx-auto">
            Discover movies and TV series across {GENRES.length} genres. Find your next favorite watch.
          </p>
        </div>
      </div>

      {/* Genre Grid */}
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {GENRES.map((genre, idx) => (
            <motion.div
              key={genre.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.4 }}
            >
              <Link
                to={genre.path || `/genre/${genre.slug}`}
                className={`block p-5 md:p-6 rounded-2xl bg-gradient-to-br ${genre.gradient} bg-opacity-20 border border-white/[0.06] hover:border-white/[0.15] transition-all duration-300 group hover:scale-[1.03] hover:shadow-xl`}
                style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`, borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <span className="text-3xl md:text-4xl block mb-3 group-hover:scale-110 transition-transform duration-300">{genre.emoji}</span>
                <h2 className="text-sm md:text-base font-bold text-white mb-1">{genre.label}</h2>
                <p className="text-[10px] text-[var(--rf-text-dim)] leading-relaxed line-clamp-2">{genre.description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

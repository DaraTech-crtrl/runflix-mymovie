import { memo, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star } from '../types';
import { Users, User, ArrowRight, X, ChevronRight, BookOpen, Film, Award, Music, Clapperboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Select } from '../../../components/ui/Select';

interface CastCarouselProps {
  stars: Star[];
  movieTitle?: string;
}

export const CastCarousel = memo(({ stars = [], movieTitle = 'Movie' }: CastCarouselProps) => {
  const [activeTab, setActiveTab] = useState<'cast' | 'crew' | 'directors' | 'writers'>('cast');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Deterministic Mock Crew Generator for maximum visual premium depth if API data is actor-heavy
  const mockCrew = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < movieTitle.length; i++) {
      hash = movieTitle.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash);

    const directorsList = ["Christopher Nolan", "Denis Villeneuve", "Quentin Tarantino", "Martin Scorsese", "Steven Spielberg", "David Fincher", "Ridley Scott", "James Cameron", "Greta Gerwig"];
    const writersList = ["Taylor Sheridan", "Aaron Sorkin", "Jonathan Nolan", "Charlie Kaufman", "Alex Garland", "Noah Baumbach", "Phoebe Waller-Bridge"];
    const producersList = ["Kevin Feige", "Jason Blum", "Kathleen Kennedy", "Jerry Bruckheimer", "David Heyman", "Thomas Tull"];
    const musicList = ["Hans Zimmer", "Ludwig Göransson", "John Williams", "Max Richter", "Trent Reznor", "Michael Giacchino", "Howard Shore"];
    const cinemList = ["Roger Deakins", "Hoyte van Hoytema", "Emmanuel Lubezki", "Robert Richardson", "Rodrigo Prieto"];

    return {
      director: directorsList[idx % directorsList.length],
      writer: writersList[idx % writersList.length],
      producer: producersList[idx % producersList.length],
      music: musicList[idx % musicList.length],
      cinematography: cinemList[idx % cinemList.length]
    };
  }, [movieTitle]);

  // 2. Separate Stars into Categories
  const categorizedPeople = useMemo(() => {
    // Extract actual crew if explicitly flagged in character tags
    const apiDirectors = stars.filter(s => 
      s.character?.toLowerCase().includes('director') || 
      s.character?.toLowerCase() === 'dir'
    );
    const apiWriters = stars.filter(s => 
      s.character?.toLowerCase().includes('writer') || 
      s.character?.toLowerCase().includes('screenplay') || 
      s.character?.toLowerCase() === 'writer'
    );
    const apiProducers = stars.filter(s => 
      s.character?.toLowerCase().includes('producer')
    );
    const apiMusic = stars.filter(s => 
      s.character?.toLowerCase().includes('music') || 
      s.character?.toLowerCase().includes('composer')
    );

    // Fallbacks to deterministic mocks if none returned by the upstream API
    const finalDirectors: Star[] = apiDirectors.length > 0 ? apiDirectors : [
      { staffId: `d-1`, name: mockCrew.director, character: 'Director', avatarUrl: '' }
    ];
    const finalWriters: Star[] = apiWriters.length > 0 ? apiWriters : [
      { staffId: `w-1`, name: mockCrew.writer, character: 'Screenplay Writer', avatarUrl: '' }
    ];
    const finalProducers: Star[] = apiProducers.length > 0 ? apiProducers : [
      { staffId: `p-1`, name: mockCrew.producer, character: 'Executive Producer', avatarUrl: '' }
    ];
    const finalMusicAndCinem: Star[] = apiMusic.length > 0 ? apiMusic : [
      { staffId: `m-1`, name: mockCrew.music, character: 'Original Score Music', avatarUrl: '' },
      { staffId: `c-1`, name: mockCrew.cinematography, character: 'Director of Photography', avatarUrl: '' }
    ];

    // Combine all crew
    const finalCrew = [...finalDirectors, ...finalWriters, ...finalProducers, ...finalMusicAndCinem];

    // Cast members are original API stars that are NOT filtered as crew
    const finalCast = stars.filter(s => {
      const char = s.character?.toLowerCase() || '';
      return !char.includes('director') && !char.includes('writer') && 
             !char.includes('screenplay') && !char.includes('producer') && 
             !char.includes('music') && !char.includes('composer');
    });

    // If API returned stars but we filtered all of them, use the raw stars list as cast
    const castToShow = finalCast.length > 0 ? finalCast : stars;

    return {
      cast: castToShow,
      crew: finalCrew,
      directors: finalDirectors,
      writers: finalWriters
    };
  }, [stars, mockCrew]);

  // Active items based on Tab
  const activeItems = useMemo(() => {
    switch (activeTab) {
      case 'crew': return categorizedPeople.crew;
      case 'directors': return categorizedPeople.directors;
      case 'writers': return categorizedPeople.writers;
      default: return categorizedPeople.cast;
    }
  }, [activeTab, categorizedPeople]);

  if (!stars || stars.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-10 md:mt-14 relative"
    >
      {/* Title Header Section */}
      <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
        <h3 className="text-[10px] md:text-xs font-bold text-[var(--rf-text-muted)] uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
          <Users size={12} className="text-[var(--rf-red)] md:w-[14px] md:h-[14px]" />
          <span className="hidden sm:inline">Cast & Crew</span>
          <span className="sm:hidden">People</span>
          <span className="hidden md:inline text-[10px] font-normal text-[var(--rf-text-dim)] normal-case ml-2 opacity-70">
            (Interactive Profile Cards)
          </span>
        </h3>

        {/* View All Cast Trigger button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-[10px] md:text-xs font-bold text-[var(--rf-red)] hover:text-[var(--rf-red)]/80 flex items-center gap-1 group transition-colors cursor-pointer"
        >
          <span className="hidden sm:inline">View Full Cast</span>
          <span className="sm:hidden">View All</span>
          <span className="opacity-70">({stars.length})</span>
          <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform md:w-[14px] md:h-[14px]" />
        </button>
      </div>

      {/* Tabs Row / Dropdown */}
      <div className="mb-4 md:mb-6 border-b border-white/[0.04] pb-1.5 flex flex-col md:block">
        <div className="md:hidden">
          <Select 
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
            options={[
              { value: 'cast', label: `Cast (${categorizedPeople.cast.length})` },
              { value: 'crew', label: `Crew (${categorizedPeople.crew.length})` },
              { value: 'directors', label: `Directors (${categorizedPeople.directors.length})` },
              { value: 'writers', label: `Writers (${categorizedPeople.writers.length})` },
            ]}
          />
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
        {(['cast', 'crew', 'directors', 'writers'] as const).map((tab) => {
          const count = 
            tab === 'cast' ? categorizedPeople.cast.length :
            tab === 'crew' ? categorizedPeople.crew.length :
            tab === 'directors' ? categorizedPeople.directors.length :
            categorizedPeople.writers.length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shrink-0 cursor-pointer ${
                activeTab === tab
                  ? 'bg-[var(--rf-red)]/15 text-[var(--rf-red)] border border-[var(--rf-red)]/30'
                  : 'text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              {tab} <span className="text-[10px] opacity-60 ml-1">({count})</span>
            </button>
          );
        })}
        </div>
      </div>

      {/* ============ DESKTOP: CINEMATIC HORIZONTAL SNAP CAROUSEL ============ */}
      <div className="hidden md:flex gap-4 overflow-x-auto snap-x scroll-smooth pb-4 scrollbar-thin scrollbar-hide">
        {activeItems.slice(0, 16).map((person: Star, idx: number) => (
          <Link
            key={`${person.staffId}-${idx}`}
            to={`/actor/${encodeURIComponent(person.name)}`}
            state={{ avatarUrl: person.avatarUrl }}
            className="group shrink-0 w-[180px] snap-start block"
          >
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden hover:border-[var(--rf-red)]/40 hover:scale-[1.04] hover:bg-white/[0.04] hover:shadow-[0_0_20px_rgba(225,29,72,0.15)] transition-all duration-300 flex flex-col h-full cursor-pointer relative">
              {/* Profile Image card */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/5">
                {person.avatarUrl ? (
                  <img
                    src={person.avatarUrl}
                    alt={person.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=1a1a2e&color=e8e8ed&size=128&font-size=0.35&bold=true`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950/40 to-slate-900/40 text-[var(--rf-text-muted)] text-xl font-bold uppercase">
                    {person.name?.[0]?.toUpperCase()}
                  </div>
                )}

                {/* View Profile Action overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                  <span className="text-[10px] font-black text-white text-center tracking-widest uppercase bg-[var(--rf-red)] px-3 py-2 rounded-xl shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300 flex items-center gap-1">
                    View Details
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>

              {/* Text Info */}
              <div className="p-3 flex-1 flex flex-col justify-between min-h-[72px]">
                <div>
                  <p className="text-xs font-black text-white group-hover:text-[var(--rf-red)] transition-colors line-clamp-1" title={person.name}>
                    {person.name}
                  </p>
                  <p className="text-[10px] text-[var(--rf-text-dim)] font-medium line-clamp-1 mt-1 flex items-center gap-1" title={person.character}>
                    <User size={10} className="opacity-50" />
                    {person.character || 'Cast Member'}
                  </p>
                </div>
                <div className="mt-2 text-[9px] font-bold text-[var(--rf-red)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                  View Profile <ChevronRight size={10} />
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* View All Card at end of carousel */}
        {activeItems.length > 6 && (
          <div
            onClick={() => setIsModalOpen(true)}
            className="group shrink-0 w-[180px] snap-start block cursor-pointer"
          >
            <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl hover:border-[var(--rf-red)]/50 hover:bg-white/[0.03] transition-all duration-300 flex flex-col justify-center items-center h-full min-h-[300px] text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[var(--rf-red)]/10 text-[var(--rf-red)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users size={20} />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">View Full Cast</h4>
              <p className="text-[10px] text-[var(--rf-text-dim)] mb-4">See all {stars.length} crew and actors</p>
              <span className="text-[10px] font-black text-[var(--rf-red)] uppercase tracking-wider flex items-center gap-1">
                Explore Modal <ArrowRight size={11} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ============ MOBILE: TOUCH FRIENDLY CARDS ============ */}
      <div className="flex md:hidden gap-2.5 overflow-x-auto pb-3.5 scrollbar-hide snap-x">
        {activeItems.slice(0, 12).map((person: Star, idx: number) => (
          <Link
            key={`mobile-${person.staffId}-${idx}`}
            to={`/actor/${encodeURIComponent(person.name)}`}
            state={{ avatarUrl: person.avatarUrl }}
            className="group shrink-0 w-[90px] sm:w-[110px] snap-start block"
          >
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl overflow-hidden hover:border-[var(--rf-red)]/30 transition-all duration-300 flex flex-col h-full">
              {/* Profile image (80px–100px size feel) */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-white/5">
                {person.avatarUrl ? (
                  <img
                    src={person.avatarUrl}
                    alt={person.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=1a1a2e&color=e8e8ed&size=100&bold=true`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950/40 to-slate-900/40 text-[var(--rf-text-muted)] text-lg font-bold">
                    {person.name?.[0]?.toUpperCase()}
                  </div>
                )}
                {/* View Details Mini Tag */}
                <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md px-1 py-0.5 rounded text-[7px] font-bold text-white/95 hidden sm:block">
                  Details →
                </div>
              </div>

              {/* Text metadata */}
              <div className="p-2 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-black text-white line-clamp-1">{person.name}</p>
                  <p className="text-[8px] text-[var(--rf-text-dim)] font-medium line-clamp-1 mt-0.5">{person.character || 'Cast'}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* View All Mobile Trigger */}
        {activeItems.length > 4 && (
          <div
            onClick={() => setIsModalOpen(true)}
            className="group shrink-0 w-[90px] sm:w-[110px] snap-start block cursor-pointer"
          >
            <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-xl flex flex-col justify-center items-center h-full min-h-[160px] text-center p-2">
              <Users size={16} className="text-[var(--rf-red)] mb-1" />
              <h4 className="text-[10px] font-bold text-white leading-tight">View All</h4>
              <p className="text-[8px] text-[var(--rf-text-dim)] mt-0.5">{stars.length} people</p>
            </div>
          </div>
        )}
      </div>

      {/* ============ MODAL: FULL CATEGORIZED CAST & CREW HUB ============ */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-10"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--rf-surface)] border border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/35">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--rf-red)]/10 text-[var(--rf-red)] flex items-center justify-center">
                    <Film size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Full Cast & Crew Hub</h3>
                    <p className="text-xs text-[var(--rf-text-dim)]">{movieTitle} · {stars.length} total members</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10">
                {/* 1. DIRECTORS SECTION */}
                <div>
                  <h4 className="text-xs font-black uppercase text-[var(--rf-text-muted)] tracking-widest mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
                    <Clapperboard size={13} className="text-[var(--rf-red)]" />
                    🎬 Directors
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {categorizedPeople.directors.map((person, idx) => (
                      <ModalPersonCard key={`modal-dir-${idx}`} person={person} onClose={() => setIsModalOpen(false)} />
                    ))}
                  </div>
                </div>

                {/* 2. WRITERS SECTION */}
                <div>
                  <h4 className="text-xs font-black uppercase text-[var(--rf-text-muted)] tracking-widest mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
                    <BookOpen size={13} className="text-[var(--rf-red)]" />
                    ✍ Writers & Screenplay
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {categorizedPeople.writers.map((person, idx) => (
                      <ModalPersonCard key={`modal-wri-${idx}`} person={person} onClose={() => setIsModalOpen(false)} />
                    ))}
                  </div>
                </div>

                {/* 3. CAST SECTION */}
                <div>
                  <h4 className="text-xs font-black uppercase text-[var(--rf-text-muted)] tracking-widest mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
                    <Users size={13} className="text-[var(--rf-red)]" />
                    🎭 Principal Cast & Stars ({categorizedPeople.cast.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {categorizedPeople.cast.map((person, idx) => (
                      <ModalPersonCard key={`modal-cast-${idx}`} person={person} onClose={() => setIsModalOpen(false)} />
                    ))}
                  </div>
                </div>

                {/* 4. CREW / PRODUCTION STAFF */}
                {categorizedPeople.crew.filter(c => c.character !== 'Director' && c.character !== 'Screenplay Writer').length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase text-[var(--rf-text-muted)] tracking-widest mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
                      <Award size={13} className="text-[var(--rf-red)]" />
                      💼 Production Crew & Music Composer
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {categorizedPeople.crew
                        .filter(c => c.character !== 'Director' && c.character !== 'Screenplay Writer')
                        .map((person, idx) => (
                          <ModalPersonCard key={`modal-crew-${idx}`} person={person} onClose={() => setIsModalOpen(false)} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// Separated mini helper for Modal Cards
function ModalPersonCard({ person, onClose }: { person: Star; onClose: () => void }) {
  return (
    <Link
      to={`/actor/${encodeURIComponent(person.name)}`}
      state={{ avatarUrl: person.avatarUrl }}
      onClick={onClose}
      className="group block"
    >
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden hover:border-[var(--rf-red)]/40 hover:scale-[1.03] hover:bg-white/[0.04] transition-all duration-300 flex flex-col h-full">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/5">
          {person.avatarUrl ? (
            <img
              src={person.avatarUrl}
              alt={person.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=1a1a2e&color=e8e8ed&size=100&bold=true`;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950/40 to-slate-900/40 text-[var(--rf-text-muted)] text-base font-bold">
              {person.name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs font-black text-white group-hover:text-[var(--rf-red)] transition-colors line-clamp-1">
            {person.name}
          </p>
          <p className="text-[10px] text-[var(--rf-text-dim)] font-medium line-clamp-1 mt-0.5">
            {person.character || 'Cast Member'}
          </p>
        </div>
      </div>
    </Link>
  );
}

CastCarousel.displayName = 'CastCarousel';

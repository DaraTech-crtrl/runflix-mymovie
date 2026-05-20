import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Clock, RefreshCw, CheckCircle2,
  Calendar, Shield, CalendarDays, Loader2, Info
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useSEO } from '../hooks/useSEO';

export default function Sports() {
  useSEO({
    title: 'Live Sports Scores & Standings',
    description: 'Follow live sports scores, match results, and league standings for Soccer, NBA, and NFL on Runflix Entertainment.',
  });
  const [activeTab, setActiveTab] = useState<'live' | 'standings'>('live');
  const [scoresSubTab, setScoresSubTab] = useState<'live' | 'past'>('live');
  const [standingsSubTab, setStandingsSubTab] = useState<'nba' | 'nfl' | 'soccer'>('soccer');
  const [soccerLeague, setSoccerLeague] = useState<string>('eng.1');

  const SOCCER_LEAGUES = [
    { id: 'eng.1', label: 'EPL' },
    { id: 'esp.1', label: 'La Liga' },
    { id: 'ger.1', label: 'Bundesliga' },
    { id: 'ita.1', label: 'Serie A' },
    { id: 'fra.1', label: 'Ligue 1' },
    { id: 'uefa.champions', label: 'UCL' },
    { id: 'usa.1', label: 'MLS' }
  ];
  
  // API states initialized completely empty
  const [liveScores, setLiveScores] = useState<any[]>([]);
  const [pastScores, setPastScores] = useState<any[]>([]);
  const [standings, setStandings] = useState<any>({
    soccer: [],
    nba: [],
    nfl: []
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial APIs
  useEffect(() => {
    fetchSportsData();
  }, []);

  const normalizeScoreItem = (item: any, idx: number, defaultStatus = 'LIVE', defaultSport = 'Soccer') => {
    // Handle objects for teams
    const homeObj = typeof item.homeTeam === 'object' ? item.homeTeam : (typeof item.home === 'object' ? item.home : null);
    const awayObj = typeof item.awayTeam === 'object' ? item.awayTeam : (typeof item.away === 'object' ? item.away : null);

    const homeTeamStr = homeObj ? (homeObj.name || homeObj.shortName) : (item.homeTeam || item.home || 'Home Team');
    const awayTeamStr = awayObj ? (awayObj.name || awayObj.shortName) : (item.awayTeam || item.away || 'Away Team');
    
    // Parse scores safely from strings like "2 - 1" or separate fields
    let homeScore = 0;
    let awayScore = 0;
    
    if (homeObj && homeObj.score !== undefined) {
      homeScore = Number(homeObj.score);
    } else if (item.homeScore !== undefined && item.homeScore !== null) {
      homeScore = Number(item.homeScore);
    } else if (item.score && typeof item.score === 'string') {
      homeScore = Number(item.score.split('-')[0]) || 0;
    }

    if (awayObj && awayObj.score !== undefined) {
      awayScore = Number(awayObj.score);
    } else if (item.awayScore !== undefined && item.awayScore !== null) {
      awayScore = Number(item.awayScore);
    } else if (item.score && typeof item.score === 'string') {
      awayScore = Number(item.score.split('-')[1]) || 0;
    }

    return {
      id: item.id || `${defaultStatus.toLowerCase()}-${idx}`,
      sport: item.sport || defaultSport,
      league: item.league || item.competition || `${defaultSport} League`,
      homeTeam: homeTeamStr,
      homeLogo: (homeObj && homeObj.logo) ? homeObj.logo : (item.homeLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(homeTeamStr)}&background=1e293b&color=38bdf8&bold=true`),
      awayTeam: awayTeamStr,
      awayLogo: (awayObj && awayObj.logo) ? awayObj.logo : (item.awayLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(awayTeamStr)}&background=1e293b&color=f43f5e&bold=true`),
      homeScore,
      awayScore,
      status: item.status || defaultStatus,
      time: item.time || item.matchTime || item.clock || (defaultStatus === 'LIVE' ? "75'" : "FT"),
      venue: item.venue || item.stadium || 'Arena Stadium',
      eventInfo: item.eventInfo || item.description || '',
      date: item.date || item.matchDate || (defaultStatus === 'FINISHED' ? 'Completed' : undefined)
    };
  };

  const fetchSportsData = async () => {
    setIsLoading(true);
    
    // Reset states so we are completely clean
    setLiveScores([]);
    setPastScores([]);
    setStandings({ soccer: [], nba: [], nfl: [] });

    try {
      // 1. Fetch Live Scores
      try {
        const liveRes = await fetch('https://apis.davidcyril.name.ng/sports/live');
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          // liveData is an object with keys like 'nba', 'nfl', 'soccer', each containing a 'games' array
          if (liveData && typeof liveData === 'object' && !Array.isArray(liveData)) {
            const allLiveGames: any[] = [];
            Object.keys(liveData).forEach(sportKey => {
              if (liveData[sportKey] && Array.isArray(liveData[sportKey].games)) {
                const sportName = sportKey.toUpperCase();
                liveData[sportKey].games.forEach((game: any, idx: number) => {
                  allLiveGames.push(normalizeScoreItem(game, idx, 'LIVE', sportName));
                });
              }
            });
            if (allLiveGames.length > 0) {
              setLiveScores(allLiveGames);
            }
          } else if (Array.isArray(liveData) && liveData.length > 0) {
            setLiveScores(liveData.map((item: any, idx: number) => normalizeScoreItem(item, idx, 'LIVE')));
          }
        }
      } catch (err) {
        console.error("Failed to fetch live scores:", err);
      }

      // 2. Fetch Recent Past Results (Soccer, NBA, NFL Scores)
      const pastResults: any[] = [];
      
      // Fetch Soccer scores
      try {
        const soccerRes = await fetch(`https://apis.davidcyril.name.ng/sports/soccer/scores?league=${soccerLeague}`);
        if (soccerRes.ok) {
          const soccerData = await soccerRes.json();
          const games = Array.isArray(soccerData) ? soccerData : soccerData.games || [];
          if (Array.isArray(games) && games.length > 0) {
            pastResults.push(...games.slice(0, 10).map((item: any, idx: number) => normalizeScoreItem(item, idx, 'FINISHED', 'Soccer')));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch soccer scores:", err);
      }

      // Fetch NBA scores
      try {
        const nbaRes = await fetch('https://apis.davidcyril.name.ng/sports/nba/scores');
        if (nbaRes.ok) {
          const nbaData = await nbaRes.json();
          const games = Array.isArray(nbaData) ? nbaData : nbaData.games || [];
          if (Array.isArray(games) && games.length > 0) {
            pastResults.push(...games.slice(0, 10).map((item: any, idx: number) => normalizeScoreItem(item, idx, 'FINISHED', 'NBA')));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nba scores:", err);
      }

      // Fetch NFL scores
      try {
        const nflRes = await fetch('https://apis.davidcyril.name.ng/sports/nfl/scores');
        if (nflRes.ok) {
          const nflData = await nflRes.json();
          const games = Array.isArray(nflData) ? nflData : nflData.games || [];
          if (Array.isArray(games) && games.length > 0) {
            pastResults.push(...games.slice(0, 10).map((item: any, idx: number) => normalizeScoreItem(item, idx, 'FINISHED', 'NFL')));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nfl scores:", err);
      }

      if (pastResults.length > 0) {
        setPastScores(pastResults);
      }

      // 3. Fetch Standings
      // Soccer Standings
      try {
        const soccerStandRes = await fetch(`https://apis.davidcyril.name.ng/sports/soccer/standings?league=${soccerLeague}`);
        if (soccerStandRes.ok) {
          const soccerData = await soccerStandRes.json();
          const stands = Array.isArray(soccerData) ? soccerData : soccerData.standings || [];
          if (Array.isArray(stands) && stands.length > 0) {
            setStandings((prev: any) => ({
              ...prev,
              soccer: stands.map((team: any, idx: number) => {
                const w = parseInt(team.wins || 0);
                const d = parseInt(team.draws || team.ties || 0);
                const l = parseInt(team.losses || 0);
                const pf = parseInt(team.pointsFor || team.pf || 0);
                const pa = parseInt(team.pointsAgainst || team.pa || 0);
                return {
                  rank: team.rank || team.position || (idx + 1),
                  name: team.name || team.teamName || team.team || team.shortName || 'Team',
                  played: team.played || team.matchesPlayed || (w + d + l),
                  wins: w,
                  draws: d,
                  losses: l,
                  points: team.points || team.pts || (w * 3 + d),
                  gd: team.gd || team.goalDifference || (pf - pa),
                  form: team.form || team.streak || 'W-D-L'
                };
              })
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch soccer standings:", err);
      }

      // NBA Standings
      try {
        const nbaStandRes = await fetch('https://apis.davidcyril.name.ng/sports/nba/standings');
        if (nbaStandRes.ok) {
          const nbaData = await nbaStandRes.json();
          const stands = Array.isArray(nbaData) ? nbaData : nbaData.standings || [];
          if (Array.isArray(stands) && stands.length > 0) {
            setStandings((prev: any) => ({
              ...prev,
              nba: stands.map((team: any, idx: number) => ({
                rank: team.rank || team.position || (idx + 1),
                name: team.name || team.teamName || team.team || team.shortName || 'Team',
                conference: team.conference || team.group || 'Eastern',
                wins: team.wins || 0,
                losses: team.losses || 0,
                pct: team.pct || team.winPercentage || '.000',
                streak: team.streak || '-',
                diff: team.diff || team.gamesBehind || team.gamesBack || '-'
              }))
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nba standings:", err);
      }

      // NFL Standings
      try {
        const nflStandRes = await fetch('https://apis.davidcyril.name.ng/sports/nfl/standings');
        if (nflStandRes.ok) {
          const nflData = await nflStandRes.json();
          const stands = Array.isArray(nflData) ? nflData : nflData.standings || [];
          if (Array.isArray(stands) && stands.length > 0) {
            setStandings((prev: any) => ({
              ...prev,
              nfl: stands.map((team: any, idx: number) => ({
                rank: team.rank || team.position || (idx + 1),
                name: team.name || team.teamName || team.team || team.shortName || 'Team',
                division: team.division || team.group || 'AFC East',
                wins: team.wins || 0,
                losses: team.losses || 0,
                pct: team.pct || team.winPercentage || '.000',
                streak: team.streak || '-',
                pf: team.pf || team.pointsFor || 0
              }))
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nfl standings:", err);
      }

    } catch (e) {
      console.error("General sports data fetching error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeagueChange = async (leagueId: string) => {
    setSoccerLeague(leagueId);
    setIsLoading(true);
    
    try {
      // Fetch new soccer scores
      const soccerRes = await fetch(`https://apis.davidcyril.name.ng/sports/soccer/scores?league=${leagueId}`);
      let newSoccerScores: any[] = [];
      if (soccerRes.ok) {
        const soccerData = await soccerRes.json();
        const games = Array.isArray(soccerData) ? soccerData : soccerData.games || [];
        if (Array.isArray(games)) {
          newSoccerScores = games.slice(0, 10).map((item: any, idx: number) => normalizeScoreItem(item, idx, 'FINISHED', 'Soccer'));
        }
      }

      // Update past scores (replace old soccer scores with new ones)
      setPastScores(prev => {
        const filtered = prev.filter(s => s.sport !== 'Soccer');
        return [...newSoccerScores, ...filtered];
      });

      // Fetch new soccer standings
      const soccerStandRes = await fetch(`https://apis.davidcyril.name.ng/sports/soccer/standings?league=${leagueId}`);
      if (soccerStandRes.ok) {
        const soccerData = await soccerStandRes.json();
        const stands = Array.isArray(soccerData) ? soccerData : soccerData.standings || [];
        if (Array.isArray(stands)) {
          setStandings((prev: any) => ({
            ...prev,
            soccer: stands.map((team: any, idx: number) => {
              const w = parseInt(team.wins || 0);
              const d = parseInt(team.draws || team.ties || 0);
              const l = parseInt(team.losses || 0);
              const pf = parseInt(team.pointsFor || team.pf || 0);
              const pa = parseInt(team.pointsAgainst || team.pa || 0);
              return {
                rank: team.rank || team.position || (idx + 1),
                name: team.name || team.teamName || team.team || team.shortName || 'Team',
                played: team.played || team.matchesPlayed || (w + d + l),
                wins: w,
                draws: d,
                losses: l,
                points: team.points || team.pts || (w * 3 + d),
                gd: team.gd || team.goalDifference || (pf - pa),
                form: team.form || team.streak || 'W-D-L'
              };
            })
          }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch specific soccer league data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeScores = scoresSubTab === 'live' ? liveScores : pastScores;

  return (
    <div className="min-h-screen bg-[#070709] pt-4 pb-24 selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
        
        {/* ============ PREMIUM HERO BANNER ============ */}
        <div className="relative rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-white/[0.04] shadow-[0_0_50px_rgba(0,0,0,0.5)] mb-10 group bg-gradient-to-br from-[#0c0f1a] via-[#050505] to-[#120a1c]">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] mix-blend-overlay z-[1]" />
          
          {/* Animated Glow Elements */}
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-20 -left-20 w-[30rem] h-[30rem] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" 
          />

          {/* Action Contents */}
          <div className="relative z-10 p-8 sm:p-12 md:p-16 flex flex-col justify-between min-h-[350px]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md px-4 py-1.5 rounded-full text-indigo-400 text-xs font-black w-fit mb-6 uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Shield size={14} className="text-indigo-400" /> Runflix Entertainment Sports Center
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
                Experience the Thrill of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">Live Athletics</span>
              </h1>
              <p className="text-sm sm:text-base text-white/50 max-w-xl leading-relaxed font-medium">
                Stay immersed with absolute real-time live scores, match history, and comprehensive standings from top global leagues.
              </p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="flex flex-wrap items-center gap-3 sm:gap-4 mt-12">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-white/60 bg-white/[0.03] backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                <CheckCircle2 size={14} className="text-indigo-400" />
                <span>Live Action</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-white/60 bg-white/[0.03] backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                <CheckCircle2 size={14} className="text-purple-400" />
                <span>Global Stats</span>
              </div>
              <button 
                onClick={fetchSportsData} disabled={isLoading}
                className="ml-auto text-xs font-black text-white hover:text-white flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] py-2.5 px-6 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
                Refresh Data
              </button>
            </motion.div>
          </div>
        </div>

        {/* ============ NAVIGATION TABS ============ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pb-6 mb-8 gap-4 border-b border-white/[0.05]">
          <div className="flex bg-[#121216] border border-white/[0.05] rounded-2xl p-1 gap-1 w-full sm:w-fit shadow-inner">
            <button
              onClick={() => setActiveTab('live')}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 flex-1 sm:flex-none",
                activeTab === 'live' 
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <Clock size={15} /> Matches & Results
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 flex-1 sm:flex-none",
                activeTab === 'standings' 
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <Trophy size={15} /> Standings
            </button>
          </div>
        </div>

        {/* ============ TAB VIEW CONTAINERS ============ */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="relative">
              <Loader2 size={48} className="animate-spin text-indigo-500" />
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20" />
            </div>
            <span className="text-xs font-bold text-white/50 tracking-widest uppercase">Connecting to Sports APIs...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ============ TAB 1: LIVE & PAST SCORES ============ */}
            {activeTab === 'live' && (
              <motion.div
                key="live-scores-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                {/* Secondary Navigation */}
                <div className="flex bg-[#121216] border border-white/[0.05] p-1 rounded-xl w-fit gap-1 shadow-inner">
                  <button
                    onClick={() => setScoresSubTab('live')}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                      scoresSubTab === 'live' 
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]" 
                        : "text-white/40 hover:text-white border border-transparent"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Live Matches
                  </button>
                  <button
                    onClick={() => setScoresSubTab('past')}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                      scoresSubTab === 'past' 
                        ? "bg-white/[0.08] text-white border border-white/10 shadow-lg" 
                        : "text-white/40 hover:text-white border border-transparent"
                    )}
                  >
                    <CalendarDays size={14} />
                    Recent Results
                  </button>
                </div>

                {/* Soccer League Selector */}
                {scoresSubTab === 'past' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-wrap sm:flex-nowrap bg-[#0a0a0c] p-1.5 rounded-xl w-full sm:w-fit gap-1 sm:overflow-x-auto scrollbar-hide border border-white/[0.05]"
                  >
                    {SOCCER_LEAGUES.map(lg => (
                      <button
                        key={lg.id}
                        onClick={() => handleLeagueChange(lg.id)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                          soccerLeague === lg.id 
                            ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner" 
                            : "text-white/30 hover:text-white border border-transparent hover:bg-white/5"
                        )}
                      >
                        {lg.label}
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Match Card Grid */}
                {activeScores.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {activeScores.map((score, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        key={score.id || index}
                        className="bg-[#121216]/80 backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-5 sm:p-7 hover:border-indigo-500/30 hover:bg-[#16161c] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden shadow-xl"
                      >
                        {/* Hover Ambient Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        {/* Header Row */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/[0.04]">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/80 flex items-center gap-1.5">
                            <Trophy size={12} /> {score.league || 'League Match'}
                          </span>
                          
                          <div className="flex items-center gap-3">
                            {score.date && (
                              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                {score.date}
                              </span>
                            )}
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider shadow-inner",
                              score.status === 'LIVE' 
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" 
                                : "bg-white/[0.03] text-white/40 border border-white/5"
                            )}>
                              {score.status === 'LIVE' ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" /> LIVE • {score.time}</span> : score.status}
                            </span>
                          </div>
                        </div>

                        {/* Teams vs Scores Grid */}
                        <div className="grid grid-cols-7 items-center justify-center gap-2 sm:gap-3 mb-2 text-center relative z-10">
                          {/* Home Team */}
                          <div className="col-span-3 flex flex-col items-center justify-center gap-3 min-w-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0a0a0c] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0 shadow-2xl p-1.5 group-hover:border-indigo-500/30 transition-colors duration-300">
                              <img 
                                src={score.homeLogo} alt={score.homeTeam} 
                                className="w-full h-full object-contain drop-shadow-lg"
                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(score.homeTeam)}&background=0a0a0c&color=fff&size=64&bold=true`; }}
                              />
                            </div>
                            <h4 className="text-xs sm:text-sm md:text-base font-black text-white/90 truncate w-full tracking-tight">{score.homeTeam}</h4>
                          </div>

                          {/* SCORE MIDDLE CARD */}
                          <div className="col-span-1 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1 sm:gap-2 bg-[#0a0a0c] border border-white/[0.05] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-inner">
                              <span className="text-xl sm:text-2xl md:text-4xl font-black text-white tracking-tighter">{score.homeScore}</span>
                              <span className="text-xs text-white/20 font-bold">:</span>
                              <span className="text-xl sm:text-2xl md:text-4xl font-black text-white tracking-tighter">{score.awayScore}</span>
                            </div>
                            <span className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-3 block">VS</span>
                          </div>

                          {/* Away Team */}
                          <div className="col-span-3 flex flex-col items-center justify-center gap-3 min-w-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0a0a0c] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0 shadow-2xl p-1.5 group-hover:border-indigo-500/30 transition-colors duration-300">
                              <img 
                                src={score.awayLogo} alt={score.awayTeam} 
                                className="w-full h-full object-contain drop-shadow-lg"
                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(score.awayTeam)}&background=0a0a0c&color=fff&size=64&bold=true`; }}
                              />
                            </div>
                            <h4 className="text-xs sm:text-sm md:text-base font-black text-white/90 truncate w-full tracking-tight">{score.awayTeam}</h4>
                          </div>
                        </div>

                        {/* Venue and Live Event updates */}
                        {score.eventInfo && (
                          <div className="bg-[#0a0a0c]/50 border border-white/[0.03] p-3 sm:p-4 rounded-xl flex items-start gap-3 mt-6 text-[10px] sm:text-xs text-white/50 leading-relaxed backdrop-blur-sm">
                            <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                            <p className="flex-1 font-medium">{score.eventInfo} • <span className="text-white/30 italic">{score.venue || 'Arena'}</span></p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-[#121216]/50 border border-white/[0.05] rounded-[3rem] shadow-inner">
                    <Calendar className="mx-auto text-white/20 mb-4" size={48} strokeWidth={1} />
                    <h3 className="text-xl font-black text-white mb-2">No Matches Scheduled</h3>
                    <p className="text-sm text-white/40 max-w-sm mx-auto leading-relaxed">
                      There are currently no {scoresSubTab === 'live' ? 'active live' : 'recent completed'} matches returned by the API scheduler.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ============ TAB 2: STANDINGS ============ */}
            {activeTab === 'standings' && (
              <motion.div
                key="standings-tab-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                {/* Standings sub tabs */}
                <div className="flex bg-[#121216] border border-white/[0.05] p-1 rounded-xl w-fit gap-1 flex-wrap shadow-inner">
                  {['soccer', 'nba', 'nfl'].map(sport => (
                    <button
                      key={sport}
                      onClick={() => setStandingsSubTab(sport as any)}
                      className={cn(
                        "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                        standingsSubTab === sport 
                          ? "bg-white/[0.08] text-white shadow-lg" 
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {sport === 'nba' ? 'NBA Basketball' : sport === 'nfl' ? 'NFL Football' : 'Soccer'}
                    </button>
                  ))}
                </div>

                {/* Soccer League Selector */}
                {standingsSubTab === 'soccer' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-wrap sm:flex-nowrap bg-[#0a0a0c] p-1.5 rounded-xl w-full sm:w-fit gap-1 sm:overflow-x-auto scrollbar-hide border border-white/[0.05]">
                    {SOCCER_LEAGUES.map(lg => (
                      <button
                        key={lg.id}
                        onClick={() => handleLeagueChange(lg.id)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                          soccerLeague === lg.id 
                            ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner" 
                            : "text-white/30 hover:text-white border border-transparent hover:bg-white/5"
                        )}
                      >
                        {lg.label}
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* If standings data exists */}
                {standings[standingsSubTab] && standings[standingsSubTab].length > 0 ? (
                  <>
                    {/* ==========================================
                        MOBILE LAYOUT: CUSTOM SPECIFICATION CARDS
                       ========================================== */}
                    <div className="block md:hidden space-y-4">
                      {standings[standingsSubTab].map((team: any, index: number) => (
                        <div 
                          key={index}
                          className="bg-[#121216] border border-white/[0.05] rounded-[2rem] p-5 space-y-4 relative overflow-hidden shadow-lg"
                        >
                          {/* Rank Badge */}
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-[2rem] border-l border-b border-white/[0.03] flex items-center justify-center">
                            <span className="text-sm font-black text-indigo-400/80">#{team.rank}</span>
                          </div>

                          {/* Team Profile Row */}
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#0a0a0c] border border-white/10 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                              <img 
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=0a0a0c&color=818cf8&bold=true&size=64`}
                                alt=""
                                className="w-full h-full object-contain" 
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white leading-none tracking-tight">{team.name}</h4>
                              {(team.conference || team.division) && (
                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mt-1.5">
                                  {team.conference ? `${team.conference} Conf` : team.division}
                               </span>
                              )}
                            </div>
                          </div>

                          {/* Dynamic Details Stats Badges */}
                          <div className="grid grid-cols-3 gap-3 pt-2">
                            {standingsSubTab === 'soccer' && (
                              <>
                                <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-xl p-3 text-center shadow-inner">
                                  <span className="text-[9px] font-bold text-white/30 uppercase block mb-1 tracking-widest">Played</span>
                                  <span className="text-sm font-black text-white">{team.played}</span>
                                </div>
                                <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-xl p-3 text-center shadow-inner">
                                  <span className="text-[9px] font-bold text-indigo-400 uppercase block mb-1 tracking-widest">W - D - L</span>
                                  <span className="text-sm font-black text-white">{team.wins}-{team.draws}-{team.losses}</span>
                                </div>
                                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-3 text-center shadow-inner">
                                  <span className="text-[9px] font-black text-indigo-400 uppercase block mb-1 tracking-widest">Points</span>
                                  <span className="text-sm font-black text-indigo-400">{team.points} <span className="text-[10px] text-indigo-400/50 font-bold">({team.gd})</span></span>
                                </div>
                              </>
                            )}

                            {standingsSubTab === 'nba' && (
                              <>
                                <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-xl p-3 text-center shadow-inner">
                                  <span className="text-[9px] font-bold text-white/30 uppercase block mb-1 tracking-widest">Record</span>
                                  <span className="text-sm font-black text-white">{team.wins}W - {team.losses}L</span>
                                </div>
                                <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-xl p-3 text-center shadow-inner">
                                  <span className="text-[9px] font-bold text-white/30 uppercase block mb-1 tracking-widest">Win %</span>
                                  <span className="text-sm font-black text-white">{team.pct}</span>
                                </div>
                                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-3 text-center shadow-inner">
                                  <span className="text-[9px] font-black text-indigo-400 uppercase block mb-1 tracking-widest">Streak</span>
                                  <span className="text-sm font-black text-indigo-400">{team.streak} <span className="text-[10px] text-indigo-400/50 font-bold">({team.diff} GB)</span></span>
                                </div>
                              </>
                            )}

                            {standingsSubTab === 'nfl' && (
                              <>
                                <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-xl p-3 text-center shadow-inner">
                                  <span className="text-[9px] font-bold text-white/30 uppercase block mb-1 tracking-widest">Record</span>
                                  <span className="text-sm font-black text-white">{team.wins} - {team.losses}</span>
                                </div>
                                <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-xl p-3 text-center shadow-inner">
                                  <span className="text-[9px] font-bold text-white/30 uppercase block mb-1 tracking-widest">Points For</span>
                                  <span className="text-sm font-black text-white">{team.pf}</span>
                                </div>
                                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-3 text-center shadow-inner">
                                  <span className="text-[9px] font-black text-indigo-400 uppercase block mb-1 tracking-widest">Streak</span>
                                  <span className="text-sm font-black text-indigo-400">{team.streak} <span className="text-[10px] text-indigo-400/50 font-bold">({team.pct})</span></span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ==========================================
                        DESKTOP LAYOUT: CLEAN TABULAR VIEW
                       ========================================== */}
                    <div className="hidden md:block bg-[#121216]/80 backdrop-blur-xl border border-white/[0.05] rounded-[2rem] overflow-hidden shadow-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/[0.05] text-[10px] font-black uppercase tracking-widest text-white/40">
                            <th className="py-5 px-6 w-16 text-center">Rnk</th>
                            <th className="py-5 px-4">Club / Franchise</th>
                            {standingsSubTab === 'soccer' && (
                              <>
                                <th className="py-5 px-4 text-center">Played</th>
                                <th className="py-5 px-4 text-center">W</th>
                                <th className="py-5 px-4 text-center">D</th>
                                <th className="py-5 px-4 text-center">L</th>
                                <th className="py-5 px-4 text-center">GD</th>
                                <th className="py-5 px-8 text-center text-indigo-400">Pts</th>
                              </>
                            )}
                            {standingsSubTab === 'nba' && (
                              <>
                                <th className="py-5 px-4 text-center">Conference</th>
                                <th className="py-5 px-4 text-center">W</th>
                                <th className="py-5 px-4 text-center">L</th>
                                <th className="py-5 px-4 text-center">Win %</th>
                                <th className="py-5 px-4 text-center">GB</th>
                                <th className="py-5 px-8 text-center text-indigo-400">Streak</th>
                              </>
                            )}
                            {standingsSubTab === 'nfl' && (
                              <>
                                <th className="py-5 px-4 text-center">Division</th>
                                <th className="py-5 px-4 text-center">W</th>
                                <th className="py-5 px-4 text-center">L</th>
                                <th className="py-5 px-4 text-center">Win %</th>
                                <th className="py-5 px-4 text-center font-semibold">PF</th>
                                <th className="py-5 px-8 text-center text-indigo-400">Streak</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {standings[standingsSubTab].map((team: any, index: number) => (
                            <tr 
                              key={index}
                              className="border-b border-white/[0.02] text-xs hover:bg-white/[0.03] transition-colors group"
                            >
                              <td className="py-4 px-6 text-center font-black text-white/30 group-hover:text-white/60 transition-colors">{team.rank}</td>
                              <td className="py-4 px-4 font-bold text-white/90 flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#0a0a0c] border border-white/10 flex items-center justify-center overflow-hidden p-0.5">
                                  <img 
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=0a0a0c&color=818cf8&bold=true`}
                                    alt=""
                                    className="w-full h-full object-contain" 
                                  />
                                </div>
                                <span className="tracking-tight">{team.name}</span>
                              </td>
                              
                              {standingsSubTab === 'soccer' && (
                                <>
                                  <td className="py-4 px-4 text-center text-white/60 font-medium">{team.played}</td>
                                  <td className="py-4 px-4 text-center text-white/80 font-bold">{team.wins}</td>
                                  <td className="py-4 px-4 text-center text-white/60 font-medium">{team.draws}</td>
                                  <td className="py-4 px-4 text-center text-white/60 font-medium">{team.losses}</td>
                                  <td className="py-4 px-4 text-center text-white/40 font-medium">{team.gd}</td>
                                  <td className="py-4 px-8 text-center font-black text-indigo-400 bg-indigo-500/[0.02]">{team.points}</td>
                                </>
                              )}
                              {standingsSubTab === 'nba' && (
                                <>
                                  <td className="py-4 px-4 text-center text-white/40 font-bold tracking-wider uppercase text-[10px]">{team.conference}</td>
                                  <td className="py-4 px-4 text-center text-white/80 font-bold">{team.wins}</td>
                                  <td className="py-4 px-4 text-center text-white/60 font-medium">{team.losses}</td>
                                  <td className="py-4 px-4 text-center text-white/60 font-medium">{team.pct}</td>
                                  <td className="py-4 px-4 text-center text-white/40 font-medium">{team.diff}</td>
                                  <td className="py-4 px-8 text-center font-black text-indigo-400 bg-indigo-500/[0.02]">{team.streak}</td>
                                </>
                              )}
                              {standingsSubTab === 'nfl' && (
                                <>
                                  <td className="py-4 px-4 text-center text-white/40 font-bold tracking-wider uppercase text-[10px]">{team.division}</td>
                                  <td className="py-4 px-4 text-center text-white/80 font-bold">{team.wins}</td>
                                  <td className="py-4 px-4 text-center text-white/60 font-medium">{team.losses}</td>
                                  <td className="py-4 px-4 text-center text-white/60 font-medium">{team.pct}</td>
                                  <td className="py-4 px-4 text-center text-white/60 font-semibold">{team.pf}</td>
                                  <td className="py-4 px-8 text-center font-black text-indigo-400 bg-indigo-500/[0.02]">{team.streak}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-[#121216]/50 border border-white/[0.05] rounded-[3rem] shadow-inner">
                    <Info className="mx-auto text-white/20 mb-4" size={48} strokeWidth={1} />
                    <h3 className="text-xl font-black text-white mb-2">No Standings Data</h3>
                    <p className="text-sm text-white/40 max-w-sm mx-auto leading-relaxed">
                      Standings information is currently not returned by the API servers for this sports league.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

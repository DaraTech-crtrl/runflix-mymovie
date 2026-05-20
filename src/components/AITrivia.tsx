import { useState } from 'react';
import { Sparkles, ChevronDown, Loader2, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aiGetTrivia } from '../api/ai';

interface AITriviaProps {
  title: string;
}

export default function AITrivia({ title }: AITriviaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [trivia, setTrivia] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrivia = async () => {
    if (trivia.length > 0) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const results = await aiGetTrivia(title);
      setTrivia(results);
    } catch (err: any) {
      setError(err.message || 'Failed to load trivia');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && trivia.length === 0) {
      fetchTrivia();
    }
  };

  return (
    <div className="mt-12 bg-white/[0.02] border border-[var(--rf-red)]/10 rounded-3xl overflow-hidden backdrop-blur-sm">
      <button
        onClick={handleToggle}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--rf-red)]/20 to-orange-500/20 flex items-center justify-center shrink-0">
            <Brain size={18} className="text-[var(--rf-red)]" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Trivia & Fun Facts
              <span className="px-1.5 py-0.5 rounded bg-[var(--rf-red)]/20 text-[var(--rf-red)] text-[8px] font-black tracking-wider uppercase">AI</span>
            </h3>
            <p className="text-[11px] text-[var(--rf-text-dim)] mt-0.5">Behind the scenes details</p>
          </div>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-[var(--rf-text-dim)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-white/[0.04] mt-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[var(--rf-red)] mb-3" />
                  <p className="text-[10px] text-[var(--rf-text-dim)] uppercase tracking-wider animate-pulse">
                    Uncovering secrets...
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-6 text-sm text-red-400">
                  {error}
                  <button onClick={fetchTrivia} className="block mx-auto mt-2 text-xs underline">Try Again</button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {trivia.map((fact, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-[var(--rf-text-muted)] leading-relaxed bg-white/[0.02] p-4 rounded-2xl">
                      <Sparkles size={14} className="text-[var(--rf-red)] shrink-0 mt-0.5" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

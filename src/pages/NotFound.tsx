import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

export default function NotFound() {
  useSEO({
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist on Runflix Entertainment.',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center px-6"
    >
      <div className="text-center max-w-md">
        {/* Animated 404 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="mb-8"
        >
          <span className="text-8xl md:text-9xl font-black bg-gradient-to-r from-[var(--rf-red)] to-rose-500 bg-clip-text text-transparent select-none">
            404
          </span>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-2xl md:text-3xl font-black text-white mb-3">Page Not Found</h1>
          <p className="text-sm text-[var(--rf-text-muted)] mb-8 leading-relaxed">
            Oops! The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/"
            className="w-full sm:w-auto btn-primary px-6 py-3 text-sm flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Go Home
          </Link>
          <Link
            to="/explore"
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-all flex items-center justify-center gap-2"
          >
            <Search size={16} />
            Explore
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-[var(--rf-text-muted)] hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

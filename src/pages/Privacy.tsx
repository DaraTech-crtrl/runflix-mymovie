import { useSEO } from '../hooks/useSEO';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Shield, Eye, Database, Lock, Cookie, UserCheck, Bell, Clock } from 'lucide-react';

export default function Privacy() {
  useSEO({
    title: 'Privacy Policy',
    description: 'Runflix Entertainment Privacy Policy — Learn how we handle your data and protect your privacy.',
  });

  const lastUpdated = 'May 17, 2026';

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto px-5 lg:px-10 pt-10 pb-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[var(--rf-text-muted)] hover:text-white transition-colors mb-8 group"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-4 mb-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Shield size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Privacy Policy</h1>
              <div className="flex items-center gap-2 mt-1">
                <Clock size={12} className="text-[var(--rf-text-dim)]" />
                <span className="text-xs text-[var(--rf-text-dim)]">Last updated: {lastUpdated}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-4xl mx-auto px-5 lg:px-10 pb-20"
      >
        {/* Summary Card */}
        <div className="glass-2 rounded-2xl p-6 border border-purple-500/10 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Your Privacy Matters</h3>
              <p className="text-xs text-[var(--rf-text-muted)] leading-relaxed">
                Runflix Entertainment is designed with a privacy-first approach. We do not require account creation,
                we do not sell your data, and all user preferences are stored locally on your device.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Section icon={<Eye size={18} />} title="1. Information We Collect" color="purple">
            <p><strong className="text-white">Minimal Data Collection:</strong> Runflix Entertainment collects as little data as possible. Here's what we do and don't collect:</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="glass rounded-xl p-4">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">✓ Stored Locally (Your Device)</h4>
                <ul className="text-xs space-y-1.5 text-[var(--rf-text-muted)]">
                  <li>• Watchlist preferences</li>
                  <li>• Recently viewed history</li>
                  <li>• Episode watch progress</li>
                  <li>• Theme and quality preferences</li>
                  <li>• Search history</li>
                </ul>
              </div>
              <div className="glass rounded-xl p-4">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">✗ We Do NOT Collect</h4>
                <ul className="text-xs space-y-1.5 text-[var(--rf-text-muted)]">
                  <li>• Personal identification info</li>
                  <li>• Email addresses</li>
                  <li>• Passwords or login credentials</li>
                  <li>• Payment information</li>
                  <li>• Location data</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section icon={<Database size={18} />} title="2. Local Storage & Cookies" color="blue">
            <p>Runflix Entertainment uses browser Local Storage (not cookies) to store your preferences and viewing history. This data:</p>
            <ul className="list-disc list-inside space-y-2 text-[var(--rf-text-muted)] mt-2">
              <li>Never leaves your device</li>
              <li>Is not transmitted to any server</li>
              <li>Can be cleared at any time through your browser settings</li>
              <li>Is used solely to enhance your user experience</li>
            </ul>
          </Section>

          <Section icon={<Lock size={18} />} title="3. Third-Party Services" color="amber">
            <p>Runflix Entertainment interacts with third-party APIs to provide content data (movie information, posters, streaming sources). These third parties may have their own privacy policies:</p>
            <ul className="list-disc list-inside space-y-2 text-[var(--rf-text-muted)] mt-2">
              <li><strong className="text-white">Content APIs</strong> — Used to fetch movie metadata, covers, and streaming links</li>
              <li><strong className="text-white">Image CDNs</strong> — Used to serve optimized poster images</li>
              <li><strong className="text-white">Sports APIs</strong> — Used for live score data on the Sports hub</li>
            </ul>
            <p className="mt-3">We recommend reviewing the privacy policies of these third-party services independently.</p>
          </Section>

          <Section icon={<Cookie size={18} />} title="4. Analytics" color="teal">
            <p>Runflix Entertainment may use basic, anonymized analytics to understand general usage patterns (e.g., most popular genres, peak usage times). This data:</p>
            <ul className="list-disc list-inside space-y-2 text-[var(--rf-text-muted)] mt-2">
              <li>Contains no personally identifiable information</li>
              <li>Is aggregated and anonymized</li>
              <li>Is used solely to improve the platform experience</li>
            </ul>
          </Section>

          <Section icon={<Shield size={18} />} title="5. Data Security" color="emerald">
            <p>Since user data is stored exclusively in your browser's Local Storage, data security is inherently managed at the device level. We recommend:</p>
            <ul className="list-disc list-inside space-y-2 text-[var(--rf-text-muted)] mt-2">
              <li>Keeping your browser up to date</li>
              <li>Using strong device passwords</li>
              <li>Avoiding use of Runflix Entertainment on shared or public devices if privacy is a concern</li>
            </ul>
          </Section>

          <Section icon={<Bell size={18} />} title="6. Changes to This Policy" color="rose">
            <p>We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated revision date. We encourage you to review this page periodically.</p>
          </Section>

          <Section icon={<UserCheck size={18} />} title="7. Contact" color="purple">
            <p>If you have any questions or concerns about this Privacy Policy, please visit our <Link to="/contact" className="text-purple-400 hover:underline">Contact page</Link>.</p>
          </Section>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ icon, title, children, color = 'purple' }: { icon: React.ReactNode; title: string; children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    teal: 'text-teal-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
  };

  return (
    <div className="glass-2 rounded-2xl p-6 sm:p-8 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className={colorMap[color] || 'text-purple-400'}>{icon}</div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-[var(--rf-text-muted)] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

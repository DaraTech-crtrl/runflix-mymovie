import { useSEO } from '../hooks/useSEO';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Shield, Scale, FileText, AlertTriangle, Globe, Clock } from 'lucide-react';

export default function Terms() {
  useSEO({
    title: 'Terms of Service',
    description: 'Runflix Entertainment Terms of Service — Read our terms and conditions for using the platform.',
  });

  const lastUpdated = 'May 17, 2026';

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--rf-red)]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--rf-red)]/5 blur-[120px] rounded-full pointer-events-none" />

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
            <div className="w-14 h-14 rounded-2xl bg-[var(--rf-red)]/10 border border-[var(--rf-red)]/20 flex items-center justify-center">
              <Scale size={24} className="text-[var(--rf-red)]" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Terms of Service</h1>
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
        <div className="space-y-8">
          <Section icon={<FileText size={18} />} title="1. Acceptance of Terms">
            <p>By accessing or using Runflix Entertainment ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
            <p>Runflix Entertainment reserves the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance of the revised terms.</p>
          </Section>

          <Section icon={<Globe size={18} />} title="2. Description of Service">
            <p>Runflix Entertainment is a content discovery and streaming aggregation platform. We provide users with access to movies, TV series, anime, and other entertainment content through third-party APIs and sources.</p>
            <p>The availability, quality, and nature of content may vary and is subject to change without prior notice.</p>
          </Section>

          <Section icon={<Shield size={18} />} title="3. User Responsibilities">
            <ul className="list-disc list-inside space-y-2 text-[var(--rf-text-muted)]">
              <li>You must be at least 13 years old to use RUNFlix.</li>
              <li>You are responsible for maintaining the security of your device and account information.</li>
              <li>You agree not to misuse the Service, including but not limited to: attempting to hack, scrape, or reverse-engineer the platform.</li>
              <li>You agree not to use automated tools or bots to access the Service.</li>
              <li>You are solely responsible for your viewing choices and their compliance with your local laws.</li>
            </ul>
          </Section>

          <Section icon={<AlertTriangle size={18} />} title="4. Content Disclaimer">
            <p>Runflix Entertainment does not host, store, or upload any media content. All content is sourced from publicly available third-party APIs and external streaming services.</p>
            <p>We do not claim ownership of any content displayed on the platform. All trademarks, logos, and content belong to their respective copyright holders.</p>
            <p>If you are a copyright owner and believe content accessible through our service infringes your rights, please contact us immediately.</p>
          </Section>

          <Section icon={<Scale size={18} />} title="5. Intellectual Property">
            <p>The Runflix Entertainment brand, logo, design system, and original source code are proprietary. You may not reproduce, distribute, or create derivative works from Runflix Entertainment's original assets without express written permission.</p>
          </Section>

          <Section icon={<Shield size={18} />} title="6. Limitation of Liability">
            <p>Runflix Entertainment is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied. We do not guarantee uninterrupted, secure, or error-free operation of the Service.</p>
            <p>In no event shall Runflix Entertainment, its developers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>
          </Section>

          <Section icon={<FileText size={18} />} title="7. Termination">
            <p>We reserve the right to suspend or terminate your access to the Service at any time, for any reason, without prior notice. Upon termination, your right to use the Service ceases immediately.</p>
          </Section>

          <Section icon={<Globe size={18} />} title="8. Governing Law">
            <p>These Terms shall be governed by and construed in accordance with applicable laws of the jurisdiction in which Runflix Entertainment operates, without regard to conflict of law provisions.</p>
          </Section>

          <Section icon={<FileText size={18} />} title="9. Contact">
            <p>If you have any questions about these Terms, please visit our <Link to="/contact" className="text-[var(--rf-red)] hover:underline">Contact page</Link>.</p>
          </Section>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-2 rounded-2xl p-6 sm:p-8 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-[var(--rf-red)]">{icon}</div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-[var(--rf-text-muted)] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

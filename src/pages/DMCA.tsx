import { useSEO } from '../hooks/useSEO';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Shield, AlertTriangle, FileText, Mail, Clock, CheckCircle2 } from 'lucide-react';

export default function DMCA() {
  useSEO({
    title: 'DMCA Policy',
    description: 'Runflix Entertainment DMCA Policy — Learn how to submit a copyright takedown request.',
  });

  const lastUpdated = 'May 17, 2026';

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto px-5 lg:px-10 pt-10 pb-8 relative z-10">
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
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
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield size={24} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">DMCA Policy</h1>
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
        {/* Important Notice Banner */}
        <div className="glass-2 rounded-2xl p-6 border border-amber-500/15 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Important Notice</h3>
              <p className="text-xs text-[var(--rf-text-muted)] leading-relaxed">
                Runflix Entertainment respects the intellectual property rights of others. We do not host, store, or upload any media
                content on our servers. All content is provided through publicly available third-party APIs. If you believe
                any content accessible through our service infringes your copyright, please follow the process below.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Section icon={<Shield size={18} />} title="1. What is DMCA?" color="amber">
            <p>The Digital Millennium Copyright Act (DMCA) is a United States copyright law that provides a process for copyright holders to request the removal of content that infringes their copyrights from online platforms.</p>
            <p>Runflix Entertainment complies with DMCA takedown requests and will promptly respond to properly submitted notices.</p>
          </Section>

          <Section icon={<FileText size={18} />} title="2. Our Position on Content" color="blue">
            <p>Runflix Entertainment operates as a <strong className="text-white">content discovery and aggregation platform</strong>. We want to be clear about our infrastructure:</p>
            <ul className="list-disc list-inside space-y-2 text-[var(--rf-text-muted)] mt-3">
              <li>We <strong className="text-white">do not</strong> host, upload, or store any video, audio, or image content on our servers.</li>
              <li>All media content is sourced from <strong className="text-white">publicly available third-party APIs</strong> and external streaming services.</li>
              <li>We <strong className="text-white">do not</strong> modify, transcode, or redistribute any copyrighted material.</li>
              <li>Movie metadata (titles, descriptions, posters) is fetched from third-party API databases.</li>
            </ul>
          </Section>

          <Section icon={<AlertTriangle size={18} />} title="3. Filing a DMCA Takedown Notice" color="rose">
            <p>If you are a copyright owner (or authorized to act on behalf of one) and believe that content accessible through Runflix Entertainment infringes your copyrights, please submit a written DMCA takedown notice containing the following:</p>

            <div className="space-y-3 mt-4">
              <RequirementItem number={1} text="Identification of the copyrighted work claimed to have been infringed." />
              <RequirementItem number={2} text="Identification of the material claimed to be infringing, including specific URL(s) or sufficient information for us to locate it." />
              <RequirementItem number={3} text="Your full name, mailing address, telephone number, and email address." />
              <RequirementItem number={4} text="A statement that you have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law." />
              <RequirementItem number={5} text="A statement, made under penalty of perjury, that the information in the notification is accurate and that you are authorized to act on behalf of the copyright owner." />
              <RequirementItem number={6} text="Your physical or electronic signature." />
            </div>
          </Section>

          <Section icon={<Mail size={18} />} title="4. How to Submit" color="emerald">
            <p>Send your DMCA takedown notice to:</p>
            <div className="glass rounded-xl p-5 mt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-[var(--rf-text-dim)] uppercase tracking-wider font-bold block">Email</span>
                    <a href="mailto:daratech.web@gmail.com" className="text-sm text-blue-400 hover:underline font-medium">
                      daratech.web@gmail.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-[var(--rf-text-dim)] uppercase tracking-wider font-bold block">Subject Line</span>
                    <span className="text-sm text-white font-medium">DMCA Takedown Request — [Content Title]</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4">You can also use our <Link to="/contact" className="text-blue-400 hover:underline">Contact page</Link> and select "Copyright/DMCA" as the subject.</p>
          </Section>

          <Section icon={<CheckCircle2 size={18} />} title="5. Response Process" color="teal">
            <p>Upon receiving a valid DMCA takedown notice, we will:</p>
            <div className="space-y-3 mt-4">
              <ProcessStep step={1} text="Acknowledge receipt of your notice within 24-48 hours." />
              <ProcessStep step={2} text="Review the reported content and verify the claim." />
              <ProcessStep step={3} text="Remove or disable access to the infringing material promptly." />
              <ProcessStep step={4} text="Notify the affected parties if applicable." />
              <ProcessStep step={5} text="Confirm the action taken to the complainant." />
            </div>
          </Section>

          <Section icon={<AlertTriangle size={18} />} title="6. Counter-Notification" color="purple">
            <p>If you believe your content was wrongfully removed, you may file a counter-notification containing:</p>
            <ul className="list-disc list-inside space-y-2 text-[var(--rf-text-muted)] mt-3">
              <li>Identification of the material that was removed and the location where it appeared before removal.</li>
              <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake or misidentification.</li>
              <li>Your name, address, phone number, and consent to the jurisdiction of your local federal court.</li>
              <li>Your physical or electronic signature.</li>
            </ul>
          </Section>

          <Section icon={<Shield size={18} />} title="7. Repeat Infringers" color="rose">
            <p>Runflix Entertainment maintains a policy of terminating access for users or services that are repeat infringers of intellectual property rights, where applicable.</p>
          </Section>

          <Section icon={<FileText size={18} />} title="8. Good Faith" color="amber">
            <p>Please note that misrepresentation in a DMCA notice may result in liability for damages, including costs and attorney fees. Ensure your claim is valid before submitting.</p>
            <p>For general inquiries, visit our <Link to="/contact" className="text-amber-400 hover:underline">Contact page</Link>.</p>
          </Section>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ icon, title, children, color = 'amber' }: { icon: React.ReactNode; title: string; children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    amber: 'text-amber-400', blue: 'text-blue-400', rose: 'text-rose-400',
    emerald: 'text-emerald-400', teal: 'text-teal-400', purple: 'text-purple-400',
  };

  return (
    <div className="glass-2 rounded-2xl p-6 sm:p-8 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className={colorMap[color] || 'text-amber-400'}>{icon}</div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-[var(--rf-text-muted)] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function RequirementItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-black text-rose-400">{number}</span>
      </div>
      <p className="text-sm text-[var(--rf-text-muted)]">{text}</p>
    </div>
  );
}

function ProcessStep({ step, text }: { step: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-black text-teal-400">{step}</span>
      </div>
      <p className="text-sm text-[var(--rf-text-muted)]">{text}</p>
    </div>
  );
}

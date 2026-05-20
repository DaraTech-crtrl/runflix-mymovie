import { useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Mail, MessageSquare, Send, CheckCircle2,
  Globe, Clock, AlertCircle, Sparkles, Github, Phone, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Select } from '../components/ui/Select';

export default function Contact() {
  useSEO({
    title: 'Contact Us',
    description: 'Get in touch with the Runflix Entertainment team — Report bugs, suggest features, or send us a message.',
  });

  const [formData, setFormData] = useState({ name: '', email: '', subject: 'general', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const subjectOptions = [
    { value: 'general', label: '💬 General Inquiry' },
    { value: 'bug', label: '🐛 Bug Report' },
    { value: 'feature', label: '✨ Feature Request' },
    { value: 'copyright', label: '©️ Copyright/DMCA' },
    { value: 'partnership', label: '🤝 Partnership' },
    { value: 'other', label: '📋 Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      // If the endpoint doesn't exist (dev server), fall back to mailto
      if (res.status === 404) {
        openMailtoFallback();
        return;
      }

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSubmitted(true);
        toast.success('Message sent successfully!');
      } else {
        toast.error(data.message || 'Failed to send message. Try again.');
      }
    } catch (err) {
      // Network error or dev server — use mailto fallback
      console.warn('Contact API unavailable, using mailto fallback:', err);
      openMailtoFallback();
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMailtoFallback = () => {
    const subjectLabel = subjectOptions.find(o => o.value === formData.subject)?.label || formData.subject;
    const mailSubject = encodeURIComponent(`[Runflix Entertainment Contact] ${subjectLabel}`);
    const mailBody = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nSubject: ${subjectLabel}\n\nMessage:\n${formData.message}`
    );
    window.open(`mailto:support@runflix.name.ng?subject=${mailSubject}&body=${mailBody}`, '_self');
    setIsSubmitted(true);
    toast.success('Opening your email client...');
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', subject: 'general', message: '' });
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-5 lg:px-10 pt-10 pb-8 relative z-10">
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
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Mail size={24} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Contact Us</h1>
              <p className="text-sm text-[var(--rf-text-dim)] mt-1">We'd love to hear from you</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-5xl mx-auto px-5 lg:px-10 pb-20"
      >
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column — Contact Info & Cards */}
          <div className="lg:col-span-2 space-y-4">
            {/* Direct Contact — Gmail */}
            <motion.a
              href="mailto:support@runflix.name.ng"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="block glass-2 rounded-2xl p-5 border border-white/[0.04] hover:border-blue-500/20 transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                    <path d="M22 6L12 13L2 6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" />
                    <rect x="2" y="4" width="20" height="16" rx="3" stroke="#EA4335" strokeWidth="1.5" fill="none" />
                    <path d="M2 6L12 13L22 6" fill="rgba(234,67,53,0.1)" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white">Email Us</h3>
                    <ExternalLink size={12} className="text-[var(--rf-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-blue-400 font-medium truncate">support</p>
                  <p className="text-[10px] text-[var(--rf-text-dim)] mt-1">Replies within 24-48 hours</p>
                </div>
              </div>
            </motion.a>

            {/* Direct Contact — WhatsApp */}
            <motion.a
              href="https://wa.me/2348100785677"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="block glass-2 rounded-2xl p-5 border border-white/[0.04] hover:border-emerald-500/20 transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white">WhatsApp Direct</h3>
                    <ExternalLink size={12} className="text-[var(--rf-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-emerald-400 font-medium">+234 810 078 5677</p>
                  <p className="text-[10px] text-[var(--rf-text-dim)] mt-1">Fastest response • Chat directly</p>
                </div>
              </div>
            </motion.a>
            <a href="https://chat.whatsapp.com/ELsCys35etk4I268yoxe6c" target="_blank" rel="noopener noreferrer" className="block text-sm text-[var(--rf-text-dim)] hover:text-white transition-colors">WhatsApp Group</a>

            {/* Runflix Entertainment Picks Daily Channel Card */}
            <motion.a
              href="https://whatsapp.com/channel/0029Vb8esUv3GJP6ymXaNF3g"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="block glass-2 rounded-2xl p-5 border border-white/[0.04] hover:border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-emerald-400">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white">Recommendations</h3>
                    <ExternalLink size={12} className="text-[var(--rf-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-emerald-400 font-black uppercase tracking-wider">Join Channel</p>
                  <p className="text-[10px] text-[var(--rf-text-dim)] mt-1">Get daily handpicked movies, anime, and updates directly to your feed.</p>
                </div>
              </div>
            </motion.a>

            {/* WhatsApp Group Card */}
            <motion.a
              href="https://chat.whatsapp.com/ELsCys35etk4I268yoxe6c"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="block glass-2 rounded-2xl p-5 border border-white/[0.04] hover:border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-emerald-400">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white">Community</h3>
                    <ExternalLink size={12} className="text-[var(--rf-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-emerald-400 font-black uppercase tracking-wider">Join Group</p>
                  <p className="text-[10px] text-[var(--rf-text-dim)] mt-1">Connect with other movie lovers, share recommendations, and get instant updates.</p>
                </div>
              </div>
            </motion.a>

            {/* Info Cards */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-2 rounded-2xl p-5 border border-white/[0.04]"
            >
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Feature Requests</h3>
                  <p className="text-xs text-[var(--rf-text-muted)] leading-relaxed">Got an idea that would make Runflix Entertainment better? We actively review and implement community suggestions.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
              className="glass-2 rounded-2xl p-5 border border-white/[0.04]"
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Bug Reports</h3>
                  <p className="text-xs text-[var(--rf-text-muted)] leading-relaxed">Found a bug? Please include your browser, device, and steps to reproduce for the fastest fix.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-2 rounded-2xl p-5 border border-white/[0.04]"
            >
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Response Time</h3>
                  <p className="text-xs text-[var(--rf-text-muted)] leading-relaxed">Email: 24-48 hours. WhatsApp: Usually within a few hours during business days.</p>
                </div>
              </div>
            </motion.div>

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65 }}
              className="glass-2 rounded-2xl p-5 border border-white/[0.04]"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-4">Connect With Us</h3>
              <div className="flex gap-3">
                <a
                  href="https://github.com/DaraTech-crtrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-[var(--rf-text-dim)] hover:text-white hover:bg-white/10 transition-all"
                  aria-label="GitHub"
                >
                  <Github size={18} />
                </a>
                <a
                  href="mailto:support@runflix.name.ng"
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-[var(--rf-text-dim)] hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Email"
                >
                  <Mail size={18} />
                </a>
                <a
                  href="https://wa.me/2348100785677"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-[var(--rf-text-dim)] hover:text-white hover:bg-white/10 transition-all"
                  aria-label="WhatsApp"
                >
                  <Phone size={18} />
                </a>
              </div>
            </motion.div>
          </div>

          {/* Right Column — Form */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-2 rounded-2xl p-6 sm:p-8 border border-white/[0.04]"
            >
              <AnimatePresence mode="wait">
                {isSubmitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 size={40} className="text-emerald-400" />
                      </div>
                      <div className="absolute inset-0 w-20 h-20 rounded-full bg-emerald-500/20 animate-ping" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Message Sent! 🎉</h3>
                    <p className="text-sm text-[var(--rf-text-muted)] max-w-sm mb-3">
                      Thank you for reaching out. We'll review your message and get back to you soon.
                    </p>
                    <p className="text-xs text-[var(--rf-text-dim)] mb-6">
                      A copy has been sent to <span className="text-blue-400">support@runflix.name.ng</span>
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={resetForm}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold glass hover:bg-white/10 transition-all text-white"
                      >
                        Send Another
                      </button>
                      <a
                        href="https://wa.me/2348100785677"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all flex items-center gap-2"
                      >
                        <Phone size={14} />
                        Chat on WhatsApp
                      </a>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <MessageSquare size={20} className="text-blue-400" />
                      <div>
                        <h2 className="text-lg font-bold text-white">Send a Message</h2>
                        <p className="text-xs text-[var(--rf-text-dim)]">Your message will be delivered to our Gmail inbox</p>
                      </div>
                    </div>

                    {/* Name + Email Row */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-2">
                          Your Name <span className="text-[var(--rf-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 rounded-xl glass border border-white/[0.06] focus:border-blue-500/40 text-sm text-white placeholder:text-[var(--rf-text-dim)] outline-none transition-colors bg-transparent focus:bg-white/[0.02]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-2">
                          Email Address <span className="text-[var(--rf-red)]">*</span>
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="john@example.com"
                          className="w-full px-4 py-3 rounded-xl glass border border-white/[0.06] focus:border-blue-500/40 text-sm text-white placeholder:text-[var(--rf-text-dim)] outline-none transition-colors bg-transparent focus:bg-white/[0.02]"
                          required
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-2">
                        Subject
                      </label>
                      <div className="relative">
                        <Select
                          value={formData.subject}
                          onChange={val => setFormData(prev => ({ ...prev, subject: val }))}
                          options={subjectOptions}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rf-text-muted)] mb-2">
                        Message <span className="text-[var(--rf-red)]">*</span>
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Tell us what's on your mind..."
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl glass border border-white/[0.06] focus:border-blue-500/40 text-sm text-white placeholder:text-[var(--rf-text-dim)] outline-none transition-colors resize-none bg-transparent focus:bg-white/[0.02]"
                        required
                      />
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-[var(--rf-text-dim)]">Be as detailed as possible</span>
                        <span className={`text-[10px] ${formData.message.length > 900 ? 'text-amber-400' : 'text-[var(--rf-text-dim)]'}`}>
                          {formData.message.length}/1000
                        </span>
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending via Gmail...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Send Message
                        </>
                      )}
                    </button>

                    {/* Alternative contact notice */}
                    <div className="text-center pt-2">
                      <p className="text-[10px] text-[var(--rf-text-dim)]">
                        Prefer instant messaging?{' '}
                        <a
                          href="https://wa.me/2348100785677"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline font-medium"
                        >
                          Chat on WhatsApp →
                        </a>
                      </p>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// RiderWelcome.jsx
// Shown after a rider completes onboarding (Phase 4 submit).
// Props:
//   rider           — user object from authService (name, first_name, vehicle, city, etc.)
//   onGoToDashboard — navigate to rider-dashboard

import { useEffect, useState } from 'react';
import {
  CheckCircle2, Bike, Clock, Shield, Zap,
  MapPin, ChevronRight, Star, Package, Sun, Moon,
} from 'lucide-react';
import './RiderWelcome.css';

const NEXT_STEPS = [
  {
    icon: <Shield size={20} strokeWidth={1.8} />,
    title: 'Application under review',
    desc:  'Our team will verify your documents within 24–48 hours. You will get an SMS.',
    status: 'done',
  },
  {
    icon: <Package size={20} strokeWidth={1.8} />,
    title: 'Pick up your gear',
    desc:  'Visit your nearest hub to collect your delivery bag and thermal pouch.',
    status: 'next',
  },
  {
    icon: <Zap size={20} strokeWidth={1.8} />,
    title: 'Complete training',
    desc:  'A short orientation session at the hub gets you ready for your first delivery.',
    status: 'upcoming',
  },
  {
    icon: <Bike size={20} strokeWidth={1.8} />,
    title: 'Start delivering & earning',
    desc:  'Go online any time and start earning. Your first payout is within 7 days.',
    status: 'upcoming',
  },
];

const STATS = [
  { value: '৳18,000+', label: 'Avg. monthly earnings' },
  { value: '30 min',   label: 'Avg. delivery time' },
  { value: '10,000+',  label: 'Active riders' },
];

export default function RiderWelcome({ rider = {}, onGoToDashboard, isDark = false, onToggleTheme }) {
  const [visible, setVisible] = useState(false);

  // Fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const firstName = rider.first_name || rider.name?.split(' ')[0] || 'Rider';
  const vehicle   = rider.vehicle || 'vehicle';
  const city      = rider.city    || 'your city';

  return (
    <div className={`rw-page ${visible ? 'rw-visible' : ''}`}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="rw-header">
        <div className="rw-header-logo">
          <div className="rw-logo-icon">
            <Bike size={22} strokeWidth={1.8} />
          </div>
          <span className="rw-logo-text">Khete Chai</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => onToggleTheme?.()}
            title={isDark ? 'Light mode' : 'Dark mode'}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: '1.5px solid var(--gray-200)',
              background: 'var(--white)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--gray-600)',
              transition: 'all 0.18s',
            }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <span className="rw-header-badge">Rider Portal</span>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="rw-hero">
        <div className="rw-hero-inner">

          {/* Check animation */}
          <div className="rw-check-wrap">
            <div className="rw-check-ring rw-ring-1" />
            <div className="rw-check-ring rw-ring-2" />
            <div className="rw-check-circle">
              <CheckCircle2 size={44} strokeWidth={1.6} />
            </div>
          </div>

          <h1 className="rw-hero-title">
            You're in, {firstName}! 🎉
          </h1>
          <p className="rw-hero-sub">
            Your application has been submitted successfully. Welcome to the Khete Chai rider family.
          </p>

          {/* Rider info pills */}
          <div className="rw-info-pills">
            <span className="rw-pill">
              <Bike size={14} /> {vehicle}
            </span>
            <span className="rw-pill">
              <MapPin size={14} /> {city}
            </span>
            <span className="rw-pill rw-pill-pending">
              <Clock size={14} /> Pending review
            </span>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="rw-stats-strip">
        {STATS.map((s, i) => (
          <div key={i} className="rw-stat">
            <span className="rw-stat-val">{s.value}</span>
            <span className="rw-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Main body ───────────────────────────────────────────────────────── */}
      <div className="rw-body">

        {/* What happens next */}
        <section className="rw-section">
          <h2 className="rw-section-title">What happens next</h2>

          <div className="rw-steps">
            {NEXT_STEPS.map((step, i) => (
              <div key={i} className={`rw-step rw-step-${step.status}`}>
                {/* Left — number + connector */}
                <div className="rw-step-left">
                  <div className="rw-step-num">
                    {step.status === 'done'
                      ? <CheckCircle2 size={18} strokeWidth={2} />
                      : <span>{i + 1}</span>
                    }
                  </div>
                  {i < NEXT_STEPS.length - 1 && <div className="rw-step-line" />}
                </div>

                {/* Right — content */}
                <div className="rw-step-body">
                  <div className="rw-step-icon">{step.icon}</div>
                  <div className="rw-step-text">
                    <h3 className="rw-step-title">{step.title}</h3>
                    <p className="rw-step-desc">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tips card */}
        <section className="rw-tips-card">
          <div className="rw-tips-header">
            <Star size={18} strokeWidth={1.8} />
            <h3>Tips for your first week</h3>
          </div>
          <ul className="rw-tips-list">
            <li>Keep your phone charged and the app open during your shift.</li>
            <li>Accept orders quickly — response time affects your rating.</li>
            <li>Be polite and on time — happy customers tip more.</li>
            <li>Use the zone heatmap in your dashboard to find busy areas.</li>
          </ul>
        </section>

        {/* CTA */}
        <div className="rw-cta-wrap">
          <button className="rw-cta-btn" onClick={onGoToDashboard}>
            Go to my dashboard
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
          <p className="rw-cta-note">
            You'll be notified by SMS once your documents are approved.
          </p>
        </div>

      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="rw-footer">
        <p>© {new Date().getFullYear()} Khete Chai · Made with ❤️ in Bangladesh</p>
      </footer>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, Bike,
  ArrowRight, TrendingUp, MapPin, Star,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { BRAND, COLORS } from '../constants.js';
import authService from '../Authservice.js';
import './RiderLogin.css';

const HERO_FEATURES = [
  { Icon: TrendingUp, text: 'Earn up to ৳25,000 per month on your schedule' },
  { Icon: MapPin,     text: 'Deliver in your city with live route guidance'  },
  { Icon: Star,       text: 'Top riders get bonuses and priority assignments' },
];

const RiderLogin = ({ onSwitchToSignUp, onLoginSuccess }) => {
  const [formData,     setFormData]     = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [focused,      setFocused]      = useState(null);

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) { toast.error('Please fill in all fields'); return; }

    setLoading(true);
    try {
      await authService.login(formData.email, formData.password, 'email');
      const user = authService.getUser();
      toast.success('Welcome back, rider! 🏍️');
      setTimeout(() => onLoginSuccess && onLoginSuccess({ type: 'rider', user }), 600);
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fg = (id) => `signin-form-group ${focused === id ? 'focused' : ''}`;

  return (
    <div className="signin-container">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      {/* ── LEFT hero ── */}
      <div className="signin-left-side">
        <motion.div className="signin-logo-section"
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike size={22} color="white" strokeWidth={2} />
            </div>
            <div className="signin-logo">{BRAND.name} <span style={{ fontWeight: 300, fontSize: '0.65em', opacity: 0.85 }}>rider</span></div>
          </div>

          <div className="signin-tagline">Log in and start delivering today</div>
          <div className="signin-features">
            {HERO_FEATURES.map(({ Icon, text }, i) => (
              <motion.div key={i} className="signin-feature-item"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
                <div className="signin-feature-icon"><Icon size={16} strokeWidth={2} /></div>
                <span>{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT form ── */}
      <div className="signin-right-side">
        <motion.div className="signin-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>

          <div className="signin-header">
            <div className="signin-brand-pill">{BRAND.name} Rider</div>
            <h1>Log in to your account</h1>
            <p>Welcome back! Sign in to your rider account.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className={fg('email')}>
              <label htmlFor="r-email">Email Address</label>
              <div className="signin-input-wrapper">
                <Mail size={15} className="signin-input-icon" />
                <input type="email" id="r-email" name="email" placeholder="Enter your email"
                  value={formData.email} onChange={handleChange}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
              </div>
            </div>

            <div className={fg('password')}>
              <label htmlFor="r-password">Password</label>
              <div className="signin-input-wrapper">
                <Lock size={15} className="signin-input-icon" />
                <input type={showPassword ? 'text' : 'password'} id="r-password" name="password"
                  placeholder="Enter your password" value={formData.password} onChange={handleChange}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                <button type="button" className="signin-toggle-password" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="signin-form-options">
              <span />
              <a href="#" className="signin-forgot-password" onClick={e => e.preventDefault()}>Forgot Password?</a>
            </div>

            <motion.button type="submit" className="signin-submit-btn" disabled={loading}
              whileHover={!loading ? { y: -2, boxShadow: '0 8px 22px rgba(215,15,100,0.38)' } : {}}
              whileTap={!loading ? { y: 0 } : {}}>
              {loading
                ? <span className="signin-loading-dots"><span/><span/><span/></span>
                : <> Log In <ArrowRight size={15} style={{ marginLeft: 5 }} /> </>}
            </motion.button>
          </form>

          <div className="signin-signup-link">
            No account?{' '}
            <a onClick={onSwitchToSignUp} style={{ cursor: 'pointer' }}>Sign up as a rider</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RiderLogin;
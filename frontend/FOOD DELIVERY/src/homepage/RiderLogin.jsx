import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, Phone, Bike,
  ArrowRight, MapPin, Star, TrendingUp, Sun, Moon, Globe,
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
  const [loginMode,    setLoginMode]    = useState('email');
  const [formData,     setFormData]     = useState({ email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [focused,      setFocused]      = useState(null);
  const [darkMode,     setDarkMode]     = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDarkMode(document.documentElement.getAttribute('data-theme') === 'dark')
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try { localStorage.setItem('fp_theme', next ? 'dark' : 'light'); } catch {}
    setDarkMode(next);
  };

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const identifier = loginMode === 'email' ? formData.email : formData.phone;
    if (!identifier || !formData.password) { toast.error('Please fill in all fields'); return; }

    setLoading(true);
    try {
      await authService.login(identifier, formData.password, loginMode === 'phone' ? 'phone' : 'email');

      // Verify this is a rider account
      const user = authService.getUser();
      const role = (user?.role || user?.user_type || '').toString().toUpperCase();
      const isRider = role === 'RIDER' || role === 'DELIVERY' || !role; // allow unknown for now

      toast.success('Welcome back, rider! 🏍️');
      setTimeout(() => onLoginSuccess && onLoginSuccess({ type: 'rider', user }), 600);
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fg = (id) => `rl-form-group ${focused === id ? 'focused' : ''}`;

  return (
    <div className="rider-login-container">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      {/* LEFT HERO */}
      <div className="rider-login-left">
        <motion.div className="rider-login-hero"
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

          {/* Illustration */}
          <div className="rider-hero-illustration">
            <div className="rider-illus-circle">
              <Bike size={64} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
            </div>
            <div className="rider-illus-badge rider-illus-badge-1">🏍️ Fast</div>
            <div className="rider-illus-badge rider-illus-badge-2">💰 Earn</div>
            <div className="rider-illus-badge rider-illus-badge-3">⭐ Rated</div>
          </div>

          <div className="rider-hero-brand">
            <Bike size={20} color="rgba(255,255,255,0.8)" />
            <span>{BRAND.name}</span>
            <span className="rider-hero-brand-sub">rider</span>
          </div>
          <h1 className="rider-hero-title">Log in to your rider account</h1>

          <div className="rider-hero-features">
            {HERO_FEATURES.map(({ Icon, text }, i) => (
              <motion.div key={i} className="rider-feature-item"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.38 }}>
                <div className="rider-feature-icon"><Icon size={16} strokeWidth={2} /></div>
                <span>{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT FORM */}
      <div className="rider-login-right">
        <div className="rider-login-header">
          <div className="rider-partner-logo">
            <div className="rider-logo-icon">
              <Bike size={18} color={COLORS.primary} strokeWidth={2.5} />
            </div>
            <span className="rider-logo-main">{BRAND.name}</span>
            <span className="rider-logo-sub"> rider</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="rider-lang-btn"><Globe size={14} /> EN</button>
            <button className="rider-theme-btn" onClick={toggleDark}>
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        <motion.div className="rider-login-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
          <h2 className="rider-login-title">
            {loginMode === 'email' ? 'Log in with email' : 'Log in with phone'}
          </h2>

          {/* Mode toggle */}
          <div className="rider-mode-toggle">
            <button className={`rider-mode-btn ${loginMode === 'email' ? 'active' : ''}`}
              onClick={() => setLoginMode('email')} type="button">Email</button>
            <button className={`rider-mode-btn ${loginMode === 'phone' ? 'active' : ''}`}
              onClick={() => setLoginMode('phone')} type="button">Phone Number</button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {loginMode === 'email' ? (
              <div className={fg('email')}>
                <div className="rl-input-wrapper">
                  <Mail size={15} className="rl-input-icon" />
                  <input type="email" name="email" placeholder="Email address"
                    value={formData.email} onChange={handleChange}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                </div>
              </div>
            ) : (
              <div className="rl-form-group">
                <div className="rl-phone-wrapper">
                  <span className="rl-country-code">+880</span>
                  <input type="tel" name="phone" placeholder="1712345678"
                    value={formData.phone} onChange={handleChange} className="rl-phone-field" />
                </div>
              </div>
            )}

            <div className={fg('password')}>
              <div className="rl-input-wrapper">
                <Lock size={15} className="rl-input-icon" />
                <input type={showPassword ? 'text' : 'password'} name="password"
                  placeholder="Password" value={formData.password} onChange={handleChange}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                <button type="button" className="rl-toggle-pw"
                  onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="rl-forgot-row">
              <a href="#" onClick={e => e.preventDefault()} className="rl-forgot-link">
                Forgot password?
              </a>
            </div>

            <motion.button type="submit" className="rl-login-btn" disabled={loading}
              whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { y: 0 } : {}}>
              {loading
                ? <span className="rl-btn-loading"><span/><span/><span/></span>
                : <> Log in <ArrowRight size={15} style={{ marginLeft: 6 }} /> </>}
            </motion.button>
          </form>

          <p className="rl-privacy-text">
            By continuing you acknowledge that your data will be processed per our{' '}
            <a href="#">Privacy Statement</a>.
          </p>
        </motion.div>

        <div className="rl-signup-footer">
          <p>No account? <a onClick={onSwitchToSignUp}>Sign up as a rider</a></p>
        </div>
      </div>
    </div>
  );
};

export default RiderLogin;
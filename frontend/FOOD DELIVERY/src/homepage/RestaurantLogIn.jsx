import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, BarChart2,
  Megaphone, Settings, Globe, ArrowRight,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import './RestaurantLogIn.css';
import authService from '../Authservice.js';
import { COLORS, BRAND } from '../constants.js';

const FEATURES = [
  { Icon: BarChart2, text: 'Track performance and get invaluable insights to improve customer loyalty and sales.' },
  { Icon: Megaphone, text: 'Offer discounts and launch ad campaigns to attract new customers.' },
  { Icon: Settings,  text: "Manage your menu and opening times more easily, so they're always up to date." },
];

const RestaurantLogin = ({ onSwitchToSignUp, onLoginSuccess }) => {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [focused,      setFocused]      = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }

    setLoading(true);
    try {
      const response = await authService.loginAsRestaurant(email, password);

      const user       = authService.getUser();
      const restaurant = response?.restaurant || authService.getRestaurantData();

      toast.success('Welcome back, partner!');
      setTimeout(() => {
        onLoginSuccess({
          type: 'restaurant_partner',
          user,
          restaurant,
        });
      }, 600);
    } catch (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="restaurant-login-container">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      {/* ── LEFT HERO ── */}
      <div className="restaurant-login-left">
        <motion.div className="restaurant-login-hero"
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

          <div className="hero-illustration">
            <div className="illustration-graphic">
              <div className="illus-monitor">
                <div className="illus-monitor-inner">
                  <div className="illus-bar wide" />
                  <div className="illus-bar mid" />
                  <div className="illus-bar short" />
                </div>
              </div>
              <div className="illus-stand" />
              <div className="illus-icon top-left"><BarChart2 size={18} color="rgba(255,255,255,0.9)" /></div>
              <div className="illus-icon top-right"><Settings size={18} color="rgba(255,255,255,0.9)" /></div>
            </div>
          </div>

          <h1 className="hero-title">Transform your business with {BRAND.name} Partner</h1>

          <div className="hero-features">
            {FEATURES.map(({ Icon, text }, i) => (
              <motion.div key={i} className="feature-item"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
                <div className="feature-icon"><Icon size={20} strokeWidth={2} /></div>
                <p className="feature-text">{text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT FORM ── */}
      <div className="restaurant-login-right">
        <div className="restaurant-login-header">
          <div className="partner-logo">
            <span className="logo-panda">{BRAND.name}</span>
            <span className="logo-partner"> partner</span>
          </div>
          <button className="language-btn"><Globe size={15} /> EN</button>
        </div>

        <motion.div className="restaurant-login-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>

          <h2 className="login-title">Log in to your restaurant account</h2>

          <form className="login-form" onSubmit={handleSubmit} noValidate>

            <div className={`form-group ${focused === 'email' ? 'focused' : ''}`}>
              <div className="input-wrapper">
                <Mail size={15} className="input-icon" />
                <input type="email" placeholder="Email" value={email}
                  onChange={e => setEmail(e.target.value)} autoComplete="email"
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
              </div>
            </div>

            <div className={`form-group ${focused === 'password' ? 'focused' : ''}`}>
              <div className="input-wrapper password-wrapper">
                <Lock size={15} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                />
                <button type="button" className="toggle-password"
                  onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="forgot-password-link">
              <a href="#" onClick={e => e.preventDefault()}>Forgot password?</a>
            </div>

            <motion.button type="submit" className="login-btn" disabled={loading}
              whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { y: 0 } : {}}>
              {loading
                ? <span className="btn-loading"><span/><span/><span/></span>
                : <>Log in <ArrowRight size={15} style={{ marginLeft: 6 }} /></>}
            </motion.button>

            <p className="privacy-text">
              By continuing you acknowledge that your personal data will be processed in accordance with the{' '}
              <a href="#">Privacy Statement</a>.
            </p>
          </form>
        </motion.div>

        <div className="signup-footer">
          <p>No account? <a onClick={onSwitchToSignUp}>Partner with {BRAND.name}</a></p>
        </div>
      </div>
    </div>
  );
};

export default RestaurantLogin;
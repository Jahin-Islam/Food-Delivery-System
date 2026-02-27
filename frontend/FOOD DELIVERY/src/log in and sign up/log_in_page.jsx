import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShoppingBag, Clock, ChefHat } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import authService from '../Authservice.js';
import { BRAND, COLORS, MOTION } from '../constants.js';
import './log_in_page.css';

// ── Edit these to change the hero feature list ──
const HERO_FEATURES = [
  { Icon: ShoppingBag, text: 'Order from hundreds of restaurants near you' },
  { Icon: Clock,       text: 'Fast delivery, tracked in real-time'          },
  { Icon: ChefHat,     text: 'Exclusive deals and discounts every day'      },
];

const SignIn = ({ onSwitchToSignUp, onLoginSuccess }) => {
  const [formData,     setFormData]     = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [focused,      setFocused]      = useState(null);

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields'); return;
    }
    setLoading(true);
    try {
      await authService.login(formData.email, formData.password);
      toast.success('Welcome back!');
      setTimeout(() => onLoginSuccess && onLoginSuccess(authService.getUser()), 500);
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="signin-logo">{BRAND.name}</div>
          <div className="signin-tagline">{BRAND.tagline}</div>
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
            <div className="signin-brand-pill">{BRAND.name}</div>
            <h1>Welcome Back!</h1>
            <p>Sign in to continue to {BRAND.name}</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className={`signin-form-group ${focused === 'email' ? 'focused' : ''}`}>
              <label htmlFor="email">Email Address</label>
              <div className="signin-input-wrapper">
                <Mail size={15} className="signin-input-icon" />
                <input type="email" id="email" name="email"
                  placeholder="Enter your email" value={formData.email}
                  onChange={handleChange} disabled={loading}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} required />
              </div>
            </div>

            {/* Password */}
            <div className={`signin-form-group ${focused === 'password' ? 'focused' : ''}`}>
              <label htmlFor="password">Password</label>
              <div className="signin-input-wrapper">
                <Lock size={15} className="signin-input-icon" />
                <input type={showPassword ? 'text' : 'password'} id="password" name="password"
                  placeholder="Enter your password" value={formData.password}
                  onChange={handleChange} disabled={loading}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} required />
                <button type="button" className="signin-toggle-password" tabIndex={-1}
                  onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="signin-form-options">
              <label className="signin-remember-me">
                <input type="checkbox" id="remember" />
                <span>Remember me</span>
              </label>
              <a href="#" className="signin-forgot-password" onClick={e => e.preventDefault()}>
                Forgot Password?
              </a>
            </div>

            <motion.button type="submit" className="signin-submit-btn" disabled={loading}
              whileHover={!loading ? { y: -2, boxShadow: '0 8px 22px rgba(215,15,100,0.38)' } : {}}
              whileTap={!loading ? { y: 0 } : {}}>
              {loading
                ? <span className="signin-loading-dots"><span/><span/><span/></span>
                : <> Sign In <ArrowRight size={15} style={{ marginLeft: 5 }} /> </>}
            </motion.button>
          </form>

          <div className="signin-signup-link">
            Don't have an account?{' '}
            <a onClick={onSwitchToSignUp} style={{ cursor: 'pointer' }}>Sign Up</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignIn;
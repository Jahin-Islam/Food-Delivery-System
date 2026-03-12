import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Phone, Bike, ArrowRight, MapPin, Star, TrendingUp } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { BRAND, COLORS, MOTION } from '../constants.js';
import authService from '../Authservice.js';
import './RiderLogin.css';

const HERO_FEATURES = [
  { Icon: TrendingUp, text: 'Earn up to ৳25,000 per month on your schedule' },
  { Icon: MapPin,     text: 'Deliver in your city with live route guidance'  },
  { Icon: Star,       text: 'Top riders get bonuses and priority assignments' },
];

const RiderLogin = ({ onSwitchToSignUp, onLoginSuccess }) => {
  const [loginMode,        setLoginMode]        = useState('email');
  const [formData,         setFormData]         = useState({ email: '', phone: '', password: '' });
  const [showPassword,     setShowPassword]     = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [focused,          setFocused]          = useState(null);

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const identifier = loginMode === 'email' ? formData.email : formData.phone;
    if (!identifier || !formData.password) {
      toast.error('Please fill in all fields'); return;
    }
    setLoading(true);
    try {
      await authService.login(identifier, formData.password, loginMode === 'phone' ? 'phone' : 'email');
      toast.success('Welcome back, rider!');
      setTimeout(() => onLoginSuccess && onLoginSuccess({ type: 'rider', user: authService.getUser() }), 500);
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

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

          <div className="rider-logo">{BRAND.name}</div>
          <h1 className="rider-hero-title">Log in to your rider account</h1>

          <div className="rider-hero-features">
            {HERO_FEATURES.map(({ Icon, text }, i) => (
              <motion.div key={i} className="rider-feature-item"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
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
            <div className="rider-logo-icon"><Bike size={18} color={COLORS.primary} strokeWidth={2.5} /></div>
            <span className="rider-logo-main">panda</span>
            <span className="rider-logo-sub"> rider</span>
          </div>
          <button className="rider-lang-btn">🌐 EN</button>
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
              <div className={`rider-form-group ${focused === 'email' ? 'focused' : ''}`}>
                <div className="rider-input-wrapper">
                  <Mail size={15} className="rider-input-icon" />
                  <input type="email" name="email" placeholder="Email address"
                    value={formData.email} onChange={handleChange}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                </div>
              </div>
            ) : (
              <div className="rider-form-group">
                <div className="rider-phone-wrapper">
                  <span className="rider-country-code">+880</span>
                  <input type="tel" name="phone" placeholder="1712345678"
                    value={formData.phone} onChange={handleChange} className="rider-phone-field" />
                </div>
              </div>
            )}

            <div className={`rider-form-group ${focused === 'password' ? 'focused' : ''}`}>
              <div className="rider-input-wrapper">
                <Lock size={15} className="rider-input-icon" />
                <input type={showPassword ? 'text' : 'password'} name="password"
                  placeholder="Password" value={formData.password} onChange={handleChange}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                <button type="button" className="rider-toggle-pw"
                  onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="rider-forgot-row">
              <a href="#" onClick={e => e.preventDefault()} className="rider-forgot-link">Forgot password?</a>
            </div>

            <motion.button type="submit" className="rider-login-btn" disabled={loading}
              whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { y: 0 } : {}}>
              {loading
                ? <span className="rider-btn-loading"><span/><span/><span/></span>
                : <> Log in <ArrowRight size={15} style={{ marginLeft: 6 }} /> </>}
            </motion.button>
          </form>

          <p className="rider-privacy-text">
            By continuing you acknowledge that your data will be processed per our{' '}
            <a href="#">Privacy Statement</a>.
          </p>
        </motion.div>

        <div className="rider-signup-footer">
          <p>No account? <a onClick={onSwitchToSignUp}>Sign up as a rider</a></p>
        </div>
      </div>
    </div>
  );
};

export default RiderLogin;
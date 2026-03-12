import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, Phone, BarChart2,
  Megaphone, Settings, Globe, ArrowRight,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import './RestaurantLogIn.css';
import authService from '../Authservice.js';
import { COLORS, BRAND } from '../constants.js';

const FEATURES = [
  { Icon: BarChart2, text: 'Track performance and get invaluable insights to improve customer loyalty and sales.' },
  { Icon: Megaphone, text: 'Offer discounts and launch ad campaigns to attract new customers.' },
  { Icon: Settings,  text: 'Manage your menu and opening times more easily, so they\'re always up to date.' },
];

const RestaurantLogin = ({ onSwitchToSignUp, onLoginSuccess }) => {
  const [loginMode,        setLoginMode]        = useState('email');
  const [formData,         setFormData]         = useState({ email: '', password: '', phone: '', phonePassword: '' });
  const [showPassword,     setShowPassword]     = useState(false);
  const [showPhonePassword,setShowPhonePassword]= useState(false);
  const [loading,          setLoading]          = useState(false);
  const [focused,          setFocused]          = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const isPhone   = loginMode === 'phone';
    const identifier = isPhone ? formData.phone : formData.email;
    const password   = isPhone ? formData.phonePassword : formData.password;

    if (!identifier || !password) { toast.error('Please fill in all fields'); return; }

    setLoading(true);
    try {
      const response = await authService.login(identifier, password, isPhone ? 'phone' : 'email');

      // ── Role check ──────────────────────────────────────────────────
      // Backend returns role inside user object
      const user = authService.getUser();
      let role = (
        user?.role ||
        user?.user_type ||
        response?.role ||
        response?.user?.role ||
        response?.user?.user_type ||
        ''
      ).toString().toUpperCase();

      const hasRestaurantData = !!(response?.restaurant || authService.getRestaurantData());

      let isVendor = role === 'RESTAURANT' || role === 'VENDOR' || hasRestaurantData;

      // If not clear yet, fetch user profile to double-check
      if (!isVendor) {
        try {
          const userDetails = await authService.fetchUserDetails();
          const detailedRole = (
            userDetails?.role ||
            userDetails?.user_type ||
            authService.getUser()?.role ||
            ''
          ).toString().toUpperCase();
          isVendor = detailedRole === 'RESTAURANT' || detailedRole === 'VENDOR' || !!authService.getRestaurantData();
        } catch {}
      }

      if (!isVendor) {
        toast.error('This account is not a restaurant partner account.');
        await authService.logout();
        setLoading(false);
        return;
      }

      toast.success('Welcome back, partner!');
      setTimeout(() => {
        onLoginSuccess({
          type: 'restaurant_partner',
          user: authService.getUser(),
          restaurant: response?.restaurant || authService.getRestaurantData(),
        });
      }, 600);
    } catch (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fg = (id) => `form-group ${focused === id ? 'focused' : ''}`;

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

          <h2 className="login-title">
            {loginMode === 'email' ? 'Log in with your email' : 'Log in with your phone'}
          </h2>

          {/* Mode toggle */}
          <div className="login-mode-toggle">
            <button className={`mode-toggle-btn ${loginMode === 'email' ? 'active' : ''}`}
              onClick={() => setLoginMode('email')} type="button">Email</button>
            <button className={`mode-toggle-btn ${loginMode === 'phone' ? 'active' : ''}`}
              onClick={() => setLoginMode('phone')} type="button">Phone Number</button>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {loginMode === 'email' ? (
              <>
                <div className={fg('email')}>
                  <div className="input-wrapper">
                    <Mail size={15} className="input-icon" />
                    <input type="email" name="email" placeholder="Email"
                      value={formData.email} onChange={handleChange}
                      onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                  </div>
                </div>

                <div className={fg('password')}>
                  <div className="input-wrapper password-wrapper">
                    <Lock size={15} className="input-icon" />
                    <input type={showPassword ? 'text' : 'password'} name="password"
                      placeholder="Password" value={formData.password} onChange={handleChange}
                      onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                    <button type="button" className="toggle-password"
                      onClick={() => setShowPassword(p => !p)}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <div className="phone-input-wrapper">
                    <span className="country-code">+880</span>
                    <input type="tel" name="phone" placeholder="1712345678"
                      value={formData.phone} onChange={handleChange} className="phone-field" />
                  </div>
                </div>

                <div className={fg('phonePassword')}>
                  <div className="input-wrapper password-wrapper">
                    <Lock size={15} className="input-icon" />
                    <input type={showPhonePassword ? 'text' : 'password'} name="phonePassword"
                      placeholder="Password" value={formData.phonePassword} onChange={handleChange}
                      onFocus={() => setFocused('phonePassword')} onBlur={() => setFocused(null)} />
                    <button type="button" className="toggle-password"
                      onClick={() => setShowPhonePassword(p => !p)}>
                      {showPhonePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="forgot-password-link">
              <a href="#" onClick={e => e.preventDefault()}>Forgot password?</a>
            </div>

            <motion.button type="submit" className="login-btn" disabled={loading}
              whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { y: 0 } : {}}>
              {loading
                ? <span className="btn-loading"><span/><span/><span/></span>
                : <> Log in <ArrowRight size={15} style={{ marginLeft: 6 }} /> </>}
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
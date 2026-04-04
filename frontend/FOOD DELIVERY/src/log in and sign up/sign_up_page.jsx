import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight,
  UserCheck, Sparkles, Gift
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import authService from '../Authservice.js';
import { BRAND, COLORS, MOTION } from '../constants.js';
import './sign_up_page.css';

const HERO_FEATURES = [
  { Icon: UserCheck, text: 'Join thousands of happy customers'   },
  { Icon: Sparkles,  text: 'Free delivery on your first order'   },
  { Icon: Gift,      text: 'Exclusive member deals every week'   },
];

const FIELDS = [
  { id: 'first_name',   label: 'First Name',       type: 'text',     placeholder: 'First name',                 Icon: User,  half: true               },
  { id: 'last_name',    label: 'Last Name',         type: 'text',     placeholder: 'Last name',                  Icon: User,  half: true               },
  { id: 'email',        label: 'Email Address',     type: 'email',    placeholder: 'Enter your email',           Icon: Mail,  half: false              },
  { id: 'phone_number', label: 'Phone Number',      type: 'tel',      placeholder: '+880 1712345678',            Icon: Phone, half: false              },
  { id: 'password',     label: 'Password',          type: 'password', placeholder: 'Create a password (min 8)', Icon: Lock,  half: false, pw: 'main'   },
  { id: 'password2',    label: 'Confirm Password',  type: 'password', placeholder: 'Re-enter your password',    Icon: Lock,  half: false, pw: 'confirm'},
];

const SignUp = ({ onSwitchToSignIn, onSignUpSuccess }) => {
  const [formData,      setFormData]      = useState({ email:'', password:'', password2:'', first_name:'', last_name:'', phone_number:'' });
  const [showMain,      setShowMain]      = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [focused,       setFocused]       = useState(null);

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password, password2, first_name, last_name, phone_number } = formData;
    if (!email || !password || !password2 || !first_name || !last_name || !phone_number)
      { toast.error('Please fill in all required fields'); return; }
    if (password !== password2)
      { toast.error('Passwords do not match'); return; }
    if (password.length < 8)
      { toast.error('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      await authService.register({ email, password, password2, first_name, last_name, phone_number });
      await authService.login(email, password);
      await authService.fetchUserDetails();

      toast.success('Account created! Welcome to foodpanda!');
      setTimeout(() => onSignUpSuccess && onSignUpSuccess(authService.getUser()), 600);
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderFields = () => {
    const out = [];
    let i = 0;
    while (i < FIELDS.length) {
      const f = FIELDS[i], nxt = FIELDS[i + 1];
      if (f.half && nxt?.half) {
        out.push(
          <div key={f.id + nxt.id} className="signup-form-row">
            {[f, nxt].map(field => renderField(field))}
          </div>
        );
        i += 2;
      } else { out.push(renderField(f)); i += 1; }
    }
    return out;
  };

  const renderField = (field) => {
    const isMain    = field.pw === 'main';
    const isConfirm = field.pw === 'confirm';
    const hasPw     = isMain || isConfirm;
    const shown     = isMain ? showMain : showConfirm;
    return (
      <div key={field.id} className={`signup-form-group ${focused === field.id ? 'focused' : ''}`}>
        <label htmlFor={field.id}>{field.label}</label>
        <div className="signup-input-wrapper">
          <field.Icon size={14} className="signup-input-icon" />
          <input
            type={hasPw ? (shown ? 'text' : 'password') : field.type}
            id={field.id} name={field.id}
            placeholder={field.placeholder}
            value={formData[field.id]}
            onChange={handleChange}
            disabled={loading}
            onFocus={() => setFocused(field.id)} onBlur={() => setFocused(null)}
            required
          />
          {hasPw && (
            <button type="button" className="signup-toggle-password" tabIndex={-1}
              onClick={() => isMain ? setShowMain(p=>!p) : setShowConfirm(p=>!p)}>
              {shown ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="signup-container">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      {/* LEFT */}
      <div className="signup-left-side">
        <motion.div className="signup-logo-section"
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <div className="signup-logo">{BRAND.name}</div>
          <div className="signup-tagline">{BRAND.tagline}</div>
          <div className="signup-features">
            {HERO_FEATURES.map(({ Icon, text }, i) => (
              <motion.div key={i} className="signup-feature-item"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
                <div className="signup-feature-icon"><Icon size={16} strokeWidth={2} /></div>
                <span>{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT */}
      <div className="signup-right-side">
        <motion.div className="signup-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
          <div className="signup-header">
            <div className="signup-brand-pill">{BRAND.name}</div>
            <h1>Create Account</h1>
            <p>Join {BRAND.name} today</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {renderFields()}
            <div className="signup-checkbox-group">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">
                I agree to the <a href="#">Terms &amp; Conditions</a>
              </label>
            </div>
            <motion.button type="submit" className="signup-submit-btn" disabled={loading}
              whileHover={!loading ? { y: -2, boxShadow: '0 8px 22px rgba(215,15,100,0.38)' } : {}}
              whileTap={!loading ? { y: 0 } : {}}>
              {loading
                ? <span className="signup-loading-dots"><span/><span/><span/></span>
                : <> Sign Up <ArrowRight size={15} style={{ marginLeft: 5 }} /> </>}
            </motion.button>
          </form>

          <div className="signup-signin-link">
            Already have an account?{' '}
            <a onClick={onSwitchToSignIn} style={{ cursor: 'pointer' }}>Sign In</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUp;
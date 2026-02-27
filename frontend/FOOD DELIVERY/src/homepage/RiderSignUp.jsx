import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Bike, User, Phone, Mail, ChevronDown,
  ArrowRight, UserCheck, ClipboardList, Car, FileText
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { BRAND, COLORS, MOTION } from '../constants.js';
import './RiderSignUp.css';

// ── Cities and vehicles — edit here ──
const CITIES    = ['Dhaa-Gulshan/Tejgaon', 'Dhaka-Dhanmondi', 'Dhaka-Mirpur', 'Chittagong', 'Sylhet'];
const VEHICLES  = ['Motorbike', 'Bi-Cycle'];

// ── Steps config — icons + labels ──
const STEPS = [
  { Icon: UserCheck,     text: 'Create your profile'           },
  { Icon: ClipboardList, text: 'Fill in your personal information' },
  { Icon: Car,           text: 'Provide your vehicle information' },
  { Icon: FileText,      text: 'Agree to our service agreement'  },
];

const RiderSignUp = ({ onSignUpSuccess, onRiderOnBoarding }) => {
  const [formData, setFormData] = useState({
    city: '', vehicle: '', name: '', surname: '',
    phone: '', email: '', isOver18: '', privacyAccepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.city || !formData.vehicle || !formData.name || !formData.phone || !formData.email || !formData.isOver18)
      { toast.error('Please fill in all required fields'); return; }
    if (formData.isOver18 === 'no')
      { toast.error('You must be over 18 to become a rider'); return; }
    if (!formData.privacyAccepted)
      { toast.error('Please accept the Rider Privacy Statement'); return; }

    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 600)); // simulate async
      toast.success('Profile created! Moving to onboarding...');
      setTimeout(() => onRiderOnBoarding({ ...formData, type: 'rider' }), 800);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fg = (id) => `input-group ${focused === id ? 'focused' : ''}`;

  return (
    <div className="rider-signup-page">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: '#fff', secondary: COLORS.primary } },
      }} />

      {/* HEADER */}
      <header className="rider-header">
        <div className="rider-logo">
          <div className="rider-logo-fp">
            <Bike size={20} color={COLORS.primary} strokeWidth={2.5} />
          </div>
          <span className="logo-text">{BRAND.name}</span>
        </div>
        <div className="language-btns">
          <button className="lang-btn active">EN</button>
          <button className="lang-btn">BN</button>
        </div>
      </header>

      {/* MAIN */}
      <div className="rider-content">
        {/* LEFT */}
        <div className="rider-left">
          <motion.div className="hero-section"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <h1>Sign up today and be a part of the {BRAND.name} rider family!</h1>
            <p>There is an opportunity to earn up to 25,000 Taka.</p>
          </motion.div>

          <motion.div className="info-card"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <h2>Complete your application in 4 steps:</h2>
            <div className="card-body">
              <div className="steps">
                {STEPS.map(({ Icon, text }, i) => (
                  <motion.div key={i} className="step-item"
                    initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="step-number">{i + 1}</div>
                    <div className="step-icon">
                      <Icon size={14} strokeWidth={2} color="rgba(255,255,255,0.9)" />
                    </div>
                    <span>{text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Rider illustration (CSS shapes) */}
              <div className="rider-image">
                <div className="rider-illustration">
                  <div className="rider-figure">
                    <div className="rider-head" />
                    <div className="rider-body" />
                  </div>
                  <div className="bike-body">
                    <div className="bike-frame" />
                    <div className="bike-handlebar" />
                    <div className="bike-seat" />
                    <div className="bike-wheel back" />
                    <div className="bike-wheel front" />
                  </div>
                </div>
              </div>
            </div>

            {/* Buildings skyline */}
            <div className="buildings">
              {[...Array(6)].map((_, i) => <div key={i} className="building" />)}
            </div>
          </motion.div>
        </div>

        {/* RIGHT — form */}
        <motion.div className="rider-right"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
          <div className="form-container">
            <h2>Create your profile</h2>

            <form onSubmit={handleSubmit} noValidate>
              {/* City */}
              <div className={fg('city')}>
                <div className="input-wrapper-r">
                  <MapPin size={14} className="input-icon-r" />
                  <select name="city" value={formData.city} onChange={handleChange}
                    className="input-field" required
                    onFocus={() => setFocused('city')} onBlur={() => setFocused(null)}>
                    <option value="">Select your city</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arr" />
                </div>
              </div>

              {/* Vehicle */}
              <div className={fg('vehicle')}>
                <div className="input-wrapper-r">
                  <Bike size={14} className="input-icon-r" />
                  <select name="vehicle" value={formData.vehicle} onChange={handleChange}
                    className="input-field" required
                    onFocus={() => setFocused('vehicle')} onBlur={() => setFocused(null)}>
                    <option value="">Choose your vehicle</option>
                    {VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arr" />
                </div>
              </div>

              {/* Name */}
              <div className={fg('name')}>
                <div className="input-wrapper-r">
                  <User size={14} className="input-icon-r" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    placeholder="Name *" className="input-field" required
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
                </div>
              </div>

              {/* Surname */}
              <div className={fg('surname')}>
                <div className="input-wrapper-r">
                  <User size={14} className="input-icon-r" />
                  <input type="text" name="surname" value={formData.surname} onChange={handleChange}
                    placeholder="Surname" className="input-field"
                    onFocus={() => setFocused('surname')} onBlur={() => setFocused(null)} />
                </div>
              </div>

              {/* Phone */}
              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <div className="phone-wrapper">
                  <div className="country-code">+880</div>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    className="input-field phone-field" required />
                </div>
              </div>

              {/* Email */}
              <div className={fg('email')}>
                <div className="input-wrapper-r">
                  <Mail size={14} className="input-icon-r" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    placeholder="Email" className="input-field" required
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                </div>
              </div>

              {/* Age question */}
              <div className="input-group">
                <div className="question-box">
                  <div className="question-header">
                    <UserCheck size={15} color={COLORS.primary} />
                    <p className="question-text">Are you over 18?</p>
                  </div>
                  <div className="radio-options">
                    {['yes', 'no'].map(val => (
                      <label key={val} className="radio-label">
                        <input type="radio" name="isOver18" value={val}
                          checked={formData.isOver18 === val} onChange={handleChange} />
                        <span>{val.charAt(0).toUpperCase() + val.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Privacy */}
              <div className="input-group">
                <div className="checkbox-box">
                  <label className="checkbox-label">
                    <input type="checkbox" name="privacyAccepted"
                      checked={formData.privacyAccepted} onChange={handleChange} />
                    <span>
                      I have read and understand the{' '}
                      <a href="#">Rider Privacy Statement</a>.
                    </span>
                  </label>
                </div>
              </div>

              <motion.button type="submit" className="submit-button" disabled={loading}
                whileHover={!loading ? { y: -2, boxShadow: '0 8px 22px rgba(215,15,100,0.38)' } : {}}
                whileTap={!loading ? { y: 0 } : {}}>
                {loading
                  ? <span className="btn-loading"><span/><span/><span/></span>
                  : <> Submit <ArrowRight size={14} style={{ marginLeft: 5 }} /> </>}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RiderSignUp;
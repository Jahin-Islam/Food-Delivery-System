/* ============================================================
   CONSTANTS.JS — JS mirror of index.css theme
   ✅ Keep these values in sync with index.css --primary values
   ============================================================ */

// 🎨 CHANGE THESE to match index.css
export const COLORS = {
  primary:        '#4f46e5',   // matches --primary
  primaryDark:    '#3730a3',   // matches --primary-dark
  primaryDarkest: '#1e1b4b',   // matches --primary-darkest
  primaryLight:   '#e0e7ff',   // matches --primary-light
  primaryBg:      '#eef2ff',   // matches --primary-bg

  success:      '#10b981',
  successLight: '#d1fae5',
  warning:      '#f59e0b',
  danger:       '#dc2626',
  dangerLight:  '#fee2e2',
  white:        '#ffffff',

  // Cuisine card icon background
  // Light mode: soft lavender-white. Dark mode override is in index.css via --cuisine-card-bg.
  cuisineCardBg:      'linear-gradient(136deg, #f0f2ff, #dde1f5)',
  cuisineCardBgHover: 'linear-gradient(135deg, #e0e7ff, #c7cdf0)',
  cuisineCardBgDark:      'linear-gradient(136deg, #b8bcd1, #010204)',
  cuisineCardBgDarkHover: 'linear-gradient(135deg, rgba(255,45,120,0.14), #0b0f16)',

  get gradientPrimary() {
    return `linear-gradient(135deg, ${this.primary} 0%, ${this.primaryDark} 100%)`;
  },
  get gradientHero() {
    return `linear-gradient(145deg, ${this.primary} 0%, ${this.primaryDark} 55%, ${this.primaryDarkest} 100%)`;
  },
  get gradientRider() {
    return `linear-gradient(160deg, ${this.primary} 0%, ${this.primaryDark} 100%)`;
  },
};

// 🎨 Update rgba to match COLORS.primary
export const SHADOWS = {
  primary:      '0 4px 14px rgba(79,70,229,0.30)',
  primaryHover: '0 8px 24px rgba(79,70,229,0.42)',
};

export const BRAND = {
  name:    'Khete Chai',
  tagline: 'Delivering happiness with care',
};

export const MOTION = {
  fadeIn:       { initial: { opacity: 0 },               animate: { opacity: 1 },          transition: { duration: 0.3 } },
  slideUp:      { initial: { opacity: 0, y: 20 },        animate: { opacity: 1, y: 0 },    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  slideInRight: { initial: { opacity: 0, x: 30 },        animate: { opacity: 1, x: 0 },    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  scaleIn:      { initial: { opacity: 0, scale: 0.95 },  animate: { opacity: 1, scale: 1 }, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

export const GRADIENTS = {
  get primary() { return COLORS.gradientPrimary; },
  get hero()    { return COLORS.gradientHero; },
  get rider()   { return COLORS.gradientRider; },
};
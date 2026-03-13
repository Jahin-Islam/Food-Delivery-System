import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, MapPin, Globe, ShoppingCart, Heart,
  User, Truck, PackageOpen, Navigation, Store, Building2,
  ChevronDown, Utensils
} from 'lucide-react';
import './Header.css';
import ProfileDropdown from './Profiledropdown.jsx';

const Header = ({
  isLoggedIn,
  user,
  cartItems = [],
  onLoginClick,
  onSignUpClick,
  onCartClick,
  onLogout,
  showBanner = false,
  onRestaurantSignUpClick,
  onProfileClick,
  onOrdersClick,
  onLogoClick,
  onDeliveryClick,
  onPickupClick,
  onNearMeClick,
  activeTab = 'delivery',
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <>
      {/* ── Top Banner ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBanner && !isLoggedIn && (
          <motion.div
            className="top-banner"
            initial={{ opacity: 0, y: -32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -32 }}
            transition={{ duration: 0.3 }}
          >
            <Store size={16} strokeWidth={2} />
            <span>Own a restaurant? Join us today!</span>
            <button className="banner-btn" onClick={onRestaurantSignUpClick}>
              SIGN UP FOR A BUSINESS ACCOUNT
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        className="header"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="header-content">

          {/* ── Left: Logo + Address ─────────────────────────────── */}
          <div className="header-left">
            <div
              className="logo-section"
              onClick={onLogoClick}
              style={{ cursor: onLogoClick ? 'pointer' : 'default' }}
            >
              {/* Lucide icon replaces panda image */}
              <button className="logo-icon" aria-label="foodpanda home" onClick={onLogoClick}>
                <Utensils size={20} strokeWidth={2.5} color="white" />
              </button>
              <span className="logo-text">foodpanda</span>
            </div>

            {/* Address button — GPS image → MapPin icon */}
            <button className="address-button">
              <MapPin size={18} strokeWidth={2} className="address-pin-icon" />
              <div className="address-text">
                <div className="address-label">Deliver to</div>
                <div className="address-full">
                  Road 71, Dhaka, Bangladesh
                  <ChevronDown size={13} strokeWidth={2.5} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                </div>
              </div>
            </button>
          </div>

          {/* ── Right: Actions ───────────────────────────────────── */}
          <div className="header-right">

            {/* Dark mode toggle */}
            <motion.button
              className="header-btn dark-toggle-btn"
              onClick={() => setIsDark(prev => !prev)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              aria-label="Toggle dark mode"
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.span key="sun"
                    initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.18 }} style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Sun size={17} strokeWidth={2} />
                  </motion.span>
                ) : (
                  <motion.span key="moon"
                    initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.18 }} style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Moon size={17} strokeWidth={2} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {!isLoggedIn ? (
              <>
                <motion.button
                  className="header-btn"
                  onClick={onLoginClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Log in
                </motion.button>
                <motion.button
                  className="header-btn signup-btn"
                  onClick={onSignUpClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Sign up for free delivery
                </motion.button>
              </>
            ) : (
              <>
                {/* Language — world image → Globe icon */}
                <motion.button
                  className="header-btn language-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Globe size={16} strokeWidth={2} />
                  <span>EN</span>
                </motion.button>

                {/* Cart — cart image → ShoppingCart icon */}
                <motion.button
                  className="header-btn cart-button"
                  onClick={onCartClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <ShoppingCart size={17} strokeWidth={2} />
                  <AnimatePresence>
                    {cartItems && cartItems.length > 0 && (
                      <motion.span
                        className="cart-badge"
                        key={cartItems.length}
                        initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        {cartItems.length}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span>CART</span>
                </motion.button>

                {/* Favourites — heart image → Heart icon */}
                <motion.button
                  className="header-btn favourite-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Heart size={16} strokeWidth={2} />
                  <span>FAVOURITES</span>
                </motion.button>

                {/* Profile — profile image → User icon */}
                <motion.button
                  className="header-btn profile-btn"
                  onClick={() => setShowProfileDropdown(p => !p)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <User size={16} strokeWidth={2} />
                  <span>{user?.first_name || 'PROFILE'}</span>
                  <ChevronDown size={13} strokeWidth={2.5} />
                </motion.button>

                <ProfileDropdown
                  isOpen={showProfileDropdown}
                  onClose={() => setShowProfileDropdown(false)}
                  user={user}
                  onProfileClick={onProfileClick}
                  onOrdersClick={onOrdersClick}
                  onLogout={onLogout}
                />
              </>
            )}
          </div>
        </div>

        {/* ── Nav Tabs ─────────────────────────────────────────────── */}
        <div className="nav-tabs">
          <div className="nav-tabs-content">

            {/* Delivery — delivery image → Truck icon */}
            <button
              className={`nav-tab ${activeTab === 'delivery' ? 'active' : ''}`}
              onClick={onDeliveryClick ?? onLogoClick}
            >
              <Truck size={16} strokeWidth={2} />
              <span>Delivery</span>
            </button>

            {/* Pick-up — pick-up image → PackageOpen icon */}
            <button
              className={`nav-tab ${activeTab === 'pickup' ? 'active' : ''}`}
              onClick={onPickupClick}
            >
              <PackageOpen size={16} strokeWidth={2} />
              <span>Pick-up</span>
            </button>

            {/* Restaurants Near Me — restaurant image → Navigation icon */}
            <button
              className={`nav-tab ${activeTab === 'nearme' ? 'active' : ''}`}
              onClick={onNearMeClick}
            >
              <Navigation size={16} strokeWidth={2} />
              <span>Restaurants Near Me</span>
            </button>

          </div>
        </div>
      </motion.header>
    </>
  );
};

export default Header;
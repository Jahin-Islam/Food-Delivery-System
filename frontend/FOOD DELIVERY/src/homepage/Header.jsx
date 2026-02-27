import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
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
  onLogoClick,        // ← NEW: clicking logo goes home
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

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && !isLoggedIn && (
          <motion.div
            className="top-banner"
            initial={{ opacity: 0, y: -32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -32 }}
            transition={{ duration: 0.3 }}
          >
            <div className="banner-icon" />
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
          <div className="header-left">
            <div className="logo-section" onClick={onLogoClick} style={{ cursor: onLogoClick ? 'pointer' : 'default' }}>
              <button className="logo-icon" aria-label="foodpanda home" onClick={onLogoClick}>
                <img
                  src="/images/accessories/panda.png"
                  alt="panda"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentNode.style.fontSize = '22px';
                    e.currentTarget.parentNode.textContent = '🐼';
                  }}
                />
              </button>
              <span className="logo-text" onClick={onLogoClick}>foodpanda</span>
            </div>
            <button className="address-button">
              <span className="logo-image">
                <img src="../../public/images/accessories/gps.png" alt="GPS" />
              </span>
              <div className="address-text">
                <div className="address-label">New address</div>
                <div className="address-full">Road 71, Dhaka, Bangladesh</div>
              </div>
            </button>
          </div>

          <div className="header-right">
            {/* 🌙 Dark Mode Toggle */}
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
                  ><Sun size={17} strokeWidth={2} /></motion.span>
                ) : (
                  <motion.span key="moon"
                    initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.18 }} style={{ display: 'flex', alignItems: 'center' }}
                  ><Moon size={17} strokeWidth={2} /></motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {!isLoggedIn ? (
              <>
                <motion.button className="header-btn" onClick={onLoginClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  Log in
                </motion.button>
                <motion.button className="header-btn signup-btn" onClick={onSignUpClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  Sign up for free delivery
                </motion.button>
              </>
            ) : (
              <>
                <motion.button className="header-btn language-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <span className="logo-image"><img src="../../public/images/accessories/world.png" alt="Language" /></span>
                  <span>EN</span>
                </motion.button>
                <motion.button className="header-btn cart-button" onClick={onCartClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <span className="logo-image"><img src="../../public/images/accessories/cart.png" alt="Cart" /></span>
                  <AnimatePresence>
                    {cartItems && cartItems.length > 0 && (
                      <motion.span className="cart-badge" key={cartItems.length}
                        initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >{cartItems.length}</motion.span>
                    )}
                  </AnimatePresence>
                  <span>CART</span>
                </motion.button>
                <motion.button className="header-btn favourite-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <span className="logo-image"><img src="../../public/images/accessories/heart.png" alt="Favourites" /></span>
                  <span>FAVOURITES</span>
                </motion.button>
                <motion.button className="header-btn profile-btn" onClick={handleProfileClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <span className="logo-image"><img src="../../public/images/accessories/profile.png" alt="Profile" /></span>
                  <span>{user?.first_name || 'PROFILE'}</span>
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

        <div className="nav-tabs">
          <div className="nav-tabs-content">
            <button className="nav-tab active">
              <span className="logo-image"><img src="../../public/images/accessories/delivery.png" alt="Delivery" /></span>
              <span>Delivery</span>
            </button>
            <button className="nav-tab">
              <span className="logo-image"><img src="../../public/images/accessories/pick-up.png" alt="Pick-up" /></span>
              <span>Pick-up</span>
            </button>
            <button className="nav-tab">
              <span className="logo-image"><img src="../../public/images/accessories/restaurant.png" alt="Restaurant" /></span>
              <span>Restaurant</span>
            </button>
          </div>
        </div>
      </motion.header>
    </>
  );
};

export default Header;
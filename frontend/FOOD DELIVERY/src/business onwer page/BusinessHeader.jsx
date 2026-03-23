import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils, ShoppingBag, Clock, Sun, Moon,
  User, HelpCircle, LogOut, Package, Building2,
  ChevronRight, UserCircle,
} from 'lucide-react';
import { BRAND, COLORS } from '../constants.js';

// ─── PROFILE DROPDOWN ────────────────────────────────────────────────────────
const BusinessProfileDropdown = ({ isOpen, onClose, user, restaurant, onLogout, onProfileClick }) => {
  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean).map(n => n[0]).join('').toUpperCase() || 'BP';

  const items = [
    { Icon: Building2,  label: restaurant?.name || 'My Restaurant', sub: 'Restaurant Partner', noAction: true },
    { Icon: User,       label: 'Profile',      action: () => { onProfileClick?.(); onClose(); } },
    { Icon: HelpCircle, label: 'Help Center',  action: () => { window.open('https://www.foodpanda.com.bd/contents/help-center', '_blank'); onClose(); } },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="bh-dd-overlay" onClick={onClose} />
          <motion.div
            className="bh-dd-menu"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,   scale: 1     }}
            exit={{    opacity: 0, y: -10, scale: 0.97  }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bh-dd-header">
              <div className="bh-dd-avatar">{initials}</div>
              <div className="bh-dd-info">
                <div className="bh-dd-name">{user?.first_name} {user?.last_name}</div>
                <div className="bh-dd-email">{user?.email}</div>
              </div>
            </div>

            <div className="bh-dd-divider" />

            <div className="bh-dd-items">
              {items.map(({ Icon, label, sub, action, noAction }, i) => (
                <motion.button key={i}
                  className={`bh-dd-item ${noAction ? 'no-action' : ''}`}
                  onClick={noAction ? undefined : action}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 + i * 0.04, duration: 0.15 }}
                  whileHover={noAction ? {} : { x: 3 }}
                  style={{ cursor: noAction ? 'default' : 'pointer' }}>
                  <span className="bh-dd-item-icon"><Icon size={17} /></span>
                  <span className="bh-dd-item-text">
                    {label}
                    {sub && <span className="bh-dd-item-sub">{sub}</span>}
                  </span>
                </motion.button>
              ))}

              <div className="bh-dd-divider" />

              <motion.button className="bh-dd-item bh-dd-logout"
                onClick={() => { onLogout?.(); onClose(); }}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.15 }}
                whileHover={{ x: 3 }}>
                <span className="bh-dd-item-icon"><LogOut size={17} /></span>
                <span className="bh-dd-item-text">Logout</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── MAIN BUSINESS HEADER ─────────────────────────────────────────────────────
const BusinessHeader = ({
  activePage,
  user,
  restaurant,
  onLogout,
  onNavigateToMenu,
  onNavigateToOrders,
  onNavigateToHistory,
  onNavigateToProfile,   // TASK 2: new prop for restaurant profile page
  onProfileClick,
  newOrderCount = 0,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const profileRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean).map(n => n[0]).join('').toUpperCase() || 'BP';

  // TASK 3: All 4 tabs now have their own click handlers — history always works
  const TABS = [
    { id: 'menu',    label: 'Menu',            Icon: Utensils,    onClick: onNavigateToMenu    },
    { id: 'orders',  label: 'Orders',          Icon: ShoppingBag, onClick: onNavigateToOrders, badge: newOrderCount },
    { id: 'history', label: 'Order History',   Icon: Clock,       onClick: onNavigateToHistory },
    { id: 'profile', label: 'Restaurant Info', Icon: UserCircle,  onClick: onNavigateToProfile },
  ];

  return (
    <>
      <header className="business-header">
        <div className="business-header-content">
          {/* Logo */}
          <div className="business-header-left">
            <div className="business-logo-section">
              <div className="bh-logo-icon">
                <Utensils size={17} color={COLORS.primary} strokeWidth={2.5} />
              </div>
              <div className="business-logo-text">
                <span className="logo-main">{BRAND.name}</span>
                <span className="logo-sub">business</span>
              </div>
            </div>
          </div>

          {/* Right controls */}
          <div className="business-header-right">
            <motion.button className="bh-icon-btn" onClick={() => setIsDark(p => !p)}
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              title={isDark ? 'Light mode' : 'Dark mode'}>
              <AnimatePresence mode="wait">
                {isDark
                  ? <motion.span key="sun"  initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate:  90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display:'flex' }}><Sun  size={16} /></motion.span>
                  : <motion.span key="moon" initial={{ rotate:  90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display:'flex' }}><Moon size={16} /></motion.span>
                }
              </AnimatePresence>
            </motion.button>

            <div className="bh-profile-wrap" ref={profileRef}>
              <button className="bh-profile-btn" onClick={() => setShowDropdown(p => !p)}>
                <div className="bh-profile-avatar">{initials}</div>
                <div className="bh-profile-info">
                  <span className="bh-profile-name">{user?.first_name || 'Partner'}</span>
                  <span className="bh-profile-role">Business Partner</span>
                </div>
                <ChevronRight size={13} className="bh-profile-chevron"
                  style={{ transform: showDropdown ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              <BusinessProfileDropdown
                isOpen={showDropdown}
                onClose={() => setShowDropdown(false)}
                user={user}
                restaurant={restaurant}
                onLogout={onLogout}
                onProfileClick={onNavigateToProfile ?? onProfileClick}
              />
            </div>
          </div>
        </div>

        {/* Nav Tabs — TASK 3: history tab now always calls onNavigateToHistory */}
        <nav className="business-nav-tabs">
          <div className="business-nav-tabs-content">
            {TABS.map(({ id, label, Icon, onClick, badge }) => (
              <button key={id}
                className={`business-nav-tab ${activePage === id ? 'active' : ''}`}
                onClick={onClick}>
                <Icon size={15} strokeWidth={activePage === id ? 2.5 : 1.8} />
                {label}
                {badge > 0 && <span className="bh-nav-badge">{badge}</span>}
              </button>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
};

export default BusinessHeader;
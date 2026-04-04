import { motion } from 'framer-motion';
import { motion } from 'framer-motion';
import {
  BarChart2, Megaphone, Settings, ShoppingBag, ArrowRight,
  TrendingUp, Users, Star, ChevronRight, LogOut, Utensils,
  Package, History, Sun, Moon
} from 'lucide-react';
import { BRAND, COLORS, MOTION } from '../constants.js';
import './Businesswelcome.css';

const STATS = [
  { Icon: Users,      number: '12,000+', label: 'Active customers'   },
  { Icon: TrendingUp, number: '300%',    label: 'Avg. revenue growth' },
  { Icon: Star,       number: '4.8',     label: 'Average rating'      },
];

const FEATURES = [
  { Icon: BarChart2, title: 'Analytics Dashboard',  desc: 'Track sales, orders, and customer trends in real time from one place.' },
  { Icon: Megaphone, title: 'Deals & Promotions',   desc: 'Create discounts and campaigns to attract new customers and boost retention.' },
  { Icon: Settings,  title: 'Menu Management',      desc: 'Add, edit, or remove menu items and categories anytime — instantly live.' },
];

const BusinessWelcome = ({
  user,
  restaurant,
  onEnterDashboard,
  onGoToDashboard,
  onGoToOrders,
  onGoToOrderHistory,
  onGoToProfile,
  onLogout,
  isDark = false,
  onToggleTheme,
}) => {
  const firstName     = user?.first_name || user?.firstName || 'Partner';
  const restaurantName = restaurant?.name || 'Your Restaurant';

  // FIX #2: all quick actions are wired to the correct handlers
  const QUICK_ACTIONS = [
    { Icon: Utensils,    title: 'Manage Menu',      desc: 'Add or update items and categories', onClick: onGoToDashboard    },
    { Icon: History,     title: 'View History',     desc: 'See your order history & analytics', onClick: onGoToOrderHistory },
    { Icon: ShoppingBag, title: 'View Orders',      desc: 'See incoming and past orders',       onClick: onGoToOrders       },
    { Icon: Package,     title: 'Restaurant Info',  desc: 'Update your restaurant details',     onClick: onGoToProfile      },
  ];

  return (
    <div className="bw-page">
      {/* Header */}
      <header className="bw-header">
        <div className="bw-logo">
          <span className="bw-logo-icon">
            <img
              src="/images/logo/khetechailogo.png"
              alt="Khete Chai"
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentNode.textContent = '🐼'; }}
            />
          </span>
          <span className="bw-logo-main">Khete</span>
          <span className="bw-logo-sub"> Chai</span>
        </div>

        <div className="bw-header-right">
          {/* FIX #1: dark mode toggle button */}
          <motion.button
            onClick={() => onToggleTheme?.()}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            title={isDark ? 'Light mode' : 'Dark mode'}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '1.5px solid var(--gray-200)',
              background: 'var(--white)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--gray-600)',
              transition: 'all 0.18s', marginRight: 8,
            }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>

          <button className="bw-logout-btn" onClick={onLogout}>
            <LogOut size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
            Logout
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="bw-hero">
        <motion.div
          className="bw-hero-content"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="bw-welcome-badge">
            <Star size={13} fill="rgba(255,255,255,0.9)" color="rgba(255,255,255,0.9)" />
            Welcome to Khete Chai Partner!
          </div>
          <h1>Welcome back, {firstName}!</h1>
          <p>
            {restaurantName} is live on {BRAND.name}. Manage your menu, track orders,
            and grow your business — all from one dashboard.
          </p>
          <div className="bw-cta-group">
            <motion.button
              className="bw-cta-primary"
              onClick={onEnterDashboard}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              Go to Dashboard <ArrowRight size={15} />
            </motion.button>
            {/* FIX #2: View Orders button wired to onGoToOrders */}
            <button className="bw-cta-secondary" onClick={onGoToOrders}>
              View Orders
            </button>
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="bw-stats">
        {STATS.map(({ Icon, number, label }, i) => (
          <motion.div
            key={i} className="bw-stat-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bw-stat-icon"><Icon size={20} /></div>
            <div className="bw-stat-number">{number}</div>
            <div className="bw-stat-label">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Features */}
      <div className="bw-features">
        <h2 className="bw-features-title">Everything you need to run your restaurant</h2>
        <div className="bw-features-grid">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <motion.div
              key={i} className="bw-feature-card"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.07, duration: 0.35 }}
            >
              <div className="bw-feature-icon-wrap"><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions — FIX #2: all 4 wired correctly */}
      <div className="bw-quick">
        <h2 className="bw-quick-title">Quick actions</h2>
        <div className="bw-quick-grid">
          {QUICK_ACTIONS.map(({ Icon, title, desc, onClick }, i) => (
            <motion.div
              key={i} className="bw-quick-card"
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
              onClick={onClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="bw-quick-card-icon"><Icon size={20} /></div>
              <div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
              <ChevronRight size={16} className="bw-quick-card-arrow" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bw-footer">
        &copy; {new Date().getFullYear()} Khete Chai · All rights reserved
      </div>
    </div>
  );
};

export default BusinessWelcome;
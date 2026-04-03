import { motion, AnimatePresence } from 'framer-motion';
import './Profiledropdown.css';
import { Package, User, HelpCircle, LogOut } from 'lucide-react';

const ProfileDropdown = ({
  isOpen,
  onClose,
  user,
  onProfileClick,
  onOrdersClick,
  onLogout,
}) => {
  const handleProfileClick = () => { onProfileClick(); onClose(); };
  const handleOrdersClick  = () => { if (onOrdersClick) onOrdersClick(); onClose(); };
  const handleLogout       = () => { onLogout(); onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible overlay to capture outside clicks */}
          <div className="profile-dropdown-overlay" onClick={onClose} />

          <motion.div
            className="profile-dropdown-menu"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,   scale: 1     }}
            exit={{    opacity: 0, y: -10, scale: 0.97  }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* ── User Header ──────────────────────────────── */}
            <div className="profile-dropdown-header">
              <div className="profile-avatar">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="profile-info">
                <div className="profile-name">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="profile-email">{user?.email}</div>
              </div>
            </div>

            <div className="profile-dropdown-divider" />

            {/* ── Menu Items ───────────────────────────────── */}
            <div className="profile-dropdown-items">
              {[
                {
                  icon:    <Package size={18} />,
                  label:   'Orders & reordering',
                  action:  handleOrdersClick,
                  danger:  false,
                },
                {
                  icon:    <User size={18} />,
                  label:   'Profile',
                  action:  handleProfileClick,
                  danger:  false,
                },
                {
                  icon:    <HelpCircle size={18} />,
                  label:   'Help Center',
                  action:  () => {
                    window.open('https://www.youtube.com/watch?v=Aq5WXmQQooo', '_blank');
                    onClose();
                  },
                  danger:  false,
                },
              ].map((item, i) => (
                <motion.button
                  key={i}
                  className="profile-dropdown-item"
                  onClick={item.action}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 + i * 0.04, duration: 0.16 }}
                  whileHover={{ x: 3 }}
                >
                  <span className="dropdown-item-icon">{item.icon}</span>
                  <span className="dropdown-item-text">{item.label}</span>
                </motion.button>
              ))}

              <div className="profile-dropdown-divider" />

              <motion.button
                className="profile-dropdown-item logout-item"
                onClick={handleLogout}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.16 }}
                whileHover={{ x: 3 }}
              >
                <span className="dropdown-item-icon"><LogOut size={18} /></span>
                <span className="dropdown-item-text">Logout</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileDropdown;
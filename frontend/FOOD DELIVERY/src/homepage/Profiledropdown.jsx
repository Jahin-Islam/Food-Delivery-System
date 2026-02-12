import React from 'react';
import './ProfileDropdown.css';

const ProfileDropdown = ({ 
  isOpen, 
  onClose, 
  user, 
  onProfileClick, 
  onOrdersClick,
  onLogout 
}) => {
  if (!isOpen) return null;

  const handleProfileClick = () => {
    onProfileClick();
    onClose();
  };

  const handleOrdersClick = () => {
    if (onOrdersClick) {
      onOrdersClick();
    }
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <>
      {/* Overlay to close dropdown when clicking outside */}
      <div className="profile-dropdown-overlay" onClick={onClose} />
      
      {/* Dropdown Menu */}
      <div className="profile-dropdown-menu">
        {/* User Info Header */}
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

        {/* Menu Items */}
        <div className="profile-dropdown-items">
          <button className="profile-dropdown-item" onClick={handleOrdersClick}>
            <span className="dropdown-item-icon">📦</span>
            <span className="dropdown-item-text">Orders & reordering</span>
          </button>

          <button className="profile-dropdown-item" onClick={handleProfileClick}>
            <span className="dropdown-item-icon">👤</span>
            <span className="dropdown-item-text">Profile</span>
          </button>

          <button className="profile-dropdown-item" onClick={() => {
            window.open('https://www.foodpanda.com.bd/contents/help-center', '_blank');
            onClose();
          }}>
            <span className="dropdown-item-icon">❓</span>
            <span className="dropdown-item-text">Help Center</span>
          </button>

          <div className="profile-dropdown-divider" />

          <button className="profile-dropdown-item logout-item" onClick={handleLogout}>
            <span className="dropdown-item-icon">🚪</span>
            <span className="dropdown-item-text">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfileDropdown;
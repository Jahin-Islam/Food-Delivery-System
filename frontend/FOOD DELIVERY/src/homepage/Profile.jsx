import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Lock, Shield, Trash2,
  CheckCircle, XCircle, Edit2, X, Heart, ShoppingCart,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import './Profile.css';
import Header from './Header.jsx';
import AllCarts from './AllCarts.jsx';
import authService from '../Authservice.js';
import { COLORS, MOTION } from '../constants.js';

const Profile = ({
  isLoggedIn, user, onBack, onLoginClick, onSignUpClick, onLogout,
  cartItems = [],
  onUpdateQuantity, onRemoveItem,
  onProfileClick, onOrdersClick, onLogoClick, onCheckout,
  currentAddress, onAddressChange,
  onNearMeClick, onDeliveryClick, onPickupClick,
  // FIX #8: App passes this so clicking Favourites opens the global sidebar
  onFavouritesClick,
}) => {
  const [showCart,           setShowCart]           = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);
  const [deleteLoading,      setDeleteLoading]      = useState(false);
  const [formData,           setFormData]           = useState({
    first_name: '', last_name: '', phone: '', email: '',
  });
  const [passwordData,       setPasswordData]       = useState({
    current_password: '', new_password: '',
  });
  const [isEditing,          setIsEditing]          = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [message,            setMessage]            = useState({ type: '', text: '' });

  useEffect(() => {
    const u = user || authService.getUser();
    if (u) setFormData({
      first_name: u.first_name  || u.firstName   || '',
      last_name:  u.last_name   || u.lastName    || '',
      phone:      u.phone_number || u.phone      || '',
      email:      u.email       || '',
    });

    const fetchFresh = async () => {
      try {
        const fresh = await authService.fetchUserDetails();
        if (fresh) setFormData({
          first_name: fresh.first_name   || '',
          last_name:  fresh.last_name    || '',
          phone:      fresh.phone_number || '',
          email:      fresh.email        || '',
        });
      } catch {}
    };
    if (authService.isAuthenticated()) fetchFresh();
  }, [user]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await authService.authenticatedFetch('http://127.0.0.1:8000/api/auth/profile/', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name:   formData.first_name,
          last_name:    formData.last_name,
          phone_number: formData.phone,
        }),
      });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.current_password || !passwordData.new_password) {
      toast.error('Please fill in both password fields'); return;
    }
    if (passwordData.new_password.length < 8) {
      toast.error('New password must be at least 8 characters'); return;
    }
    setLoading(true);
    try {
      await authService.authenticatedFetch('http://127.0.0.1:8000/api/auth/profile/', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password:     passwordData.new_password,
        }),
      });
      toast.success('Password changed successfully');
      setPasswordData({ current_password: '', new_password: '' });
      setIsChangingPassword(false);
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await authService.authenticatedFetch('http://127.0.0.1:8000/api/auth/profile/', {
        method: 'DELETE',
      });
      authService.clearTokens();
      authService.clearUser();
      authService.clearRestaurantData();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('restaurantData');
      toast.success('Account deleted. Goodbye!');
      setShowDeleteConfirm(false);
      setTimeout(() => { onLogout?.(); }, 1200);
    } catch (err) {
      toast.error(err.message || 'Failed to delete account. Please contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const initials = `${formData.first_name?.[0] || ''}${formData.last_name?.[0] || ''}`.toUpperCase() || 'U';
  const fullName  = `${formData.first_name} ${formData.last_name}`.trim() || 'User';
  const cartCount = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <div className="profile-container">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      <Header
        isLoggedIn={isLoggedIn} user={user} cartItems={cartItems}
        onLoginClick={onLoginClick} onSignUpClick={onSignUpClick}
        onCartClick={() => setShowCart(!showCart)} onLogout={onLogout}
        onProfileClick={onProfileClick} onOrdersClick={onOrdersClick}
        onLogoClick={onLogoClick}
        onNearMeClick={onNearMeClick}
        onDeliveryClick={onDeliveryClick}
        onPickupClick={onPickupClick}
        // FIX #8: pass through to Header so the Favourites nav tab works
        onFavouritesClick={onFavouritesClick}
        currentAddress={currentAddress}
        onAddressChange={onAddressChange}
      />

      <div className="profile-content">

        {/* ── Quick actions row (FIX #8) ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {/* Favourites button */}
          <button
            onClick={onFavouritesClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px',
              background: 'var(--c-white)',
              border: `1.5px solid var(--c-gray-200)`,
              borderRadius: 'var(--radius)',
              fontSize: 14, fontWeight: 600,
              color: COLORS.primary,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.background = 'var(--c-primary-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-gray-200)'; e.currentTarget.style.background = 'var(--c-white)'; }}
          >
            <Heart size={16} fill={COLORS.primary} color={COLORS.primary} />
            My Favourites
          </button>

          {/* Cart button — FIX #8: profile page can open cart sidebar */}
          <button
            onClick={() => setShowCart(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px',
              background: 'var(--c-white)',
              border: `1.5px solid var(--c-gray-200)`,
              borderRadius: 'var(--radius)',
              fontSize: 14, fontWeight: 600,
              color: 'var(--c-gray-700)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.18s',
              position: 'relative',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-gray-400)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-gray-200)'; }}
          >
            <ShoppingCart size={16} />
            My Cart
            {cartCount > 0 && (
              <span style={{
                background: COLORS.primary, color: 'white',
                fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 999, lineHeight: 1.6,
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Avatar card */}
        <motion.div className="profile-section" {...MOTION.slideUp}>
          <div className="profile-avatar-section">
            <div className="profile-avatar">{initials}</div>
            <div>
              <div className="profile-name">{fullName}</div>
              <div className="profile-email-preview">{formData.email}</div>
            </div>
          </div>

          <AnimatePresence>
            {message.text && (
              <motion.div
                className={`profile-message ${message.type}`}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                {message.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Personal Info */}
          <div className="section-header">
            <span className="section-title-profile">
              <User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Personal Information
            </span>
            <button className="section-edit-btn" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? <><X size={13} /> Cancel</> : <><Edit2 size={13} /> Edit</>}
            </button>
          </div>

          {isEditing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">First Name</label>
                  <input className="profile-input" value={formData.first_name}
                    onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">Last Name</label>
                  <input className="profile-input" value={formData.last_name}
                    onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="field-group" style={{ marginTop: 12 }}>
                <label className="field-label">Phone Number</label>
                <input className="profile-input" value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="btn-row">
                <button className="btn-primary" onClick={handleUpdate} disabled={loading}>
                  {loading ? <span className="btn-loading"><span/><span/><span/></span> : 'Save Changes'}
                </button>
                <button className="btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </motion.div>
          ) : (
            <div className="field-row">
              <div className="field-group">
                <div className="field-label">First Name</div>
                <div className="field-value">{formData.first_name || <span className="field-value muted">Not set</span>}</div>
              </div>
              <div className="field-group">
                <div className="field-label">Last Name</div>
                <div className="field-value">{formData.last_name || <span className="field-value muted">Not set</span>}</div>
              </div>
              <div className="field-group">
                <div className="field-label"><Phone size={11} style={{ marginRight: 4 }} />Phone</div>
                <div className="field-value">{formData.phone || <span className="field-value muted">Not set</span>}</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Email */}
        <motion.div className="profile-section" {...MOTION.slideUp} transition={{ delay: 0.05, duration: 0.28 }}>
          <div className="section-header">
            <span className="section-title-profile">
              <Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Email Address
            </span>
            <span className="verified-badge"><CheckCircle size={12} /> Verified</span>
          </div>
          <div className="field-value">{formData.email}</div>
        </motion.div>

        {/* Password */}
        <motion.div className="profile-section" {...MOTION.slideUp} transition={{ delay: 0.08, duration: 0.28 }}>
          <div className="section-header">
            <span className="section-title-profile">
              <Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Password &amp; Security
            </span>
            <button className="section-edit-btn" onClick={() => setIsChangingPassword(!isChangingPassword)}>
              {isChangingPassword ? <><X size={13} /> Cancel</> : <><Shield size={13} /> Change</>}
            </button>
          </div>
          <AnimatePresence>
            {isChangingPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              >
                <div className="field-group" style={{ marginBottom: 12 }}>
                  <label className="field-label">Current Password</label>
                  <input type="password" className="profile-input" placeholder="Enter current password"
                    value={passwordData.current_password}
                    onChange={e => setPasswordData(p => ({ ...p, current_password: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">New Password</label>
                  <input type="password" className="profile-input" placeholder="Min. 8 characters"
                    value={passwordData.new_password}
                    onChange={e => setPasswordData(p => ({ ...p, new_password: e.target.value }))} />
                </div>
                <div className="btn-row">
                  <button className="btn-primary" onClick={handlePasswordChange} disabled={loading}>
                    {loading ? <span className="btn-loading"><span/><span/><span/></span> : 'Update Password'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {!isChangingPassword && <div className="field-value muted">••••••••••</div>}
        </motion.div>

        {/* Danger zone */}
        <motion.div className="profile-section" {...MOTION.slideUp} transition={{ delay: 0.11, duration: 0.28 }}>
          <div className="section-header">
            <span className="section-title-profile">
              <Trash2 size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--c-danger)' }} />
              <span style={{ color: 'var(--c-danger)' }}>Delete Account</span>
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-gray-500)', marginBottom: 14, lineHeight: 1.5 }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete My Account
            </button>
          ) : (
            <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#991b1b', marginBottom: 12 }}>
                Are you sure? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleDeleteAccount} disabled={deleteLoading}>
                  {deleteLoading ? <span className="btn-loading"><span/><span/><span/></span> : 'Yes, Delete My Account'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* FIX #8: Cart sidebar accessible from Profile */}
      <AllCarts
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={cartItems}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
        onCheckout={(restaurantId) => {
          setShowCart(false);
          if (onCheckout) onCheckout(restaurantId);
        }}
        onNavigateToRestaurant={() => {
          setShowCart(false);
          if (onBack) onBack();
        }}
      />
    </div>
  );
};

export default Profile;
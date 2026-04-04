import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Lock, Shield, CheckCircle, XCircle,
  Edit2, X, Clock, Building2, Utensils, Trash2,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import '../homepage/Profile.jsx'; // reuse same CSS as customer profile
import BusinessHeader from './BusinessHeader.jsx';
import authService from '../Authservice.js';
import { COLORS, MOTION } from '../constants.js';

const BusinessProfile = ({
  user, restaurant, isLoggedIn,
  onLogout,
  onNavigateToMenu,
  onNavigateToOrders,
  onNavigateToHistory,
  onNavigateToProfile,
  isDark = false,
  onToggleTheme,
}) => {
  // Owner personal info state
  const [ownerData, setOwnerData] = useState({
    first_name: '', last_name: '', phone: '', email: '',
  });
  // Restaurant info state
  const [restData, setRestData] = useState({
    name: '', opening_time: '', closing_time: '', phone: '',
  });
  const [imageFile,    setImageFile]    = useState(null);      // File object chosen by user
  const [imagePreview, setImagePreview] = useState(null);      // local object-URL for <img>
  const [currentImage, setCurrentImage] = useState(null);      // Cloudinary URL from server
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });
  const [isEditingOwner,    setIsEditingOwner]    = useState(false);
  const [isEditingRest,     setIsEditingRest]     = useState(false);
  const [isChangingPassword,setIsChangingPassword]= useState(false);
  const [loading,           setLoading]           = useState(false);
  const [restLoading,       setRestLoading]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading,     setDeleteLoading]     = useState(false);

  // Load user data on mount
  useEffect(() => {
    const u = user || authService.getUser();
    if (u) {
      setOwnerData({
        first_name: u.first_name || '',
        last_name:  u.last_name  || '',
        phone:      u.phone_number || u.phone || '',
        email:      u.email || '',
      });
    }
  }, [user]);

  // Load restaurant data on mount
  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        const data = await authService.authenticatedFetch(
          'http://127.0.0.1:8000/api/vendor/profile/'
        );
        if (data) {
          setRestData({
            name:         data.name         || '',
            opening_time: data.opening_time || '',
            closing_time: data.closing_time || '',
            phone:        data.phone        || '',
          });
          if (data.image_url) setCurrentImage(data.image_url);
        }
      } catch (e) {
        // fallback to prop data
        setRestData({
          name:         restaurant?.name         || '',
          opening_time: restaurant?.opening_time || '',
          closing_time: restaurant?.closing_time || '',
          phone:        restaurant?.phone        || '',
        });
      }
    };
    fetchRestaurantDetails();
  }, [restaurant]);

  const handleUpdateOwner = async () => {
    setLoading(true);
    try {
      await authService.authenticatedFetch('http://127.0.0.1:8000/api/auth/profile/', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name:   ownerData.first_name,
          last_name:    ownerData.last_name,
          phone_number: ownerData.phone,
        }),
      });
      toast.success('Profile updated successfully');
      setIsEditingOwner(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleUpdateRestaurant = async () => {
    setRestLoading(true);
    try {
      const formData = new FormData();
      formData.append('name',         restData.name);
      formData.append('phone',        restData.phone);
      formData.append('opening_time', restData.opening_time || '');
      formData.append('closing_time', restData.closing_time || '');
      if (imageFile) formData.append('restaurant_image', imageFile);

      // FIX: fetch directly so we never accidentally set Content-Type to
      // application/json — the browser must set it automatically with the
      // multipart boundary when the body is FormData.
      const token = authService.getAccessToken?.() || localStorage.getItem('accessToken');
      const response = await fetch('http://127.0.0.1:8000/api/vendor/profile/', {
        method: 'PATCH',
        headers: {
          // Only Authorization — do NOT set Content-Type here.
          // The browser sets it automatically as:
          //   multipart/form-data; boundary=----WebKitFormBoundaryXXX
          // Manually setting Content-Type would strip the boundary and
          // cause the Django server to respond 415 Unsupported Media Type.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data?.image_url) setCurrentImage(data.image_url);
      setImageFile(null);
      setImagePreview(null);
      toast.success('Restaurant info updated successfully');
      setIsEditingRest(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update restaurant info');
    } finally {
      setRestLoading(false);
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

  const ownerInitials = `${ownerData.first_name?.[0] || ''}${ownerData.last_name?.[0] || ''}`.toUpperCase() || 'BP';
  const ownerFullName = `${ownerData.first_name} ${ownerData.last_name}`.trim() || 'Partner';

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

  return (
    <div className="profile-container">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      <BusinessHeader
        activePage="profile"
        user={user}
        restaurant={restaurant}
        onLogout={onLogout}
        onNavigateToMenu={onNavigateToMenu}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToHistory={onNavigateToHistory}
        onNavigateToProfile={onNavigateToProfile}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div className="profile-content">

        {/* ── RESTAURANT INFO SECTION ── */}
        <motion.div className="profile-section" {...MOTION.slideUp}>
          <div className="profile-avatar-section">
            <div className="profile-avatar" style={{ background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-dark) 100%)', borderRadius: 12, width: 66, height: 66, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0 }}>
              {(imagePreview || currentImage) ? (
                <img
                  src={imagePreview || currentImage}
                  alt="Restaurant"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                />
              ) : (
                <Utensils size={28} color="white" />
              )}
            </div>
            <div>
              <div className="profile-name">{restData.name || 'My Restaurant'}</div>
              <div className="profile-email-preview">Restaurant Partner</div>
            </div>
          </div>

          <div className="section-header">
            <span className="section-title-profile">
              <Building2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Restaurant Information
            </span>
            <button className="section-edit-btn" onClick={() => setIsEditingRest(!isEditingRest)}>
              {isEditingRest ? <><X size={13} /> Cancel</> : <><Edit2 size={13} /> Edit</>}
            </button>
          </div>

          {isEditingRest ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* ── Restaurant Image Upload ── */}
              <div className="field-group" style={{ marginBottom: 14 }}>
                <label className="field-label">Restaurant Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--c-border)', flexShrink: 0, background: 'var(--c-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(imagePreview || currentImage) ? (
                      <img
                        src={imagePreview || currentImage}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Utensils size={20} color="var(--c-gray-400)" />
                    )}
                  </div>

                  {/*
                    FIX: Removed the wrapping <label> tag + the onClick calling
                    .click() on the input. Having both caused the file dialog to
                    open twice (once from the label's implicit click forwarding,
                    and once from the manual .click() call).

                    Now the hidden <input> sits beside the button, and the button
                    simply calls inputRef.current.click() — one trigger, one dialog.
                  */}
                  <input
                    id="rest-img-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}
                    onClick={() => document.getElementById('rest-img-input').click()}
                  >
                    {imageFile ? 'Change Image' : 'Upload Image'}
                  </button>

                  {imageFile && (
                    <span style={{ fontSize: 12, color: 'var(--c-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                      {imageFile.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: 12 }}>
                <label className="field-label">Restaurant Name</label>
                <input className="profile-input" value={restData.name}
                  onChange={e => setRestData(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">
                    <Clock size={11} style={{ marginRight: 4 }} />Opening Time
                  </label>
                  <input className="profile-input" type="time" value={restData.opening_time}
                    onChange={e => setRestData(p => ({ ...p, opening_time: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">
                    <Clock size={11} style={{ marginRight: 4 }} />Closing Time
                  </label>
                  <input className="profile-input" type="time" value={restData.closing_time}
                    onChange={e => setRestData(p => ({ ...p, closing_time: e.target.value }))} />
                </div>
              </div>
              <div className="field-group" style={{ marginTop: 12 }}>
                <label className="field-label">Restaurant Phone</label>
                <input className="profile-input" value={restData.phone}
                  onChange={e => setRestData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="btn-row">
                <button className="btn-primary" onClick={handleUpdateRestaurant} disabled={restLoading}>
                  {restLoading ? <span className="btn-loading"><span/><span/><span/></span> : 'Save Changes'}
                </button>
                <button className="btn-ghost" onClick={() => { setIsEditingRest(false); setImageFile(null); setImagePreview(null); }}>Cancel</button>
              </div>
            </motion.div>
          ) : (
            <div className="field-row">
              <div className="field-group">
                <div className="field-label">Restaurant Name</div>
                <div className="field-value">{restData.name || <span className="field-value muted">Not set</span>}</div>
              </div>
              <div className="field-group">
                <div className="field-label"><Clock size={11} style={{marginRight:4}} />Opening Time</div>
                <div className="field-value">{restData.opening_time || <span className="field-value muted">Not set</span>}</div>
              </div>
              <div className="field-group">
                <div className="field-label"><Clock size={11} style={{marginRight:4}} />Closing Time</div>
                <div className="field-value">{restData.closing_time || <span className="field-value muted">Not set</span>}</div>
              </div>
              <div className="field-group">
                <div className="field-label"><Phone size={11} style={{marginRight:4}} />Phone</div>
                <div className="field-value">{restData.phone || <span className="field-value muted">Not set</span>}</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── OWNER PERSONAL INFO ── */}
        <motion.div className="profile-section" {...MOTION.slideUp} transition={{ delay: 0.05, duration: 0.28 }}>
          <div className="profile-avatar-section">
            <div className="profile-avatar">{ownerInitials}</div>
            <div>
              <div className="profile-name">{ownerFullName}</div>
              <div className="profile-email-preview">{ownerData.email}</div>
            </div>
          </div>

          <div className="section-header">
            <span className="section-title-profile">
              <User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Owner Information
            </span>
            <button className="section-edit-btn" onClick={() => setIsEditingOwner(!isEditingOwner)}>
              {isEditingOwner ? <><X size={13} /> Cancel</> : <><Edit2 size={13} /> Edit</>}
            </button>
          </div>

          {isEditingOwner ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">First Name</label>
                  <input className="profile-input" value={ownerData.first_name}
                    onChange={e => setOwnerData(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">Last Name</label>
                  <input className="profile-input" value={ownerData.last_name}
                    onChange={e => setOwnerData(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="field-group" style={{ marginTop: 12 }}>
                <label className="field-label">Phone Number</label>
                <input className="profile-input" value={ownerData.phone}
                  onChange={e => setOwnerData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="btn-row">
                <button className="btn-primary" onClick={handleUpdateOwner} disabled={loading}>
                  {loading ? <span className="btn-loading"><span/><span/><span/></span> : 'Save Changes'}
                </button>
                <button className="btn-ghost" onClick={() => setIsEditingOwner(false)}>Cancel</button>
              </div>
            </motion.div>
          ) : (
            <div className="field-row">
              <div className="field-group">
                <div className="field-label">First Name</div>
                <div className="field-value">{ownerData.first_name || <span className="field-value muted">Not set</span>}</div>
              </div>
              <div className="field-group">
                <div className="field-label">Last Name</div>
                <div className="field-value">{ownerData.last_name || <span className="field-value muted">Not set</span>}</div>
              </div>
              <div className="field-group">
                <div className="field-label"><Phone size={11} style={{marginRight:4}} />Phone</div>
                <div className="field-value">{ownerData.phone || <span className="field-value muted">Not set</span>}</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── EMAIL (read-only) ── */}
        <motion.div className="profile-section" {...MOTION.slideUp} transition={{ delay: 0.08, duration: 0.28 }}>
          <div className="section-header">
            <span className="section-title-profile">
              <Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Email Address
            </span>
            <span className="verified-badge"><CheckCircle size={12} /> Verified</span>
          </div>
          <div className="field-value">{ownerData.email}</div>
        </motion.div>

        {/* ── PASSWORD ── */}
        <motion.div className="profile-section" {...MOTION.slideUp} transition={{ delay: 0.10, duration: 0.28 }}>
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
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
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

        {/* ── DELETE ACCOUNT ── */}
        <motion.div className="profile-section" {...MOTION.slideUp} transition={{ delay: 0.12, duration: 0.28 }}>
          <div className="section-header">
            <span className="section-title-profile">
              <Trash2 size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--c-danger)' }} />
              <span style={{ color: 'var(--c-danger)' }}>Delete Account</span>
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-gray-500)', marginBottom: 14, lineHeight: 1.5 }}>
            Permanently delete your restaurant account and all associated data. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete My Account
            </button>
          ) : (
            <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#991b1b', marginBottom: 12 }}>
                Are you sure? Your restaurant, menu, and all data will be deleted permanently.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleDeleteAccount} disabled={deleteLoading}>
                  {deleteLoading ? <span className="btn-loading"><span/><span/><span/></span> : 'Yes, Delete Everything'}
                </button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default BusinessProfile;
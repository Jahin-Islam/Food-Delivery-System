import React, { useState, useEffect } from 'react';
import './Profile.css';
import Header from './Header.jsx';
import authService from '../Authservice.js';

const Profile = ({ 
  isLoggedIn,
  user,
  onBack,
  onLoginClick,
  onSignUpClick,
  onLogout,
  cartItems = []
}) => {
  const [showCart, setShowCart] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Update form data when user prop changes
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setMessage({ type: '', text: '' });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setMessage({ type: '', text: '' });
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Call API to update profile
      const response = await authService.authenticatedFetch(
        'http://127.0.0.1:8000/api/auth/user/',
        {
          method: 'PATCH',
          body: JSON.stringify(formData)
        }
      );

      // Update user in authService
      authService.setUser(response);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Call API to change password
      await authService.authenticatedFetch(
        'http://127.0.0.1:8000/api/auth/change-password/',
        {
          method: 'POST',
          body: JSON.stringify({
            old_password: passwordData.current_password,
            new_password: passwordData.new_password
          })
        }
      );

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ current_password: '', new_password: '' });
      setIsChangingPassword(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      email: user?.email || ''
    });
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  const handleCancelPasswordChange = () => {
    setPasswordData({ current_password: '', new_password: '' });
    setIsChangingPassword(false);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="profile-page-container">
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        cartItems={cartItems}
        onLoginClick={onLoginClick}
        onSignUpClick={onSignUpClick}
        onCartClick={() => setShowCart(!showCart)}
        onLogout={onLogout}
        showBanner={false}
      />

      <div className="profile-content">
        <div className="profile-wrapper">
          {/* Back Button */}
          <button className="profile-back-btn" onClick={onBack}>
            ← Back
          </button>

          <h1 className="profile-page-title">My Account</h1>

          {/* Success/Error Message */}
          {message.text && (
            <div className={`profile-message ${message.type}`}>
              {message.text}
            </div>
          )}

          {/* My Profile Section */}
          <div className="profile-section">
            <div className="profile-section-header">
              <h2 className="profile-section-title">My profile</h2>
              {!isEditing ? (
                <button 
                  className="profile-edit-btn"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
              ) : (
                <button 
                  className="profile-cancel-btn"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="profile-form-grid">
              <div className="profile-input-group">
                <label>First name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="First name"
                />
              </div>

              <div className="profile-input-group">
                <label>Last name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Last name"
                />
              </div>

              <div className="profile-input-group full-width">
                <label>Mobile number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Mobile number"
                />
              </div>
            </div>

            {isEditing && (
              <button 
                className="profile-save-btn"
                onClick={handleSaveProfile}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>

          {/* Email Section */}
          <div className="profile-section">
            <h2 className="profile-section-title">Email</h2>
            
            <div className="profile-input-group">
              <label>Email</label>
              <div className="email-with-badge">
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="email-input-disabled"
                />
                <span className="verified-badge">✓ Verified</span>
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="profile-section">
            <div className="profile-section-header">
              <h2 className="profile-section-title">Password</h2>
              {!isChangingPassword && (
                <button 
                  className="profile-edit-btn"
                  onClick={() => setIsChangingPassword(true)}
                >
                  Change
                </button>
              )}
            </div>

            {isChangingPassword && (
              <>
                <div className="profile-form-grid">
                  <div className="profile-input-group full-width">
                    <label>Current password</label>
                    <input
                      type="password"
                      name="current_password"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="profile-input-group full-width">
                    <label>New password</label>
                    <input
                      type="password"
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password (min. 8 characters)"
                    />
                  </div>
                </div>

                <div className="profile-password-actions">
                  <button 
                    className="profile-cancel-btn"
                    onClick={handleCancelPasswordChange}
                  >
                    Cancel
                  </button>
                  <button 
                    className="profile-save-btn"
                    onClick={handleChangePassword}
                    disabled={loading}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Account Management Section */}
          <div className="profile-section">
            <h2 className="profile-section-title">Account Management</h2>
            <p className="profile-danger-text">
              You can delete your account and personal data associated with it
            </p>
            <button className="profile-delete-btn">
              Delete my account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
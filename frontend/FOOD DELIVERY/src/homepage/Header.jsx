import React from 'react';
import './Header.css';

const Header = ({ 
  isLoggedIn, 
  user, 
  cartItems = [], 
  onLoginClick, 
  onSignUpClick, 
  onCartClick, 
  onLogout,
  showBanner = false,
  onRestaurantSignUpClick
}) => {
  return (
    <>
      {/* Top Pink Banner */}
      {showBanner && !isLoggedIn && (
        <div className="top-banner">
          <div className="banner-icon"></div>
          <button className="banner-btn" onClick={onRestaurantSignUpClick}>
            SIGN UP TO BE A RESTAURANT PARTNER
          </button>
          <button className="banner-btn" onClick={onRestaurantSignUpClick}>
            SIGN UP FOR A BUSINESS ACCOUNT
          </button>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            {/* Logo and Address */}
            <div className="logo-section">
              <button className="logo-icon"></button>
              <span className="logo-text">foodpanda</span>
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

          {/* Right Side Buttons */}
          <div className="header-right">
            {!isLoggedIn ? (
              <>
                <button className="header-btn" onClick={onLoginClick}>
                  Log in
                </button>
                <button className="header-btn signup-btn" onClick={onSignUpClick}>
                  Sign up for free delivery
                </button>
              </>
            ) : (
              <>
                <button className="header-btn language-btn">
                  <span className="logo-image">
                    <img src="../../public/images/accessories/world.png" alt="Language" />
                  </span>
                  <span>EN</span>
                </button>
                <button className="header-btn cart-button" onClick={onCartClick}>
                  <span className="logo-image">
                    <img src="../../public/images/accessories/cart.png" alt="Cart" />
                  </span>
                  {cartItems && cartItems.length > 0 && (
                    <span className="cart-badge">{cartItems.length}</span>
                  )}
                  <span>CART</span>
                </button>
                <button className="header-btn favourite-btn">
                  <span className="logo-image">
                    <img src="../../public/images/accessories/heart.png" alt="Favourites" />
                  </span>
                  <span>FAVOURITES</span>
                </button>
                <button className="header-btn profile-btn" onClick={onLogout}>
                  <span className="logo-image">
                    <img src="../../public/images/accessories/profile.png" alt="Profile" />
                  </span>
                  <span>{user?.first_name || "PROFILE"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <div className="nav-tabs-content">
            <button className="nav-tab active">
              <span className="logo-image">
                <img src="../../public/images/accessories/delivery.png" alt="Delivery" />
              </span>
              <span>Delivery</span>
            </button>
            <button className="nav-tab">
              <span className="logo-image">
                <img src="../../public/images/accessories/pick-up.png" alt="Pick-up" />
              </span>
              <span>Pick-up</span>
            </button>
            <button className="nav-tab">
              <span className="logo-image">
                <img src="../../public/images/accessories/restaurant.png" alt="Restaurant" />
              </span>
              <span>Restaurant</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
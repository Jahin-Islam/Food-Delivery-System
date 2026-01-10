import { useState } from "react";
import "./Homepage.css";
import CuisineFilter from "./cuisineOption.jsx";
import SortOption from "./sortbyOption.jsx";
import OfferOption from "./offerOption.jsx";
import PriceOption from "./priceOption.jsx";

const Homepage = ({ 
  isLoggedIn, 
  cartItems, 
  setCartItems, 
  onLoginClick, 
  onSignUpClick, 
  onLogout 
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(true); // State to toggle filters

  const cuisines = [
    { id: 1, name: "Pizza", emoji: "🍕" },
    { id: 2, name: "Biryani", emoji: "🍛" },
    { id: 3, name: "Burgers", emoji: "🍔" },
    { id: 4, name: "Cakes", emoji: "🍰" },
    { id: 5, name: "Bangladeshi", emoji: "🍱" },
    { id: 6, name: "Snacks", emoji: "🍟" },
    { id: 7, name: "Cafe", emoji: "☕" },
    { id: 8, name: "Fast Food", emoji: "🌭" },
  ];

  const deals = [
    {
      id: 1,
      name: "Burger King",
      type: "Fast Food • Burgers",
      rating: 4.5,
      deliveryTime: "25-35 min",
      discount: "20% OFF",
      image: "🍔",
    },
    {
      id: 2,
      name: "Pizza Hut",
      type: "Pizza • Italian",
      rating: 4.7,
      deliveryTime: "30-40 min",
      discount: "15% OFF",
      image: "🍕",
    },
    {
      id: 3,
      name: "Starbucks",
      type: "Cafe • Coffee",
      rating: 4.8,
      deliveryTime: "20-30 min",
      discount: "10% OFF",
      image: "☕",
    },
    {
      id: 4,
      name: "KFC",
      type: "Fast Food • Chicken",
      rating: 4.6,
      deliveryTime: "25-35 min",
      discount: "25% OFF",
      image: "🍗",
    },
  ];

  return (
    <div className="homepage-container">
      {/* Top Pink Banner */}
      {!isLoggedIn? <div className="top-banner">
        <div className="banner-icon"></div>
        <button className="banner-btn">
          SIGN UP TO BE A RESTAURANT PARTNER
        </button>
        <button className="banner-btn">SIGN UP FOR A BUSINESS ACCOUNT</button>
      </div> : null}
     

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
                    <img src="../../public/images/accessories/gps.png" alt="Favourites" />
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
                <button className="header-btn cart-button">
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
                  <span>PROFILE</span>
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

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Sidebar Filters - Conditionally rendered */}
          <aside className={`sidebar ${showFilters ? 'sidebar-visible' : 'sidebar-hidden'}`}>
            <div className="sidebar-header">
              <h3 className="sidebar-title">Filters</h3>
              <button 
                className="close-filters-btn"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            <SortOption />
            <OfferOption />
            <CuisineFilter />
            <PriceOption />
          </aside>

          {/* Main Area */}
          <div className={`main-area ${showFilters ? '' : 'main-area-full'}`}>
            {/* Search Bar with Filter Toggle */}
            <div className="search-container">
              <div className="search-wrapper">
                {/* Hamburger Menu Button */}
                <button 
                  className="filter-toggle-btn"
                  onClick={() => setShowFilters(!showFilters)}
                  aria-label="Toggle filters"
                >
                  <div className="hamburger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </button>

                 <span>
                    <img src="../../public/images/accessories/glass.png" className="glass-image" />
                  </span>
                <input
                  type="text"
                  placeholder="Search for restaurants, cuisines, and dishes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Promo Banner */}
            {!isLoggedIn && (
              <div className="promo-banner">
                <div className="promo-content">
                  <h2 className="promo-title">
                    Sign up for free delivery on
                    <br />
                    your first order
                  </h2>
                  <button className="promo-btn" onClick={onSignUpClick}>
                    Sign up
                  </button>
                </div>
                <div className="promo-image">🎁</div>
              </div>
            )}

            {/* Cuisines Section */}
            <section className="cuisines-section">
              <h2 className="section-title">Cuisines</h2>
              <div className="cuisines-grid">
                {cuisines.map((cuisine) => (
                  <button key={cuisine.id} className="cuisine-card">
                    <div className="cuisine-icon">{cuisine.emoji}</div>
                    <span className="cuisine-name">{cuisine.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Daily Deals Section */}
            <section className="deals-section">
              <h2 className="section-title">Your daily deals</h2>
              <div className="deals-grid">
                {deals.map((deal) => (
                  <div key={deal.id} className="deal-card">
                    <div className="deal-image">
                      <div className="deal-emoji">{deal.image}</div>
                      {deal.discount && (
                        <div className="deal-discount">{deal.discount}</div>
                      )}
                    </div>
                    <div className="deal-info">
                      <h3 className="deal-name">{deal.name}</h3>
                      <p className="deal-type">{deal.type}</p>
                      <div className="deal-footer">
                        <div className="deal-rating">
                          <span>⭐</span>
                          <span>{deal.rating}</span>
                        </div>
                        <span className="deal-time">{deal.deliveryTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Homepage;
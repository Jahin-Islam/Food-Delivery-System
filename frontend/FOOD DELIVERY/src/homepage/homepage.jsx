import { useState, useEffect } from "react";
import "./Homepage.css";
import CuisineFilter from "./cuisineOption.jsx";
import SortOption from "./sortbyOption.jsx";
import OfferOption from "./offerOption.jsx";
import PriceOption from "./priceOption.jsx";
import Cart from "./Cart.jsx";
import authService from "../Authservice.js";

const Homepage = ({ 
  isLoggedIn, 
  user,
  cartItems, 
  setCartItems, 
  onLoginClick, 
  onSignUpClick, 
  onRestaurantSignUpClick,
  onLogout,
  onRestaurantClick
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch restaurants from API (with or without authentication)
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        let data;
        
        // If user is logged in, use authenticated fetch
        if (isLoggedIn) {
          data = await authService.authenticatedFetch("http://127.0.0.1:8000/api/v1/restaurants/");
        } else {
          // Public endpoint - no authentication required
          const response = await fetch("http://127.0.0.1:8000/api/v1/restaurants/");
          if (!response.ok) {
            throw new Error('Failed to fetch restaurants');
          }
          data = await response.json();
        }
        
        setRestaurants(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching restaurants:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [isLoggedIn]);

  // Cart handling functions
  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCartItems(cartItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  // Navigate to restaurant detail page
  const handleRestaurantClick = (restaurant) => {
    if (onRestaurantClick) {
      onRestaurantClick(restaurant);
    }
  };

  // Filter restaurants based on search query
  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="homepage-container">
      {/* Top Pink Banner */}
      {!isLoggedIn ? (
        <div className="top-banner">    
          <div className="banner-icon"></div>
          <button className="banner-btn" onClick={onRestaurantSignUpClick}>
            SIGN UP TO BE A RESTAURANT PARTNER
          </button>
          <button className="banner-btn" onClick={onRestaurantSignUpClick}>
            SIGN UP FOR A BUSINESS ACCOUNT
          </button>
        </div>
      ) : null}
     
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
                <button 
                  className="header-btn cart-button"
                  onClick={() => setShowCart(!showCart)}
                >
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
                  <span>{user?.first_name || 'PROFILE'}</span>
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
          {/* Sidebar Filters */}
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
                  <img src="../../public/images/accessories/glass.png" className="glass-image" alt="Search" />
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

            {/* Restaurants Section */}
            <section className="deals-section">
              <h2 className="section-title">
                {searchQuery ? `Search results for "${searchQuery}"` : 'Featured Restaurants'}
              </h2>

              {/* Loading State */}
              {loading && (
                <div className="loading-state">
                  <div className="loading-spinner">🔄</div>
                  <p>Loading restaurants...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="error-state">
                  <div className="error-icon">⚠️</div>
                  <p>Failed to load restaurants: {error}</p>
                  <button onClick={() => window.location.reload()} className="retry-btn">
                    Retry
                  </button>
                </div>
              )}

              {/* Restaurants Grid */}
              {!loading && !error && (
                <div className="deals-grid">
                  {filteredRestaurants.length > 0 ? (
                    filteredRestaurants.map((restaurant) => (
                      <div 
                        key={restaurant.id} 
                        className="deal-card"
                        onClick={() => handleRestaurantClick(restaurant)}
                      >
                        <div className="deal-image">
                          {restaurant.image_url ? (
                            <img 
                              src={restaurant.image_url} 
                              alt={restaurant.name}
                              className="restaurant-img"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="deal-emoji" style={{ display: restaurant.image_url ? 'none' : 'flex' }}>
                            🍽️
                          </div>
                          {restaurant.percentage > 0 && (
                            <div className="deal-discount">{restaurant.percentage}% OFF</div>
                          )}
                        </div>
                        <div className="deal-info">
                          <h3 className="deal-name">{restaurant.name}</h3>
                          <p className="deal-type">{restaurant.description || 'Food • Restaurant'}</p>
                          <p className="deal-address">{restaurant.address}</p>
                          <div className="deal-footer">
                            <div className="deal-rating">
                              <span>⭐</span>
                              <span>{restaurant.rating}</span>
                              <span className="rating-count">({restaurant.total_rated})</span>
                            </div>
                            <span className="deal-min-order">Min: ৳{restaurant.min_order}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">
                      <div className="no-results-icon">🔍</div>
                      <p>No restaurants found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Cart Sidebar */}
      <Cart 
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />
    </div>
  );
};

export default Homepage;
import { useState, useEffect } from "react";
import "./homepage.css";
import Header from "./Header.jsx";
import CuisineFilter from "./cuisineOption.jsx";
import SortOption from "./sortbyOption.jsx";
import OfferOption from "./offerOption.jsx";
import PriceOption from "./priceOption.jsx";
import AllCarts from "./AllCarts.jsx";
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
  onRestaurantClick,
  onCheckout,
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
          data = await authService.authenticatedFetch(
            "http://127.0.0.1:8000/api/v1/restaurants/",
          );
        } else {
          // Public endpoint - no authentication required
          const response = await fetch(
            "http://127.0.0.1:8000/api/v1/restaurants/",
          );
          if (!response.ok) {
            throw new Error("Failed to fetch restaurants");
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
    setCartItems(
      cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  // Navigate to restaurant detail page
  const handleRestaurantClick = (restaurant) => {
    if (onRestaurantClick) {
      onRestaurantClick(restaurant);
    }
  };

  const handleCheckout = (restaurantId) => {
    console.log("Checkout for restaurant:", restaurantId);
    if (onCheckout) {
      onCheckout(restaurantId);
    }
  };

  const handleNavigateToRestaurant = (restaurantId) => {
    const restaurant = restaurants.find((r) => r.id === restaurantId);
    if (restaurant && onRestaurantClick) {
      onRestaurantClick(restaurant);
      setShowCart(false);
    }
  };

  // Filter restaurants based on search query
  const filteredRestaurants = restaurants.filter(
    (restaurant) =>
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.description?.toLowerCase().includes(searchQuery.toLowerCase()),
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
      {/* Reusable Header Component */}
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        cartItems={cartItems}
        onLoginClick={onLoginClick}
        onSignUpClick={onSignUpClick}
        onRestaurantSignUpClick={onRestaurantSignUpClick}
        onCartClick={() => setShowCart(!showCart)}
        onLogout={onLogout}
        showBanner={true}
      />

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Sidebar Filters */}
          <aside
            className={`sidebar ${showFilters ? "sidebar-visible" : "sidebar-hidden"}`}
          >
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
          <div className={`main-area ${showFilters ? "" : "main-area-full"}`}>
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
                  <img
                    src="../../public/images/accessories/glass.png"
                    className="glass-image"
                    alt="Search"
                  />
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
                {searchQuery
                  ? `Search results for "${searchQuery}"`
                  : "Featured Restaurants"}
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
                  <button
                    onClick={() => window.location.reload()}
                    className="retry-btn"
                  >
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
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="deal-emoji"
                            style={{
                              display: restaurant.image_url ? "none" : "flex",
                            }}
                          >
                            🍽️
                          </div>
                          {restaurant.percentage > 0 && (
                            <div className="deal-discount">
                              {restaurant.percentage}% OFF
                            </div>
                          )}
                        </div>
                        <div className="deal-info">
                          <h3 className="deal-name">{restaurant.name}</h3>
                          <p className="deal-type">
                            {restaurant.description || "Food • Restaurant"}
                          </p>
                          <p className="deal-address">{restaurant.address}</p>
                          <div className="deal-footer">
                            <div className="deal-rating">
                              <span>⭐</span>
                              <span>{restaurant.rating}</span>
                              <span className="rating-count">
                                ({restaurant.total_rated})
                              </span>
                            </div>
                            <span className="deal-min-order">
                              Min: ৳{restaurant.min_order}
                            </span>
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
      <AllCarts
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={cartItems}
        onCheckout={handleCheckout}
        onNavigateToRestaurant={handleNavigateToRestaurant}
      />
    </div>
  );
};

export default Homepage;
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
  onProfileClick,
  onOrdersClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [selectedCuisines, setSelectedCuisines] = useState([]);

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

        // Fetch full details for each restaurant to get menu items
        // This is needed for cuisine filtering
        const detailedRestaurants = await Promise.all(
          data.map(async (restaurant) => {
            try {
              let details;
              if (isLoggedIn) {
                details = await authService.authenticatedFetch(
                  `http://127.0.0.1:8000/api/v1/restaurants/${restaurant.id}/`
                );
              } else {
                const detailResponse = await fetch(
                  `http://127.0.0.1:8000/api/v1/restaurants/${restaurant.id}/`
                );
                if (detailResponse.ok) {
                  details = await detailResponse.json();
                }
              }
              return details || restaurant;
            } catch (err) {
              console.error(`Error fetching details for restaurant ${restaurant.id}:`, err);
              return restaurant; // Return basic data if detail fetch fails
            }
          })
        );

        setRestaurants(detailedRestaurants);
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

  // Cuisine scroll handlers
  const scrollCuisines = (direction) => {
    const container = document.querySelector('.cuisines-grid');
    if (container) {
      const scrollAmount = 300;
      const newScrollLeft = direction === 'left' 
        ? container.scrollLeft - scrollAmount 
        : container.scrollLeft + scrollAmount;
      
      container.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
      
      // Update arrow visibility after scroll
      setTimeout(() => updateArrowVisibility(), 300);
    }
  };

  const updateArrowVisibility = () => {
    const container = document.querySelector('.cuisines-grid');
    if (container) {
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  // Check arrow visibility on mount and resize
  useEffect(() => {
    updateArrowVisibility();
    window.addEventListener('resize', updateArrowVisibility);
    return () => window.removeEventListener('resize', updateArrowVisibility);
  }, []);

  // Filter restaurants based on search query
  const filteredRestaurants = restaurants.filter(
    (restaurant) =>
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle cuisine card click from homepage
  const handleCuisineClick = (cuisineName) => {
    setSelectedCuisines([cuisineName]);
    setSearchQuery(""); // Clear search when cuisine is selected
  };

  // Handle cuisine checkbox toggle from sidebar
  const handleCuisineToggle = (cuisineName) => {
    setSelectedCuisines(prev => {
      if (prev.includes(cuisineName)) {
        // Remove cuisine if already selected
        return prev.filter(c => c !== cuisineName);
      } else {
        // Add cuisine to selection
        return [...prev, cuisineName];
      }
    });
  };

  // Filter restaurants by selected cuisines (OR operation)
  const getCuisineFilteredRestaurants = () => {
    if (selectedCuisines.length === 0) {
      return filteredRestaurants;
    }

    return filteredRestaurants.filter(restaurant => {
      // Check if ANY of the restaurant's menu items match ANY selected cuisine
      return restaurant.items?.some(item => 
        selectedCuisines.some(selectedCuisine => 
          item.category_name?.toLowerCase() === selectedCuisine.toLowerCase()
        )
      );
    });
  };

  const displayedRestaurants = getCuisineFilteredRestaurants();

  const cuisines = [
    { id: 1, name: "Pizza", image: "Pizza.png" },
    { id: 2, name: "Biryani", image: "Biryani.png" },
    { id: 3, name: "Burgers", image: "Burgers.png" },
    { id: 4, name: "Cakes", image: "Cakes.png" },
    { id: 5, name: "Bangladeshi", image: "Bangladeshi.png" },
    { id: 6, name: "Snacks", image: "Snacks.png" },
    { id: 7, name: "Cafe", image: "Cafe.png" },
    { id: 8, name: "Fast Food", image: "Fast%20Food.png" },
    { id: 9, name: "Breakfast", image: "Breakfast.png" },
    { id: 10, name: "Chicken", image: "Chicken.png" },
    { id: 11, name: "Kebab", image: "Kebab.png" },
    { id: 12, name: "Pasta", image: "pasta.png" },
    { id: 13, name: "Rice Dishes", image: "Rice%20Dishes.png" },
    { id: 14, name: "Soups", image: "Soups.png" },
    { id: 15, name: "Tehari", image: "Tehari.png" },
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
        onProfileClick={onProfileClick}
        onOrdersClick={onOrdersClick}
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
            <CuisineFilter 
              selectedCuisines={selectedCuisines}
              onCuisineToggle={handleCuisineToggle}
            />
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
                    src="/images/accessories/glass.png"
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
              <div className="cuisines-header">
                <h2 className="section-title">Cuisines</h2>
                <div className="cuisines-nav">
                  <button
                    className={`cuisine-nav-btn ${!showLeftArrow ? 'disabled' : ''}`}
                    onClick={() => scrollCuisines('left')}
                    disabled={!showLeftArrow}
                    aria-label="Scroll left"
                  >
                    ←
                  </button>
                  <button
                    className={`cuisine-nav-btn ${!showRightArrow ? 'disabled' : ''}`}
                    onClick={() => scrollCuisines('right')}
                    disabled={!showRightArrow}
                    aria-label="Scroll right"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="cuisines-grid-wrapper">
                <div className="cuisines-grid" onScroll={updateArrowVisibility}>
                  {cuisines.map((cuisine) => (
                    <button 
                      key={cuisine.id} 
                      className="cuisine-card"
                      onClick={() => handleCuisineClick(cuisine.name)}
                    >
                      <div className="cuisine-icon">
                        <img 
                          src={`/images/cusines/${cuisine.image}`}
                          alt={cuisine.name}
                          className="cuisine-image"
                        />
                      </div>
                      <span className="cuisine-name">{cuisine.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Restaurants Section */}
            <section className="deals-section">
              <h2 className="section-title">
                {selectedCuisines.length > 0
                  ? `${displayedRestaurants.length} Restaurant${displayedRestaurants.length !== 1 ? 's' : ''} found`
                  : searchQuery
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
                  {displayedRestaurants.length > 0 ? (
                    displayedRestaurants.map((restaurant) => (
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
                      <p>
                        {selectedCuisines.length > 0
                          ? `No restaurants found serving ${selectedCuisines.join(', ')}`
                          : `No restaurants found matching "${searchQuery}"`}
                      </p>
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
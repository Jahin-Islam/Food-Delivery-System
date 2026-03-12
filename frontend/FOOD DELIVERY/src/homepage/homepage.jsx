import { useState, useEffect } from "react";
import { Gift, Loader2, UtensilsCrossed, Star, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import "./homepage.css";
import Header from "./Header.jsx";
import CuisineFilter from "./cuisineOption.jsx";
import SortOption from "./sortbyOption.jsx";
import OfferOption from "./offerOption.jsx";
import PriceOption from "./priceOption.jsx";
import AllCarts from "./AllCarts.jsx";

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
  onLogoClick,
  onDeliveryClick,
  onPickupClick,
  onNearMeClick,
  activeTab = 'delivery',
  // restaurants passed from App (shared with NearMePage — no duplicate fetch)
  restaurants = [],
}) => {
  const [searchQuery,      setSearchQuery]      = useState("");
  const [showFilters,      setShowFilters]      = useState(true);
  const [showCart,         setShowCart]         = useState(false);
  const [showLeftArrow,    setShowLeftArrow]    = useState(false);
  const [showRightArrow,   setShowRightArrow]   = useState(true);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [sortBy,           setSortBy]           = useState('relevance');
  const [userLocation,     setUserLocation]     = useState(null);

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) { handleRemoveItem(itemId); return; }
    setCartItems(cartItems.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const handleNavigateToRestaurant = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id == restaurantId);
    if (restaurant && onRestaurantClick) { setShowCart(false); onRestaurantClick(restaurant); }
  };

  const scrollCuisines = (direction) => {
    const container = document.querySelector('.cuisines-grid');
    if (container) {
      container.scrollTo({ left: container.scrollLeft + (direction === 'left' ? -300 : 300), behavior: 'smooth' });
      setTimeout(updateArrowVisibility, 300);
    }
  };

  const updateArrowVisibility = () => {
    const container = document.querySelector('.cuisines-grid');
    if (container) {
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    }
  };

  useEffect(() => {
    updateArrowVisibility();
    window.addEventListener('resize', updateArrowVisibility);
    return () => window.removeEventListener('resize', updateArrowVisibility);
  }, []);

  const filteredRestaurants = restaurants.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCuisineClick = (cuisineName) => { setSelectedCuisines([cuisineName]); setSearchQuery(""); };

  const handleCuisineToggle = (cuisineName) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisineName) ? prev.filter(c => c !== cuisineName) : [...prev, cuisineName]
    );
  };

  const getCuisineFilteredRestaurants = () => {
    if (selectedCuisines.length === 0) return filteredRestaurants;
    return filteredRestaurants.filter(r =>
      r.items?.some(item =>
        selectedCuisines.some(sel => item.category_name?.toLowerCase() === sel.toLowerCase())
      )
    );
  };

  const haversineKm = (a, b) => {
    if (!a || !b) return Infinity;
    const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };

  useEffect(() => {
    if ((sortBy === 'distance' || sortBy === 'fast_delivery') && !userLocation) {
      navigator.geolocation?.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 23.7808, lng: 90.4206 })
      );
    }
  }, [sortBy]);

  const displayedRestaurants = (() => {
    const base = getCuisineFilteredRestaurants();
    if (sortBy === 'relevance') return base;
    return [...base].sort((a, b) => {
      if (sortBy === 'top_rated') return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
      if (sortBy === 'distance' || sortBy === 'fast_delivery') {
        const loc = userLocation || { lat: 23.7808, lng: 90.4206 };
        return haversineKm(loc, { lat: parseFloat(a.latitude), lng: parseFloat(a.longitude) }) -
               haversineKm(loc, { lat: parseFloat(b.latitude), lng: parseFloat(b.longitude) });
      }
      return 0;
    });
  })();

  const cuisines = [
    { id: 1,  name: "Pizza",       image: "Pizza.png" },
    { id: 2,  name: "Biryani",     image: "Biryani.png" },
    { id: 3,  name: "Burgers",     image: "Burgers.png" },
    { id: 4,  name: "Cakes",       image: "Cakes.png" },
    { id: 5,  name: "Bangladeshi", image: "Bangladeshi.png" },
    { id: 6,  name: "Snacks",      image: "Snacks.png" },
    { id: 7,  name: "Cafe",        image: "Cafe.png" },
    { id: 8,  name: "Fast Food",   image: "Fast%20Food.png" },
    { id: 9,  name: "Breakfast",   image: "Breakfast.png" },
    { id: 10, name: "Chicken",     image: "Chicken.png" },
    { id: 11, name: "Kebab",       image: "Kebab.png" },
    { id: 12, name: "Pasta",       image: "pasta.png" },
    { id: 13, name: "Rice Dishes", image: "Rice%20Dishes.png" },
    { id: 14, name: "Soups",       image: "Soups.png" },
    { id: 15, name: "Tehari",      image: "Tehari.png" },
  ];

  return (
    <div className="homepage-container">
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
        onLogoClick={onLogoClick}
        onDeliveryClick={onDeliveryClick}
        onPickupClick={onPickupClick}
        onNearMeClick={onNearMeClick}
        activeTab={activeTab}
        showBanner={true}
      />

      <main className="main-content">
        <div className="content-wrapper">
          <aside className={`sidebar ${showFilters ? "sidebar-visible" : "sidebar-hidden"}`}>
            <div className="sidebar-header">
              <h3 className="sidebar-title">Filters</h3>
              <button className="close-filters-btn" onClick={() => setShowFilters(false)} aria-label="Close filters">
                <X size={16} />
              </button>
            </div>
            <SortOption sortBy={sortBy} onSortChange={setSortBy} />
            <OfferOption />
            <CuisineFilter selectedCuisines={selectedCuisines} onCuisineToggle={handleCuisineToggle} />
            <PriceOption />
          </aside>

          <div className={`main-area ${showFilters ? "" : "main-area-full"}`}>
            {/* Search Bar */}
            <div className="search-container">
              <div className="search-wrapper">
                <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)} aria-label="Toggle filters">
                  <div className="hamburger-icon"><span></span><span></span><span></span></div>
                </button>
                <span><img src="/images/accessories/glass.png" className="glass-image" alt="Search" /></span>
                <input
                  type="text"
                  placeholder="Search for restaurants, cuisines, and dishes"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Promo Banner */}
            {!isLoggedIn && (
              <div className="promo-banner">
                <div className="promo-content">
                  <h2 className="promo-title">Sign up for free delivery on<br />your first order</h2>
                  <button className="promo-btn" onClick={onSignUpClick}>Sign up</button>
                </div>
                <div className="promo-image"><Gift size={64} strokeWidth={1.5} /></div>
              </div>
            )}

            {/* Cuisines */}
            <section className="cuisines-section">
              <div className="cuisines-header">
                <h2 className="section-title">Cuisines</h2>
                <div className="cuisines-nav">
                  <button className={`cuisine-nav-btn ${!showLeftArrow ? 'disabled' : ''}`} onClick={() => scrollCuisines('left')} disabled={!showLeftArrow}><ChevronLeft size={18} /></button>
                  <button className={`cuisine-nav-btn ${!showRightArrow ? 'disabled' : ''}`} onClick={() => scrollCuisines('right')} disabled={!showRightArrow}><ChevronRight size={18} /></button>
                </div>
              </div>
              <div className="cuisines-grid-wrapper">
                <div className="cuisines-grid" onScroll={updateArrowVisibility}>
                  {cuisines.map(cuisine => (
                    <button key={cuisine.id} className="cuisine-card" onClick={() => handleCuisineClick(cuisine.name)}>
                      <div className="cuisine-icon">
                        <img src={`/images/cusines/${cuisine.image}`} alt={cuisine.name} className="cuisine-image" />
                      </div>
                      <span className="cuisine-name">{cuisine.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Restaurants */}
            <section className="deals-section">
              <div className="section-title-row">
                <h2 className="section-title">
                  {selectedCuisines.length > 0
                    ? `${displayedRestaurants.length} Restaurant${displayedRestaurants.length !== 1 ? 's' : ''} found`
                    : searchQuery ? `Search results for "${searchQuery}"`
                    : sortBy === 'top_rated' ? 'Top Rated Restaurants'
                    : sortBy === 'distance' ? 'Nearest Restaurants'
                    : sortBy === 'fast_delivery' ? 'Fastest Delivery Near You'
                    : 'Featured Restaurants'}
                </h2>
              </div>
              <br />

              {restaurants.length === 0 && (
                <div className="loading-state">
                  <div className="loading-spinner"><Loader2 size={40} strokeWidth={1.5} className="spin-icon" /></div>
                  <p>Loading restaurants...</p>
                </div>
              )}

              {restaurants.length > 0 && (
                <div className="deals-grid">
                  {displayedRestaurants.length > 0 ? (
                    displayedRestaurants.map(restaurant => (
                      <div key={restaurant.id} className="deal-card" onClick={() => onRestaurantClick?.(restaurant)}>
                        <div className="deal-image">
                          {restaurant.image_url ? (
                            <img src={restaurant.image_url} alt={restaurant.name} className="restaurant-img"
                              onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                            />
                          ) : null}
                          <div className="deal-emoji" style={{ display: restaurant.image_url ? "none" : "flex" }}>
                            <UtensilsCrossed size={52} strokeWidth={1.5} />
                          </div>
                          {restaurant.percentage > 0 && <div className="deal-discount">{restaurant.percentage}% OFF</div>}
                        </div>
                        <div className="deal-info">
                          <h3 className="deal-name">{restaurant.name}</h3>
                          <p className="deal-type">{restaurant.description || "Food • Restaurant"}</p>
                          <p className="deal-address">{restaurant.address}</p>
                          <div className="deal-footer">
                            <div className="deal-rating">
                              <span className="star-icon"><Star size={13} fill="currentColor" /></span>
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
                      <div className="no-results-icon"><Search size={48} strokeWidth={1.5} /></div>
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

      <AllCarts
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={cartItems}
        onCheckout={onCheckout}
        onNavigateToRestaurant={handleNavigateToRestaurant}
      />
    </div>
  );
};

export default Homepage;
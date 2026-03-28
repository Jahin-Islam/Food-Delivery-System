import { useState, useEffect } from "react";
import { Gift, Loader2, UtensilsCrossed, Star, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import "./homepage.css";
import Header from "./Header.jsx";
import CuisineFilter from "./cuisineOption.jsx";
import SortOption from "./sortbyOption.jsx";
import OfferOption from "./offerOption.jsx";
import PriceOption, { filterByPrice } from "./priceOption.jsx";
// FIX: Removed AllCarts import — it is now rendered globally in App.jsx
// This prevents two AllCarts instances fighting each other

const Homepage = ({
  isLoggedIn, user, cartItems, setCartItems,
  onLoginClick, onSignUpClick, onRestaurantSignUpClick, onRiderSignUpClick, onLogout,
  onRestaurantClick, onCheckout,
  onProfileClick, onOrdersClick, onLogoClick,
  onDeliveryClick, onPickupClick, onNearMeClick,
  onFavouritesClick,
  // FIX: onCartClick now comes from App.jsx (opens global AllCarts)
  // Previously Homepage managed its own showCart state + its own AllCarts,
  // which meant the cart could never open from any other page like OrderStatus.
  onCartClick,
  activeTab = 'delivery',
  restaurants = [],
  currentAddress,
  onAddressChange,
}) => {
  const [searchQuery,      setSearchQuery]      = useState("");
  const [showFilters,      setShowFilters]      = useState(true);
  // FIX: Removed local showCart state — global state lives in App.jsx now
  const [showLeftArrow,    setShowLeftArrow]    = useState(false);
  const [showRightArrow,   setShowRightArrow]   = useState(true);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [sortBy,           setSortBy]           = useState('relevance');
  const [userLocation,     setUserLocation]     = useState(null);
  const [localAddress,     setLocalAddress]     = useState('');

  // Filter state
  const [selectedOffers, setSelectedOffers] = useState({ freeDelivery: false, acceptsVouchers: false, deals: false });
  const [minPrice,       setMinPrice]       = useState('');
  const [maxPrice,       setMaxPrice]       = useState('');

  const handlePriceChange = (min, max) => { setMinPrice(min); setMaxPrice(max); };

  const handleUpdateQuantity = (itemId, qty) => {
    if (qty <= 0) { setCartItems(cartItems.filter(i => i.id !== itemId)); return; }
    setCartItems(cartItems.map(i => i.id === itemId ? { ...i, quantity: qty } : i));
  };
  const handleRemoveItem = id => setCartItems(cartItems.filter(i => i.id !== id));

  const scrollCuisines = dir => {
    const c = document.querySelector('.cuisines-grid');
    if (c) { c.scrollTo({ left: c.scrollLeft + (dir === 'left' ? -300 : 300), behavior: 'smooth' }); setTimeout(updateArrows, 300); }
  };
  const updateArrows = () => {
    const c = document.querySelector('.cuisines-grid');
    if (c) { setShowLeftArrow(c.scrollLeft > 0); setShowRightArrow(c.scrollLeft < c.scrollWidth - c.clientWidth - 10); }
  };
  useEffect(() => { updateArrows(); window.addEventListener('resize', updateArrows); return () => window.removeEventListener('resize', updateArrows); }, []);

  useEffect(() => {
    if ((sortBy === 'distance' || sortBy === 'fast_delivery') && !userLocation) {
      navigator.geolocation?.getCurrentPosition(
        p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserLocation({ lat: 23.7808, lng: 90.4206 })
      );
    }
  }, [sortBy]);

  const haversineKm = (a, b) => {
    if (!a || !b) return Infinity;
    const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
  };

  // ── Filter pipeline ──────────────────────────────────────────────────────
  const step1 = restaurants.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const step2 = selectedCuisines.length === 0 ? step1 :
    step1.filter(r => r.items?.some(item => selectedCuisines.some(s => item.category_name?.toLowerCase() === s.toLowerCase())));
  const step3 = step2.filter(r => {
    if (selectedOffers.freeDelivery    && !r.free_delivery)    return false;
    if (selectedOffers.acceptsVouchers && !r.accepts_vouchers) return false;
    if (selectedOffers.deals           && !(r.percentage > 0)) return false;
    return true;
  });
  const step4 = filterByPrice(step3, minPrice, maxPrice);
  const displayedRestaurants = (() => {
    if (sortBy === 'relevance') return step4;
    return [...step4].sort((a, b) => {
      if (sortBy === 'top_rated') return (parseFloat(b.rating)||0) - (parseFloat(a.rating)||0);
      if (sortBy === 'distance' || sortBy === 'fast_delivery') {
        const loc = userLocation || { lat: 23.7808, lng: 90.4206 };
        return haversineKm(loc, { lat: +a.latitude, lng: +a.longitude }) - haversineKm(loc, { lat: +b.latitude, lng: +b.longitude });
      }
      return 0;
    });
  })();

  const handleCuisineClick  = name => { setSelectedCuisines([name]); setSearchQuery(""); };
  const handleCuisineToggle = name => setSelectedCuisines(p => p.includes(name) ? p.filter(c => c !== name) : [...p, name]);

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
        isLoggedIn={isLoggedIn} user={user} cartItems={cartItems}
        onLoginClick={onLoginClick} onSignUpClick={onSignUpClick}
        onRestaurantSignUpClick={onRestaurantSignUpClick}
        onRiderSignUpClick={onRiderSignUpClick}
        // FIX: was () => setShowCart(!showCart) — now calls the global onCartClick from App.jsx
        onCartClick={onCartClick}
        onLogout={onLogout}
        onProfileClick={onProfileClick} onOrdersClick={onOrdersClick} onLogoClick={onLogoClick}
        onDeliveryClick={onDeliveryClick} onPickupClick={onPickupClick} onNearMeClick={onNearMeClick}
        onFavouritesClick={onFavouritesClick}
        activeTab={activeTab} showBanner={true}
        currentAddress={currentAddress || localAddress}
        onAddressChange={(addr) => { setLocalAddress(addr); onAddressChange?.(addr); }}
      />

      <main className="main-content">
        <div className="content-wrapper">
          <aside className={`sidebar ${showFilters ? "sidebar-visible" : "sidebar-hidden"}`}>
            <div className="sidebar-header">
              <h3 className="sidebar-title">Filters</h3>
              <button className="close-filters-btn" onClick={() => setShowFilters(false)}>
                <X size={16} />
              </button>
            </div>
            <SortOption sortBy={sortBy} onSortChange={setSortBy} />
            <OfferOption selectedOffers={selectedOffers} onOfferChange={setSelectedOffers} />
            <CuisineFilter selectedCuisines={selectedCuisines} onCuisineToggle={handleCuisineToggle} />
            <PriceOption minPrice={minPrice} maxPrice={maxPrice} onPriceChange={handlePriceChange} />
          </aside>

          <div className={`main-area ${showFilters ? "" : "main-area-full"}`}>
            {/* Search */}
            <div className="search-container">
              <div className="search-wrapper">
                <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
                  <div className="hamburger-icon"><span/><span/><span/></div>
                </button>
                <span style={{ display: 'flex', alignItems: 'center', marginRight: 6 }}>
                  <Search size={16} style={{ color: 'var(--c-gray-400)' }} />
                </span>
                <input type="text" placeholder="Search for restaurants, cuisines, and dishes"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="search-input" />
              </div>
            </div>

            {/* Promo */}
            {!isLoggedIn && (
              <div className="promo-banner">
                <div className="promo-content">
                  <h2 className="promo-title">Sign up for free delivery on<br />your first order</h2>
                  <button className="promo-btn" onClick={onSignUpClick}>Sign up</button>
                </div>
                <div className="promo-image"><Gift size={64} strokeWidth={1.5} /></div>
              </div>
            )}

            {/* Pickup pill */}
            {activeTab === 'pickup' && (
              <div style={{ padding: '10px 0 2px' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary)', background: 'var(--c-primary-light)', padding: '4px 14px', borderRadius: 999 }}>
                  Pick-up mode — browse and collect from these restaurants
                </span>
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
                <div className="cuisines-grid" onScroll={updateArrows}>
                  {cuisines.map(c => (
                    <button key={c.id} className="cuisine-card" onClick={() => handleCuisineClick(c.name)}>
                      <div className="cuisine-icon">
                        <img src={`/images/cusines/${c.image}`} alt={c.name} className="cuisine-image" />
                      </div>
                      <span className="cuisine-name">{c.name}</span>
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
                    : activeTab === 'pickup' ? 'Restaurants for Pick-up'
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
                    displayedRestaurants.map(r => (
                      <div key={r.id} className="deal-card" onClick={() => onRestaurantClick?.(r)}>
                        <div className="deal-image">
                          {r.image_url
                            ? <img src={r.image_url} alt={r.name} className="restaurant-img" onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
                            : null}
                          <div className="deal-emoji" style={{ display: r.image_url ? "none" : "flex" }}>
                            <UtensilsCrossed size={52} strokeWidth={1.5} />
                          </div>
                          {r.percentage > 0 && <div className="deal-discount">{r.percentage}% OFF</div>}
                        </div>
                        <div className="deal-info">
                          <h3 className="deal-name">{r.name}</h3>
                          <p className="deal-type">{r.description || "Food • Restaurant"}</p>
                          <p className="deal-address">{r.address}</p>
                          <div className="deal-footer">
                            <div className="deal-rating">
                              <span className="star-icon"><Star size={13} fill="currentColor" /></span>
                              <span>{r.rating}</span>
                              <span className="rating-count">({r.total_rated})</span>
                            </div>
                            <span className="deal-min-order">Min: ৳{r.min_order}</span>
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

      {/* FIX: AllCarts removed from here — it now lives globally in App.jsx.
          Having it here AND in App.jsx caused two sidebars to exist, and
          the one in App.jsx (used by OrderStatus) was never connected to
          any open/close trigger because Homepage was intercepting onCartClick
          with its own local state. */}
    </div>
  );
};

export default Homepage;
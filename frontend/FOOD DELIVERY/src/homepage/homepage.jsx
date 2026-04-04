import { useState, useEffect, useMemo } from "react";
import {
  Gift, Loader2, UtensilsCrossed, Star, Search,
  ChevronLeft, ChevronRight, X, RotateCcw,
  ShoppingBag, Truck, MapPin, Store,
  Phone, Mail, Instagram, Facebook, Twitter,
} from "lucide-react";
import "./homepage.css";
import Header from "./Header.jsx";
import CuisineFilter from "./cuisineOption.jsx";
import SortOption from "./sortbyOption.jsx";
import OfferOption from "./offerOption.jsx";
import PriceOption, { filterByPrice } from "./priceOption.jsx";
import AllCarts from "./AllCarts.jsx";

// ── Static cuisines with images — always shown first ─────────────────────────
const STATIC_CUISINES = [
  { id: 's1',  name: "Pizza",       image: "Pizza.png" },
  { id: 's2',  name: "Biryani",     image: "Biryani.png" },
  { id: 's3',  name: "Burgers",     image: "Burgers.png" },
  { id: 's4',  name: "Cakes",       image: "Cakes.png" },
  { id: 's5',  name: "Bangladeshi", image: "Bangladeshi.png" },
  { id: 's6',  name: "Snacks",      image: "Snacks.png" },
  { id: 's7',  name: "Cafe",        image: "Cafe.png" },
  { id: 's8',  name: "Fast Food",   image: "Fast%20Food.png" },
  { id: 's9',  name: "Breakfast",   image: "Breakfast.png" },
  { id: 's10', name: "Chicken",     image: "Chicken.png" },
  { id: 's11', name: "Kebab",       image: "Kebab.png" },
  { id: 's12', name: "Pasta",       image: "pasta.png" },
  { id: 's13', name: "Rice Dishes", image: "Rice%20Dishes.png" },
  { id: 's14', name: "Soups",       image: "Soups.png" },
  { id: 's15', name: "Tehari",      image: "Tehari.png" },
];

const STATIC_NAME_SET = new Set(STATIC_CUISINES.map(c => c.name.toLowerCase()));

const Homepage = ({
  isLoggedIn, user, cartItems, setCartItems,
  onLoginClick, onSignUpClick, onRestaurantSignUpClick, onRiderSignUpClick, onLogout,
  onRestaurantClick, onCheckout,
  onProfileClick, onOrdersClick, onLogoClick,
  onDeliveryClick, onPickupClick, onNearMeClick,
  onFavouritesClick,
  activeTab = 'delivery',
  restaurants = [],
  currentAddress,
  onAddressChange,
}) => {
  const [searchQuery,      setSearchQuery]      = useState("");
  const [showFilters,      setShowFilters]      = useState(true);
  const [showCart,         setShowCart]         = useState(false);
  const [showLeftArrow,    setShowLeftArrow]    = useState(false);
  const [showRightArrow,   setShowRightArrow]   = useState(true);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [sortBy,           setSortBy]           = useState('relevance');
  const [userLocation,     setUserLocation]     = useState(null);
  const [localAddress,     setLocalAddress]     = useState('');

  const [selectedOffers, setSelectedOffers] = useState({ freeDelivery: false, acceptsVouchers: false, deals: false });
  const [minPrice,       setMinPrice]       = useState('');
  const [maxPrice,       setMaxPrice]       = useState('');

  const handlePriceChange = (min, max) => { setMinPrice(min); setMaxPrice(max); };

  const handleUpdateQuantity = (itemId, qty) => {
    if (qty <= 0) { setCartItems(cartItems.filter(i => i.id !== itemId)); return; }
    setCartItems(cartItems.map(i => i.id === itemId ? { ...i, quantity: qty } : i));
  };
  const handleRemoveItem = id => setCartItems(cartItems.filter(i => i.id !== id));
  const handleNavigateToRestaurant = id => {
    const r = restaurants.find(r => r.id == id);
    if (r && onRestaurantClick) { setShowCart(false); onRestaurantClick(r); }
  };

  const scrollCuisines = dir => {
    const c = document.querySelector('.cuisines-grid');
    if (c) { c.scrollTo({ left: c.scrollLeft + (dir === 'left' ? -300 : 300), behavior: 'smooth' }); setTimeout(updateArrows, 300); }
  };
  const updateArrows = () => {
    const c = document.querySelector('.cuisines-grid');
    if (c) { setShowLeftArrow(c.scrollLeft > 0); setShowRightArrow(c.scrollLeft < c.scrollWidth - c.clientWidth - 10); }
  };
  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, []);

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

  const dynamicCuisines = useMemo(() => {
    const seen = new Set();
    const names = [];
    for (const restaurant of restaurants) {
      for (const item of restaurant?.items ?? []) {
        const name = item?.category_name?.trim();
        if (name && !STATIC_NAME_SET.has(name.toLowerCase()) && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          names.push(name);
        }
      }
    }
    return names.sort((a, b) => a.localeCompare(b)).map((name, idx) => ({ id: `d${idx}`, name, image: null }));
  }, [restaurants]);

  const allCuisines = useMemo(() => [...STATIC_CUISINES, ...dynamicCuisines], [dynamicCuisines]);

  const step1 = restaurants.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const step2 = selectedCuisines.length === 0 ? step1 :
    step1.filter(r => r.items?.some(item =>
      selectedCuisines.some(s => item.category_name?.toLowerCase() === s.toLowerCase())
    ));
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

  const hasActiveFilters =
    selectedCuisines.length > 0 ||
    Object.values(selectedOffers).some(Boolean) ||
    sortBy !== 'relevance' ||
    minPrice !== '' ||
    maxPrice !== '';

  const handleResetFilters = () => {
    setSelectedCuisines([]);
    setSelectedOffers({ freeDelivery: false, acceptsVouchers: false, deals: false });
    setSortBy('relevance');
    setMinPrice('');
    setMaxPrice('');
    setSearchQuery('');
  };

  return (
    <div className="homepage-container">
      <Header
        isLoggedIn={isLoggedIn} user={user} cartItems={cartItems}
        onLoginClick={onLoginClick} onSignUpClick={onSignUpClick}
        onRestaurantSignUpClick={onRestaurantSignUpClick}
        onRiderSignUpClick={onRiderSignUpClick}
        onCartClick={() => setShowCart(!showCart)} onLogout={onLogout}
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
              <h3 className="sidebar-title">
                Filters
                {hasActiveFilters && <span className="filters-active-dot" />}
              </h3>
              <button className="close-filters-btn" onClick={() => setShowFilters(false)}>
                <X size={16} />
              </button>
            </div>
            <SortOption sortBy={sortBy} onSortChange={setSortBy} />
            <OfferOption selectedOffers={selectedOffers} onOfferChange={setSelectedOffers} />
            <CuisineFilter
              selectedCuisines={selectedCuisines}
              onCuisineToggle={handleCuisineToggle}
              restaurants={restaurants}
            />
            <PriceOption minPrice={minPrice} maxPrice={maxPrice} onPriceChange={handlePriceChange} />
            {hasActiveFilters && (
              <button className="reset-filters-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handleResetFilters}>
                <RotateCcw size={14} />
                Reset all filters
              </button>
            )}
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
                  <button
                    className={`cuisine-nav-btn ${!showLeftArrow ? 'disabled' : ''}`}
                    onClick={() => scrollCuisines('left')}
                    disabled={!showLeftArrow}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    className={`cuisine-nav-btn ${!showRightArrow ? 'disabled' : ''}`}
                    onClick={() => scrollCuisines('right')}
                    disabled={!showRightArrow}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="cuisines-grid-wrapper">
                <div className="cuisines-grid" onScroll={updateArrows}>
                  {allCuisines.map(c => (
                    <button
                      key={c.id}
                      className={`cuisine-card${selectedCuisines.includes(c.name) ? ' active' : ''}`}
                      onClick={() => handleCuisineClick(c.name)}
                    >
                      <div className="cuisine-icon">
                        {c.image ? (
                          <img src={`/images/cusines/${c.image}`} alt={c.name} className="cuisine-image" />
                        ) : (
                          <UtensilsCrossed size={28} strokeWidth={1.5} />
                        )}
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
                {hasActiveFilters && (
                  <button className="reset-filters-btn" onClick={handleResetFilters}>
                    <RotateCcw size={13} />
                    Reset filters
                  </button>
                )}
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
                            ? <img src={r.image_url} alt={r.name} className="restaurant-img"
                                onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
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
                              {parseFloat(r.total_rated) > 0 ? (
                                <>
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} size={12}
                                      fill={s <= Math.round(parseFloat(r.rating)) ? '#f59e0b' : 'none'}
                                      color={s <= Math.round(parseFloat(r.rating)) ? '#f59e0b' : '#d1d5db'}
                                      style={{ marginRight: 1 }}
                                    />
                                  ))}
                                  <span style={{ marginLeft: 4 }}>{parseFloat(r.rating).toFixed(1)}</span>
                                  <span className="rating-count">({r.total_rated})</span>
                                </>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--c-gray-400)' }}>New</span>
                              )}
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

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────── */}
      <section className="hiw-section">
        <div className="hiw-inner">
          <h2 className="hiw-title">How Khete Chai works</h2>
          <p className="hiw-subtitle">Hot food at your door in three easy steps</p>
          <div className="hiw-steps">

            <div className="hiw-step">
              <div className="hiw-icon-wrap">
                <MapPin size={28} strokeWidth={1.8} />
              </div>
              <div className="hiw-connector" />
              <h3 className="hiw-step-title">Set your location</h3>
              <p className="hiw-step-desc">Enter your delivery address and we'll show you every restaurant that delivers to your door.</p>
            </div>

            <div className="hiw-step">
              <div className="hiw-icon-wrap">
                <ShoppingBag size={28} strokeWidth={1.8} />
              </div>
              <div className="hiw-connector" />
              <h3 className="hiw-step-title">Choose your food</h3>
              <p className="hiw-step-desc">Browse menus, filter by cuisine, and add your favourites to your cart.</p>
            </div>

            <div className="hiw-step">
              <div className="hiw-icon-wrap hiw-icon-last">
                <Truck size={28} strokeWidth={1.8} />
              </div>
              <h3 className="hiw-step-title">We deliver to you</h3>
              <p className="hiw-step-desc">Sit back and relax. Track your order live and get fresh food delivered right to you.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── RESTAURANT OWNER CTA ──────────────────────────────────────────────── */}
      <section className="vendor-cta-section">
        <div className="vendor-cta-inner">
          <div className="vendor-cta-text">
            <div className="vendor-cta-badge">
              <Store size={14} strokeWidth={2} /> For restaurant owners
            </div>
            <h2 className="vendor-cta-title">Grow your business with Khete Chai</h2>
            <p className="vendor-cta-desc">
              Join hundreds of restaurants already on our platform. Reach thousands of hungry customers
              in Dhaka, manage orders in real time, and boost your revenue — all from one dashboard.
            </p>
            <div className="vendor-cta-perks">
              <span className="vendor-perk">✓ Free to join</span>
              <span className="vendor-perk">✓ Real-time order management</span>
              <span className="vendor-perk">✓ Live sales analytics</span>
            </div>
            <button className="vendor-cta-btn" onClick={onRestaurantSignUpClick}>
              Register your restaurant
            </button>
          </div>
          <div className="vendor-cta-illustration">
            <div className="vendor-stat-card">
              <span className="vendor-stat-num">500+</span>
              <span className="vendor-stat-label">Restaurants</span>
            </div>
            <div className="vendor-stat-card">
              <span className="vendor-stat-num">10k+</span>
              <span className="vendor-stat-label">Daily orders</span>
            </div>
            <div className="vendor-stat-card">
              <span className="vendor-stat-num">30 min</span>
              <span className="vendor-stat-label">Avg. delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-inner">

          {/* Brand column */}
          <div className="footer-col footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <UtensilsCrossed size={20} strokeWidth={1.8} />
              </div>
              <span className="footer-logo-text">Khete Chai</span>
            </div>
            <p className="footer-tagline">
              Bangladesh's favourite food delivery platform. Hot meals from your favourite restaurants, delivered fast.
            </p>
            <div className="footer-social">
              <a href="#" className="social-btn" aria-label="Facebook"><Facebook size={16} /></a>
              <a href="#" className="social-btn" aria-label="Instagram"><Instagram size={16} /></a>
              <a href="#" className="social-btn" aria-label="Twitter"><Twitter size={16} /></a>
            </div>
          </div>

          {/* Company links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links">
              <li><a href="#">About us</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>

          {/* Help links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Help</h4>
            <ul className="footer-links">
              <li><a href="#">FAQs</a></li>
              <li><a href="#">Track your order</a></li>
              <li><a href="#">Report an issue</a></li>
              <li><a href="#">Privacy policy</a></li>
              <li><a href="#">Terms &amp; conditions</a></li>
            </ul>
          </div>

          {/* Partners links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Partners</h4>
            <ul className="footer-links">
              <li><a href="#" onClick={e => { e.preventDefault(); onRestaurantSignUpClick?.(); }}>Register your restaurant</a></li>
              <li><a href="#" onClick={e => { e.preventDefault(); onRiderSignUpClick?.(); }}>Become a rider</a></li>
              <li><a href="#">Partner portal</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h4 className="footer-col-title">Contact</h4>
            <ul className="footer-links footer-contact">
              <li>
                <Phone size={13} />
                <span>+880 1XXX-XXXXXX</span>
              </li>
              <li>
                <Mail size={13} />
                <span>support@khetechai.com.bd</span>
              </li>
              <li>
                <MapPin size={13} />
                <span>Dhaka, Bangladesh</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Khete Chai. All rights reserved.</p>
          <p>Made with ❤️ in Bangladesh</p>
        </div>
      </footer>

      <AllCarts isOpen={showCart} onClose={() => setShowCart(false)}
        cartItems={cartItems} onCheckout={onCheckout}
        onNavigateToRestaurant={handleNavigateToRestaurant} />
    </div>
  );
};

export default Homepage;
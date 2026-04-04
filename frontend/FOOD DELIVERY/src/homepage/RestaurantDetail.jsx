import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Utensils, ChevronLeft, ChevronRight, Search,
  X, Star, Loader2,
} from 'lucide-react';
import './RestaurantDetail.css';
import { COLORS } from '../constants.js';
import Header from './Header.jsx';
import authService from '../Authservice.js';
import OrderSummary from './OrderSummary.jsx';
import ItemDetailModal from './ItemDetailModal.jsx';
import AllCarts from './AllCarts.jsx';
import StaticMap from './StaticMap.jsx';

const BASE_URL = 'http://127.0.0.1:8000';

const SORT_TABS = ['Newest', 'Highest rating', 'Lowest rating'];
async function fetchRestaurantReviews(restaurantId, limit = 50, offset = 0) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/reviews/restaurant/${restaurantId}/?limit=${limit}&offset=${offset}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

function calcRatingBars(reviews) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => {
    const rounded = Math.round(parseFloat(r.rating));
    if (counts[rounded] !== undefined) counts[rounded]++;
  });
  const total = reviews.length || 1;
  return [5, 4, 3, 2, 1].map(stars => ({
    stars,
    pct: Math.round((counts[stars] / total) * 100),
  }));
}

const ReviewsModal = ({ isOpen, onClose, restaurant }) => {
  const [sortTab, setSortTab]   = useState('Newest');
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!isOpen || !restaurant?.id) return;
    setLoading(true);
    fetchRestaurantReviews(restaurant.id).then(data => {
      setReviews(data);
      setLoading(false);
    });
  }, [isOpen, restaurant?.id]);

  const sorted = [...reviews].sort((a, b) => {
    if (sortTab === 'Highest rating') return parseFloat(b.rating) - parseFloat(a.rating);
    if (sortTab === 'Lowest rating')  return parseFloat(a.rating) - parseFloat(b.rating);
    return b.review_id - a.review_id;
  });

  const ratingBars = calcRatingBars(reviews);
  const name       = restaurant?.name || 'Restaurant';
  const rating     = parseFloat(restaurant?.rating || 0).toFixed(1);
  const count      = restaurant?.total_rated || reviews.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 3000, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 16,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--c-white)', borderRadius: 16,
              width: '100%', maxWidth: 480, maxHeight: '88vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
            }}
          >
            {/* ── Modal Header ── */}
            <div style={{
              padding: '18px 20px 14px', borderBottom: '1.5px solid var(--c-gray-100)',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-gray-900)', margin: 0, letterSpacing: -0.3 }}>
                  Reviews
                </h2>
                <p style={{ fontSize: 13, color: 'var(--c-gray-500)', margin: '2px 0 0' }}>{name}</p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--c-gray-100)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', color: 'var(--c-gray-500)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Scrollable Content ── */}
            <div style={{ overflowY: 'auto', flex: 1 }}>

              {/* Rating Summary */}
              <div style={{ padding: '16px 20px', display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--c-gray-900)', lineHeight: 1 }}>
                    {rating}
                  </div>
                  <div style={{ display: 'flex', gap: 2, margin: '4px 0 2px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={14}
                        fill={s <= Math.round(parseFloat(rating)) ? '#f59e0b' : 'none'}
                        color={s <= Math.round(parseFloat(rating)) ? '#f59e0b' : 'var(--c-gray-300)'}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--c-gray-400)', margin: 0 }}>
                    All Ratings ({count})
                  </p>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ratingBars.map(({ stars, pct }) => (
                    <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={11} fill="#f59e0b" color="#f59e0b" />
                      <span style={{ fontSize: 11, color: 'var(--c-gray-500)', width: 10 }}>{stars}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--c-gray-100)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sort Tabs */}
              <div style={{ display: 'flex', gap: 6, padding: '0 20px 14px', flexWrap: 'wrap' }}>
                {SORT_TABS.map(t => (
                  <button key={t} onClick={() => setSortTab(t)} style={{
                    padding: '6px 14px', borderRadius: 999,
                    border: `1.5px solid ${sortTab === t ? 'var(--c-primary)' : 'var(--c-gray-200)'}`,
                    background: sortTab === t ? 'var(--c-primary)' : 'var(--c-white)',
                    color: sortTab === t ? 'white' : 'var(--c-gray-600)',
                    fontSize: 13, fontWeight: sortTab === t ? 700 : 500,
                    cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
                  }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Loading state */}
              {loading && (
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  padding: '40px 0', gap: 10, color: 'var(--c-gray-400)',
                }}>
                  <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 14 }}>Loading reviews…</span>
                </div>
              )}

              {/* Empty state */}
              {!loading && sorted.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Star size={40} color="var(--c-gray-300)" strokeWidth={1.5} style={{ marginBottom: 10 }} />
                  <p style={{ fontSize: 14, color: 'var(--c-gray-400)', margin: 0 }}>
                    No reviews yet. Be the first to review!
                  </p>
                </div>
              )}

              {/* Review Cards */}
              {!loading && sorted.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {sorted.map((review, idx) => {
                    const ratingNum = parseFloat(review.rating);
                    // Use review_id as a proxy for a unique customer initial
                    const initial = String(review.customer_id ?? review.review_id ?? '?')[0].toUpperCase();

                    return (
                      <div key={review.review_id} style={{
                        padding: '16px 20px',
                        borderTop: '1.5px solid var(--c-gray-100)',
                      }}>
                        {/* Reviewer header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'var(--c-primary)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0,
                          }}>
                            {initial}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-gray-900)' }}>
                              Customer #{review.customer_id ?? review.review_id}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <div style={{ display: 'flex', gap: 1 }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} size={11}
                                    fill={s <= Math.round(ratingNum) ? '#f59e0b' : 'none'}
                                    color={s <= Math.round(ratingNum) ? '#f59e0b' : 'var(--c-gray-300)'}
                                  />
                                ))}
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--c-gray-500)', fontWeight: 600 }}>
                                {ratingNum.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Comment */}
                        {review.comment && (
                          <p style={{
                            fontSize: 14, color: 'var(--c-gray-700)',
                            margin: 0, lineHeight: 1.55,
                          }}>
                            {review.comment}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const RestaurantDetail = ({
  restaurant,
  onBack,
  onAddToCart,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isLoggedIn,
  user,
  onLoginClick,
  onSignUpClick,
  onLogout,
  onLogoClick,
  onProfileClick,
  onOrdersClick,
  onNavigateToRestaurant,
  onNearMeClick,
  onDeliveryClick,
  onPickupClick,
  currentAddress,
  onAddressChange,
  onRefreshRestaurant,
}) => {
  const [searchQuery,       setSearchQuery]       = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState('All');
  const [menuItems,         setMenuItems]         = useState([]);
  const [categories,        setCategories]        = useState([]);
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState(null);
  const [showCart,          setShowCart]          = useState(false);
  const [selectedItem,      setSelectedItem]      = useState(null);
  const [showItemModal,     setShowItemModal]     = useState(false);
  const [showReviews,       setShowReviews]       = useState(false);

  const categoriesScrollRef   = useRef(null);
  const menuItemsContainerRef = useRef(null);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurant || !restaurant.id) { setLoading(false); return; }
      try {
        setLoading(true);
        let data;
        if (isLoggedIn) {
          data = await authService.authenticatedFetch(
            `${BASE_URL}/api/v1/restaurants/${restaurant.id}/`
          );
        } else {
          const response = await fetch(`${BASE_URL}/api/v1/restaurants/${restaurant.id}/`);
          if (!response.ok) throw new Error('Failed to fetch restaurant details');
          data = await response.json();
        }
        setRestaurantDetails(data);
        if (data.items && data.items.length > 0) {
          const availableItems = data.items.filter(
            item => item.is_available && item.is_available !== 0 && item.is_available !== '0'
          );
          setCategories(['All', ...new Set(availableItems.map(item => item.category_name))]);
          setMenuItems(availableItems);
        } else {
          setCategories(['All']); setMenuItems([]);
        }
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurantDetails();
  }, [restaurant, isLoggedIn]);

  // When leaving this page, refresh the restaurant's rating in the homepage list
  // so the card immediately shows the correct stars instead of "New".
  useEffect(() => {
    return () => {
      if (restaurant?.id && onRefreshRestaurant) {
        onRefreshRestaurant(restaurant.id);
      }
    };
  }, [restaurant?.id, onRefreshRestaurant]);

  const commonHeaderProps = {
    isLoggedIn, user, cartItems,
    onLoginClick, onSignUpClick,
    onCartClick: () => setShowCart(!showCart),
    onLogout, onLogoClick, onProfileClick, onOrdersClick,
    showBanner: false,
    onNearMeClick,
    onDeliveryClick: onDeliveryClick ?? onLogoClick,
    onPickupClick,
    currentAddress,
    onAddressChange,
  };

  if (!restaurant) return (
    <div className="restaurant-detail-container">
      <Header {...commonHeaderProps} />
      <div style={{ padding: '40px', textAlign: 'center' }}><p>Restaurant not found</p></div>
    </div>
  );

  if (loading) return (
    <div className="restaurant-detail-container">
      <Header {...commonHeaderProps} />
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading-spinner">
          <img className="load-icon" src="/images/accessories/load.gif" alt="Loading..." />
        </div>
        <p>Loading restaurant details...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="restaurant-detail-container">
      <Header {...commonHeaderProps} />
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <AlertTriangle size={48} color="var(--warning)" />
        <p>Failed to load: {error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">Retry</button>
      </div>
    </div>
  );

  const displayRestaurant = restaurantDetails || restaurant;

  const filteredItems = menuItems.filter(item => {
    if (!item.is_available || item.is_available === 0 || item.is_available === '0') return false;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category_name || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const restaurantCartItems = cartItems.filter(item => item.restaurantId === displayRestaurant.id);

  const handleItemClick = (item) => {
    setSelectedItem({
      ...item,
      restaurant: displayRestaurant.name,
      restaurantId: displayRestaurant.id,
      restaurantImage: displayRestaurant.image_url,
    });
    setShowItemModal(true);
  };

  const handleQuickAdd = (item, e) => {
    e.stopPropagation();
    const itemId = `${item.food_id}-${displayRestaurant.id}`;
    const existing = cartItems.find(ci => ci.id === itemId);
    if (existing) {
      if (onUpdateQuantity) onUpdateQuantity(itemId, existing.quantity + 1);
      return;
    }
    if (onAddToCart) onAddToCart({
      id: itemId,
      foodId: item.food_id,
      name: item.name,
      price: item.price,
      originalPrice: item.original_price,
      restaurant: displayRestaurant.name,
      restaurantId: displayRestaurant.id,
      restaurantImage: displayRestaurant.image_url,
      image: item.image_url,
      quantity: 1,
      variation: null,
      extras: [],
      specialInstructions: '',
    });
  };

  const getFrequentlyBoughtItems = (currentItem) =>
    menuItems.filter(i => i.food_id !== currentItem.food_id).slice(0, 5)
      .map(i => ({ id: i.food_id, name: i.name, price: i.price, image: i.image_url }));

  const scrollToCategory = (category) => {
    if (category === 'All') {
      menuItemsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    const el = document.querySelector(`[data-category="${category}"]`);
    if (el && menuItemsContainerRef.current) {
      menuItemsContainerRef.current.scrollTo({
        top: el.offsetTop - menuItemsContainerRef.current.offsetTop - 20,
        behavior: 'smooth',
      });
    }
  };

  const handleCheckout = () => {
    if (onCheckout && restaurantCartItems.length > 0) onCheckout(displayRestaurant.id);
  };

  const handleNavigateToRestaurant = (restaurantId) => {
    setShowCart(false);
    if (!onNavigateToRestaurant) return;
    if (String(restaurantId) === String(displayRestaurant?.id)) return;
    const cartItem = cartItems.find(i => String(i.restaurantId) === String(restaurantId));
    const target = cartItem
      ? { id: cartItem.restaurantId, name: cartItem.restaurant, image_url: cartItem.restaurantImage || '' }
      : null;
    if (target) onNavigateToRestaurant(target);
  };

  const handleCheckoutFromCart = (restaurantId) => {
    setShowCart(false);
    if (onCheckout) onCheckout(restaurantId);
  };

  return (
    <div className="restaurant-detail-container">
      <Header {...commonHeaderProps} />

      {/* ── Restaurant Banner ── */}
      <div className="restaurant-banner">
        <div className="banner-image">
          {displayRestaurant.image_url ? (
            <>
              <img src={displayRestaurant.image_url} alt={displayRestaurant.name}
                className="restaurant-banner-img"
                onError={(e) => { e.target.style.display = 'none'; }} />
              <div className="banner-emoji" style={{ display: 'none' }}>
                <Utensils size={64} color="var(--primary)" />
              </div>
            </>
          ) : (
            <div className="banner-emoji"><Utensils size={64} color="var(--primary)" /></div>
          )}
        </div>

        <div className="restaurant-info-banner">
          <h1 className="restaurant-name">{displayRestaurant.name}</h1>
          <p className="restaurant-subtitle">{displayRestaurant.description || 'Restaurant'}</p>
          <div className="restaurant-rating-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {parseFloat(displayRestaurant.total_rated) > 0 ? (
                <>
                  {[1, 2, 3, 4, 5].map(s => {
                    const filled = s <= Math.round(parseFloat(displayRestaurant.rating || 0));
                    return (
                      <Star key={s} size={15}
                        fill={filled ? '#f59e0b' : 'none'}
                        color={filled ? '#f59e0b' : '#d1d5db'}
                        style={{ marginRight: 1, filter: filled ? 'drop-shadow(0 0 3px #f59e0b88)' : 'none' }}
                      />
                    );
                  })}
                  <span style={{ marginLeft: 5, fontWeight: 700, fontSize: 14, color: 'var(--c-gray-800)' }}>
                    {parseFloat(displayRestaurant.rating || 0).toFixed(1)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--c-gray-500)', marginLeft: 3 }}>
                    ({displayRestaurant.total_rated})
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary)', background: 'var(--c-primary-bg)', padding: '2px 10px', borderRadius: 999 }}>✨ New</span>
              )}
            </div>
            <button className="see-reviews-btn" onClick={() => setShowReviews(true)}>
              See reviews
            </button>
          </div>
        </div>
      </div>

      {/* ── Available Deals ── */}
      {(() => {
        const deals = (restaurantDetails?.discounts ?? restaurant?.discounts ?? []).filter(
          d => d.is_active === true || d.is_active === 1 || d.is_active === '1'
        );
        if (deals.length === 0) return null;
        return (
          <div className="deals-section-detail">
            <h2 className="section-title-detail">Available deals</h2>
            <div className="deals-grid-detail">
              {deals.map((discount, index) => (
                <div key={index} className="deal-card-detail"
                  style={{ background: index === 0 ? 'linear-gradient(135deg,#1e293b,#334155)' : COLORS.gradientPrimary }}>
                  <div className="deal-icon">
                    <img className="discount-icon" src="/images/accessories/discount.png" alt="Discount" />
                  </div>
                  <div className="deal-content">
                    <h3 className="deal-title-detail">{discount.description}</h3>
                    <p className="deal-description">Min. order ৳{discount.min_order} • {discount.percentage}% off</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Menu + Order Summary ── */}
      <div className="menu-with-summary-container">
        <div className="menu-section">
          <h2 className="section-title-detail">Menu</h2>
          <div className="menu-controls">
            <div className="search-in-menu">
              <span className="search-icon"></span>
              <input type="text" placeholder="Search in menu"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="menu-search-input" />
            </div>
          </div>

          <div className="menu-categories-container">
            <button className="category-scroll-btn prev"
              onClick={() => categoriesScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}>
              <ChevronLeft size={18} />
            </button>
            <div className="menu-categories-scroll" ref={categoriesScrollRef}>
              {categories.map(category => (
                <button key={category}
                  className={`menu-category-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => { setSelectedCategory(category); scrollToCategory(category); }}>
                  {category}
                </button>
              ))}
            </div>
            <button className="category-scroll-btn next"
              onClick={() => categoriesScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="menu-items-scroll-container" ref={menuItemsContainerRef}>
            {Object.keys(groupedItems).length > 0 ? (
              Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="menu-category-section" data-category={category}>
                  <h3 className="menu-category-title">{category}</h3>
                  <p className="menu-category-subtitle">{items.length} items</p>
                  <div className="menu-items-grid">
                    {items.map(item => (
                      <div key={item.food_id} className="menu-item-card"
                        onClick={() => handleItemClick(item)} style={{ cursor: 'pointer' }}>
                        <div className="menu-item-info">
                          <h4 className="menu-item-name">{item.name}</h4>
                          <p className="menu-item-description">{item.description}</p>
                          <div className="menu-item-footer">
                            <span className="menu-item-price">৳{item.price}</span>
                            {item.discount_ammount && (
                              <span className="menu-item-discount">-{item.discount_ammount}%</span>
                            )}
                          </div>
                        </div>
                        <div className="menu-item-image-container">
                          <div className="menu-item-image">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                            ) : null}
                            <div className="menu-item-emoji" style={{ display: item.image_url ? 'none' : 'flex' }}>
                              <Utensils size={32} color="var(--primary)" />
                            </div>
                          </div>
                          {(() => {
                            const itemId = `${item.food_id}-${displayRestaurant.id}`;
                            const inCart = cartItems.find(ci => ci.id === itemId);
                            return inCart ? (
                              <div className="add-item-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', fontSize: 18, fontWeight: 700, gap: 4 }}
                                onClick={e => e.stopPropagation()}>
                                <button style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
                                  onClick={(e) => { e.stopPropagation(); onUpdateQuantity && onUpdateQuantity(itemId, inCart.quantity - 1); }}>−</button>
                                <span style={{ minWidth: 18, textAlign: 'center' }}>{inCart.quantity}</span>
                                <button style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
                                  onClick={(e) => handleQuickAdd(item, e)}>+</button>
                              </div>
                            ) : (
                              <button className="add-item-btn" onClick={(e) => handleQuickAdd(item, e)}>+</button>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-menu-results">
                <div className="no-results-icon"><Search size={48} color="var(--gray-400)" /></div>
                <p>No items found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        <OrderSummary
          cartItems={restaurantCartItems}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          onCheckout={handleCheckout}
          restaurantName={displayRestaurant.name}
        />
      </div>

      {/* ── Footer ── */}
      <div className="restaurant-footer-info">
        <div className="footer-info-section">
          <h3>About</h3>
          <p>{displayRestaurant.description || 'Quality food delivered to your door.'}</p>
        </div>
        <div className="footer-info-section">
          <h3>Opening Hours</h3>
          <p>{displayRestaurant.opening_time} - {displayRestaurant.closing_time}</p>
        </div>
        <div className="footer-info-section">
          <h3>Contact</h3>
          <p>Phone: {displayRestaurant.phone || 'N/A'}</p>
          <p>Address: {typeof displayRestaurant.address === 'string'
            ? displayRestaurant.address
            : displayRestaurant.address?.street_address ?? 'Dhaka, Bangladesh'}</p>
        </div>
        <div className="footer-info-section">
          <h3>Location</h3>
          <StaticMap
            lat={displayRestaurant.address?.latitude ?? displayRestaurant.latitude ?? null}
            lng={displayRestaurant.address?.longitude ?? displayRestaurant.longitude ?? null}
            label={displayRestaurant.name}
            pinColor="#f97316"
            address={typeof displayRestaurant.address === 'string'
              ? displayRestaurant.address
              : displayRestaurant.address?.street_address ?? ''}
            height="220px"
          />
        </div>
        <div className="footer-info-section">
          <h3>Delivery Info</h3>
          <p>Minimum order: ৳{displayRestaurant.min_order}</p>
          <p>Delivery fee may vary</p>
        </div>
      </div>

      {/* ── Reviews Modal ── */}
      <ReviewsModal
        isOpen={showReviews}
        onClose={() => setShowReviews(false)}
        restaurant={displayRestaurant}
      />

      <ItemDetailModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        item={selectedItem}
        onAddToCart={(cartItem) => onAddToCart && onAddToCart(cartItem)}
        frequentlyBoughtItems={selectedItem ? getFrequentlyBoughtItems(selectedItem) : []}
      />

      <AllCarts
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={cartItems}
        onCheckout={handleCheckoutFromCart}
        onNavigateToRestaurant={handleNavigateToRestaurant}
      />
    </div>
  );
};

export default RestaurantDetail;
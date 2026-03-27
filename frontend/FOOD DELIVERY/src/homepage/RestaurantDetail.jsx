import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Utensils, ChevronLeft, ChevronRight, Search,
  X, Star, ThumbsUp, ChevronRight as Arrow, Heart,
} from 'lucide-react';
import './RestaurantDetail.css';
import { COLORS } from '../constants.js';
import Header from './Header.jsx';
import authService from '../Authservice.js';
import OrderSummary from './OrderSummary.jsx';
import ItemDetailModal from './ItemDetailModal.jsx';
import AllCarts from './AllCarts.jsx';
import StaticMap from './StaticMap.jsx';

// ─── MOCK REVIEWS (replace with API call when ready) ─────────────────────────
const MOCK_REVIEWS = [
  {
    id: 1, name: 'Arif', badge: 'Top Reviewer', rating: 4,
    date: '3 months ago', text: 'The cake keeps getting thinner :)',
    helpful: 3,
    likedDishes: [
      { name: 'Cappuccino',         price: 290, image: null },
      { name: 'Ultimate Chocolate Cake', price: 480, image: null },
    ],
  },
  {
    id: 2, name: 'Musharrat', badge: 'Top Reviewer', rating: 5,
    date: 'Yesterday', text: 'Yummmm',
    helpful: 1,
    likedDishes: [
      { name: 'Classic Chicken Sandwich', price: 410, image: null },
      { name: 'Banana Bread with Chocolate Chips', price: 165, image: null },
    ],
  },
  {
    id: 3, name: 'Musharrat', badge: 'Top Reviewer', rating: 4,
    date: '4 days ago', text: 'Great atmosphere and quality drinks!',
    helpful: 0,
    likedDishes: [],
  },
  {
    id: 4, name: 'Tanvir', badge: null, rating: 5,
    date: '1 week ago', text: 'Best coffee in Gulshan. Will be back!',
    helpful: 5,
    likedDishes: [{ name: 'Caffe Latte', price: 300, image: null }],
  },
];

const RATING_BARS = [
  { stars: 5, pct: 78 },
  { stars: 4, pct: 12 },
  { stars: 3, pct: 5  },
  { stars: 2, pct: 3  },
  { stars: 1, pct: 2  },
];

const SORT_TABS = ['Top reviews', 'Newest', 'Highest rating', 'Lowest rating'];

// ─── REVIEWS MODAL ────────────────────────────────────────────────────────────
const ReviewsModal = ({ isOpen, onClose, restaurant }) => {
  const [sortTab,    setSortTab]    = useState('Top reviews');
  const [dishPage,   setDishPage]   = useState({});   // reviewId → page index

  const sorted = [...MOCK_REVIEWS].sort((a, b) => {
    if (sortTab === 'Newest')         return 0;
    if (sortTab === 'Highest rating') return b.rating - a.rating;
    if (sortTab === 'Lowest rating')  return a.rating - b.rating;
    return b.helpful - a.helpful;   // Top reviews
  });

  const name  = restaurant?.name || 'Restaurant';
  const rating = parseFloat(restaurant?.rating || 5).toFixed(1);
  const count  = restaurant?.total_rated || '5000+';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={onClose}>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--c-white)', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1.5px solid var(--c-gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-gray-900)', margin: 0, letterSpacing: -0.3 }}>Reviews</h2>
                <p style={{ fontSize: 13, color: 'var(--c-gray-500)', margin: '2px 0 0' }}>{name}</p>
              </div>
              <button onClick={onClose} style={{ background: 'var(--c-gray-100)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--c-gray-500)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', flex: 1 }}>

              {/* Rating summary */}
              <div style={{ padding: '16px 20px', display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--c-gray-900)', lineHeight: 1 }}>{rating}</div>
                  <div style={{ display: 'flex', gap: 2, margin: '4px 0 2px' }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} fill={s <= Math.round(rating) ? '#f59e0b' : 'none'} color={s <= Math.round(rating) ? '#f59e0b' : 'var(--c-gray-300)'} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--c-gray-400)', margin: 0 }}>All Ratings ({count})</p>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {RATING_BARS.map(({ stars, pct }) => (
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

              {/* Sort tabs */}
              <div style={{ display: 'flex', gap: 6, padding: '0 20px 14px', flexWrap: 'wrap' }}>
                {SORT_TABS.map(t => (
                  <button key={t} onClick={() => setSortTab(t)}
                    style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${sortTab === t ? 'var(--c-primary)' : 'var(--c-gray-200)'}`, background: sortTab === t ? 'var(--c-primary)' : 'var(--c-white)', color: sortTab === t ? 'white' : 'var(--c-gray-600)', fontSize: 13, fontWeight: sortTab === t ? 700 : 500, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s' }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Review cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {sorted.map((review, idx) => {
                  const page = dishPage[review.id] || 0;
                  const DISHES_PER_PAGE = 2;
                  const totalPages = Math.ceil(review.likedDishes.length / DISHES_PER_PAGE);
                  const visibleDishes = review.likedDishes.slice(page * DISHES_PER_PAGE, (page + 1) * DISHES_PER_PAGE);

                  return (
                    <div key={review.id} style={{ padding: '16px 20px', borderTop: idx === 0 ? '1.5px solid var(--c-gray-100)' : '1.5px solid var(--c-gray-100)' }}>
                      {/* Reviewer header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                          {review.name[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-gray-900)' }}>{review.name}</span>
                            {review.badge && (
                              <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--c-primary-light)', color: 'var(--c-primary)', padding: '1px 8px', borderRadius: 999 }}>{review.badge}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <div style={{ display: 'flex', gap: 1 }}>
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={11} fill={s <= review.rating ? '#f59e0b' : 'none'} color={s <= review.rating ? '#f59e0b' : 'var(--c-gray-300)'} />
                              ))}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--c-gray-400)' }}>{review.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Review text */}
                      {review.text && (
                        <p style={{ fontSize: 14, color: 'var(--c-gray-700)', margin: '0 0 10px', lineHeight: 1.5 }}>{review.text}</p>
                      )}

                      {/* Liked dishes */}
                      {review.likedDishes.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-gray-500)', margin: '0 0 8px' }}>Liked {review.likedDishes.length} dish{review.likedDishes.length > 1 ? 'es' : ''}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {totalPages > 1 && (
                              <button onClick={() => setDishPage(p => ({ ...p, [review.id]: Math.max(0, page - 1) }))}
                                disabled={page === 0}
                                style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--c-gray-200)', background: 'var(--c-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, flexShrink: 0 }}>
                                <ChevronLeft size={14} />
                              </button>
                            )}
                            <div style={{ display: 'flex', gap: 8, flex: 1, overflow: 'hidden' }}>
                              {visibleDishes.map((dish, di) => (
                                <div key={di} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--c-gray-200)', borderRadius: 10, padding: '8px 10px', background: 'var(--c-gray-50)', minWidth: 0 }}>
                                  <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--c-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Utensils size={18} color="var(--c-primary)" />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-gray-900)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish.name}</p>
                                    <p style={{ fontSize: 12, color: 'var(--c-gray-500)', margin: '2px 0 0' }}>৳{dish.price}</p>
                                  </div>
                                  <button style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--c-gray-300)', background: 'var(--c-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: 'var(--c-gray-700)', flexShrink: 0 }}>+</button>
                                </div>
                              ))}
                            </div>
                            {totalPages > 1 && (
                              <button onClick={() => setDishPage(p => ({ ...p, [review.id]: Math.min(totalPages - 1, page + 1) }))}
                                disabled={page >= totalPages - 1}
                                style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--c-gray-200)', background: 'var(--c-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1, flexShrink: 0 }}>
                                <Arrow size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Helpful */}
                      <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-gray-500)', fontSize: 13, padding: 0, fontFamily: 'var(--font)' }}>
                        <ThumbsUp size={14} />
                        Helpful{review.helpful > 0 ? ` ${review.helpful}` : ''}
                      </button>
                    </div>
                  );
                })}
              </div>
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
  // Task 10: navigation props for Header nav tabs
  onNearMeClick,
  onDeliveryClick,
  onPickupClick,
  currentAddress,
  onAddressChange,
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

  /* ── Favourites ── */
  const FK = 'fp_favourites';
  const getFavourites = () => { try { return JSON.parse(localStorage.getItem(FK) || '[]'); } catch { return []; } };
  const [isFavourite, setIsFavourite] = useState(() =>
    getFavourites().some(f => String(f.id) === String(restaurant?.id))
  );
  const toggleFavourite = () => {
    const favs = getFavourites();
    const rid  = String(displayRestaurant?.id ?? restaurant?.id);
    if (isFavourite) {
      localStorage.setItem(FK, JSON.stringify(favs.filter(f => String(f.id) !== rid)));
    } else {
      const r = displayRestaurant ?? restaurant;
      localStorage.setItem(FK, JSON.stringify([...favs, {
        id: r.id, name: r.name, image_url: r.image_url,
        description: r.description, rating: r.rating,
        address: r.address, min_order: r.min_order,
      }]));
    }
    setIsFavourite(p => !p);
  };

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
            `http://127.0.0.1:8000/api/v1/restaurants/${restaurant.id}/`
          );
        } else {
          const response = await fetch(`http://127.0.0.1:8000/api/v1/restaurants/${restaurant.id}/`);
          if (!response.ok) throw new Error('Failed to fetch restaurant details');
          data = await response.json();
        }
        setRestaurantDetails(data);
        if (data.items && data.items.length > 0) {
          setCategories(['All', ...new Set(data.items.map(item => item.category_name))]);
          setMenuItems(data.items);
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

  const commonHeaderProps = {
    isLoggedIn, user, cartItems,
    onLoginClick, onSignUpClick,
    onCartClick: () => setShowCart(!showCart),
    onLogout, onLogoClick, onProfileClick, onOrdersClick,
    showBanner: false,
    // Task 10: pass nav props so header tabs work from restaurant page
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
        <div className="loading-spinner"><img className="load-icon" src="/images/accessories/load.gif" alt="Loading..." /></div>
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
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    setSelectedItem({ ...item, restaurant: displayRestaurant.name, restaurantId: displayRestaurant.id, restaurantImage: displayRestaurant.image_url });
    setShowItemModal(true);
  };

  const handleQuickAdd = (item, e) => {
    e.stopPropagation();
    if (onAddToCart) onAddToCart({
      id: `${item.food_id}-${displayRestaurant.id}`,
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
      unavailableAction: 'Remove it from my order',
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
    if (onCheckout && restaurantId === displayRestaurant.id) onCheckout(restaurantId);
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
          <div className="restaurant-meta">
            <div className="meta-item">
              <img className="delivery-icon" src="/images/accessories/cyclist.png" alt="Delivery" />
              <span className="delivery-info">Delivery: {displayRestaurant.delivery_time || '20-30 min'}</span>
            </div>
          </div>
          <div className="restaurant-rating-info">
            <span><img className="star-icon" src="/images/accessories/star.png" alt="Rating" /> {displayRestaurant.rating} ({displayRestaurant.total_rated || 0})</span>
            <button className="see-reviews-btn" onClick={() => setShowReviews(true)}>See reviews</button>
            <button className="more-info-btn">More info</button>
          </div>

          {/* Add to favourites */}
          <button
            className="add-to-favourites-btn"
            onClick={toggleFavourite}
            title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart
              size={16}
              fill={isFavourite ? 'currentColor' : 'none'}
              strokeWidth={2}
            />
            {isFavourite ? 'Saved to favourites' : 'Add to favourites'}
          </button>
        </div>
      </div>

      {/* Available Deals */}
      {displayRestaurant.discounts && displayRestaurant.discounts.length > 0 && (
        <div className="deals-section-detail">
          <h2 className="section-title-detail">Available deals</h2>
          <div className="deals-grid-detail">
            {displayRestaurant.discounts.map((discount, index) => (
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
      )}

      {/* Menu + Order Summary */}
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
                          <button className="add-item-btn" onClick={(e) => handleQuickAdd(item, e)}
                            disabled={!item.is_available}>+</button>
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

      {/* Footer */}
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

      {/* Reviews Modal */}
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
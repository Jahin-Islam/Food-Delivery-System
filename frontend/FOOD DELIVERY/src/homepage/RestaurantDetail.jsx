import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Utensils, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import './RestaurantDetail.css';
import { COLORS } from '../constants.js';
import Header from './Header.jsx';
import authService from '../Authservice.js';
import OrderSummary from './OrderSummary.jsx';
import ItemDetailModal from './ItemDetailModal.jsx';
import AllCarts from './AllCarts.jsx';
import StaticMap from './StaticMap.jsx';

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

  const categoriesScrollRef    = useRef(null);
  const menuItemsContainerRef  = useRef(null);

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

      {/* ── Restaurant Banner — NO back button here ── */}
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
            <button className="see-reviews-btn">See reviews</button>
            <button className="more-info-btn">More info</button>
          </div>
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
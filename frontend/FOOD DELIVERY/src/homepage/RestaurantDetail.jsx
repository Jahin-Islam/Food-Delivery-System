import { useState, useEffect, useRef } from 'react';
import './RestaurantDetail.css';
import Header from './Header.jsx';
import authService from '../Authservice.js';
import OrderSummary from './OrderSummary.jsx';
import ItemDetailModal from './ItemDetailModal.jsx';
import AllCarts from './AllCarts.jsx';

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
  onLogout 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  
  // Item Detail Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Refs for scrolling
  const categoriesScrollRef = useRef(null);
  const menuItemsContainerRef = useRef(null);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurant || !restaurant.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let data;
        
        if (isLoggedIn) {
          data = await authService.authenticatedFetch(
            `http://127.0.0.1:8000/api/v1/restaurants/${restaurant.id}/`
          );
        } else {
          const response = await fetch(
            `http://127.0.0.1:8000/api/v1/restaurants/${restaurant.id}/`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch restaurant details');
          }
          data = await response.json();
        }
        
        setRestaurantDetails(data);
        
        if (data.items && data.items.length > 0) {
          const uniqueCategories = ['All', ...new Set(data.items.map(item => item.category_name))];
          setCategories(uniqueCategories);
          setMenuItems(data.items);
        } else {
          setCategories(['All']);
          setMenuItems([]);
        }
        
        setError(null);
      } catch (err) {
        console.error("Error fetching restaurant details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantDetails();
  }, [restaurant, isLoggedIn]);

  if (!restaurant) {
    return (
      <div className="restaurant-detail-container">
        <Header
          isLoggedIn={isLoggedIn}
          user={user}
          cartItems={cartItems}
          onLoginClick={onLoginClick}
          onSignUpClick={onSignUpClick}
          onCartClick={() => setShowCart(!showCart)}
          onLogout={onLogout}
          showBanner={false}
        />
        <div className="restaurant-detail-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Restaurant not found</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="restaurant-detail-container">
        <Header
          isLoggedIn={isLoggedIn}
          user={user}
          cartItems={cartItems}
          onLoginClick={onLoginClick}
          onSignUpClick={onSignUpClick}
          onCartClick={() => setShowCart(!showCart)}
          onLogout={onLogout}
          showBanner={false}
        />
        <div className="restaurant-detail-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner"><img className="load-icon" src="/images/accessories/load.gif" alt="Loading..." /></div>
          <p>Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="restaurant-detail-container">
        <Header
          isLoggedIn={isLoggedIn}
          user={user}
          cartItems={cartItems}
          onLoginClick={onLoginClick}
          onSignUpClick={onSignUpClick}
          onCartClick={() => setShowCart(!showCart)}
          onLogout={onLogout}
          showBanner={false}
        />
        <div className="restaurant-detail-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="error-icon">⚠️</div>
          <p>Failed to load restaurant details: {error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayRestaurant = restaurantDetails || restaurant;

  // Filter menu items based on search and category
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group items by category for display
  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category_name || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // Get cart items for THIS restaurant only
  const restaurantCartItems = cartItems.filter(
    item => item.restaurantId === displayRestaurant.id
  );

  // Handle item click - Open modal for customization
  const handleItemClick = (item) => {
    const itemData = {
      ...item,
      restaurant: displayRestaurant.name,
      restaurantId: displayRestaurant.id,
      restaurantImage: displayRestaurant.image_url
    };
    setSelectedItem(itemData);
    setShowItemModal(true);
  };

  // Handle Quick Add - Directly add to cart with default options
  const handleQuickAdd = (item, e) => {
    e.stopPropagation(); // Prevent opening modal
    
    const cartItem = {
      id: `${item.food_id}-${Date.now()}`,
      foodId: item.food_id,
      name: item.name,
      price: item.price,
      originalPrice: item.original_price,
      restaurant: displayRestaurant.name,
      restaurantId: displayRestaurant.id,
      restaurantImage: displayRestaurant.image_url,
      image: item.image_url,
      emoji: item.emoji || '🍽️',
      quantity: 1,
      variation: null,
      extras: [],
      specialInstructions: '',
      unavailableAction: 'Remove it from my order'
    };
    
    if (onAddToCart) {
      onAddToCart(cartItem);
    }
  };

  // Handle Add to Cart from Modal
  const handleAddToCartFromModal = (cartItem) => {
    if (onAddToCart) {
      onAddToCart(cartItem);
    }
  };

  // Get frequently bought items for modal
  const getFrequentlyBoughtItems = (currentItem) => {
    return menuItems
      .filter(item => item.food_id !== currentItem.food_id)
      .slice(0, 5)
      .map(item => ({
        id: item.food_id,
        name: item.name,
        price: item.price,
        image: item.image_url
      }));
  };

  // Scroll to category
  const scrollToCategory = (category) => {
    if (category === 'All') {
      if (menuItemsContainerRef.current) {
        menuItemsContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const categoryElement = document.querySelector(`[data-category="${category}"]`);
    if (categoryElement && menuItemsContainerRef.current) {
      const container = menuItemsContainerRef.current;
      const elementTop = categoryElement.offsetTop - container.offsetTop;
      container.scrollTo({ top: elementTop - 20, behavior: 'smooth' });
    }
  };

  // Handle checkout - navigate to checkout with THIS restaurant's items
  const handleCheckout = () => {
    if (onCheckout && restaurantCartItems.length > 0) {
      onCheckout(displayRestaurant.id);
    }
  };

  // Handle navigation to restaurant from AllCarts
  const handleNavigateToRestaurant = (restaurantId) => {
    // Close the cart sidebar
    setShowCart(false);
    // If different restaurant, user should navigate from homepage
    // This is already on the restaurant page, so just close
  };

  // Handle checkout from AllCarts sidebar
  const handleCheckoutFromCart = (restaurantId) => {
    setShowCart(false);
    if (onCheckout && restaurantId === displayRestaurant.id) {
      onCheckout(restaurantId);
    }
  };

  return (
    <div className="restaurant-detail-container">
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        cartItems={cartItems}
        onLoginClick={onLoginClick}
        onSignUpClick={onSignUpClick}
        onCartClick={() => setShowCart(!showCart)}
        onLogout={onLogout}
        showBanner={false}
      />

      <div className="restaurant-detail-header">
        <button className="back-button" onClick={onBack}>
          ← Back to restaurants
        </button>
      </div>

      {/* Restaurant Banner */}
      <div className="restaurant-banner">
        <div className="banner-image">
          {displayRestaurant.image_url ? (
            <>
              <img 
                src={displayRestaurant.image_url} 
                alt={displayRestaurant.name}
                className="restaurant-banner-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="banner-emoji" style={{ display: displayRestaurant.image_url ? 'none' : 'flex' }}>
                🍽️
              </div>
            </>
          ) : (
            <div className="banner-emoji">🍽️</div>
          )}
        </div>
        
        <div className="restaurant-info-banner">
          <h1 className="restaurant-name">{displayRestaurant.name}</h1>
          <p className="restaurant-subtitle">{displayRestaurant.description || 'Restaurant'}</p>
          
          <div className="restaurant-meta">
            <div className="meta-item">
              <img className="delivery-icon" src="/images/accessories/cyclist.png" alt="Delivery" />
              <span className="delivery-info">
                Delivery: {displayRestaurant.delivery_time || '20-30 min'}
              </span>
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
              <div
                key={index}
                className="deal-card-detail"
                style={{
                  background: index === 0 
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                    : 'linear-gradient(135deg, #db2777 0%, #be185d 100%)'
                }}
              >
                <div className="deal-icon">
                  <img className="discount-icon" src="/images/accessories/discount.png" alt="Discount" />
                </div>
                <div className="deal-content">
                  <h3 className="deal-title-detail">{discount.description}</h3>
                  <p className="deal-description">
                    Min. order ৳{discount.min_order} • {discount.percentage}% off
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Section with Order Summary - FIXED LAYOUT */}
      <div className="menu-with-summary-container">
        {/* Left Side: Menu */}
        <div className="menu-section">
          <h2 className="section-title-detail">Menu</h2>

          {/* Menu Controls - Search */}
          <div className="menu-controls">
            <div className="search-in-menu">
              <span className="search-icon"></span>
              <input
                type="text"
                placeholder="Search in menu"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="menu-search-input"
              />
            </div>
          </div>

          {/* Menu Categories with Scroll Arrows */}
          <div className="menu-categories-container">
            <button 
              className="category-scroll-btn prev"
              onClick={() => {
                if (categoriesScrollRef.current) {
                  categoriesScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                }
              }}
            >
              ‹
            </button>
            
            <div className="menu-categories-scroll" ref={categoriesScrollRef}>
              {categories.map((category) => (
                <button
                  key={category}
                  className={`menu-category-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(category);
                    scrollToCategory(category);
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            <button 
              className="category-scroll-btn next"
              onClick={() => {
                if (categoriesScrollRef.current) {
                  categoriesScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                }
              }}
            >
              ›
            </button>
          </div>

          {/* Menu Items with Scroll Container */}
          <div className="menu-items-scroll-container" ref={menuItemsContainerRef}>
            {Object.keys(groupedItems).length > 0 ? (
              Object.entries(groupedItems).map(([category, items]) => (
                <div 
                  key={category} 
                  className="menu-category-section"
                  data-category={category}
                >
                  <h3 className="menu-category-title">{category}</h3>
                  <p className="menu-category-subtitle">{items.length} items</p>
                  
                  <div className="menu-items-grid">
                    {items.map((item) => (
                      <div 
                        key={item.food_id} 
                        className="menu-item-card"
                        onClick={() => handleItemClick(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="menu-item-info">
                          <h4 className="menu-item-name">{item.name}</h4>
                          <p className="menu-item-description">{item.description}</p>
                          
                          <div className="menu-item-footer">
                            <span className="menu-item-price">৳{item.price}</span>
                            {item.discount_ammount && (
                              <span className="menu-item-discount">
                                -{item.discount_ammount}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="menu-item-image-container">
                          <div className="menu-item-image">
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '10px'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="menu-item-emoji" 
                              style={{ display: item.image_url ? 'none' : 'flex' }}
                            >
                              🍽️
                            </div>
                          </div>
                          
                          <button
                            className="add-item-btn"
                            onClick={(e) => handleQuickAdd(item, e)}
                            disabled={!item.is_available}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-menu-results">
                <div className="no-results-icon">🔍</div>
                <p>No items found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Order Summary */}
        <OrderSummary 
          cartItems={restaurantCartItems}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          onCheckout={handleCheckout}
          restaurantName={displayRestaurant.name}
        />
      </div>

      {/* Similar Restaurants */}
      <div className="similar-restaurants-section">
        <h2 className="section-title-detail">Similar restaurants</h2>
        <div className="similar-restaurants-grid">
          {/* Similar restaurant cards here */}
        </div>
      </div>

      {/* Footer Info */}
      <div className="restaurant-footer-info">
        <div className="footer-info-section">
          <h3>About</h3>
          <p>{displayRestaurant.description || 'Quality food delivered to your door.'}</p>
        </div>
        
        <div className="footer-info-section">
          <h3>Opening Hours</h3>
          <p>
            {displayRestaurant.opening_time} - {displayRestaurant.closing_time}
          </p>
        </div>
        
        <div className="footer-info-section">
          <h3>Contact</h3>
          <p>Phone: {displayRestaurant.phone || 'N/A'}</p>
          <p>Address: {displayRestaurant.address || 'Dhaka, Bangladesh'}</p>
        </div>
        
        <div className="footer-info-section">
          <h3>Delivery Info</h3>
          <p>Minimum order: ৳{displayRestaurant.min_order}</p>
          <p>Delivery fee may vary</p>
        </div>
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        item={selectedItem}
        onAddToCart={handleAddToCartFromModal}
        frequentlyBoughtItems={selectedItem ? getFrequentlyBoughtItems(selectedItem) : []}
      />

      {/* All Carts Sidebar */}
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
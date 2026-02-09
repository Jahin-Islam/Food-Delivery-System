import { useState, useEffect } from 'react';
import './RestaurantDetail.css';
import authService from '../Authservice.js';
import RestaurantCart from './RestaurantCart.jsx';

const RestaurantDetail = ({ restaurant, onBack, onAddToCart, isLoggedIn }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [localCartItems, setLocalCartItems] = useState([]);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurant || !restaurant.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let data;
        
        // Fetch detailed restaurant data with menu items
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
        
        // Extract unique categories from menu items
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
        <div className="restaurant-detail-header">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner">🔄</div>
          <p>Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="restaurant-detail-container">
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

  // Use restaurantDetails if available, otherwise fall back to restaurant prop
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

  const handleAddToCart = (item) => {
    const newItem = {
      id: `${item.food_id}-${Date.now()}`,
      name: item.name,
      price: item.price,
      restaurant: displayRestaurant.name,
      restaurantId: displayRestaurant.id,
      image: item.image_url || '🍽️',
      emoji: '🍽️',
      quantity: 1
    };
    
    // Add to local cart for this restaurant
    setLocalCartItems([...localCartItems, newItem]);
    
    // Also call parent's onAddToCart if provided
    if (onAddToCart) {
      onAddToCart(newItem);
    }
    
    // Show cart sidebar
    setShowCart(true);
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setLocalCartItems(localCartItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleRemoveItem = (itemId) => {
    setLocalCartItems(localCartItems.filter(item => item.id !== itemId));
  };

  const handleCheckout = () => {
    // Navigate to checkout page
    // You'll need to implement this navigation in App.jsx
    console.log('Navigate to checkout with items:', localCartItems);
    alert('Checkout functionality - to be implemented');
  };

  return (
    <div className="restaurant-detail-container">
      {/* Header */}
      <div className="restaurant-detail-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
      </div>

      {/* Restaurant Banner */}
      <div className="restaurant-banner">
        <div className="banner-image">
          {displayRestaurant.image_url ? (
            <img 
              src={displayRestaurant.image_url} 
              alt={displayRestaurant.name}
              className="restaurant-banner-img"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="banner-emoji" style={{ display: displayRestaurant.image_url ? 'none' : 'flex' }}>
            🍽️
          </div>
        </div>
        
        <div className="restaurant-info-banner">
          <h1 className="restaurant-name">{displayRestaurant.name}</h1>
          <p className="restaurant-subtitle">{displayRestaurant.description || 'Restaurant'}</p>
          
          <div className="restaurant-meta">
            <div className="meta-item">
              <span className="delivery-icon">🚴</span>
              <span className="delivery-info">Delivery: 30-45 min</span>
            </div>
          </div>

          <div className="restaurant-rating-info">
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              ⭐ {displayRestaurant.rating} ({displayRestaurant.total_rated})
            </span>
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
                key={discount.id} 
                className="deal-card-detail"
                style={{
                  background: index === 0 
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                    : 'linear-gradient(135deg, #db2777 0%, #be185d 100%)'
                }}
              >
                <div className="deal-icon">🎉</div>
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

      {/* Menu Section */}
      <div className="menu-section">
        <h2 className="section-title-detail">Menu</h2>

        {/* Menu Controls - Search and Delivery/Pickup */}
        <div className="menu-controls">
          <div className="search-in-menu">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search in menu"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="menu-search-input"
            />
          </div>

          <div className="delivery-pickup-toggle">
            <button
              className={`toggle-btn ${deliveryMode === 'delivery' ? 'active' : ''}`}
              onClick={() => setDeliveryMode('delivery')}
            >
              Delivery
            </button>
            <button
              className={`toggle-btn ${deliveryMode === 'pickup' ? 'active' : ''}`}
              onClick={() => setDeliveryMode('pickup')}
            >
              Pick-up
            </button>
          </div>
        </div>

        {/* Menu Categories */}
        <div className="menu-categories-scroll">
          {categories.map((category) => (
            <button
              key={category}
              className={`menu-category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="menu-items-container">
          {Object.keys(groupedItems).length > 0 ? (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="menu-category-section">
                <h3 className="menu-category-title">{category}</h3>
                <p className="menu-category-subtitle">{items.length} items</p>
                
                <div className="menu-items-grid">
                  {items.map((item) => (
                    <div key={item.food_id} className="menu-item-card">
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
                          onClick={() => handleAddToCart(item)}
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

      {/* Similar Restaurants */}
      <div className="similar-restaurants-section">
        <h2 className="section-title-detail">Similar restaurants</h2>
        <div className="similar-restaurants-grid">
          {/* Placeholder for similar restaurants */}
          <div className="similar-restaurant-card">
            <div className="similar-rest-image">
              <div className="similar-rest-emoji">🍕</div>
              <div className="similar-rest-deal">20% OFF</div>
            </div>
            <div className="similar-rest-info">
              <h4>Pizza Palace</h4>
              <div className="similar-rest-rating">⭐ 4.5 (200+)</div>
            </div>
          </div>
          
          <div className="similar-restaurant-card">
            <div className="similar-rest-image">
              <div className="similar-rest-emoji">🍔</div>
              <div className="similar-rest-deal">15% OFF</div>
            </div>
            <div className="similar-rest-info">
              <h4>Burger House</h4>
              <div className="similar-rest-rating">⭐ 4.3 (150+)</div>
            </div>
          </div>

          <div className="similar-restaurant-card">
            <div className="similar-rest-image">
              <div className="similar-rest-emoji">🍜</div>
              <div className="similar-rest-deal">25% OFF</div>
            </div>
            <div className="similar-rest-info">
              <h4>Noodle Bar</h4>
              <div className="similar-rest-rating">⭐ 4.7 (300+)</div>
            </div>
          </div>

          <div className="similar-restaurant-card">
            <div className="similar-rest-image">
              <div className="similar-rest-emoji">🍰</div>
              <div className="similar-rest-deal">10% OFF</div>
            </div>
            <div className="similar-rest-info">
              <h4>Cake Corner</h4>
              <div className="similar-rest-rating">⭐ 4.6 (180+)</div>
            </div>
          </div>
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

      {/* Restaurant-Specific Cart Sidebar */}
      <RestaurantCart 
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={localCartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        restaurantName={displayRestaurant.name}
      />
    </div>
  );
};

export default RestaurantDetail;
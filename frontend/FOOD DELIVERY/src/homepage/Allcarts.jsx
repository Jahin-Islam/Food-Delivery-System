import React from 'react';
import './AllCarts.css';

const AllCarts = ({ isOpen, onClose, cartItems = [], onCheckout, onNavigateToRestaurant }) => {
  // Group cart items by restaurant
  const groupedCarts = cartItems.reduce((acc, item) => {
    const restaurantName = item.restaurant || 'Unknown Restaurant';
    if (!acc[restaurantName]) {
      acc[restaurantName] = {
        restaurantName,
        restaurantId: item.restaurantId,
        items: [],
        subtotal: 0,
        savings: 0 // Calculate from discounts
      };
    }
    acc[restaurantName].items.push(item);
    acc[restaurantName].subtotal += item.price * item.quantity;
    
    // Calculate savings if original price exists
    if (item.originalPrice) {
      acc[restaurantName].savings += (item.originalPrice - item.price) * item.quantity;
    }
    
    return acc;
  }, {});

  const restaurantCarts = Object.values(groupedCarts);

  const handleRestaurantClick = (restaurantId) => {
    if (onNavigateToRestaurant) {
      onNavigateToRestaurant(restaurantId);
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`all-carts-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* All Carts Sidebar */}
      <aside className={`all-carts-sidebar ${isOpen ? 'visible' : 'hidden'}`}>
        <div className="all-carts-header">
          <h3 className="all-carts-title">All carts</h3>
          <button 
            className="close-all-carts-btn"
            onClick={onClose}
            aria-label="Close all carts"
          >
            ✕
          </button>
        </div>

        <div className="all-carts-content">
          {restaurantCarts.length === 0 ? (
            <div className="all-carts-empty">
              <div className="empty-icon">🛒</div>
              <p className="empty-text">No items in cart</p>
            </div>
          ) : (
            <div className="restaurant-carts-list">
              {restaurantCarts.map((cart, index) => (
                <div key={index} className="restaurant-cart-card">
                  {/* Restaurant Header - Clickable */}
                  <div 
                    className="restaurant-cart-header"
                    onClick={() => handleRestaurantClick(cart.restaurantId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="restaurant-info">
                      <div className="restaurant-icon">
                        <img 
                          src={cart.items[0]?.restaurantImage || ''} 
                          alt={cart.restaurantName}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '🍽️';
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="restaurant-name">{cart.restaurantName}</h4>
                        <p className="delivery-time">Pick-up in 6 mins</p>
                      </div>
                    </div>
                    <button 
                      className="add-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestaurantClick(cart.restaurantId);
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Items Preview */}
                  <div className="cart-items-preview">
                    {cart.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="item-preview">
                        {item.image && item.image.startsWith('http') ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <div className="item-emoji">{item.emoji || '🍔'}</div>
                        )}
                      </div>
                    ))}
                    {cart.items.length > 3 && (
                      <div className="more-items-indicator">+{cart.items.length - 3}</div>
                    )}
                  </div>

                  {/* Savings Banner */}
                  {cart.savings > 0 && (
                    <div className="cart-savings-banner">
                      💰 Saving ৳{Math.round(cart.savings)}
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="cart-subtotal-row">
                    <span className="subtotal-label">Subtotal</span>
                    <span className="subtotal-amount">৳{Math.round(cart.subtotal)}</span>
                  </div>

                  {/* Checkout Button */}
                  <button 
                    className="cart-checkout-btn"
                    onClick={() => {
                      if (onCheckout) {
                        onCheckout(cart.restaurantId);
                      }
                    }}
                  >
                    Go to checkout
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AllCarts;
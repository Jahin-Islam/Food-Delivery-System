import React from 'react';
import './AllCarts.css';
import { COLORS, SHADOWS } from '../constants.js';
import { ShoppingCart, Utensils, Coins, X } from 'lucide-react';

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
        savings: 0
      };
    }
    acc[restaurantName].items.push(item);
    acc[restaurantName].subtotal += item.price * item.quantity;
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
      <div 
        className={`all-carts-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`all-carts-sidebar ${isOpen ? 'visible' : 'hidden'}`}>
        <div className="all-carts-header">
          <h3 className="all-carts-title">All carts</h3>
          <button 
            className="close-all-carts-btn"
            onClick={onClose}
            aria-label="Close all carts"
          >
            <X size={16} />
          </button>
        </div>

        <div className="all-carts-content">
          {restaurantCarts.length === 0 ? (
            <div className="all-carts-empty">
              <div className="empty-icon"><ShoppingCart size={80} strokeWidth={1} opacity={0.5} /></div>
              <p className="empty-text">No items in cart</p>
            </div>
          ) : (
            <div className="restaurant-carts-list">
              {restaurantCarts.map((cart, index) => (
                <div key={index} className="restaurant-cart-card">
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
                            e.target.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>';
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

                  <div className="cart-items-preview">
                    {cart.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="item-preview">
                        {item.image && item.image.startsWith('http') ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <div className="item-emoji" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <Utensils size={28} color={COLORS.primary} />
                          </div>
                        )}
                      </div>
                    ))}
                    {cart.items.length > 3 && (
                      <div className="more-items-indicator">+{cart.items.length - 3}</div>
                    )}
                  </div>

                  {cart.savings > 0 && (
                    <div className="cart-savings-banner" style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <Coins size={14} /> Saving ৳{Math.round(cart.savings)}
                    </div>
                  )}

                  <div className="cart-subtotal-row">
                    <span className="subtotal-label">Subtotal</span>
                    <span className="subtotal-amount">৳{Math.round(cart.subtotal)}</span>
                  </div>

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
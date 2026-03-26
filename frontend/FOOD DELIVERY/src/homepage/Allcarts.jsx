import React from 'react';
import './Allcarts.css';
import { COLORS } from '../constants.js';
import { ShoppingCart, Utensils, Coins, X } from 'lucide-react';

const AllCarts = ({ isOpen, onClose, cartItems = [], onCheckout, onNavigateToRestaurant }) => {
  const groupedCarts = cartItems.reduce((acc, item) => {
    const restaurantName = item.restaurant || 'Unknown Restaurant';
    if (!acc[restaurantName]) {
      acc[restaurantName] = {
        restaurantName,
        restaurantId: item.restaurantId,
        restaurantImage: item.restaurantImage || '',
        items: [],
        subtotal: 0,
        savings: 0,
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
          <button className="close-all-carts-btn" onClick={onClose} aria-label="Close cart">
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
                        {cart.restaurantImage ? (
                          <img
                            src={cart.restaurantImage}
                            alt={cart.restaurantName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <Utensils size={22} color={COLORS.primary} />
                        )}
                      </div>
                      <div>
                        <h4 className="restaurant-name">{cart.restaurantName}</h4>
                        <p className="delivery-time">Pick-up in 6 mins</p>
                      </div>
                    </div>
                    <button
                      className="add-more-btn"
                      onClick={(e) => { e.stopPropagation(); handleRestaurantClick(cart.restaurantId); }}
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
                          <div className="item-emoji" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    <div className="cart-savings-banner" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Coins size={14} /> Saving ৳{Math.round(cart.savings)}
                    </div>
                  )}

                  <div className="cart-subtotal-row">
                    <span className="subtotal-label">Subtotal</span>
                    <span className="subtotal-amount">৳{Math.round(cart.subtotal)}</span>
                  </div>

                  <button
                    className="cart-checkout-btn"
                    onClick={() => { if (onCheckout) onCheckout(cart.restaurantId); }}
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
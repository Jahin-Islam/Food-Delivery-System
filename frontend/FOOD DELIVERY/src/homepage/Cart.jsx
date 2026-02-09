import React from 'react';
import './Cart.css';

const Cart = ({ 
  isOpen, 
  onClose, 
  cartItems = [], 
  onUpdateQuantity, 
  onRemoveItem,
  restaurantFilter = null // If provided, only show items from this restaurant
}) => {
  // Filter items by restaurant if restaurantFilter is provided
  const displayItems = restaurantFilter 
    ? cartItems.filter(item => item.restaurant === restaurantFilter)
    : cartItems;

  const subtotal = displayItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceFee = 3;
  const deliveryFee = 0; // Free delivery in your case
  const total = subtotal + serviceFee + deliveryFee;

  // Calculate savings (if any discounts are applied)
  const savings = 30; // This would come from actual discount calculation

  return (
    <>
      {/* Overlay */}
      <div 
        className={`cart-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Cart Sidebar */}
      <aside className={`cart-sidebar ${isOpen ? 'cart-visible' : 'cart-hidden'}`}>
        <div className="cart-header">
          <h3 className="cart-title">Your items</h3>
          <button 
            className="close-cart-btn"
            onClick={onClose}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="cart-content">
          {displayItems.length === 0 ? (
            <div className="cart-empty">
              <div className="empty-cart-icon">🛒</div>
              <p className="empty-cart-text">Your cart is empty</p>
              <p className="empty-cart-subtext">Add items to get started</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="cart-items-list">
                {displayItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-image">
                      <div className="cart-item-emoji">{item.emoji || '🍔'}</div>
                    </div>
                    <div className="cart-item-details">
                      <h4 className="cart-item-name">{item.name}</h4>
                      {!restaurantFilter && (
                        <p className="cart-item-restaurant">{item.restaurant}</p>
                      )}
                      <div className="cart-item-price-row">
                        <span className="cart-item-price">৳{item.price}</span>
                      </div>
                    </div>
                    <div className="cart-item-actions">
                      <button 
                        className="remove-item-btn" 
                        onClick={() => onRemoveItem && onRemoveItem(item.id)}
                        aria-label="Remove item"
                      >
                        🗑️
                      </button>
                      <div className="cart-item-quantity">
                        <button 
                          className="quantity-btn"
                          onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button 
                          className="quantity-btn"
                          onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cutlery Option */}
              <div className="cutlery-option">
                <div className="cutlery-info">
                  <span className="cutlery-icon">🍴</span>
                  <div>
                    <div className="cutlery-title">Cutlery</div>
                    <div className="cutlery-subtitle">No cutlery provided. Thanks for reducing waste!</div>
                  </div>
                </div>
                <label className="cutlery-toggle">
                  <input type="checkbox" />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Free Delivery Banner */}
              <div className="free-delivery-banner">
                <span className="check-icon">✓</span>
                <span>You've got free delivery for your first order</span>
              </div>

              {/* Cart Summary */}
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>৳{subtotal.toFixed(0)}</span>
                </div>
                {deliveryFee === 0 ? (
                  <div className="summary-row">
                    <span>Standard delivery</span>
                    <span className="free-text">Free</span>
                  </div>
                ) : (
                  <div className="summary-row">
                    <span>Delivery Fee</span>
                    <span>৳{deliveryFee.toFixed(0)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Service fee</span>
                  <span>৳{serviceFee}</span>
                </div>
                {savings > 0 && (
                  <div className="summary-row savings-row">
                    <span>💰 Saving</span>
                    <span className="savings-amount">৳{savings}</span>
                  </div>
                )}
                <div className="summary-row summary-total">
                  <div>
                    <div className="total-label">Total</div>
                    <div className="total-sublabel">(incl. fees and tax)</div>
                  </div>
                  <div className="total-amount">
                    <div className="total-price">৳{total}</div>
                    {savings > 0 && (
                      <div className="original-price">৳{total + savings}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button className="checkout-btn">
                Review payment and address
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default Cart;
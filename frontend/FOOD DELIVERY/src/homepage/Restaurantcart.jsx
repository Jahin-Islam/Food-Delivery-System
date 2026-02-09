import React, { useState } from 'react';
import './RestaurantCart.css';

const RestaurantCart = ({ 
  isOpen, 
  onClose, 
  cartItems = [], 
  onUpdateQuantity, 
  onRemoveItem,
  onCheckout,
  restaurantName
}) => {
  const [deliveryMode, setDeliveryMode] = useState('delivery');

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceFee = 3;
  const deliveryFee = 0; // Free delivery
  const savings = 30; // Calculate from discounts
  const total = subtotal + serviceFee + deliveryFee;

  // Get popular items suggestions (mock data - you can fetch from API)
  const popularSuggestions = [
    { id: 1, name: 'Americano', price: 145, originalPrice: 170, image: '☕' },
    { id: 2, name: 'Latte', price: 179, originalPrice: 210, image: '☕' },
    { id: 3, name: 'Hot Chocolate', price: 187, originalPrice: 200, image: '☕' }
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className={`restaurant-cart-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Cart Sidebar */}
      <aside className={`restaurant-cart-sidebar ${isOpen ? 'cart-visible' : 'cart-hidden'}`}>
        {/* Delivery/Pickup Toggle */}
        <div className="delivery-mode-header">
          <button
            className={`mode-btn ${deliveryMode === 'delivery' ? 'active' : ''}`}
            onClick={() => setDeliveryMode('delivery')}
          >
            <div className="mode-title">Delivery</div>
            <div className="mode-subtitle">Standard (10 - 25 mins)</div>
          </button>
          <button
            className={`mode-btn ${deliveryMode === 'pickup' ? 'active' : ''}`}
            onClick={() => setDeliveryMode('pickup')}
          >
            <div className="mode-title">Pick-up</div>
            <div className="mode-subtitle">Standard (10 mins)</div>
          </button>
        </div>

        <div className="restaurant-cart-content">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <div className="empty-cart-icon">🛒</div>
              <p className="empty-cart-text">Your cart is empty</p>
              <p className="empty-cart-subtext">Add items to get started</p>
            </div>
          ) : (
            <>
              {/* Your Items Section */}
              <div className="your-items-section">
                <h3 className="section-title">Your items</h3>
                
                <div className="cart-items-list">
                  {cartItems.map((item) => (
                    <div key={item.id} className="cart-item-row">
                      <div className="item-main">
                        <div className="item-image">
                          {item.image && item.image.startsWith('http') ? (
                            <img src={item.image} alt={item.name} />
                          ) : (
                            <div className="item-emoji">{item.emoji || '🍽️'}</div>
                          )}
                        </div>
                        <div className="item-info">
                          <h4 className="item-name">{item.name}</h4>
                          <div className="item-price-row">
                            <span className="item-price">৳{item.price}</span>
                            {item.originalPrice && (
                              <span className="item-original-price">৳{item.originalPrice}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="item-actions">
                        <button 
                          className="delete-btn"
                          onClick={() => onRemoveItem && onRemoveItem(item.id)}
                        >
                          🗑️
                        </button>
                        <div className="quantity-controls">
                          <button 
                            className="qty-btn"
                            onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            −
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button 
                            className="qty-btn"
                            onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular with your order */}
              <div className="popular-section">
                <h3 className="section-title">Popular with your order</h3>
                <p className="section-subtitle">Based on what other customers bought together</p>
                
                <div className="popular-items-scroll">
                  {popularSuggestions.map((item) => (
                    <div key={item.id} className="popular-item-card">
                      <div className="popular-item-image">
                        <span className="popular-emoji">{item.image}</span>
                        <button className="add-popular-btn">+</button>
                      </div>
                      <div className="popular-item-info">
                        <div className="popular-price">
                          ৳{item.price} 
                          <span className="popular-original">৳{item.originalPrice}</span>
                        </div>
                        <div className="popular-name">{item.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>৳{subtotal}</span>
                </div>
                <div className="summary-row">
                  <span>Service fee</span>
                  <span>৳{serviceFee}</span>
                </div>
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

              {/* Total */}
              <div className="cart-total-section">
                <div className="total-row">
                  <div>
                    <div className="total-label">Total</div>
                    <div className="total-sublabel">(incl. fees and tax)</div>
                  </div>
                  <div className="total-amounts">
                    <div className="total-price">৳{total}</div>
                    {savings > 0 && (
                      <div className="total-original">৳{total + savings}</div>
                    )}
                  </div>
                </div>
                <button className="see-summary-btn">See summary</button>
              </div>

              {/* Checkout Button */}
              <button className="checkout-btn" onClick={onCheckout}>
                Review payment and address
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default RestaurantCart;
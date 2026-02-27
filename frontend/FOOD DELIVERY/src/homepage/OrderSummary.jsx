import React, { useState } from 'react';
import './OrderSummary.css';
import { COLORS, SHADOWS } from '../constants.js';
import { UtensilsCrossed, Trash2, Utensils, Coffee } from 'lucide-react';

const OrderSummary = ({ 
  cartItems = [], 
  onUpdateQuantity, 
  onRemoveItem,
  onCheckout,
  restaurantName
}) => {
  const [deliveryMode, setDeliveryMode] = useState('delivery');

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceFee = 3;
  const total = subtotal + serviceFee;

  const popularItems = [
    { id: 1, name: 'Americano', price: 145, originalPrice: 170, image: 'coffee' },
    { id: 2, name: 'Latte', price: 179, originalPrice: 210, image: 'coffee' },
    { id: 3, name: 'Hot Chocolate', price: 187, originalPrice: 200, image: 'coffee' }
  ];

  return (
    <div className="order-summary-container">
      <div className="delivery-mode-tabs">
        <button
          className={`mode-tab ${deliveryMode === 'delivery' ? 'active' : ''}`}
          onClick={() => setDeliveryMode('delivery')}
        >
          <div className="mode-tab-title">Delivery</div>
          <div className="mode-tab-subtitle">Standard (10 - 25 mins)</div>
        </button>
        <button
          className={`mode-tab ${deliveryMode === 'pickup' ? 'active' : ''}`}
          onClick={() => setDeliveryMode('pickup')}
        >
          <div className="mode-tab-title">Pick-up</div>
          <div className="mode-tab-subtitle">Standard (10 mins)</div>
        </button>
      </div>

      <div className="order-summary-content">
        <h3 className="summary-section-title">Your items</h3>
        
        {cartItems.length === 0 ? (
          <div className="empty-order">
            <p>No items added yet</p>
          </div>
        ) : (
          <div className="order-items-list">
            {cartItems.map((item) => (
              <div key={item.id} className="order-item">
                <div className="order-item-main">
                  <div className="order-item-image">
                    {item.image && item.image.startsWith('http') ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <span className="item-emoji" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <UtensilsCrossed size={32} color={COLORS.primary} />
                      </span>
                    )}
                  </div>
                  <div className="order-item-details">
                    <h4 className="order-item-name">{item.name}</h4>
                    <div className="order-item-price-row">
                      <span className="current-price">৳{item.price}</span>
                      {item.originalPrice && (
                        <span className="original-price">৳{item.originalPrice}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="order-item-controls">
                  <button 
                    className="remove-btn"
                    onClick={() => onRemoveItem && onRemoveItem(item.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="quantity-selector">
                    <button 
                      className="qty-btn"
                      onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="qty-display">{item.quantity}</span>
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
        )}

        {cartItems.length > 0 && (
          <div className="popular-recommendations">
            <h3 className="summary-section-title">Popular with your order</h3>
            <p className="recommendations-subtitle">Based on what other customers bought together</p>
            
            <div className="popular-carousel">
              <button className="carousel-btn prev">‹</button>
              <div className="popular-items-container">
                {popularItems.map((item) => (
                  <div key={item.id} className="popular-item">
                    <div className="popular-item-image">
                      <span className="popular-emoji" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Coffee size={40} color={COLORS.primary} />
                      </span>
                      <button className="quick-add-btn">+</button>
                    </div>
                    <div className="popular-item-details">
                      <div className="popular-item-price">
                        ৳{item.price}
                        <span className="popular-original-price">৳{item.originalPrice}</span>
                      </div>
                      <div className="popular-item-name">{item.name}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="carousel-btn next">›</button>
            </div>
          </div>
        )}

        {cartItems.length > 0 && (
          <>
            <div className="order-summary-breakdown">
              <div className="summary-line">
                <span>Subtotal</span>
                <span>৳{subtotal}</span>
              </div>
              <div className="summary-line">
                <span>Service fee</span>
                <span>৳{serviceFee}</span>
              </div>
            </div>

            <div className="cutlery-section">
              <div className="cutlery-info">
                <span className="cutlery-icon" style={{display:'flex',alignItems:'center'}}>
                  <Utensils size={20} />
                </span>
                <div>
                  <div className="cutlery-title">Cutlery</div>
                  <div className="cutlery-text">No cutlery provided. Thanks for reducing waste!</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="order-total-section">
              <div className="total-row">
                <div>
                  <div className="total-label">Total</div>
                  <div className="total-note">(incl. fees and tax)</div>
                </div>
                <div className="total-amount">
                  <div className="total-price">৳{total}</div>
                  <div className="total-original">৳{total + 30}</div>
                </div>
              </div>
              <button className="summary-link-btn">See summary</button>
            </div>

            <button className="review-payment-btn" onClick={onCheckout}>
              Review payment and address
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderSummary;
import React from 'react';
import './Restaurantcart.css';
import { COLORS } from '../constants.js';
import { ShoppingCart, Trash2, UtensilsCrossed, Utensils } from 'lucide-react';

const RestaurantCart = ({ 
  isOpen, 
  onClose, 
  cartItems = [], 
  onUpdateQuantity, 
  onRemoveItem,
  onCheckout,
  restaurantName
}) => {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <>
      <div 
        className={`restaurant-cart-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`restaurant-cart-sidebar ${isOpen ? 'cart-visible' : 'cart-hidden'}`}>
        {/* Delivery-only header */}
        <div className="delivery-mode-header">
          <div className="mode-btn active" style={{ flex: 1, cursor: 'default' }}>
            <div className="mode-title">Delivery</div>
            <div className="mode-subtitle">Standard (10 - 25 mins)</div>
          </div>
        </div>

        <div className="restaurant-cart-content">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <div className="empty-cart-icon" style={{ display: 'flex', justifyContent: 'center', opacity: 0.5 }}>
                <ShoppingCart size={80} strokeWidth={1} />
              </div>
              <p className="empty-cart-text">Your cart is empty</p>
              <p className="empty-cart-subtext">Add items to get started</p>
            </div>
          ) : (
            <>
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
                            <div className="item-emoji" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <UtensilsCrossed size={32} color={COLORS.primary} />
                            </div>
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
                          <Trash2 size={18} />
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

              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>৳{subtotal}</span>
                </div>
              </div>

              <div className="cutlery-option">
                <div className="cutlery-info">
                  <span className="cutlery-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <Utensils size={20} />
                  </span>
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

              <div className="cart-total-section">
                <div className="total-row">
                  <div className="total-label">Total</div>
                  <div className="total-amounts">
                    <div className="total-price">৳{subtotal}</div>
                  </div>
                </div>
              </div>

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
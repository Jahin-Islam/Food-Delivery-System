import React from 'react';
import './Cart.css';

const Cart = ({ isOpen, onClose, cartItems = [], onUpdateQuantity, onRemoveItem }) => {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 2.99;
  const total = subtotal + deliveryFee;

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
          <h3 className="cart-title">Your Cart</h3>
          <button 
            className="close-cart-btn"
            onClick={onClose}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="cart-content">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <div className="empty-cart-icon">🛒</div>
              <p className="empty-cart-text">Your cart is empty</p>
              <p className="empty-cart-subtext">Add items to get started</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="cart-items-list">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-image">
                      <div className="cart-item-emoji">{item.emoji || '🍔'}</div>
                    </div>
                    <div className="cart-item-details">
                      <h4 className="cart-item-name">{item.name}</h4>
                      <p className="cart-item-restaurant">{item.restaurant}</p>
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
                    <div className="cart-item-price">
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                      <button 
                        className="remove-item-btn" 
                        onClick={() => onRemoveItem && onRemoveItem(item.id)}
                        aria-label="Remove item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Summary */}
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery Fee</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="summary-row summary-total">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button className="checkout-btn">
                Proceed to Checkout
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default Cart;
import React, { useState } from 'react';
import './Orders.css';
import { User, Bike, Package, CheckCircle, AlertTriangle } from 'lucide-react';

const Orders = ({ 
  isLoggedIn,
  user,
  onLogout,
  onNavigateToMenu,
  onNavigateToOrderHistory
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [orderToDeny, setOrderToDeny] = useState(null);

  // Mock data for demonstration
  const [newOrders, setNewOrders] = useState([
    {
      id: '#3279',
      orderId: 'q0a2-1f64',
      customerName: 'Mrs Zaidi Haleem',
      items: [
        { name: 'Chicken Haleem', quantity: 1, price: 410.00 }
      ],
      subtotal: 410.00,
      vat: 0,
      deliveryFee: 0,
      serviceFee: 0,
      total: 410.00,
      timeElapsed: '7 mins',
      timestamp: new Date()
    },
    {
      id: '#3280',
      orderId: 'a1b2-3c4d',
      customerName: 'Ahmed Khan',
      items: [
        { name: 'Chicken Cashewnut Salad', quantity: 2, price: 387.00 },
        { name: 'Coleslaw', quantity: 1, price: 135.00 }
      ],
      subtotal: 909.00,
      vat: 0,
      deliveryFee: 50.00,
      serviceFee: 10.00,
      total: 969.00,
      timeElapsed: '3 mins',
      timestamp: new Date()
    }
  ]);

  const [acceptedOrders, setAcceptedOrders] = useState([
    {
      id: '#3278',
      orderId: 'x9y8-7z6w',
      customerName: 'Murtaza Akbar',
      riderName: 'Muhammad',
      riderStatus: 'is nearby',
      items: [
        { name: 'Pan Polao with Gochujang Chicken', quantity: 1, price: 594.00 }
      ],
      subtotal: 594.00,
      vat: 0,
      deliveryFee: 60.00,
      serviceFee: 12.00,
      total: 666.00,
      timeElapsed: '12 mins',
      timestamp: new Date()
    }
  ]);

  // Accept Order
  const handleAcceptOrder = (order) => {
    // Remove from new orders
    setNewOrders(prev => prev.filter(o => o.id !== order.id));
    
    // Add to accepted orders with rider info
    const acceptedOrder = {
      ...order,
      riderName: 'Muhammad',
      riderStatus: 'on the way'
    };
    setAcceptedOrders(prev => [acceptedOrder, ...prev]);
    
    // Show success message
    alert(`Order ${order.id} accepted!`);
  };

  // Deny Order - Show confirmation
  const handleDenyClick = (order) => {
    setOrderToDeny(order);
    setShowDenyModal(true);
  };

  // Confirm Deny
  const handleConfirmDeny = () => {
    if (orderToDeny) {
      setNewOrders(prev => prev.filter(o => o.id !== orderToDeny.id));
      alert(`Order ${orderToDeny.id} denied and removed.`);
    }
    setShowDenyModal(false);
    setOrderToDeny(null);
  };

  // Mark as Ready/Complete
  const handleMarkReady = (order) => {
    // Remove from accepted orders
    setAcceptedOrders(prev => prev.filter(o => o.id !== order.id));
    
    // In real app, this would move to order history
    alert(`Order ${order.id} marked as ready! Moved to Order History.`);
  };

  return (
    <div className="orders-page">
      {/* Business Header */}
      <header className="business-header">
        <div className="business-header-content">
          <div className="business-header-left">
            <div className="business-logo-section">
              <button className="logo-icon"></button>
              <div className="business-logo-text">
                <span className="logo-main">foodpanda</span>
                <span className="logo-sub">business</span>
              </div>
            </div>
          </div>

          <div className="business-header-right">
            <button className="business-header-btn language-btn">
              <span className="logo-image">
                <img src="/images/accessories/world.png" alt="Language" />
              </span>
              <span>EN</span>
            </button>
            <button className="business-header-btn profile-btn" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
              <span className="logo-image">
                <img src="/images/accessories/profile.png" alt="Profile" />
              </span>
              <span>{user?.first_name || "PROFILE"}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="business-nav-tabs">
          <div className="business-nav-tabs-content">
            <button 
              className="business-nav-tab"
              onClick={onNavigateToMenu}
            >
              <span className="logo-image">
                <img src="/images/accessories/delivery.png" alt="Menu" />
              </span>
              Menu
            </button>
            <button className="business-nav-tab active">
              <span className="logo-image">
                <img src="/images/accessories/cart.png" alt="Orders" />
              </span>
              Orders
            </button>
            <button 
              className="business-nav-tab"
              onClick={onNavigateToOrderHistory}
            >
              <span className="logo-image">
                <img src="/images/accessories/heart.png" alt="Order History" />
              </span>
              Order History
            </button>
          </div>
        </div>
      </header>

      {/* Orders Content */}
      <div className="orders-content">
        {/* New Orders Section */}
        <div className="orders-section">
          <div className="orders-section-header">
            <h2 className="orders-section-title">New</h2>
            <span className="orders-count-badge">{newOrders.length}</span>
          </div>

          <div className="orders-list">
            {newOrders.length > 0 ? (
              newOrders.map(order => (
                <div key={order.id} className="order-card new-order">
                  <div className="order-header">
                    <div className="order-header-left">
                      <div className="customer-avatar">
                        {order.customerName.charAt(0)}
                      </div>
                      <div className="order-basic-info">
                        <h3 className="order-number">{order.id}</h3>
                        <p className="order-id">{order.orderId}</p>
                      </div>
                    </div>
                    <div className="order-time">{order.timeElapsed}</div>
                  </div>

                  <div className="order-details">
                    <div className="order-customer">
                      <span className="detail-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                      <div>
                        <p className="detail-label">Customer</p>
                        <p className="detail-value">{order.customerName}</p>
                      </div>
                    </div>

                    <div className="order-items-list">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="order-item">
                          <span className="item-quantity">{item.quantity} x</span>
                          <span className="item-name">{item.name}</span>
                          <span className="item-price">PKR{item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="order-totals">
                      <div className="total-row">
                        <span>Subtotal</span>
                        <span>PKR{order.subtotal.toFixed(2)}</span>
                      </div>
                      {order.vat > 0 && (
                        <div className="total-row">
                          <span>VAT</span>
                          <span>PKR{order.vat.toFixed(2)}</span>
                        </div>
                      )}
                      {order.deliveryFee > 0 && (
                        <div className="total-row">
                          <span>Delivery Fee</span>
                          <span>PKR{order.deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      {order.serviceFee > 0 && (
                        <div className="total-row">
                          <span>Service Fee</span>
                          <span>PKR{order.serviceFee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="total-row total-final">
                        <span>Total</span>
                        <span>PKR{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button 
                      className="order-action-btn deny-btn"
                      onClick={() => handleDenyClick(order)}
                    >
                      Deny
                    </button>
                    <button 
                      className="order-action-btn accept-btn"
                      onClick={() => handleAcceptOrder(order)}
                    >
                      Accept Order
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg></div>
                <p className="empty-text">No new orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Accepted Orders Section */}
        <div className="orders-section">
          <div className="orders-section-header">
            <h2 className="orders-section-title">Accepted</h2>
            <span className="orders-count-badge">{acceptedOrders.length}</span>
          </div>

          <div className="orders-list">
            {acceptedOrders.length > 0 ? (
              acceptedOrders.map(order => (
                <div key={order.id} className="order-card accepted-order">
                  <div className="order-header">
                    <div className="order-header-left">
                      <div className="customer-avatar">
                        {order.customerName.charAt(0)}
                      </div>
                      <div className="order-basic-info">
                        <h3 className="order-number">{order.id}</h3>
                        <p className="order-id">{order.orderId}</p>
                      </div>
                    </div>
                    <div className="order-time">{order.timeElapsed}</div>
                  </div>

                  <div className="order-details">
                    <div className="order-customer">
                      <span className="detail-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                      <div>
                        <p className="detail-label">Customer</p>
                        <p className="detail-value">{order.customerName}</p>
                      </div>
                    </div>

                    <div className="order-rider">
                      <span className="detail-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></span>
                      <div>
                        <p className="detail-label">Rider</p>
                        <p className="detail-value rider-status">
                          {order.riderName} {order.riderStatus}
                        </p>
                      </div>
                    </div>

                    <div className="order-items-list">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="order-item">
                          <span className="item-quantity">{item.quantity} x</span>
                          <span className="item-name">{item.name}</span>
                          <span className="item-price">PKR{item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="order-totals">
                      <div className="total-row">
                        <span>Subtotal</span>
                        <span>PKR{order.subtotal.toFixed(2)}</span>
                      </div>
                      {order.vat > 0 && (
                        <div className="total-row">
                          <span>VAT</span>
                          <span>PKR{order.vat.toFixed(2)}</span>
                        </div>
                      )}
                      {order.deliveryFee > 0 && (
                        <div className="total-row">
                          <span>Delivery Fee</span>
                          <span>PKR{order.deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      {order.serviceFee > 0 && (
                        <div className="total-row">
                          <span>Service Fee</span>
                          <span>PKR{order.serviceFee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="total-row total-final">
                        <span>Total</span>
                        <span>PKR{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button 
                      className="order-action-btn mark-ready-btn"
                      onClick={() => handleMarkReady(order)}
                    >
                      Mark as Ready
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                <p className="empty-text">No accepted orders</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deny Confirmation Modal */}
      {showDenyModal && (
        <div className="modal-overlay" onClick={() => setShowDenyModal(false)}>
          <div className="deny-modal" onClick={(e) => e.stopPropagation()}>
            <div className="deny-modal-content">
              <div className="deny-icon"><AlertTriangle size={52} color="#f59e0b" /></div>
              <h3 className="deny-title">Deny Order?</h3>
              <p className="deny-message">
                Are you sure you want to deny order {orderToDeny?.id}? This action cannot be undone.
              </p>
              <div className="deny-modal-actions">
                <button 
                  className="deny-cancel-btn"
                  onClick={() => setShowDenyModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="deny-confirm-btn"
                  onClick={handleConfirmDeny}
                >
                  Deny Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
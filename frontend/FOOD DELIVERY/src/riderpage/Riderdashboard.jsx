import React, { useState } from 'react';
import './Riderdashboard.css';

const RiderDashboard = ({ 
  rider = {
    name: 'Piyush Agarwal',
    id: 'RD-9577690140',
    vehicle: 'Car',
    phone: '9577690140',
    email: 'agarwal.piyush123@outlook.com',
    rating: 4.8,
    totalReviews: 156
  },
  onLogout
}) => {
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // new, ongoing, completed
  const [orders, setOrders] = useState([
    {
      id: '6897',
      orderId: 't2iz-2apy (#6897)',
      customer: {
        name: 'Fãminha Hossain',
        phone: '01712345678'
      },
      restaurant: {
        name: 'Kutumbari Restora - WASA',
        address: '146, CDA Avenue, Wasa Mor',
        location: { lat: 22.3569, lng: 91.7832 }
      },
      delivery: {
        address: 'Late Alhaj Zahur Ahmed Chowdhury Rd 18, Chittagong',
        location: { lat: 22.3475, lng: 91.8123 }
      },
      items: [
        { name: 'Food Item', quantity: 1 }
      ],
      amount: 28.82,
      paymentMethod: 'Cash',
      status: 'new',
      pickupTime: '6 mins',
      deliveryTime: '7 mins',
      timeRemaining: 105 // seconds
    }
  ]);

  // Today's stats
  const [todayStats, setTodayStats] = useState({
    earnings: 0,
    ordersCompleted: 0,
    totalOrders: 10,
    totalEarnings: 164.10,
    amountReceived: 97.05,
    amountPending: 67.05,
    cashToReturn: 761.40,
    acceptanceRate: 89
  });

  const handleToggleStatus = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      // Show notification
      showNotification('You are now online!', 'success');
    } else {
      showNotification('You are now offline', 'warning');
    }
  };

  const handleAcceptOrder = (orderId) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: 'ongoing', stage: 'going_to_restaurant' }
          : order
      )
    );
    setActiveTab('ongoing');
    showNotification('Order accepted!', 'success');
  };

  const handleDeclineOrder = (orderId) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    showNotification('Order declined', 'warning');
  };

  const handlePickedUp = (orderId) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, stage: 'delivering' }
          : order
      )
    );
    showNotification('Order picked up!', 'success');
  };

  const handleDelivered = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setTodayStats(prev => ({
        ...prev,
        earnings: prev.earnings + order.amount,
        ordersCompleted: prev.ordersCompleted + 1
      }));
      
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === orderId 
            ? { ...o, status: 'completed', completedAt: new Date() }
            : o
        )
      );
      
      setActiveTab('completed');
      showNotification(`Great job! ₹${order.amount} earned`, 'success');
    }
  };

  const showNotification = (message, type) => {
    // Implement notification logic
    console.log(`${type}: ${message}`);
  };

  const newOrders = orders.filter(o => o.status === 'new');
  const ongoingOrders = orders.filter(o => o.status === 'ongoing');
  const completedOrders = orders.filter(o => o.status === 'completed');

  return (
    <div className="rider-dashboard-container">
      {/* Header */}
      <header className="rider-dashboard-header">
        <div className="rider-dashboard-header-content">
          <div className="rider-info-section">
            <div className="rider-avatar">
              <span className="avatar-text">PA</span>
            </div>
            <div className="rider-details">
              <h2 className="rider-name">{rider.name}</h2>
              <p className="rider-meta">ID: {rider.id} | Vehicle: {rider.vehicle}</p>
            </div>
          </div>

          <div className="status-toggle-section">
            <button 
              className={`status-toggle-btn ${isOnline ? 'online' : 'offline'}`}
              onClick={handleToggleStatus}
            >
              <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
              <div className={`toggle-switch ${isOnline ? 'active' : ''}`}>
                <div className="toggle-slider"></div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="rider-stats-grid">
        <div className="rider-stat-card earnings">
          <h3 className="stat-label">Today's Earnings</h3>
          <div className="stat-value">₹{todayStats.earnings.toFixed(2)}</div>
          <div className="stat-change">+0% from yesterday</div>
        </div>

        <div className="rider-stat-card orders">
          <h3 className="stat-label">Orders Completed</h3>
          <div className="stat-value">{todayStats.ordersCompleted}</div>
          <div className="stat-change">Today</div>
        </div>

        <div className="rider-stat-card rating">
          <h3 className="stat-label">Your Rating</h3>
          <div className="stat-value">{rider.rating} ⭐</div>
          <div className="stat-change">Based on {rider.totalReviews} reviews</div>
        </div>

        <div className="rider-stat-card acceptance">
          <h3 className="stat-label">Acceptance Rate</h3>
          <div className="stat-value">{todayStats.acceptanceRate}%</div>
          <div className="stat-change">Last 30 days</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="rider-main-content">
        {/* Map Section */}
        <div className="rider-map-section">
          <div className="section-header">
            <h3 className="section-title"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;margin-right:6px"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Live Location</h3>
            <button className="map-center-btn">Center Map</button>
          </div>
          <div className="rider-map-container">
            <div className="map-placeholder">
              <div className="map-icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#db2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
              <p className="map-text">Map will load here when online</p>
              <p className="map-subtext">Toggle status to start receiving orders</p>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="rider-orders-section">
          <div className="section-header">
            <h3 className="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;margin-right:6px"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg> Orders 
              {newOrders.length > 0 && (
                <span className="order-badge">{newOrders.length}</span>
              )}
            </h3>
          </div>

          {/* Order Tabs */}
          <div className="rider-order-tabs">
            <button 
              className={`rider-tab ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              New Orders
            </button>
            <button 
              className={`rider-tab ${activeTab === 'ongoing' ? 'active' : ''}`}
              onClick={() => setActiveTab('ongoing')}
            >
              Ongoing
            </button>
            <button 
              className={`rider-tab ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed
            </button>
          </div>

          {/* Order Content */}
          <div className="rider-orders-content">
            {activeTab === 'new' && (
              <div className="orders-list">
                {newOrders.length === 0 ? (
                  <div className="empty-orders">
                    <div className="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg></div>
                    <p>No new orders</p>
                    <p className="empty-subtext">New orders will appear here</p>
                  </div>
                ) : (
                  newOrders.map(order => (
                    <NewOrderCard 
                      key={order.id}
                      order={order}
                      onAccept={handleAcceptOrder}
                      onDecline={handleDeclineOrder}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'ongoing' && (
              <div className="orders-list">
                {ongoingOrders.length === 0 ? (
                  <div className="empty-orders">
                    <div className="empty-icon">🚚</div>
                    <p>No ongoing orders</p>
                  </div>
                ) : (
                  ongoingOrders.map(order => (
                    <OngoingOrderCard 
                      key={order.id}
                      order={order}
                      onPickedUp={handlePickedUp}
                      onDelivered={handleDelivered}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="orders-list">
                {completedOrders.length === 0 ? (
                  <div className="empty-orders">
                    <div className="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                    <p>No completed orders today</p>
                  </div>
                ) : (
                  completedOrders.map(order => (
                    <CompletedOrderCard 
                      key={order.id}
                      order={order}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Earnings Section */}
      <div className="rider-earnings-section">
        <div className="earnings-header">
          <h3 className="section-title"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;margin-right:6px"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Earnings Overview</h3>
          <div className="cash-return-badge">
            Cash to Return: ₹{todayStats.cashToReturn.toFixed(2)}
          </div>
        </div>

        <div className="earnings-grid">
          <div className="earning-card received">
            <h4 className="earning-label">Amount Received</h4>
            <div className="earning-amount">₹{todayStats.amountReceived.toFixed(2)}</div>
          </div>

          <div className="earning-card pending">
            <h4 className="earning-label">Amount Pending</h4>
            <div className="earning-amount">₹{todayStats.amountPending.toFixed(2)}</div>
          </div>

          <div className="earning-card lifetime">
            <h4 className="earning-label">Lifetime Earnings</h4>
            <div className="earning-amount">₹{todayStats.totalEarnings.toFixed(2)}</div>
            <p className="earning-subtext">{todayStats.totalOrders} Total Orders</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// New Order Card Component
const NewOrderCard = ({ order, onAccept, onDecline }) => {
  return (
    <div className="rider-order-card new-order-animation">
      <div className="order-card-header">
        <div>
          <div className="order-id">{order.orderId}</div>
          <div className="customer-name">{order.customer.name}</div>
        </div>
        <div className="order-amount">₹{order.amount.toFixed(2)}</div>
      </div>

      <div className="order-locations">
        <div className="location-row">
          <span className="location-icon">🏪</span>
          <div className="location-details">
            <strong className="location-label">Pickup ({order.pickupTime})</strong>
            <p className="location-address">{order.restaurant.name}</p>
            <p className="location-subaddress">{order.restaurant.address}</p>
          </div>
        </div>

        <div className="location-row">
          <span className="location-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
          <div className="location-details">
            <strong className="location-label">Drop-off ({order.deliveryTime})</strong>
            <p className="location-address">{order.delivery.address}</p>
          </div>
        </div>
      </div>

      <div className="order-items-section">
        <strong>Items ({order.items.length}):</strong>
        {order.items.map((item, idx) => (
          <div key={idx} className="order-item-row">
            <span>{item.quantity}x {item.name}</span>
          </div>
        ))}
      </div>

      <div className="order-payment-info">
        <span className="payment-method"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;margin-right:4px"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>{order.paymentMethod}</span>
        <span className="order-timer">⏱️ Accept in 01:45</span>
      </div>

      <div className="order-actions">
        <button 
          className="order-btn accept-btn"
          onClick={() => onAccept(order.id)}
        >
          Accept Order
        </button>
        <button 
          className="order-btn decline-btn"
          onClick={() => onDecline(order.id)}
        >
          Decline
        </button>
      </div>
    </div>
  );
};

// Ongoing Order Card Component
const OngoingOrderCard = ({ order, onPickedUp, onDelivered }) => {
  const isDelivering = order.stage === 'delivering';

  return (
    <div className="rider-order-card">
      <div className="order-card-header">
        <div>
          <div className="order-id">{order.orderId}</div>
          <div className="customer-name">{order.customer.name}</div>
        </div>
        <div className="order-amount">₹{order.amount.toFixed(2)}</div>
      </div>

      <div className="order-status-banner">
        <strong>
          Status: {isDelivering ? 'Delivering to customer' : 'On the way to restaurant'}
        </strong>
      </div>

      <div className="order-actions">
        {isDelivering ? (
          <button 
            className="order-btn delivered-btn"
            onClick={() => onDelivered(order.id)}
          >
            Mark Delivered
          </button>
        ) : (
          <button 
            className="order-btn picked-btn"
            onClick={() => onPickedUp(order.id)}
          >
            Picked Up
          </button>
        )}
      </div>
    </div>
  );
};

// Completed Order Card Component
const CompletedOrderCard = ({ order }) => {
  return (
    <div className="rider-order-card completed-card">
      <div className="order-card-header">
        <div>
          <div className="order-id">{order.orderId} ✓</div>
          <div className="completed-time">Completed • Just now</div>
        </div>
        <div className="order-amount">₹{order.amount.toFixed(2)}</div>
      </div>
    </div>
  );
};

export default RiderDashboard;
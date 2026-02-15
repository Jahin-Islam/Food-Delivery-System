import React, { useState } from 'react';
import './OrderHistory.css';

const OrderHistory = ({ 
  isLoggedIn,
  user,
  onLogout,
  onNavigateToMenu,
  onNavigateToOrders
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [dateFilter, setDateFilter] = useState('today'); // 'today', 'yesterday', '7days', '30days'

  // Mock completed orders data
  const [completedOrders] = useState([
    {
      id: '#3276',
      orderId: 'z9y8-x7w6',
      customerName: 'Fatima Rahman',
      riderName: 'Karim',
      items: [
        { name: 'Nasi Goreng', quantity: 2, price: 495.00 },
        { name: 'Coleslaw', quantity: 1, price: 135.00 }
      ],
      subtotal: 1125.00,
      vat: 0,
      deliveryFee: 50.00,
      serviceFee: 15.00,
      total: 1190.00,
      completedAt: new Date('2024-02-14T15:30:00'),
      status: 'Delivered'
    },
    {
      id: '#3275',
      orderId: 'p8o7-n6m5',
      customerName: 'Hassan Ali',
      riderName: 'Ibrahim',
      items: [
        { name: 'BBQ Chicken Rice Bowl', quantity: 1, price: 315.00 }
      ],
      subtotal: 315.00,
      vat: 0,
      deliveryFee: 40.00,
      serviceFee: 8.00,
      total: 363.00,
      completedAt: new Date('2024-02-14T14:15:00'),
      status: 'Delivered'
    },
    {
      id: '#3274',
      orderId: 'k5j4-i3h2',
      customerName: 'Ayesha Begum',
      riderName: 'Rashid',
      items: [
        { name: 'Chicken Cashewnut Salad', quantity: 1, price: 387.00 },
        { name: 'Mushroom Salad', quantity: 1, price: 405.00 }
      ],
      subtotal: 792.00,
      vat: 0,
      deliveryFee: 60.00,
      serviceFee: 12.00,
      total: 864.00,
      completedAt: new Date('2024-02-13T18:45:00'),
      status: 'Delivered'
    },
    {
      id: '#3273',
      orderId: 'g2f1-e0d9',
      customerName: 'Tariq Mahmud',
      riderName: 'Salman',
      items: [
        { name: 'Vegetable Letka Khichuri', quantity: 3, price: 198.00 }
      ],
      subtotal: 594.00,
      vat: 0,
      deliveryFee: 50.00,
      serviceFee: 10.00,
      total: 654.00,
      completedAt: new Date('2024-02-13T12:20:00'),
      status: 'Delivered'
    }
  ]);

  // Mock chart data for business summary
  const getChartData = () => {
    // Last 7 days of order counts
    return [
      { day: 'Mon', orders: 12 },
      { day: 'Tue', orders: 18 },
      { day: 'Wed', orders: 15 },
      { day: 'Thu', orders: 22 },
      { day: 'Fri', orders: 28 },
      { day: 'Sat', orders: 35 },
      { day: 'Sun', orders: 24 }
    ];
  };

  const chartData = getChartData();
  const maxOrders = Math.max(...chartData.map(d => d.orders));

  // Filter orders based on date selection
  const filterOrders = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return completedOrders.filter(order => {
      const orderDate = new Date(order.completedAt);
      
      switch(dateFilter) {
        case 'today':
          return orderDate >= today;
        case 'yesterday':
          return orderDate >= yesterday && orderDate < today;
        case '7days':
          return orderDate >= sevenDaysAgo;
        case '30days':
          return orderDate >= thirtyDaysAgo;
        default:
          return true;
      }
    });
  };

  const filteredOrders = filterOrders();

  const formatDate = (date) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="order-history-page">
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
            <button 
              className="business-nav-tab"
              onClick={onNavigateToOrders}
            >
              <span className="logo-image">
                <img src="/images/accessories/cart.png" alt="Orders" />
              </span>
              Orders
            </button>
            <button className="business-nav-tab active">
              <span className="logo-image">
                <img src="/images/accessories/heart.png" alt="Order History" />
              </span>
              Order History
            </button>
          </div>
        </div>
      </header>

      {/* Order History Content */}
      <div className="order-history-content">
        {/* Business Summary Section */}
        <div className="business-summary-section">
          <div className="summary-header">
            <h2 className="summary-title">Business Summary</h2>
          </div>

          {/* Date Filter Tabs */}
          <div className="date-filter-tabs">
            <button 
              className={`date-tab ${dateFilter === 'today' ? 'active' : ''}`}
              onClick={() => setDateFilter('today')}
            >
              Today
            </button>
            <button 
              className={`date-tab ${dateFilter === 'yesterday' ? 'active' : ''}`}
              onClick={() => setDateFilter('yesterday')}
            >
              Yesterday
            </button>
            <button 
              className={`date-tab ${dateFilter === '7days' ? 'active' : ''}`}
              onClick={() => setDateFilter('7days')}
            >
              7 Days
            </button>
            <button 
              className={`date-tab ${dateFilter === '30days' ? 'active' : ''}`}
              onClick={() => setDateFilter('30days')}
            >
              30 Days
            </button>
          </div>

          {/* Chart View */}
          <div className="chart-section">
            <h3 className="chart-title">Chart View</h3>
            <div className="chart-container">
              <div className="chart-y-axis">
                <span>{maxOrders}</span>
                <span>{Math.floor(maxOrders * 0.75)}</span>
                <span>{Math.floor(maxOrders * 0.5)}</span>
                <span>{Math.floor(maxOrders * 0.25)}</span>
                <span>0</span>
              </div>
              <div className="chart-bars">
                {chartData.map((data, index) => (
                  <div key={index} className="chart-bar-wrapper">
                    <div 
                      className="chart-bar"
                      style={{ 
                        height: `${(data.orders / maxOrders) * 100}%`,
                        background: index === chartData.length - 1 
                          ? 'linear-gradient(135deg, #db2777 0%, #be185d 100%)'
                          : '#e5e7eb'
                      }}
                    >
                      <span className="bar-value">{data.orders}</span>
                    </div>
                    <span className="bar-label">{data.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live Ops Monitor */}
          <div className="live-ops-monitor">
            <h3 className="ops-title">Live Ops Monitor</h3>
            <div className="ops-status">
              <span className="status-icon">✅</span>
              <span className="status-text">Your restaurant is operating normally</span>
            </div>
          </div>
        </div>

        {/* Order History List */}
        <div className="history-orders-section">
          <div className="history-header">
            <h2 className="history-title">Completed Orders</h2>
            <span className="history-count-badge">{filteredOrders.length}</span>
          </div>

          <div className="history-orders-list">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <div key={order.id} className="history-order-card">
                  <div className="order-header">
                    <div className="order-header-left">
                      <div className="customer-avatar completed">
                        {order.customerName.charAt(0)}
                      </div>
                      <div className="order-basic-info">
                        <h3 className="order-number">{order.id}</h3>
                        <p className="order-id">{order.orderId}</p>
                      </div>
                    </div>
                    <div className="order-status-badge">
                      <span className="status-dot"></span>
                      {order.status}
                    </div>
                  </div>

                  <div className="order-details">
                    <div className="order-meta-row">
                      <div className="order-customer">
                        <span className="detail-icon">👤</span>
                        <div>
                          <p className="detail-label">Customer</p>
                          <p className="detail-value">{order.customerName}</p>
                        </div>
                      </div>

                      <div className="order-rider">
                        <span className="detail-icon">🚴</span>
                        <div>
                          <p className="detail-label">Rider</p>
                          <p className="detail-value">{order.riderName}</p>
                        </div>
                      </div>

                      <div className="order-time-info">
                        <span className="detail-icon">🕒</span>
                        <div>
                          <p className="detail-label">Completed</p>
                          <p className="detail-value">{formatDate(order.completedAt)}</p>
                        </div>
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
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📜</div>
                <p className="empty-text">No orders found for selected period</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
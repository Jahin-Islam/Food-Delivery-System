import { useState, useEffect, useCallback } from 'react';
import Homepage from './homepage/homepage.jsx';
import NearMePage from './homepage/NearMePage.jsx';
import RestaurantDetail from './homepage/RestaurantDetail.jsx';
import BusinessDashboard from './business onwer page/Businessdashboard.jsx';
import BusinessWelcome from './business onwer page/BusinessWelcome.jsx';
import Orders from './business onwer page/Orders.jsx';
import OrderHistory from './business onwer page/Orderhistory.jsx';
import BusinessProfile from './business onwer page/BusinessProfile.jsx';
import Checkout from './homepage/Checkout.jsx';
import Profile from './homepage/Profile.jsx';
import SignIn from './log in and sign up/log_in_page.jsx';
import SignUp from './log in and sign up/sign_up_page.jsx';
import RestaurantLogin from './homepage/RestaurantLogIn.jsx';
import RestaurantSignUp from './homepage/RestaurantSignUp.jsx';
import RiderSignUp from './homepage/RiderSignUp.jsx';
import RiderOnBoarding from './homepage/RiderOnBoarding.jsx';
import RiderLogin from './riderpage/RiderLogin.jsx';
import RiderDashboard from './riderpage/Riderdashboard.jsx';
import authService from './Authservice.js';
import cartService from './Cartservice.js';
import cartApiService from './Cartapiservice.js';

// ── Keys for session persistence ──────────────────────────────────────────
const SK_PAGE        = 'fp_current_page';
const SK_ROLE        = 'fp_user_role';
const SK_RESTAURANT  = 'fp_restaurant';
const SK_RIDER       = 'fp_rider';
const SK_ADDRESS     = 'fp_delivery_address'; // TASK 1: persist delivery address

const BUSINESS_PAGES = new Set(['business-welcome', 'business-dashboard', 'orders', 'order-history', 'business-profile']);
const RIDER_PAGES    = new Set(['rider-dashboard']);

const TRANSIENT_PAGES = new Set([
  'login', 'signup', 'restaurant-login', 'restaurant-signup',
  'rider-signup', 'rider-onboarding', 'rider-login',
]);

function App() {
  const [currentPage,          setCurrentPage]          = useState('home');
  const [selectedRestaurant,   setSelectedRestaurant]   = useState(null);
  const [checkoutRestaurantId, setCheckoutRestaurantId] = useState(null);
  const [isLoggedIn,           setIsLoggedIn]           = useState(false);
  const [user,                 setUser]                 = useState(null);
  const [cartItems,            setCartItems]            = useState([]);
  const [isInitializing,       setIsInitializing]       = useState(true);
  const [riderData,            setRiderData]            = useState(null);
  const [restaurants,          setRestaurants]          = useState([]);
  const [activeTab,            setActiveTab]            = useState('delivery'); // TASK 10

  // TASK 1: Load saved delivery address from localStorage on startup
  const [currentAddress, setCurrentAddress] = useState(() => {
    try { return localStorage.getItem(SK_ADDRESS) || 'Road 71, Dhaka, Bangladesh'; } catch { return 'Road 71, Dhaka, Bangladesh'; }
  });

  // TASK 1: Whenever address changes, save to localStorage
  const handleAddressChange = useCallback((addr) => {
    setCurrentAddress(addr);
    try { localStorage.setItem(SK_ADDRESS, addr); } catch {}
  }, []);

  const push = useCallback((page, extra = {}) => {
    window.history.pushState({ page, ...extra }, '', '#' + page);
    setCurrentPage(page);
    if (!TRANSIENT_PAGES.has(page)) {
      try { localStorage.setItem(SK_PAGE, page); } catch {}
    }
  }, []);

  useEffect(() => {
    const onPop = (e) => {
      const dest = e.state?.page ?? 'home';
      if (BUSINESS_PAGES.has(currentPage) && !BUSINESS_PAGES.has(dest) && dest !== 'home') {
        setCurrentPage('business-dashboard'); return;
      }
      if (RIDER_PAGES.has(currentPage) && dest !== 'rider-dashboard') {
        setCurrentPage('rider-dashboard'); return;
      }
      setCurrentPage(dest);
      if (e.state?.restaurant) setSelectedRestaurant(e.state.restaurant);
      if ('checkoutRestaurantId' in (e.state ?? {})) setCheckoutRestaurantId(e.state.checkoutRestaurantId);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [currentPage]);

  // ── Init: restore auth + page from localStorage ──────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const authState = await authService.initialize();
        setIsLoggedIn(authState.isAuthenticated);
        setUser(authState.user);

        if (authState.isAuthenticated) {
          setCartItems(await cartApiService.getAllCarts());

          const u = authState.user;
          const role = (u?.role || u?.user_type || '').toString().toUpperCase();
          const isVendor = role === 'RESTAURANT' || role === 'VENDOR' || !!authState.restaurant;
          const isRider  = role === 'RIDER';

          const savedPage = localStorage.getItem(SK_PAGE);

          if (isVendor) localStorage.setItem(SK_ROLE, 'restaurant');
          else if (isRider) localStorage.setItem(SK_ROLE, 'rider');
          else localStorage.setItem(SK_ROLE, 'customer');

          const pickRestaurant = () => {
            const fromAuth = authState.restaurant;
            const fromStorage = (() => { try { return JSON.parse(localStorage.getItem(SK_RESTAURANT) || 'null'); } catch { return null; } })();
            if (fromAuth?.id && fromAuth.id !== 1) return fromAuth;
            if (fromStorage?.id && fromStorage.id !== 1) return fromStorage;
            return fromAuth ?? fromStorage ?? null;
          };

          if (savedPage && !TRANSIENT_PAGES.has(savedPage)) {
            if (BUSINESS_PAGES.has(savedPage)) {
              const r = pickRestaurant();
              if (r) { setSelectedRestaurant(r); localStorage.setItem(SK_RESTAURANT, JSON.stringify(r)); }
            }
            if (RIDER_PAGES.has(savedPage)) {
              try {
                const rd = JSON.parse(localStorage.getItem(SK_RIDER) || 'null');
                if (rd) setRiderData(rd);
              } catch {}
            }

            if (isVendor && !BUSINESS_PAGES.has(savedPage)) {
              const r = pickRestaurant();
              if (r) { setSelectedRestaurant(r); localStorage.setItem(SK_RESTAURANT, JSON.stringify(r)); }
              localStorage.setItem(SK_PAGE, 'business-welcome');
              setCurrentPage('business-welcome');
              window.history.replaceState({ page: 'business-welcome' }, '', '#business-welcome');
            } else if (isRider && !RIDER_PAGES.has(savedPage)) {
              setCurrentPage('rider-dashboard');
              window.history.replaceState({ page: 'rider-dashboard' }, '', '#rider-dashboard');
            } else {
              setCurrentPage(savedPage);
              window.history.replaceState({ page: savedPage }, '', '#' + savedPage);
            }
          } else if (isVendor) {
            const r = pickRestaurant();
            if (r) { setSelectedRestaurant(r); localStorage.setItem(SK_RESTAURANT, JSON.stringify(r)); }
            localStorage.setItem(SK_PAGE, 'business-welcome');
            setCurrentPage('business-welcome');
            window.history.replaceState({ page: 'business-welcome' }, '', '#business-welcome');
          } else {
            window.history.replaceState({ page: 'home' }, '', '#home');
          }
        } else {
          setCartItems(cartService.loadCart());
          localStorage.removeItem(SK_PAGE);
          localStorage.removeItem(SK_ROLE);
          localStorage.removeItem(SK_RESTAURANT);
          localStorage.removeItem(SK_RIDER);
          window.history.replaceState({ page: 'home' }, '', '#home');
        }
      } catch (err) {
        console.error('Init error:', err);
        setCartItems(cartService.loadCart());
        window.history.replaceState({ page: 'home' }, '', '#home');
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const [restaurantRefresh, setRestaurantRefresh] = useState(0);

  // Fetch restaurants
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        let data;
        if (isLoggedIn) {
          data = await authService.authenticatedFetch('http://127.0.0.1:8000/api/v1/restaurants/');
        } else {
          const res = await fetch('http://127.0.0.1:8000/api/v1/restaurants/');
          if (!res.ok) throw new Error('Failed');
          data = await res.json();
        }

        const detailed = await Promise.all(data.map(async (r) => {
          try {
            if (isLoggedIn) return await authService.authenticatedFetch(`http://127.0.0.1:8000/api/v1/restaurants/${r.id}/`);
            const dr = await fetch(`http://127.0.0.1:8000/api/v1/restaurants/${r.id}/`);
            return dr.ok ? await dr.json() : r;
          } catch { return r; }
        }));

        const ownRestaurant = authService.getRestaurantData();
        if (ownRestaurant?.id) {
          const alreadyInList = detailed.some(r => r.id === ownRestaurant.id);
          if (!alreadyInList) {
            try {
              let ownDetail;
              if (isLoggedIn) {
                ownDetail = await authService.authenticatedFetch(`http://127.0.0.1:8000/api/v1/restaurants/${ownRestaurant.id}/`);
              } else {
                const dr = await fetch(`http://127.0.0.1:8000/api/v1/restaurants/${ownRestaurant.id}/`);
                ownDetail = dr.ok ? await dr.json() : ownRestaurant;
              }
              detailed.push(ownDetail ?? ownRestaurant);
            } catch { detailed.push(ownRestaurant); }
          }
        }

        setRestaurants(detailed);
      } catch (err) { console.error('Restaurant fetch error:', err); }
    };
    fetchRestaurants();
  }, [isLoggedIn, restaurantRefresh]);

  useEffect(() => {
    if (!isInitializing && !isLoggedIn) cartService.saveCart(cartItems);
  }, [cartItems, isInitializing, isLoggedIn]);

  const reloadBackendCart = async () => {
    try { setCartItems(await cartApiService.getAllCarts()); } catch (e) { console.error(e); }
  };

  // ── Cart ops ──────────────────────────────────────────────────────────
  const handleAddToCart = async (newItem) => {
    if (isLoggedIn && newItem.restaurantId) {
      try {
        await cartApiService.addToCart(newItem.restaurantId, {
          food_id: newItem.foodId ?? newItem.food_id,
          quantity: newItem.quantity ?? 1,
        });
        await reloadBackendCart(); return;
      } catch (e) { console.error('[Cart] addToCart failed:', e.message); return; }
    }
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.foodId === newItem.foodId && i.restaurantId === newItem.restaurantId);
      if (idx !== -1) { const u = [...prev]; u[idx] = { ...u[idx], quantity: u[idx].quantity + 1 }; return u; }
      return [...prev, { ...newItem, quantity: newItem.quantity ?? 1 }];
    });
  };

  const handleUpdateQuantity = async (itemId, qty) => {
    if (qty <= 0) { handleRemoveItem(itemId); return; }
    const item = cartItems.find(i => i.id === itemId);
    if (isLoggedIn && item?.restaurantId) {
      try {
        await cartApiService.updateCartItem(item.restaurantId, item.foodId ?? item.food_id, qty);
        await reloadBackendCart(); return;
      } catch (e) { console.error('[Cart] updateCartItem failed:', e.message); return; }
    }
    setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: qty } : i));
  };

  const handleRemoveItem = async (itemId) => {
    const item = cartItems.find(i => i.id === itemId);
    if (isLoggedIn && item?.restaurantId) {
      try {
        await cartApiService.removeFromCart(item.restaurantId, item.foodId ?? item.food_id);
        await reloadBackendCart(); return;
      } catch (e) { console.error('[Cart] removeFromCart failed:', e.message); return; }
    }
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  // ── Navigation ────────────────────────────────────────────────────────
  const goHome = useCallback(() => {
    setSelectedRestaurant(null); setCheckoutRestaurantId(null);
    setActiveTab('delivery'); // TASK 10
    localStorage.setItem(SK_PAGE, 'home');
    window.history.pushState({ page: 'home' }, '', '#home');
    setCurrentPage('home');
  }, []);

  const goToNearMe = useCallback(() => {
    setActiveTab('nearme');
    push('near-me');
  }, [push]);

  // TASK 10: Pickup tab shows homepage with pickup activeTab
  const goToPickup = useCallback(() => {
    setActiveTab('pickup');
    setSelectedRestaurant(null);
    setCheckoutRestaurantId(null);
    localStorage.setItem(SK_PAGE, 'home');
    window.history.pushState({ page: 'home' }, '', '#home');
    setCurrentPage('home');
  }, []);

  const goToRestaurant = useCallback((restaurant) => {
    setSelectedRestaurant(restaurant);
    localStorage.setItem(SK_PAGE, 'restaurant');
    window.history.pushState({ page: 'restaurant', restaurant }, '', '#restaurant');
    setCurrentPage('restaurant');
  }, []);

  const goToCheckout = useCallback((restaurantId) => {
    setCheckoutRestaurantId(restaurantId);
    push('checkout');
  }, [push]);

  const goToRiderDashboard = useCallback((rider) => {
    setRiderData(rider);
    try {
      localStorage.setItem(SK_PAGE, 'rider-dashboard');
      localStorage.setItem(SK_ROLE, 'rider');
      localStorage.setItem(SK_RIDER, JSON.stringify(rider));
    } catch {}
    window.history.pushState({ page: 'rider-dashboard' }, '', '#rider-dashboard');
    setCurrentPage('rider-dashboard');
  }, []);

  const goToBusinessPage = useCallback((page, restaurant) => {
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      try { localStorage.setItem(SK_RESTAURANT, JSON.stringify(restaurant)); } catch {}
    }
    try {
      localStorage.setItem(SK_PAGE, page);
      localStorage.setItem(SK_ROLE, 'restaurant');
    } catch {}
    window.history.pushState({ page, restaurant }, '', '#' + page);
    setCurrentPage(page);
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────
  const handleLoginSuccess = async () => {
    setIsLoggedIn(true);
    const u = authService.getUser();
    setUser(u);

    const role = (u?.role || u?.user_type || '').toString().toUpperCase();
    const isVendor = role === 'RESTAURANT' || role === 'VENDOR' || !!authService.getRestaurantData();

    if (isVendor) {
      const r = authService.getRestaurantData() ?? { id: u?.restaurant_id ?? 1, name: u?.restaurant_name ?? 'My Restaurant' };
      setSelectedRestaurant(r);
      goToBusinessPage('business-welcome', r);
      return;
    }

    try { await cartApiService.syncCartAfterLogin(); } catch {}
    await reloadBackendCart();
    localStorage.setItem(SK_PAGE, 'home');
    localStorage.setItem(SK_ROLE, 'customer');
    goHome();
  };

  const handleSignUpSuccess = async () => {
    setIsLoggedIn(true);

    // Always fetch fresh profile from backend after signup so Profile page auto-fills
    let u = authService.getUser();
    try {
      const fresh = await authService.fetchUserDetails();
      if (fresh) u = fresh;
    } catch {}
    setUser(u);

    const role = (u?.role || u?.user_type || '').toString().toUpperCase();
    const isVendor = role === 'RESTAURANT' || role === 'VENDOR' || !!authService.getRestaurantData();

    if (isVendor) {
      const r = authService.getRestaurantData() ?? { id: u?.restaurant_id ?? 1, name: u?.restaurant_name ?? 'My Restaurant' };
      setSelectedRestaurant(r);
      goToBusinessPage('business-welcome', r);
      return;
    }

    try { await cartApiService.syncCartAfterLogin(); } catch {}
    await reloadBackendCart();
    localStorage.setItem(SK_PAGE, 'home');
    localStorage.setItem(SK_ROLE, 'customer');
    goHome();
  };

  const handleRiderOnBoardingComplete = () => {
    const u = authService.getUser();
    setIsLoggedIn(true);
    setUser(u);
    goToRiderDashboard(u ?? {});
  };

  const handleRiderLoginSuccess = (data) => {
    const u = authService.getUser() ?? data?.user ?? {};
    setIsLoggedIn(true);
    setUser(u);
    goToRiderDashboard(u);
  };

  const handleRestaurantLoginSuccess = async (userData) => {
    setIsLoggedIn(true);
    const u = authService.getUser();
    setUser(u);
    let r = authService.getRestaurantData() ?? userData?.restaurant ?? null;
    if (!r?.id) {
      try {
        const profile = await authService.fetchUserDetails();
        r = authService.getRestaurantData() ?? profile?.restaurant ?? (profile?.restaurant_id ? { id: profile.restaurant_id, name: profile.restaurant_name ?? 'My Restaurant' } : null);
      } catch (e) { console.warn('Could not fetch restaurant from profile', e); }
    }
    if (!r?.id) { console.error('No restaurant linked to this account.'); return; }
    setSelectedRestaurant(r);
    goToBusinessPage('business-welcome', r);
  };

  const handleRestaurantSignUpSuccess = async (userData) => {
    setIsLoggedIn(true);
    const u = authService.getUser();
    setUser(u);

    let r = authService.getRestaurantData() ?? userData?.restaurant ?? null;
    if (!r?.id) {
      try {
        const profile = await authService.fetchUserDetails();
        r = authService.getRestaurantData() ?? profile?.restaurant_info ?? profile?.restaurant ?? null;
      } catch (e) { console.warn('Could not fetch restaurant from profile:', e); }
    }
    if (!r) { r = { id: null, name: userData?.businessName ?? u?.first_name ?? 'My Restaurant' }; }
    setSelectedRestaurant(r);
    setRestaurantRefresh(n => n + 1); // force homepage to reload restaurant list
    goToBusinessPage('business-welcome', r);
  };

  const handleLogout = async () => {
    // Blacklist the refresh token on backend (best effort — don't block if it fails)
    try { await authService.logout(); } catch {}
    // Clear all tokens and user data from localStorage
    authService.clearTokens();
    authService.clearUser();
    authService.clearRestaurantData();
    // Clear all React state
    setIsLoggedIn(false);
    setUser(null);
    setSelectedRestaurant(null);
    setRiderData(null);
    setCartItems([]);
    // Clear all persisted localStorage keys
    localStorage.removeItem(SK_PAGE);
    localStorage.removeItem(SK_ROLE);
    localStorage.removeItem(SK_RESTAURANT);
    localStorage.removeItem(SK_RIDER);
    localStorage.removeItem(SK_ADDRESS);
    localStorage.removeItem('fp_delivery_lat');
    localStorage.removeItem('fp_delivery_lng');
    localStorage.removeItem('foodpanda_cart');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('restaurantData');
    // Reset address
    setCurrentAddress('');
    goHome();
  };

  // TASK 7: Wire place order to real API
  const handlePlaceOrder = async (orderData) => {
    if (!isLoggedIn) { alert('Please log in to place an order'); push('login'); return; }
    try {
      // Build the items array from cart
      const items = (orderData.items || []).map(item => ({
        item_id: item.foodId ?? item.food_id,
        quantity: item.quantity,
      }));

      const payload = {
        restaurant_id:   orderData.restaurant?.id ?? checkoutRestaurantId,
        address_id:      orderData.deliveryAddress?.id ?? null,
        items,
        delivery_charge: orderData.deliveryFee ?? 0,
        service_charge:  orderData.serviceFee  ?? 0,
        rider_tip:       orderData.tip         ?? 0,
        email:           orderData.personalDetails?.email      || user?.email       || '',
        first_name:      orderData.personalDetails?.firstName  || user?.first_name  || '',
        last_name:       orderData.personalDetails?.lastName   || user?.last_name   || '',
        phone_number:    orderData.personalDetails?.mobile     || user?.phone_number || '',
      };

      const result = await authService.authenticatedFetch('http://127.0.0.1:8000/api/v1/customers/me/orders/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Clear cart for this restaurant
      setCartItems(prev => prev.filter(i => i.restaurantId !== checkoutRestaurantId));
      if (isLoggedIn) await reloadBackendCart();

      alert(`Order #${result.order_id} placed successfully! 🎉`);
      goHome();
    } catch (err) {
      console.error('Place order failed:', err);
      alert('Failed to place order: ' + (err.message || 'Unknown error'));
    }
  };

  if (isInitializing) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 48 }}>🐼</div>
      <p style={{ fontSize: 18, color: '#6b7280' }}>Loading foodpanda…</p>
    </div>
  );

  // ── Shared Header props ───────────────────────────────────────────────
  const H = {
    isLoggedIn, user,
    onLoginClick:    () => push('login'),
    onSignUpClick:   () => push('signup'),
    onLogout:        handleLogout,
    onProfileClick:  () => push('profile'),
    onOrdersClick:   () => push('profile'),
    onLogoClick:     goHome,
    onDeliveryClick: goHome,
    onPickupClick:   goToPickup,   // TASK 10
    onNearMeClick:   goToNearMe,
    currentAddress,
    onAddressChange: handleAddressChange,  // TASK 1
  };

  const CartOps = {
    onUpdateQuantity: handleUpdateQuantity,
    onRemoveItem:     handleRemoveItem,
    onCheckout:       goToCheckout,
  };

  return (
    <div className="App">

      {currentPage === 'login' && (
        <SignIn onSwitchToSignUp={() => push('signup')} onLoginSuccess={handleLoginSuccess} />
      )}

      {currentPage === 'signup' && (
        <SignUp onSwitchToSignIn={() => push('login')} onSignUpSuccess={handleSignUpSuccess} />
      )}

      {currentPage === 'home' && (
        <Homepage
          {...H} {...CartOps}
          activeTab={activeTab}
          restaurants={restaurants}
          cartItems={cartItems}
          setCartItems={setCartItems}
          onAddToCart={handleAddToCart}
          onRestaurantSignUpClick={() => push('restaurant-signup')}
          onRiderSignUpClick={() => push('rider-signup')}
          onRestaurantClick={goToRestaurant}
          onBusinessDashboardClick={(r) => { setSelectedRestaurant(r); push('business-dashboard'); }}
        />
      )}

      {currentPage === 'near-me' && (
        <NearMePage
          {...H} {...CartOps}
          activeTab="nearme"
          cartItems={cartItems}
          restaurants={restaurants}
          onRestaurantClick={goToRestaurant}
          onBack={goHome}
        />
      )}

      {currentPage === 'profile' && (
        <Profile {...H} {...CartOps} cartItems={cartItems} onBack={goHome} />
      )}

      {currentPage === 'restaurant' && selectedRestaurant && (
        <RestaurantDetail
          {...H}
          restaurant={selectedRestaurant}
          onBack={goHome}
          onAddToCart={handleAddToCart}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={goToCheckout}
          onNavigateToRestaurant={goToRestaurant}
          onNearMeClick={goToNearMe}   // TASK 10: pass near me nav
        />
      )}

      {currentPage === 'business-welcome' && selectedRestaurant && (
        <BusinessWelcome
          user={user}
          restaurant={selectedRestaurant}
          onEnterDashboard={() => goToBusinessPage('business-dashboard', selectedRestaurant)}
          // TASK 2: each quick action goes to its own page
          onGoToDashboard={() => goToBusinessPage('business-dashboard', selectedRestaurant)}
          onGoToOrders={() => goToBusinessPage('orders', selectedRestaurant)}
          onGoToOrderHistory={() => goToBusinessPage('order-history', selectedRestaurant)}
          onGoToProfile={() => goToBusinessPage('business-profile', selectedRestaurant)}
          onLogout={handleLogout}
        />
      )}

      {currentPage === 'business-dashboard' && selectedRestaurant && (
        <BusinessDashboard
          {...H}
          restaurant={selectedRestaurant}
          // TASK 2: remove back button — we replace it with header nav only
          onBack={null}
          onNavigateToOrders={() => goToBusinessPage('orders', selectedRestaurant)}
          // TASK 3: fix order history nav from dashboard
          onNavigateToHistory={() => goToBusinessPage('order-history', selectedRestaurant)}
          onNavigateToProfile={() => goToBusinessPage('business-profile', selectedRestaurant)}
        />
      )}

      {currentPage === 'orders' && (
        <Orders
          {...H}
          restaurant={selectedRestaurant}
          onNavigateToMenu={() => goToBusinessPage('business-dashboard', selectedRestaurant)}
          onNavigateToOrders={() => {}}
          // TASK 3: fix order history nav from orders page
          onNavigateToHistory={() => goToBusinessPage('order-history', selectedRestaurant)}
          onNavigateToProfile={() => goToBusinessPage('business-profile', selectedRestaurant)}
        />
      )}

      {currentPage === 'order-history' && (
        <OrderHistory
          {...H}
          restaurant={selectedRestaurant}
          onNavigateToMenu={() => goToBusinessPage('business-dashboard', selectedRestaurant)}
          onNavigateToOrders={() => goToBusinessPage('orders', selectedRestaurant)}
          // TASK 3
          onNavigateToHistory={() => {}}
          onNavigateToProfile={() => goToBusinessPage('business-profile', selectedRestaurant)}
        />
      )}

      {/* TASK 2: New business profile page */}
      {currentPage === 'business-profile' && selectedRestaurant && (
        <BusinessProfile
          user={user}
          restaurant={selectedRestaurant}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          onNavigateToMenu={() => goToBusinessPage('business-dashboard', selectedRestaurant)}
          onNavigateToOrders={() => goToBusinessPage('orders', selectedRestaurant)}
          onNavigateToHistory={() => goToBusinessPage('order-history', selectedRestaurant)}
          onNavigateToProfile={() => {}}
        />
      )}

      {currentPage === 'checkout' && checkoutRestaurantId && (
        <Checkout
          {...H}
          restaurant={
            selectedRestaurant ??
            (() => {
              const f = cartItems.find(i => i.restaurantId === checkoutRestaurantId);
              return f ? { id: checkoutRestaurantId, name: f.restaurant, image_url: f.image } : null;
            })()
          }
          cartItems={cartItems.filter(i => i.restaurantId === checkoutRestaurantId)}
          allCartItems={cartItems}
          onBack={() => selectedRestaurant ? goToRestaurant(selectedRestaurant) : goHome()}
          onPlaceOrder={handlePlaceOrder}   // TASK 7: real API
          onCheckout={goToCheckout}
        />
      )}

      {currentPage === 'restaurant-login' && (
        <RestaurantLogin
          onSwitchToSignUp={() => push('restaurant-signup')}
          onLoginSuccess={handleRestaurantLoginSuccess}
        />
      )}

      {currentPage === 'restaurant-signup' && (
        <RestaurantSignUp
          onSwitchToLogin={() => push('restaurant-login')}
          onRiderSignUp={() => push('rider-signup')}
          onSignUpSuccess={handleRestaurantSignUpSuccess}
        />
      )}

      {currentPage === 'rider-signup' && (
        <RiderSignUp
          onSignUpSuccess={handleLoginSuccess}
          onRiderOnBoarding={() => push('rider-onboarding')}
          onSwitchToLogin={() => push('rider-login')}
        />
      )}

      {currentPage === 'rider-onboarding' && (
        <RiderOnBoarding onCompletion={handleRiderOnBoardingComplete} />
      )}

      {currentPage === 'rider-login' && (
        <RiderLogin
          onSwitchToSignUp={() => push('rider-signup')}
          onLoginSuccess={handleRiderLoginSuccess}
        />
      )}

      {currentPage === 'rider-dashboard' && (
        <RiderDashboard rider={riderData ?? user ?? {}} onLogout={handleLogout} />
      )}

    </div>
  );
}

export default App;
import { useState, useEffect, useCallback } from 'react';
import Homepage from './homepage/homepage.jsx';
import NearMePage from './homepage/NearMePage.jsx';
import RestaurantDetail from './homepage/RestaurantDetail.jsx';
import BusinessDashboard from './business onwer page/Businessdashboard.jsx';
import BusinessWelcome from './business onwer page/BusinessWelcome.jsx';
import Orders from './business onwer page/Orders.jsx';
import OrderHistory from './business onwer page/Orderhistory.jsx';
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
const SK_PAGE       = 'fp_current_page';
const SK_ROLE       = 'fp_user_role';       // 'customer' | 'restaurant' | 'rider'
const SK_RESTAURANT = 'fp_restaurant';      // JSON string of restaurant object
const SK_RIDER      = 'fp_rider';           // JSON string of rider object

const BUSINESS_PAGES = new Set(['business-welcome', 'business-dashboard', 'orders', 'order-history']);
const RIDER_PAGES    = new Set(['rider-dashboard']);

// Pages that should NOT be persisted across refresh (auth / sign-up flows)
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

  const push = useCallback((page, extra = {}) => {
    window.history.pushState({ page, ...extra }, '', '#' + page);
    setCurrentPage(page);
    // Persist non-transient pages so refresh restores them
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

          // ── Restore page after refresh ──────────────────────────────
          const savedPage = localStorage.getItem(SK_PAGE);

          // Fix stale role in localStorage
          if (isVendor) localStorage.setItem(SK_ROLE, 'restaurant');
          else if (isRider) localStorage.setItem(SK_ROLE, 'rider');
          else localStorage.setItem(SK_ROLE, 'customer');

          // Helper: pick the best restaurant object, rejecting stale id:1 fallbacks
          const pickRestaurant = () => {
            const fromAuth = authState.restaurant;
            const fromStorage = (() => { try { return JSON.parse(localStorage.getItem(SK_RESTAURANT) || 'null'); } catch { return null; } })();
            // Prefer whichever has a real id (not the legacy hardcoded 1)
            if (fromAuth?.id && fromAuth.id !== 1) return fromAuth;
            if (fromStorage?.id && fromStorage.id !== 1) return fromStorage;
            return fromAuth ?? fromStorage ?? null; // last resort — dashboard will re-fetch
          };

          if (savedPage && !TRANSIENT_PAGES.has(savedPage)) {
            // Restore restaurant/rider objects needed by business/rider pages
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

            // Guard: vendor must land on a business page
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
            // No saved page — send vendor to their dashboard
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
          // Clear any stale page/role so logged-out user always gets home
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

  // Fetch restaurants — runs on login state change
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

        // If the logged-in user is a restaurant owner, their own restaurant
        // may not appear in the public list yet (e.g. is_active=False pending approval).
        // Always include it so customers can navigate to it from the homepage.
        const ownRestaurant = authService.getRestaurantData();
        if (ownRestaurant?.id) {
          const alreadyInList = detailed.some(r => r.id === ownRestaurant.id);
          if (!alreadyInList) {
            // Fetch the full detail for the owner's own restaurant
            try {
              let ownDetail;
              if (isLoggedIn) {
                ownDetail = await authService.authenticatedFetch(
                  `http://127.0.0.1:8000/api/v1/restaurants/${ownRestaurant.id}/`
                );
              } else {
                const dr = await fetch(`http://127.0.0.1:8000/api/v1/restaurants/${ownRestaurant.id}/`);
                ownDetail = dr.ok ? await dr.json() : ownRestaurant;
              }
              detailed.push(ownDetail ?? ownRestaurant);
            } catch {
              detailed.push(ownRestaurant);
            }
          }
        }

        setRestaurants(detailed);
      } catch (err) { console.error('Restaurant fetch error:', err); }
    };
    fetchRestaurants();
  }, [isLoggedIn]);

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
    localStorage.setItem(SK_PAGE, 'home');
    window.history.pushState({ page: 'home' }, '', '#home');
    setCurrentPage('home');
  }, []);

  const goToNearMe = useCallback(() => {
    push('near-me');
  }, [push]);

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
      try {
        localStorage.setItem(SK_RESTAURANT, JSON.stringify(restaurant));
      } catch {}
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

    // Check if this user is actually a restaurant owner
    const role = (u?.role || u?.user_type || '').toString().toUpperCase();
    const isVendor = role === 'RESTAURANT' || role === 'VENDOR' || !!authService.getRestaurantData();

    if (isVendor) {
      const r = authService.getRestaurantData() ?? {
        id: u?.restaurant_id ?? 1,
        name: u?.restaurant_name ?? 'My Restaurant',
        address: 'Dhaka, Bangladesh',
        rating: 4.8,
      };
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
    const u = authService.getUser();
    setUser(u);

    const role = (u?.role || u?.user_type || '').toString().toUpperCase();
    const isVendor = role === 'RESTAURANT' || role === 'VENDOR' || !!authService.getRestaurantData();

    if (isVendor) {
      const r = authService.getRestaurantData() ?? {
        id: u?.restaurant_id ?? 1,
        name: u?.restaurant_name ?? 'My Restaurant',
        address: 'Dhaka, Bangladesh',
        rating: 4.8,
      };
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
    // Resolve the real restaurant — never fall back to a hardcoded id:1
    let r = authService.getRestaurantData() ?? userData?.restaurant ?? null;
    if (!r?.id) {
      try {
        const profile = await authService.fetchUserDetails();
        r = authService.getRestaurantData()
          ?? profile?.restaurant
          ?? (profile?.restaurant_id ? { id: profile.restaurant_id, name: profile.restaurant_name ?? 'My Restaurant' } : null);
      } catch (e) { console.warn('Could not fetch restaurant from profile', e); }
    }
    if (!r?.id) {
      console.error('No restaurant linked to this account. Check backend returns restaurant data on login.');
      return;
    }
    setSelectedRestaurant(r);
    goToBusinessPage('business-welcome', r);
  };

  const handleRestaurantSignUpSuccess = async (userData) => {
    // At this point authService.login() has already run inside registerRestaurantPartner,
    // so tokens + user + restaurantData are already stored in localStorage.
    setIsLoggedIn(true);
    const u = authService.getUser();
    setUser(u);

    let r = authService.getRestaurantData() ?? userData?.restaurant ?? null;

    if (!r?.id) {
      try {
        const profile = await authService.fetchUserDetails();
        r = authService.getRestaurantData()
          ?? profile?.restaurant_info
          ?? profile?.restaurant
          ?? null;
      } catch (e) { console.warn('Could not fetch restaurant from profile:', e); }
    }

    // Still no restaurant? Build a placeholder so we at least navigate.
    // The dashboard will re-fetch on mount.
    if (!r) {
      r = {
        id: null,
        name: userData?.businessName ?? u?.first_name ?? 'My Restaurant',
      };
    }

    setSelectedRestaurant(r);
    goToBusinessPage('business-welcome', r);
  };

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    setIsLoggedIn(false);
    setUser(null);
    setSelectedRestaurant(null);
    setRiderData(null);
    setCartItems([]);
    // Clear all persisted session data
    localStorage.removeItem(SK_PAGE);
    localStorage.removeItem(SK_ROLE);
    localStorage.removeItem(SK_RESTAURANT);
    localStorage.removeItem(SK_RIDER);
    goHome();
  };

  const handlePlaceOrder = () => {
    setCartItems(prev => prev.filter(i => i.restaurantId !== checkoutRestaurantId));
    alert('Order placed successfully! 🎉');
    goHome();
  };

  if (isInitializing) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', flexDirection: 'column', gap: 20,
    }}>
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
    onOrdersClick:   () => alert('Orders coming soon!'),
    onLogoClick:     goHome,
    onDeliveryClick: goHome,
    onPickupClick:   goHome,
    onNearMeClick:   goToNearMe,
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
          activeTab="delivery"
          restaurants={restaurants}
          cartItems={cartItems}
          setCartItems={setCartItems}
          onAddToCart={handleAddToCart}
          onRestaurantSignUpClick={() => push('restaurant-signup')}
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
        />
      )}

      {currentPage === 'business-welcome' && selectedRestaurant && (
        <BusinessWelcome
          user={user}
          restaurant={selectedRestaurant}
          onEnterDashboard={() => goToBusinessPage('business-dashboard', selectedRestaurant)}
          onLogout={handleLogout}
        />
      )}

      {currentPage === 'business-dashboard' && selectedRestaurant && (
        <BusinessDashboard
          {...H}
          restaurant={selectedRestaurant}
          onBack={() => goToBusinessPage('business-welcome', selectedRestaurant)}
          onNavigateToOrders={() => goToBusinessPage('orders', selectedRestaurant)}
        />
      )}

      {currentPage === 'orders' && (
        <Orders
          {...H}
          onNavigateToMenu={() => goToBusinessPage('business-dashboard', selectedRestaurant)}
          onNavigateToOrderHistory={() => goToBusinessPage('order-history', selectedRestaurant)}
        />
      )}

      {currentPage === 'order-history' && (
        <OrderHistory
          {...H}
          onNavigateToMenu={() => goToBusinessPage('business-dashboard', selectedRestaurant)}
          onNavigateToOrders={() => goToBusinessPage('orders', selectedRestaurant)}
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
          onPlaceOrder={handlePlaceOrder}
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
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Businessdashboard.css';
import './BusinessHeader.css';
import { COLORS } from '../constants.js';
import { Search, Utensils, Bike, Star, Camera, Pencil, Trash2, Plus, AlertCircle, Upload, X, ImagePlus } from 'lucide-react';
import authService from '../Authservice.js';
import vendorApiService from '../Vendorapiservice.js';
import BusinessHeader from './BusinessHeader.jsx';
const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
      background: type === 'error' ? '#fee2e2' : '#d1fae5',
      color: type === 'error' ? '#dc2626' : '#065f46',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'slideInRight 0.3s ease',
    }}>
      {type === 'error' ? <AlertCircle size={16} /> : '✓'} {message}
    </div>
  );
};

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div style={{
      background: '#fff', borderRadius: 14, padding: '28px 32px', maxWidth: 380,
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)', textAlign: 'center',
    }} onClick={e => e.stopPropagation()}>
      <Trash2 size={40} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
      <p style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>Are you sure?</p>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{message}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="modal-cancel-btn" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button
          style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14 }}
          onClick={onConfirm}
        >Delete</button>
      </div>
    </div>
  </div>
);

// ─── Logo Upload Modal ────────────────────────────────────────────────────────
const LogoUploadModal = ({ currentImage, onClose, onSave, saving }) => {
  const [preview, setPreview] = useState(currentImage);
  const [file, setFile]       = useState(null);
  const inputRef              = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onInputChange = (e) => handleFile(e.target.files[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        style={{
          background: '#fff', borderRadius: 20, padding: '32px',
          maxWidth: 460, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', margin: 0, letterSpacing: '-0.3px' }}>
              Restaurant Photo
            </h2>
            <p style={{ fontSize: 13, color: 'var(--gray-400)', margin: '3px 0 0', fontWeight: 500 }}>
              Upload a logo or banner for your restaurant
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--gray-100)', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--gray-500)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--primary)' : preview ? 'var(--gray-200)' : 'var(--gray-300)'}`,
            borderRadius: 14,
            background: dragging ? 'var(--primary-bg)' : preview ? '#000' : 'var(--gray-50)',
            cursor: 'pointer',
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transition: 'all 0.15s',
            position: 'relative',
            marginBottom: 20,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onInputChange}
            style={{ display: 'none' }}
          />
          {preview ? (
            <>
              <img
                src={preview}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* overlay hint */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 6, opacity: 0, transition: 'opacity 0.15s',
              }}
                className="logo-preview-hover"
              >
                <Camera size={28} color="white" />
                <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>Click to change</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--gray-400)', pointerEvents: 'none' }}>
              <ImagePlus size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
              <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: 'var(--gray-600)' }}>
                Drop image here or click to browse
              </p>
              <p style={{ fontSize: 12, margin: 0 }}>PNG, JPG, WEBP · Max 5 MB</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="modal-cancel-btn"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            style={{
              flex: 2, padding: '12px', borderRadius: 10, border: 'none', cursor: file ? 'pointer' : 'not-allowed',
              background: file ? 'var(--gradient-primary)' : 'var(--gray-200)',
              color: file ? 'white' : 'var(--gray-400)',
              fontWeight: 700, fontSize: 14, fontFamily: 'var(--font)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: file ? 'var(--shadow-primary)' : 'none',
              transition: 'all 0.15s',
            }}
            onClick={() => file && onSave(file)}
            disabled={!file || saving}
          >
            {saving ? (
              <>
                <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Uploading…
              </>
            ) : (
              <>
                <Upload size={15} />
                Save Photo
              </>
            )}
          </button>
        </div>
      </div>
      <style>{`
        .logo-preview-hover { pointer-events: none; }
        div:hover > .logo-preview-hover { opacity: 1 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const BusinessDashboard = ({
  restaurant, onBack, isLoggedIn, user, onLoginClick, onSignUpClick, onLogout,
  onNavigateToMenu,
  onNavigateToOrders,
  onNavigateToHistory,
  onNavigateToProfile,
  isDark = false,
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Logo upload state
  const [showLogoModal, setShowLogoModal]   = useState(false);
  const [logoUploading, setLogoUploading]   = useState(false);
  const [localLogoUrl, setLocalLogoUrl]     = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  const [confirm, setConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState('');
  const [newItemData, setNewItemData] = useState({
    name: '', description: '', price: '', discount_ammount: '',
    discount_description: '', is_available: true, image_file: null, image_preview: null,
  });

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [newDealData, setNewDealData] = useState({ description: '', min_order: '', percentage: '' });

  const fetchAll = useCallback(async () => {
    if (!restaurant?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      let details = null;
      try {
        const endpoint = `http://127.0.0.1:8000/api/v1/restaurants/${restaurant.id}/`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        if (isLoggedIn) {
          details = await authService.authenticatedFetch(endpoint, { signal: controller.signal });
        } else {
          const r = await fetch(endpoint, { signal: controller.signal });
          if (r.ok) details = await r.json();
        }
        clearTimeout(timeoutId);
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('restaurant details fetch failed', e);
        details = restaurant;
      }

      setRestaurantDetails(details ?? restaurant);
      setMenuItems(details?.items ?? []);

      if (isLoggedIn) {
        const [cats, disc] = await Promise.all([
          vendorApiService.getCategories().catch(() => []),
          vendorApiService.getDiscounts().catch(() => []),
        ]);
        const normalised = cats.map(c => ({
          category_id:   c.category_id,
          category_name: c.category_name ?? c.name ?? String(c.category_id),
        }));
        setCategories(['All', ...normalised]);
        setDeals(disc);
      } else {
        const names = [...new Set((details?.items ?? []).map(i => i.category_name).filter(Boolean))];
        setCategories(['All', ...names.map(n => ({ category_id: null, category_name: n }))]);
      }
    } catch (err) {
      console.error('fetchAll error:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [restaurant, isLoggedIn]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const displayRestaurant = restaurantDetails ?? restaurant;
  // prefer locally uploaded logo over server URL
  const displayLogoUrl = localLogoUrl ?? displayRestaurant?.image_url;

  const filteredItems = menuItems.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch = item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    const matchCat = selectedCategory === 'All' || item.category_name === (selectedCategory?.category_name ?? selectedCategory);
    return matchSearch && matchCat;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category_name || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const openAddItem = (category) => {
    setEditingItem(null);
    setSelectedCategoryForAdd(category);
    setNewItemData({ name: '', description: '', price: '', discount_ammount: '',
      discount_description: '', is_available: true, image_file: null, image_preview: null });
    setShowAddItemModal(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setSelectedCategoryForAdd(item.category_id);
    setNewItemData({
      name: item.name, description: item.description ?? '',
      price: item.price.toString(), discount_ammount: item.discount_ammount?.toString() ?? '',
      discount_description: item.discount_description ?? '',
      is_available: !!item.is_available, image_file: null, image_preview: item.image_url ?? null,
    });
    setShowAddItemModal(true);
  };

  const closeAddItemModal = () => { setShowAddItemModal(false); setEditingItem(null); };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setNewItemData(p => ({ ...p, image_file: file, image_preview: URL.createObjectURL(file) }));
  };

  const handleItemInput = (e) => {
    const { name, value, type, checked } = e.target;
    setNewItemData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmitItem = async () => {
    if (!newItemData.name.trim() || !newItemData.price) {
      showToast('Name and price are required', 'error'); return;
    }
    setSubmitting(true);
    try {
      const basePayload = {
        description: newItemData.description,
        price: parseFloat(newItemData.price),
        discount_amount: newItemData.discount_ammount ? parseFloat(newItemData.discount_ammount) : 0,
        discount_description: newItemData.discount_description,
        is_available: newItemData.is_available ? 1 : 0,
        category_id: selectedCategoryForAdd?.category_id ?? null,
        image: newItemData.image_file ?? undefined,
      };

      if (editingItem) {
        await vendorApiService.updateItem(editingItem.food_id, { ...basePayload, name: newItemData.name });
        showToast('Item updated successfully!');
      } else {
        await vendorApiService.addItem({ ...basePayload, item_name: newItemData.name });
        showToast('Item added successfully!');
      }
      closeAddItemModal();
      await fetchAll();
    } catch (err) {
      showToast(err.message || 'Failed to save item', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDeleteItem = (item) => {
    setConfirm({
      message: `Delete "${item.name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await vendorApiService.deleteItem(item.food_id);
          showToast('Item deleted');
          await fetchAll();
        } catch (e) { showToast('Failed to delete item', 'error'); }
      },
    });
  };

  const handleToggleAvailability = async (item) => {
    try {
      await vendorApiService.toggleItemAvailability(item.food_id, !item.is_available);
      setMenuItems(prev => prev.map(i => i.food_id === item.food_id ? { ...i, is_available: !i.is_available } : i));
    } catch (e) { showToast('Failed to update availability', 'error'); }
  };

  const handleSubmitCategory = async () => {
    if (!newCategoryName.trim()) { showToast('Category name is required', 'error'); return; }
    setSubmitting(true);
    try {
      await vendorApiService.addCategory({ category_name: newCategoryName.trim() });
      showToast('Category added!');
      setShowAddCategoryModal(false);
      setNewCategoryName('');
      await fetchAll();
    } catch (e) {
      showToast(e.message || 'Failed to add category', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDeleteCategory = (cat) => {
    setConfirm({
      message: `Delete category "${cat}"? Items in it will not be deleted.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          const cats = await vendorApiService.getCategories();
          const found = cats.find(c => (c.category_name ?? c.name) === cat);
          if (!found) { showToast('Category not found', 'error'); return; }
          await vendorApiService.deleteCategory(found.category_id ?? found.id);
          showToast('Category deleted');
          await fetchAll();
        } catch (e) { showToast('Failed to delete category', 'error'); }
      },
    });
  };

  const openAddDeal = () => {
    setEditingDeal(null);
    setNewDealData({ description: '', min_order: '', percentage: '' });
    setShowAddDealModal(true);
  };

  const openEditDeal = (deal) => {
    setEditingDeal(deal);
    setNewDealData({ description: deal.description, min_order: deal.min_order.toString(), percentage: deal.percentage.toString() });
    setShowAddDealModal(true);
  };

  const handleDealInput = (e) => { const { name, value } = e.target; setNewDealData(p => ({ ...p, [name]: value })); };

  const handleSubmitDeal = async () => {
    const { description, min_order, percentage } = newDealData;
    if (!description || !min_order || !percentage) { showToast('All fields are required', 'error'); return; }
    setSubmitting(true);
    try {
      const payload = { description, min_order: parseFloat(min_order), percentage: parseFloat(percentage) };
      if (editingDeal) { await vendorApiService.updateDiscount(editingDeal.id, payload); showToast('Deal updated!'); }
      else { await vendorApiService.addDiscount(payload); showToast('Deal added!'); }
      setShowAddDealModal(false); setEditingDeal(null);
      await fetchAll();
    } catch (e) { showToast(e.message || 'Failed to save deal', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteDeal = (deal) => {
    setConfirm({
      message: `Delete deal "${deal.description}"?`,
      onConfirm: async () => {
        setConfirm(null);
        try { await vendorApiService.deleteDiscount(deal.id); showToast('Deal deleted'); await fetchAll(); }
        catch (e) { showToast('Failed to delete deal', 'error'); }
      },
    });
  };

  // ── Logo upload handler ──────────────────────────────────────────────────────
  const handleLogoSave = async (file) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();

      formData.append('restaurant_image', file);

      let token = authService.getAccessToken();
      let res = await fetch('http://127.0.0.1:8000/api/vendor/profile/', {
        method: 'PATCH',
        body: formData,
        headers: { Authorization: `Bearer ${token}` },

      });
      if (res.status === 401) {
        try { token = await authService.refreshAccessToken(); } catch { throw new Error('Session expired. Please log in again.'); }
        res = await fetch('http://127.0.0.1:8000/api/vendor/profile/', {
          method: 'PATCH',
          body: formData,
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.restaurant_image?.[0] || errData.image?.[0] || `Upload failed (${res.status})`);
      }
      setLocalLogoUrl(URL.createObjectURL(file));
      showToast('Restaurant photo updated!');
      setShowLogoModal(false);
    } catch (e) {
      showToast(e.message || 'Failed to upload photo', 'error');
    } finally {
      setLogoUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="business-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, border: `3px solid var(--primary-light)`, borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--gray-500)', fontSize: 15, fontWeight: 600 }}>Loading restaurant…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="business-dashboard">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      <BusinessHeader
        activePage="menu"
        user={user}
        restaurant={displayRestaurant}
        onLogout={onLogout}
        onNavigateToMenu={onNavigateToMenu ?? (() => {})}
        onNavigateToOrders={onNavigateToOrders ?? (() => {})}
        onNavigateToHistory={onNavigateToHistory ?? (() => {})}
        onNavigateToProfile={onNavigateToProfile ?? (() => {})}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      {/* ── Restaurant Banner ── */}
      <div className="business-restaurant-banner">
        <div className="business-banner-content">

          {/* ── Logo with upload overlay ── */}
          <div className="business-banner-image bd-logo-wrap">
            {displayLogoUrl
              ? <img src={displayLogoUrl} alt={displayRestaurant?.name} className="restaurant-banner-img" />
              : <Utensils size={64} color="var(--primary)" style={{ opacity: 0.6 }} />
            }
            {/* Camera overlay button */}
            <button
              className="bd-logo-upload-btn"
              onClick={() => setShowLogoModal(true)}
              title="Change restaurant photo"
            >
              <Camera size={17} />
              <span>Change Photo</span>
            </button>
          </div>

          <div className="business-restaurant-info">
            <h1 className="business-restaurant-name">{displayRestaurant?.name}</h1>
            <p className="business-restaurant-subtitle">Restaurant</p>
            <div className="business-restaurant-rating">
              {parseFloat(displayRestaurant?.total_rated) > 0 ? (
                <>
                  {[1, 2, 3, 4, 5].map(s => {
                    const filled = s <= Math.round(parseFloat(displayRestaurant?.rating || 0));
                    return (
                      <Star key={s} size={15}
                        fill={filled ? '#f59e0b' : 'none'}
                        color={filled ? '#f59e0b' : '#d1d5db'}
                        style={{ marginRight: 2, filter: filled ? 'drop-shadow(0 0 3px #f59e0b88)' : 'none' }}
                      />
                    );
                  })}
                  <span className="rating-number" style={{ marginLeft: 5 }}>{parseFloat(displayRestaurant?.rating || 0).toFixed(1)}</span>
                  <span className="rating-count">({displayRestaurant?.total_rated})</span>
                </>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-bg)', padding: '2px 10px', borderRadius: 999 }}>✨ New</span>
              )}
            </div>

            {/* Quick update photo button (alternate location for visibility) */}
            <button
              className="bd-update-photo-btn"
              onClick={() => setShowLogoModal(true)}
            >
              <ImagePlus size={14} />
              {displayLogoUrl ? 'Update Photo' : 'Add Restaurant Photo'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Deals Section ── */}
      <div className="business-deals-section">
        <h2 className="business-section-title">Available Deals</h2>
        <div className="business-deals-grid">
          {deals.map((deal, i) => (
            <div key={deal.id ?? i} className="business-deal-card"
              style={{ background: i % 2 === 0 ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' : COLORS.gradientPrimary }}>
              <div className="deal-content" style={{ flex: 1 }}>
                <h3 className="deal-title">{deal.description}</h3>
                <p className="deal-description">Min. ৳{deal.min_order} • {deal.percentage}% off</p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => openEditDeal(deal)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#fff', fontSize: 12 }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDeleteDeal(deal)}
                  style={{ background: 'rgba(220,38,38,0.7)', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#fff', fontSize: 12 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          <button className="business-add-card" onClick={openAddDeal}>
            <div className="add-card-icon"><Plus size={22} /></div>
            <div className="add-card-text">Add New Deal</div>
          </button>
        </div>
      </div>

      {/* ── Menu Section ── */}
      <div className="business-menu-section">
        <h2 className="business-section-title">Menu</h2>
        <div className="business-menu-controls">
          <div className="business-search-in-menu">
            <Search size={16} style={{ marginRight: 8, color: 'var(--gray-400)', flexShrink: 0 }} />
            <input type="text" placeholder="Search in menu" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="business-menu-search-input" />
          </div>
        </div>

        <div className="business-menu-categories">
          <div className="business-categories-scroll">
            {categories.map(cat => {
              const catName = cat?.category_name ?? cat;
              const catKey  = cat?.category_id != null ? cat.category_id : catName;
              const isActive = selectedCategory === cat ||
                (selectedCategory?.category_id != null && selectedCategory?.category_id === cat?.category_id);
              return (
                <div key={catKey} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    className={`business-category-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}>
                    {catName}
                  </button>
                  {catName !== 'All' && (
                    <button onClick={() => handleDeleteCategory(catName)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--gray-400)', padding: '2px 4px', borderRadius: 4,
                        display: 'flex', alignItems: 'center' }}
                      title="Delete category">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
            <button className="business-add-category-btn" onClick={() => setShowAddCategoryModal(true)}>
              + Add Category
            </button>
          </div>
        </div>

        <div className="business-menu-items-container">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="business-category-section">
              <h3 className="business-category-title">{category}</h3>
              <p className="business-category-subtitle">{items.length} item{items.length !== 1 ? 's' : ''}</p>
              <div className="business-items-grid">
                {items.map(item => (
                  <div key={item.food_id} className="business-item-card">
                    <div className="business-item-info">
                      <h4 className="business-item-name">{item.name}</h4>
                      <p className="business-item-description">{item.description}</p>
                      <div className="business-item-footer">
                        <span className="business-item-price">৳{item.price}</span>
                        {item.discount_ammount > 0 && <span className="business-item-discount">−{item.discount_ammount}%</span>}
                      </div>
                      <div className="business-item-controls">
                        <button className="business-item-edit-btn" onClick={() => openEditItem(item)}>
                          <Pencil size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                            borderRadius: 7, border: '1px solid #fee2e2', background: '#fff8f8',
                            color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          <Trash2 size={13} /> Remove
                        </button>
                        <div className="business-item-availability">
                          <label className="availability-switch">
                            <input type="checkbox" checked={!!item.is_available}
                              onChange={() => handleToggleAvailability(item)} />
                            <span className="availability-slider" />
                          </label>
                          <span className="availability-label">
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="business-item-image-container">
                      <div className="business-item-image">
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                          : <Utensils size={32} color="var(--primary)" style={{ opacity: 0.5 }} />}
                      </div>
                    </div>
                  </div>
                ))}
                <button className="business-add-item-card" onClick={() => {
                  const catObj = categories.find(c => c?.category_name === category);
                  openAddItem(catObj);
                }}>
                  <div className="add-item-icon"><Plus size={22} /></div>
                  <div className="add-item-text">Add New Item</div>
                </button>
              </div>
            </div>
          ))}

          {categories.slice(1).filter(cat => !Object.keys(groupedItems).includes(cat?.category_name ?? cat)).map(cat => (
            <div key={cat?.category_id ?? cat?.category_name ?? cat} className="business-category-section">
              <h3 className="business-category-title">{cat?.category_name ?? cat}</h3>
              <p className="business-category-subtitle">0 items</p>
              <div className="business-items-grid">
                <button className="business-add-item-card" onClick={() => openAddItem(cat)}>
                  <div className="add-item-icon"><Plus size={22} /></div>
                  <div className="add-item-text">Add New Item</div>
                </button>
              </div>
            </div>
          ))}

          {Object.keys(groupedItems).length === 0 && categories.length <= 1 && (
            <div className="business-no-results">
              <div className="no-results-icon"><Search size={48} style={{ color: 'var(--gray-400)', opacity: 0.5 }} /></div>
              <p>{searchQuery ? `No items found for "${searchQuery}"` : 'No items yet. Add a category and start adding items!'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ADD/EDIT ITEM MODAL */}
      {showAddItemModal && (
        <div className="modal-overlay" onClick={closeAddItemModal}>
          <div className="add-item-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItem ? `Edit "${editingItem.name}"` : `Add Item to ${selectedCategoryForAdd?.category_name ?? selectedCategoryForAdd}`}
              </h2>
              <button className="modal-close-btn" onClick={closeAddItemModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Item Photo</label>
                <div className="image-upload-area">
                  {newItemData.image_preview ? (
                    <div className="image-preview-container">
                      <img src={newItemData.image_preview} alt="Preview" className="image-preview" />
                      <button className="remove-image-btn"
                        onClick={() => setNewItemData(p => ({ ...p, image_file: null, image_preview: null }))}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="upload-label">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="file-input" />
                      <div className="upload-placeholder">
                        <Camera size={32} style={{ color: 'var(--gray-400)', marginBottom: 8 }} />
                        <div className="upload-text">Click to upload photo</div>
                        <div className="upload-subtext">PNG, JPG up to 5MB</div>
                      </div>
                    </label>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input type="text" name="name" value={newItemData.name} onChange={handleItemInput}
                  placeholder="e.g., Chicken Cashewnut Salad" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea name="description" value={newItemData.description} onChange={handleItemInput}
                  placeholder="Describe your dish…" className="form-textarea" rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Price (৳) *</label>
                <input type="number" name="price" value={newItemData.price} onChange={handleItemInput}
                  placeholder="0.00" className="form-input" min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Availability</label>
                <div className="availability-toggle-group">
                  <label className="availability-switch">
                    <input type="checkbox" name="is_available" checked={newItemData.is_available}
                      onChange={handleItemInput} />
                    <span className="availability-slider" />
                  </label>
                  <span className="availability-label">{newItemData.is_available ? 'Available' : 'Unavailable'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={closeAddItemModal} disabled={submitting}>Cancel</button>
              <button className="modal-submit-btn" onClick={handleSubmitItem}
                disabled={submitting || !newItemData.name || !newItemData.price}>
                {submitting ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowAddCategoryModal(false)}>
          <div className="add-category-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Category</h2>
              <button className="modal-close-btn" onClick={() => setShowAddCategoryModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Desserts, Beverages, Appetizers" className="form-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={() => setShowAddCategoryModal(false)} disabled={submitting}>Cancel</button>
              <button className="modal-submit-btn" onClick={handleSubmitCategory}
                disabled={submitting || !newCategoryName.trim()}>
                {submitting ? 'Adding…' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT DEAL MODAL */}
      {showAddDealModal && (
        <div className="modal-overlay" onClick={() => { setShowAddDealModal(false); setEditingDeal(null); }}>
          <div className="add-deal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingDeal ? 'Edit Deal' : 'Add New Deal'}</h2>
              <button className="modal-close-btn" onClick={() => { setShowAddDealModal(false); setEditingDeal(null); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Deal Name *</label>
                <input type="text" name="description" value={newDealData.description}
                  onChange={handleDealInput} placeholder="e.g., Weekend Special – 20% Off" className="form-input" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Minimum Order (৳) *</label>
                  <input type="number" name="min_order" value={newDealData.min_order}
                    onChange={handleDealInput} placeholder="0" className="form-input" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount (%) *</label>
                  <input type="number" name="percentage" value={newDealData.percentage}
                    onChange={handleDealInput} placeholder="0" className="form-input" min="0" max="100" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn"
                onClick={() => { setShowAddDealModal(false); setEditingDeal(null); }}
                disabled={submitting}>Cancel</button>
              <button className="modal-submit-btn" onClick={handleSubmitDeal}
                disabled={submitting || !newDealData.description || !newDealData.min_order || !newDealData.percentage}>
                {submitting ? 'Saving…' : editingDeal ? 'Save Changes' : 'Add Deal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGO UPLOAD MODAL ── */}
      {showLogoModal && (
        <LogoUploadModal
          currentImage={displayLogoUrl}
          onClose={() => setShowLogoModal(false)}
          onSave={handleLogoSave}
          saving={logoUploading}
        />
      )}
    </div>
  );
};

export default BusinessDashboard;
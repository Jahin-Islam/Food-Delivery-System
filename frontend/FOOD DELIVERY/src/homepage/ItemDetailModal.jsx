import React, { useState, useEffect } from 'react';
import { X, Utensils } from 'lucide-react';
import './ItemDetailModal.css';

const ItemDetailModal = ({ 
  isOpen, 
  onClose, 
  item,
  onAddToCart,
  frequentlyBoughtItems = []
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [unavailableAction, setUnavailableAction] = useState('Remove it from my order');
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [showAllExtras, setShowAllExtras] = useState(false);

  // Mock variations - replace with actual data from item
  // Only use variations if the item actually has them
  const variations = item?.variations && item.variations.length > 0 
    ? item.variations 
    : [];

  // Reset all states when item changes or modal opens
  useEffect(() => {
    if (isOpen && item) {
      // Reset to defaults
      setQuantity(1);
      setSelectedExtras([]);
      setSpecialInstructions('');
      setUnavailableAction('Remove it from my order');
      setShowAllExtras(false);
      
      // Set default variation if exists
      if (variations.length > 0) {
        const defaultVariation = variations.find(v => v.isDefault) || variations[0];
        setSelectedVariation(defaultVariation);
      } else {
        setSelectedVariation(null);
      }
    }
  }, [isOpen, item?.food_id]); // Reset when modal opens or item changes

  if (!isOpen || !item) return null;

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleExtraToggle = (extraItem) => {
    setSelectedExtras(prev => {
      const exists = prev.find(e => e.id === extraItem.id);
      if (exists) {
        return prev.filter(e => e.id !== extraItem.id);
      } else {
        return [...prev, extraItem];
      }
    });
  };

  const handleAddToCart = () => {
    // For items without variations, use the base item price
    if (!selectedVariation) {
      const cartItem = {
        id: `${item.food_id}-${Date.now()}`,
        foodId: item.food_id,
        name: item.name,
        price: item.price,
        originalPrice: item.original_price,
        restaurant: item.restaurant,
        restaurantId: item.restaurantId,
        restaurantImage: item.restaurantImage,
        image: item.image_url,
        emoji: item.emoji || '🍽️',
        quantity: quantity,
        variation: null,
        extras: selectedExtras,
        specialInstructions: specialInstructions,
        unavailableAction: unavailableAction
      };

      // Calculate total price including extras (per item)
      const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
      cartItem.price = item.price + extrasTotal;

      onAddToCart(cartItem);
      onClose();
      return;
    }

    // For items with variations
    const cartItem = {
      id: `${item.food_id}-${selectedVariation.id}-${Date.now()}`,
      foodId: item.food_id,
      name: `${item.name} (${selectedVariation.size})`,
      price: selectedVariation.price,
      originalPrice: item.original_price,
      restaurant: item.restaurant,
      restaurantId: item.restaurantId,
      restaurantImage: item.restaurantImage,
      image: item.image_url,
      emoji: item.emoji || '🍽️',
      quantity: quantity,
      variation: selectedVariation,
      extras: selectedExtras,
      specialInstructions: specialInstructions,
      unavailableAction: unavailableAction
    };

    // Calculate total price including extras (per item)
    const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    cartItem.price = selectedVariation.price + extrasTotal;

    onAddToCart(cartItem);
    onClose(); // Auto-close modal after adding to cart
  };

  const displayedExtras = showAllExtras ? frequentlyBoughtItems : frequentlyBoughtItems.slice(0, 3);
  const hasMoreExtras = frequentlyBoughtItems.length > 3;

  // Calculate total price
  const basePrice = selectedVariation ? selectedVariation.price : (item?.price || 0);
  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const totalPrice = (basePrice + extrasTotal) * quantity;

  return (
    <>
      {/* Overlay */}
      <div className="item-modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="item-detail-modal">
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose}>
          <X size={16} />
        </button>

        {/* Modal Content */}
        <div className="modal-content-scroll">
          {/* Item Image */}
          <div className="modal-item-image">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} />
            ) : (
              <div className="modal-item-emoji"><Utensils size={80} style={{opacity:0.4, color:"var(--gray-400)"}} /></div>
            )}
          </div>

          {/* Item Info */}
          <div className="modal-item-info">
            <h2 className="modal-item-name">{item.name}</h2>
            <p className="modal-item-price">Tk {selectedVariation?.price || item.price}</p>
            {item.description && (
              <p className="modal-item-description">{item.description}</p>
            )}
          </div>

          {/* Variations Section */}
          {variations.length > 0 && (
            <div className="modal-section">
              <div className="section-header">
                <h3 className="section-title">Variation</h3>
                <span className="required-badge">Required</span>
              </div>
              <p className="section-subtitle">Select 1</p>

              <div className="variation-options">
                {variations.map((variation) => (
                  <label key={variation.id} className="variation-option">
                    <div className="variation-info">
                      <span className="variation-size">{variation.size}</span>
                      <span className="variation-price">Tk {variation.price}</span>
                    </div>
                    <input
                      type="radio"
                      name="variation"
                      checked={selectedVariation?.id === variation.id}
                      onChange={() => setSelectedVariation(variation)}
                    />
                    <span className="radio-custom"></span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Frequently Bought Together */}
          {frequentlyBoughtItems.length > 0 && (
            <div className="modal-section">
              <div className="section-header">
                <h3 className="section-title">Frequently bought together</h3>
                <span className="optional-badge">Optional</span>
              </div>
              <p className="section-subtitle">Others around you liked this</p>

              <div className="extras-list">
                {displayedExtras.map((extra) => (
                  <label key={extra.id} className="extra-item">
                    <div className="extra-item-info">
                      <div className="extra-item-image">
                        {extra.image ? (
                          <img src={extra.image} alt={extra.name} />
                        ) : (
                          <span className="extra-emoji"><Utensils size={22} color="var(--primary)" /></span>
                        )}
                      </div>
                      <div className="extra-item-details">
                        <span className="extra-item-name">{extra.name}</span>
                      </div>
                    </div>
                    <div className="extra-item-right">
                      <span className="extra-item-price">+ Tk {extra.price}</span>
                      <input
                        type="checkbox"
                        checked={selectedExtras.some(e => e.id === extra.id)}
                        onChange={() => handleExtraToggle(extra)}
                      />
                      <span className="checkbox-custom"></span>
                    </div>
                  </label>
                ))}
              </div>

              {hasMoreExtras && (
                <button 
                  className="view-more-btn"
                  onClick={() => setShowAllExtras(!showAllExtras)}
                >
                  {showAllExtras ? '˄ Show less' : `˅ View ${frequentlyBoughtItems.length - 3} more`}
                </button>
              )}
            </div>
          )}

          {/* Special Instructions */}
          <div className="modal-section">
            <h3 className="section-title">Special instructions</h3>
            <p className="section-subtitle">Special requests are subject to the restaurant's approval. Tell us here!</p>
            <textarea
              className="special-instructions-input"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* If Item Not Available */}
          <div className="modal-section">
            <h3 className="section-title">If this item is not available</h3>
            <select
              className="unavailable-select"
              value={unavailableAction}
              onChange={(e) => setUnavailableAction(e.target.value)}
            >
              <option value="Remove it from my order">Remove it from my order</option>
              <option value="Call me">Call me</option>
              <option value="Refund (if bought)">Refund (if bought)</option>
            </select>
          </div>
        </div>

        {/* Footer - Quantity and Add to Cart */}
        <div className="modal-footer">
          <div className="quantity-controls-modal">
            <button 
              className="qty-btn-modal"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              −
            </button>
            <span className="qty-display-modal">{quantity}</span>
            <button 
              className="qty-btn-modal"
              onClick={() => handleQuantityChange(1)}
            >
              +
            </button>
          </div>

          <button 
            className="add-to-cart-modal-btn"
            onClick={handleAddToCart}
          >
            Add {quantity > 1 ? `${quantity} ` : ''}to cart • ৳{totalPrice}
          </button>
        </div>
      </div>
    </>
  );
};

export default ItemDetailModal;
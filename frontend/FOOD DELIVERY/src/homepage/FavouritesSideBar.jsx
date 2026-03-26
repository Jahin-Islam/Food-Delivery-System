import { useState, useEffect } from 'react';
import './FavouritesSideBar.css';
import { COLORS } from '../constants.js';
import { Heart, Utensils, MapPin, Star, X } from 'lucide-react';

const FK = 'fp_favourites';

const FavouritesSidebar = ({ isOpen, onClose, onNavigateToRestaurant }) => {
  const [favourites, setFavourites] = useState([]);

  // Reload from localStorage every time the sidebar opens
  useEffect(() => {
    if (isOpen) {
      try {
        setFavourites(JSON.parse(localStorage.getItem(FK) || '[]'));
      } catch {
        setFavourites([]);
      }
    }
  }, [isOpen]);

  const handleGoToRestaurant = (fav) => {
    if (onNavigateToRestaurant) onNavigateToRestaurant(fav);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fav-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`fav-sidebar ${isOpen ? 'visible' : 'hidden'}`}>

        {/* Header */}
        <div className="fav-header">
          <h3 className="fav-title">
            <Heart size={18} fill={COLORS.primary} color={COLORS.primary} />
            Favourites
          </h3>
          <button className="fav-close-btn" onClick={onClose} aria-label="Close favourites">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="fav-content">
          {favourites.length === 0 ? (

            /* ── Empty state ── */
            <div className="fav-empty">
              <div className="fav-empty-icon">
                <Heart size={80} strokeWidth={1} color={COLORS.primary} opacity={0.3} />
              </div>
              <p className="fav-empty-title">No favourites yet</p>
              <p className="fav-empty-sub">
                Tap the heart ♡ on any restaurant to save it here
              </p>
            </div>

          ) : (

            /* ── Favourites list ── */
            <div className="fav-list">
              {favourites.map((fav, index) => (
                <div key={fav.id ?? index} className="fav-card">

                  {/* Restaurant info */}
                  <div className="fav-card-info">
                    <div className="fav-card-img">
                      {fav.image_url ? (
                        <img
                          src={fav.image_url}
                          alt={fav.name}
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <Utensils size={24} color={COLORS.primary} />
                      )}
                    </div>

                    <div className="fav-card-text">
                      <p className="fav-card-name">{fav.name}</p>

                      {fav.address && (
                        <p className="fav-card-address">
                          <MapPin size={10} />
                          {fav.address.length > 38
                            ? fav.address.slice(0, 38) + '…'
                            : fav.address}
                        </p>
                      )}

                      {fav.rating && (
                        <p className="fav-card-rating">
                          <Star size={10} color="#f59e0b" fill="#f59e0b" />
                          {fav.rating}
                          {fav.total_rated ? ` (${fav.total_rated})` : ''}
                        </p>
                      )}
                    </div>

                    <Heart
                      className="fav-card-heart"
                      size={16}
                      fill={COLORS.primary}
                      color={COLORS.primary}
                    />
                  </div>

                  {/* Go to restaurant */}
                  <button
                    className="fav-go-btn"
                    onClick={() => handleGoToRestaurant(fav)}
                  >
                    Go to restaurant
                  </button>

                </div>
              ))}
            </div>

          )}
        </div>
      </aside>
    </>
  );
};

export default FavouritesSidebar;
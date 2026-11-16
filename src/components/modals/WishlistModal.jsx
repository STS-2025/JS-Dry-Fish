import React from 'react';
import { getProductPackPrice, useCart } from '../../context/CartContext';
import AppIcon from '../common/AppIcon';
import { getProductPlaceholder } from '../../utils/productPlaceholder';
import useBodyScrollLock from '../../utils/useBodyScrollLock';

export default function WishlistModal({ isOpen, onClose }) {
  const {
    products,
    wishlist,
    isTamil,
    toggleWishlist,
    addToCart,
    getItemWeight,
    setQuickViewProduct
  } = useCart();

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const savedProducts = products.filter(product => wishlist.includes(product.id));
  const title = isTamil ? 'விருப்பப்பட்டியல்' : 'My Wishlist';

  return (
    <div className="modal-overlay" style={{ display: 'grid', zIndex: 1200 }}>
      <section
        className="modal-container wishlist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishlist-modal-title"
      >
        <div className="modal-head">
          <h3 id="wishlist-modal-title"><AppIcon name="heart" /> {title} ({savedProducts.length})</h3>
          <button type="button" className="close-drawer" onClick={onClose} aria-label="Close wishlist">×</button>
        </div>
        <div className="modal-body wishlist-modal-body">
          {savedProducts.length ? (
            <div className="wishlist-product-list">
              {savedProducts.map(product => {
                const weight = getItemWeight(product.id);
                const price = getProductPackPrice(product, weight);
                const name = isTamil ? product.nameTa : product.nameEn;
                const fallbackSvg = getProductPlaceholder(product.fallbackIcon, 120);

                return (
                  <article className="wishlist-product" key={product.id}>
                    <button
                      type="button"
                      className="wishlist-product-image-button"
                      onClick={() => {
                        setQuickViewProduct(product);
                        onClose();
                      }}
                      aria-label={isTamil ? `${name} விவரங்களைப் பார்க்க` : `View ${name}`}
                    >
                      <img
                        src={product.img || fallbackSvg}
                        alt=""
                        onError={event => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = fallbackSvg;
                        }}
                      />
                    </button>
                    <div className="wishlist-product-details">
                      <button
                        type="button"
                        className="wishlist-product-name"
                        onClick={() => {
                          setQuickViewProduct(product);
                          onClose();
                        }}
                      >
                        {name}
                      </button>
                      <span>{weight} · ₹{price}</span>
                      <div className="wishlist-product-actions">
                        <button type="button" onClick={() => addToCart(product, weight)}>
                          {isTamil ? 'கூடையில் சேர்' : 'Add to cart'}
                        </button>
                        <button type="button" className="wishlist-remove" onClick={() => toggleWishlist(product.id)}>
                          {isTamil ? 'நீக்கு' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="wishlist-empty">
              <AppIcon name="heart" size={36} />
              <p>{isTamil ? 'விருப்பப்பட்டியலில் பொருட்கள் இல்லை. பொருட்களில் உள்ள இதயக் குறியை அழுத்தி சேமிக்கவும்.' : 'Your wishlist is empty. Tap the heart on a product to save it here.'}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

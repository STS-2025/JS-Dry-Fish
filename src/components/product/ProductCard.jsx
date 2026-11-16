import React from 'react';
import { useCart, getProductPackPrice, getProductPackMrp } from '../../context/CartContext';
import ProductRating from './ProductRating';
import AppIcon from '../common/AppIcon';
import { getProductPlaceholder } from '../../utils/productPlaceholder';

export default function ProductCard({ product }) {
  const {
    cart = [],
    addToCart,
    updateQty,
    buyNow,
    wishlist,
    toggleWishlist,
    isTamil,
    getItemWeight,
    setItemWeight,
    setQuickViewProduct
  } = useCart();

  const packs = (product.availablePacks && product.availablePacks.length > 0)
    ? product.availablePacks
    : (product.category === 'pickle' ? ['200g', '500g'] : ['250g', '500g', '1kg']);

  // Always show 250g rate by default on product cards
  const defaultWeight = packs.includes('250g') ? '250g' : packs[0];
  const currentWeight = getItemWeight(product.id, defaultWeight);
  const curPrice = getProductPackPrice(product, currentWeight);
  const curMrp = getProductPackMrp(product, currentWeight);

  const cartItem = (cart || []).find(item => item.id === product.id && item.weight === currentWeight);
  const itemQty = cartItem ? cartItem.qty : 0;

  const isWished = wishlist.includes(product.id);
  const fallbackSvg = getProductPlaceholder(product.fallbackIcon);

  return (
    <article
      className="product-card"
      onClick={() => setQuickViewProduct(product)}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-top">
        <button
          type="button"
          className={`wishlist-btn ${isWished ? 'active' : ''}`}
          aria-label={isWished
            ? (isTamil ? 'விருப்பப்பட்டியலில் இருந்து நீக்கு' : 'Remove from wishlist')
            : (isTamil ? 'விருப்பப்பட்டியலில் சேர்' : 'Add to wishlist')}
          aria-pressed={isWished}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          title={isTamil ? 'விருப்பப்பட்டியல்' : 'Wishlist'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
              fill={isWished ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <img
          src={product.img || fallbackSvg}
          alt={isTamil ? product.nameTa : product.nameEn}
          className="product-img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackSvg;
          }}
        />
      </div>

      <div className="card-details">
      
        <h3 className="product-title">
          {isTamil ? product.nameTa : product.nameEn}
        </h3>
        <div className="product-tamil-name">
          {isTamil ? product.nameEn : product.nameTa}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <ProductRating product={product} />
        </div>

        {/* Weight Selector */}
        <div className="weight-selector-row" onClick={(e) => e.stopPropagation()}>
          {packs.map(weight => (
            <button
              key={weight}
              type="button"
              className={`weight-btn ${currentWeight === weight ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setItemWeight(product.id, weight);
              }}
            >
              {weight === '1kg' ? '1 Kg' : weight}
            </button>
          ))}
        </div>

        {/* Price Row */}
        <div className="price-row">
          <span className="curr-price">₹{curPrice}</span>
          {curMrp > curPrice && (
            <>
              <span className="mrp-price">₹{curMrp}</span>
              <span className="save-percent">{Math.round(((curMrp - curPrice) / curMrp) * 100)}% {isTamil ? 'தள்ளுபடி' : 'off'}</span>
            </>
          )}
        </div>

        {/* Actions: ADD TO CART & BUY NOW (Single Line) */}
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          {itemQty > 0 ? (
            <div className="card-qty-stepper" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="qty-btn-minus"
                aria-label="Decrease quantity"
                onClick={(e) => {
                  e.stopPropagation();
                  updateQty(product.id, currentWeight, -1);
                }}
              >
                −
              </button>
              <span className="qty-val">{itemQty}</span>
              <button
                type="button"
                className="qty-btn-plus"
                aria-label="Increase quantity"
                onClick={(e) => {
                  e.stopPropagation();
                  updateQty(product.id, currentWeight, 1);
                }}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-add-cart"
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product, currentWeight);
              }}
            >
              <AppIcon name="cart" size={13} />
              <span className="btn-text-full">{isTamil ? 'கார்ட்டில் சேர்' : 'ADD TO CART'}</span>
              <span className="btn-text-short">{isTamil ? 'கார்ட்' : 'ADD'}</span>
            </button>
          )}

          <button
            type="button"
            className="btn-buy-now"
            onClick={(e) => {
              e.stopPropagation();
              buyNow(product, currentWeight);
            }}
          >
            <AppIcon name="bolt" size={13} />
            <span className="btn-text-full">{isTamil ? 'இப்போதே வாங்கு' : 'BUY NOW'}</span>
            <span className="btn-text-short">{isTamil ? 'வாங்கு' : 'BUY'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

import React from 'react';
import { useCart, getProductPackMrp, getProductPackPrice } from '../../context/CartContext';
import ProductRating from './ProductRating';
import { getProductPlaceholder } from '../../utils/productPlaceholder';
import AppIcon from '../common/AppIcon';
import useBodyScrollLock from '../../utils/useBodyScrollLock';

const BONE_TYPE_LABELS = {
  'boneless': { en: '100% Boneless', ta: '100% முள் இல்லாதது' },
  'single-bone': { en: 'Single Center Bone', ta: 'ஒற்றை நடு முள்' },
  'whole-crisp': { en: 'Whole Crispy Chewable', ta: 'முழுதும் மொறுமொறுப்பானது' }
};

const SALT_LABELS = {
  'mild': { en: 'Mild / Low Salt', ta: 'மிதமான உப்பு (Low Salt)' },
  'traditional': { en: 'Traditional Sea Salted', ta: 'பாரம்பரிய கடல் உப்பு' }
};

export default function QuickViewModal() {
  const {
    quickViewProduct,
    setQuickViewProduct,
    cart = [],
    addToCart,
    updateQty,
    buyNow,
    getItemWeight,
    setItemWeight,
    isTamil
  } = useCart();

  useBodyScrollLock(Boolean(quickViewProduct));

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const packs = (product.availablePacks && product.availablePacks.length > 0)
    ? product.availablePacks
    : (product.category === 'pickle' ? ['200g', '500g'] : ['250g', '500g', '1kg']);

  const defaultWeight = packs.includes('250g') ? '250g' : packs[0];
  const currentWeight = getItemWeight(product.id, defaultWeight);
  const curPrice = getProductPackPrice(product, currentWeight);
  const curMrp = getProductPackMrp(product, currentWeight);
  const discount = curMrp > curPrice ? Math.round(((curMrp - curPrice) / curMrp) * 100) : 0;
  const fallbackSvg = getProductPlaceholder(product.fallbackIcon);

  const cartItem = (cart || []).find(item => item.id === product.id && item.weight === currentWeight);
  const itemQty = cartItem ? cartItem.qty : 0;

  const boneLabel = product.boneType && BONE_TYPE_LABELS[product.boneType]
    ? (isTamil ? BONE_TYPE_LABELS[product.boneType].ta : BONE_TYPE_LABELS[product.boneType].en)
    : product.boneType;

  const saltLabel = product.salt && SALT_LABELS[product.salt]
    ? (isTamil ? SALT_LABELS[product.salt].ta : SALT_LABELS[product.salt].en)
    : product.salt;

  const descriptionText = isTamil
    ? (product.descTa || product.descEn)
    : (product.descEn || product.descTa);

  return (
    <div
      className="product-details-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setQuickViewProduct(null);
        }
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="product-details-modal-card">
        {/* Modal Header */}
        <div className="product-details-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcon name="fish" size={18} />
            <span style={{ fontSize: '15px', fontWeight: 800 }}>
              {isTamil ? 'தயாரிப்பு விவரங்கள்' : 'Product Details'}
            </span>
          </div>
          <button
            type="button"
            className="product-details-close-btn"
            onClick={() => setQuickViewProduct(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="product-details-body">
          <div className="product-details-grid">
            {/* Left: Product Image */}
            <div className="product-details-image-box">
              <img
                src={product.img || fallbackSvg}
                alt={isTamil ? product.nameTa : product.nameEn}
                className="product-details-image"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackSvg;
                }}
              />
              {product.tag && (
                <span className="product-details-tag-pill">{product.tag}</span>
              )}
            </div>

            {/* Right: Info */}
            <div className="product-details-info">
              

              <h2 className="product-details-title">
                {isTamil ? product.nameTa : product.nameEn}
              </h2>
              <div className="product-tamil-name">
                {isTamil ? product.nameEn : product.nameTa}
              </div>

              {/* Rating */}
              <div style={{ margin: '8px 0' }}>
                <ProductRating product={product} />
              </div>

              {/* Price Row */}
              <div className="price-row" style={{ margin: '10px 0 8px 0', alignItems: 'baseline' }}>
                <span className="curr-price" style={{ fontSize: '24px', fontWeight: 800 }}>
                  ₹{curPrice}
                </span>
                {discount > 0 && (
                  <>
                    <span className="mrp-price" style={{ fontSize: '14px', marginLeft: '8px' }}>₹{curMrp}</span>
                    <span className="save-percent" style={{ fontSize: '12px', marginLeft: '6px' }}>{discount}% off</span>
                  </>
                )}
              </div>

              {/* Pack Size Selection */}
              <div style={{ margin: '10px 0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {isTamil ? 'எடை அளவு தேர்வு செய்க:' : 'Select Pack Size:'}
                </div>
                <div className="weight-selector-row">
                  {packs.map(weight => (
                    <button
                      key={weight}
                      type="button"
                      className={`weight-btn ${currentWeight === weight ? 'active' : ''}`}
                      onClick={() => setItemWeight(product.id, weight)}
                    >
                      {weight === '1kg' ? '1 Kg' : weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attributes: Bone Type & Salt Content (Stock removed as requested) */}
              {(boneLabel || saltLabel) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0' }}>
                  {boneLabel && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      border: '1px solid #dbeafe'
                    }}>
                      <AppIcon name="bone" size={14} />
                      <span>{boneLabel}</span>
                    </span>
                  )}

                  {saltLabel && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      background: '#f0fdf4',
                      color: '#15803d',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      border: '1px solid #dcfce7'
                    }}>
                      <AppIcon name="salt" size={14} />
                      <span>{saltLabel}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Product Description */}
              {descriptionText && (
                <div style={{
                  margin: '12px 0',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                    {isTamil ? 'தயாரிப்பு விளக்கம்' : 'Product Description'}
                  </div>
                  <p style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.6, margin: 0 }}>
                    {descriptionText}
                  </p>
                </div>
              )}

              {product.cleaning && (
                <div style={{ background: '#f0fdf4', borderLeft: '4px solid #16a34a', padding: '8px 12px', borderRadius: '0 4px 4px 0', fontSize: '12px', color: '#166534', margin: '10px 0' }}>
                  <b><AppIcon name="shower" /> {isTamil ? 'சுத்தம் செய்யும் முறை:' : 'Cleaning Instructions:'}</b> {product.cleaning}
                </div>
              )}

              {product.recipe && (
                <div className="recipe-box" style={{ margin: '10px 0' }}>
                  <b><AppIcon name="chef" /> {isTamil ? 'செய்முறை குறிப்பு:' : 'Cooking Recipe Idea:'}</b> {product.recipe}
                </div>
              )}

              {/* Actions: Add to Cart (with - 1 +) & Buy Now */}
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {itemQty > 0 ? (
                  <div className="card-qty-stepper" style={{ height: '42px', borderRadius: '6px' }}>
                    <button
                      type="button"
                      className="qty-btn-minus"
                      aria-label="Decrease quantity"
                      onClick={() => updateQty(product.id, currentWeight, -1)}
                    >
                      −
                    </button>
                    <span className="qty-val" style={{ fontSize: '14px' }}>{itemQty} in cart</span>
                    <button
                      type="button"
                      className="qty-btn-plus"
                      aria-label="Increase quantity"
                      onClick={() => updateQty(product.id, currentWeight, 1)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-add-cart"
                    style={{ height: '42px', borderRadius: '6px', fontSize: '13px' }}
                    onClick={() => addToCart(product, currentWeight)}
                  >
                    <AppIcon name="cart" size={15} />
                    <span>{isTamil ? 'கார்ட்டில் சேர்' : 'ADD TO CART'}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-buy-now"
                  style={{ height: '42px', borderRadius: '6px', fontSize: '13px' }}
                  onClick={() => {
                    buyNow(product, currentWeight);
                    setQuickViewProduct(null);
                  }}
                >
                  <AppIcon name="bolt" size={15} />
                  <span>{isTamil ? 'இப்போதே வாங்கு' : 'BUY NOW'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

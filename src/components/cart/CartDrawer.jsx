import React, { useState, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import AppIcon from '../common/AppIcon';
import { getProductPlaceholder } from '../../utils/productPlaceholder';
import useBodyScrollLock from '../../utils/useBodyScrollLock';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQty,
    removeFromCart,
    clearCart,
    totalItemsCount,
    totalMRP,
    subTotal,
    mrpDiscount,
    couponDiscount,
    deliveryCharge,
    baseDeliveryCharge,
    freeDeliveryThreshold,
    finalPayable,
    totalSavings,
    appliedCoupon,
    availableCoupons,
    applyCouponCode,
    removeCoupon,
    setIsCheckoutOpen,
    setSelectedCategory,
    isTamil,
    showToast
  } = useCart();

  const handleShopNow = (catId = 'all') => {
    if (setSelectedCategory && catId) {
      setSelectedCategory(catId);
    }
    setIsCartOpen(false);
    setTimeout(() => {
      const el = document.getElementById('productsSection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const [showAllCoupons, setShowAllCoupons] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponStatus, setCouponStatus] = useState(null);
  useBodyScrollLock(isCartOpen);

  const activeCouponsList = useMemo(() => {
    return Object.entries(availableCoupons)
      .filter(([_, c]) => c && c.isActive !== false)
      .map(([code, c]) => ({
        code,
        desc: c.desc || '',
        minOrder: Number(c.minOrder || 0),
        flatDiscount: Number(c.flatDiscount || 0),
        discountPercent: Number(c.discountPercent || 0)
      }))
      .sort((a, b) => {
        const aApplied = appliedCoupon === a.code;
        const bApplied = appliedCoupon === b.code;
        if (aApplied) return -1;
        if (bApplied) return 1;
        const aEligible = subTotal >= a.minOrder;
        const bEligible = subTotal >= b.minOrder;
        if (aEligible && !bEligible) return -1;
        if (!aEligible && bEligible) return 1;
        return (b.flatDiscount || b.discountPercent) - (a.flatDiscount || a.discountPercent);
      });
  }, [availableCoupons, appliedCoupon, subTotal]);

  const displayedCoupons = showAllCoupons
    ? activeCouponsList
    : activeCouponsList.slice(0, 1);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput || !couponInput.trim()) return;
    const res = applyCouponCode(couponInput.trim());
    if (res.success) {
      setCouponStatus(null);
      setCouponInput('');
      showToast(res.msg);
    } else {
      setCouponStatus(res);
    }
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) {
      showToast('Cart is empty!');
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <>
      <div className="cart-drawer-overlay" style={{ display: 'block' }} onClick={() => setIsCartOpen(false)} />
      <aside className="cart-drawer open">
        <div className="cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3><AppIcon name="cart" /> {isTamil ? 'உங்கள் கூடை (My Cart)' : 'My Cart'} ({totalItemsCount})</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {cart.length > 0 && (
              <button
                type="button"
                className="cart-clear-all-btn"
                onClick={() => {
                  clearCart();
                  showToast(isTamil ? 'கூடையில் உள்ள அனைத்துப் பொருட்களும் நீக்கப்பட்டன' : 'All items cleared from cart');
                }}
                title={isTamil ? 'கூடையை காலி செய்' : 'Clear all items from cart'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '6px',
                  padding: '5px 9px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#e11d48',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <AppIcon name="trash" size={13} />
                <span>{isTamil ? 'காலி செய்' : 'Clear Cart'}</span>
              </button>
            )}
            <button className="close-drawer" onClick={() => setIsCartOpen(false)}>×</button>
          </div>
        </div>

        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="empty-cart-container">
              {/* Animated Floating Cart & Sparkle Icon */}
              <div className="empty-cart-icon-wrapper">
                <AppIcon name="cart" size={46} />
                <span className="empty-cart-sparkle" title="Fresh Arrival">
                  <AppIcon name="sparkles" size={15} />
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="empty-cart-title">
                {isTamil ? 'உங்கள் கூடை காலியாக உள்ளது!' : 'Your Cart is Empty!'}
              </h3>
              <p className="empty-cart-desc">
                {isTamil
                  ? 'தூத்துக்குடி துறைமுகத்தின் 100% இயற்கை வெயில் உலர்ந்த சுவையான கருவாடுகளை தேர்ந்தெடுத்து உங்கள் சமையலை அசத்துங்கள்!'
                  : 'Looks like you haven\'t added any items yet. Explore our authentic harbour-fresh sun-dried seafood varieties!'}
              </p>

              {/* High-Conversion Primary CTA: Shop Now */}
              <button
                type="button"
                className="empty-cart-shop-btn"
                onClick={() => handleShopNow('all')}
              >
                <AppIcon name="fish" size={18} />
                <span>{isTamil ? 'ஷாப்பிங் செய்ய' : 'SHOP DRY FISH NOW'}</span>
                <span style={{ fontSize: '17px', lineHeight: 1 }}>→</span>
              </button>

              {/* Quick Category Discovery Pills */}
              <div className="empty-cart-categories">
                <div className="empty-cart-cat-title">
                  {isTamil ? 'பிரபலமான வகைகள்' : 'Popular Categories to Explore'}
                </div>
                <div className="empty-cart-cat-pills">
                  {[
                    { id: 'nethili', icon: 'fish', en: 'Nethili Anchovy', ta: 'நெத்திலி' },
                    { id: 'shark', icon: 'fish', en: 'Milk Shark', ta: 'பால் சுறா' },
                    { id: 'seer-fish', icon: 'fish', en: 'Vanjaram Seer', ta: 'வஞ்சிரம்' },
                    { id: 'prawn', icon: 'shrimp', en: 'Prawns', ta: 'இறால்' },
                    { id: 'pickle', icon: 'jar', en: 'Fish Pickle', ta: 'ஊறுகாய்' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className="empty-cart-cat-pill"
                      onClick={() => handleShopNow(cat.id)}
                    >
                      <AppIcon name={cat.icon} size={13} />
                      <span>{isTamil ? cat.ta : cat.en}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Items List */}
              {cart.map(item => {
                const itemTotal = item.price * item.qty;
                const itemMrpTotal = item.mrp * item.qty;
                const itemFallback = getProductPlaceholder(item.fallbackIcon, 100);
                return (
                  <div key={`${item.id}-${item.weight}`} className="cart-item-card">
                    <img
                      src={item.img || itemFallback}
                      alt={item.nameEn}
                      className="cart-item-img"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = itemFallback;
                      }}
                    />
                    <div className="cart-item-info">
                      {/* Top Row: Product Name on Left, Stepper & Cross on Right Top */}
                      <div className="cart-item-top-row">
                        <div className="cart-item-title-group">
                          <div className="cart-item-title">
                            {isTamil ? item.nameTa : item.nameEn}
                          </div>
                          <div className="cart-item-weight">
                            Pack: <b>{item.weight}</b> | {isTamil ? 'இயற்கை வெயில் உலர்' : 'Fresh Sun-Dried'}
                          </div>
                        </div>

                        <div className="cart-item-right-actions">
                          <div className="cart-qty-wrap">
                            <button
                              type="button"
                              className="cart-qty-btn"
                              onClick={() => updateQty(item.id, item.weight, -1)}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="cart-qty-val">{item.qty}</span>
                            <button
                              type="button"
                              className="cart-qty-btn"
                              onClick={() => updateQty(item.id, item.weight, 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            className="cart-remove-cross-btn"
                            onClick={() => removeFromCart(item.id, item.weight)}
                            title={isTamil ? 'நீக்கு' : 'Remove item'}
                            aria-label="Remove item"
                          >
                            <AppIcon name="close" size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Price Row */}
                      <div className="cart-item-price-row">
                        <div className="cart-item-price">
                          ₹{itemTotal} <small style={{ textDecoration: 'line-through', color: '#878787', fontWeight: 'normal', fontSize: '12px' }}>₹{itemMrpTotal}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Admin Coupons & Offers Section */}
              <div className="cart-coupons-section">
                <div className="cart-coupons-header">
                  <span className="cart-coupons-title">
                    <AppIcon name="coupon" /> {isTamil ? 'கூப்பன்கள் & சலுகைகள்' : 'Coupons & Offers'}
                  </span>
                  {activeCouponsList.length > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--fk-blue)', fontWeight: 700 }}>
                      {activeCouponsList.length} {isTamil ? 'கூப்பன்கள் உள்ளன' : 'available'}
                    </span>
                  )}
                </div>

                {/* Manual Coupon Input Form */}
                <form onSubmit={handleApplyCoupon} className="cart-coupon-form">
                  <input
                    type="text"
                    value={couponInput}
                    placeholder={isTamil ? 'கூப்பன் குறியீடு (eg: TUTYFIRST)' : 'Enter coupon code (eg: TUTYFIRST)'}
                    className="cart-coupon-input"
                    onChange={(e) => setCouponInput(e.target.value)}
                  />
                  <button type="submit" className="cart-coupon-apply-btn">
                    {isTamil ? 'பயன்படுத்து' : 'APPLY'}
                  </button>
                </form>

                {/* Show error only when coupon application fails. Success is shown in the ONE success box below! */}
                {couponStatus && !couponStatus.success && (
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    margin: '8px 0 10px',
                    color: '#b91c1c',
                    background: '#fef2f2',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AppIcon name="alert" />
                    <span>{couponStatus.msg}</span>
                  </div>
                )}

                {/* Admin-Managed Coupons List */}
                {activeCouponsList.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
                    {isTamil ? 'தற்போது கூப்பன்கள் எதுவும் இல்லை.' : 'No active coupons available right now.'}
                  </div>
                ) : (
                  <div className="cart-coupons-list">
                    {displayedCoupons.map(coupon => {
                      const minOrder = Number(coupon.minOrder || 0);
                      const isEligible = subTotal >= minOrder;
                      const isApplied = appliedCoupon === coupon.code;
                      const shortfall = Math.max(0, minOrder - subTotal);
                      const discountTag = coupon.flatDiscount
                        ? `₹${coupon.flatDiscount} FLAT OFF`
                        : `${coupon.discountPercent}% OFF`;
                      const potentialSavings = coupon.flatDiscount
                        ? coupon.flatDiscount
                        : Math.round((subTotal * (coupon.discountPercent || 0)) / 100);

                      return (
                        <div
                          key={coupon.code}
                          className={`cart-coupon-card ${isApplied ? 'applied' : isEligible ? 'eligible' : 'disabled'}`}
                          onClick={() => {
                            if (isEligible && !isApplied) {
                              const res = applyCouponCode(coupon.code);
                              if (res.success) {
                                setCouponStatus(null);
                                showToast(res.msg);
                              } else {
                                setCouponStatus(res);
                              }
                            } else if (!isEligible) {
                              showToast(isTamil
                                ? `இன்னும் ₹${shortfall} சேர்த்தால் ${coupon.code} கூப்பனைப் பயன்படுத்தலாம்!`
                                : `Add ₹${shortfall} more to unlock ${coupon.code}!`);
                            }
                          }}
                        >
                          <div className="coupon-card-top">
                            <div className="coupon-badge-group">
                              <span className="coupon-code-badge">{coupon.code}</span>
                              <span className="coupon-discount-tag">{discountTag}</span>
                            </div>
                            {isApplied && (
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669' }}>
                                <AppIcon name="checkCircle" /> APPLIED
                              </span>
                            )}
                          </div>

                          <div className="coupon-card-desc">
                            {coupon.desc || (isTamil ? 'சிறப்பு தள்ளுபடி கூப்பன்' : 'Special store discount coupon')}
                          </div>

                          <div className="coupon-card-bottom">
                            {isApplied ? (
                              <>
                                <span className="coupon-savings-note" style={{ color: '#047857', fontWeight: 700 }}>
                                  <AppIcon name="check" /> {isTamil ? `₹${couponDiscount} தள்ளுபடி பெறப்பட்டது` : `Saved ₹${couponDiscount} on this order`}
                                </span>
                                <button
                                  type="button"
                                  className="coupon-action-btn applied"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCoupon();
                                    setCouponStatus(null);
                                    showToast(isTamil ? 'கூப்பன் நீக்கப்பட்டது' : 'Coupon removed');
                                  }}
                                >
                                  {isTamil ? 'நீக்கு' : 'REMOVE'}
                                </button>
                              </>
                            ) : isEligible ? (
                              <>
                                <span className="coupon-savings-note">
                                  {potentialSavings > 0
                                    ? (isTamil ? `இப்போது ₹${potentialSavings} சேமிக்கலாம்!` : `Save ₹${potentialSavings} on this order!`)
                                    : (isTamil ? `குறைந்தபட்ச ஆர்டர்: ₹${minOrder}` : `Min order: ₹${minOrder}`)}
                                </span>
                                <button
                                  type="button"
                                  className="coupon-action-btn apply"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const res = applyCouponCode(coupon.code);
                                    if (res.success) {
                                      setCouponStatus(null);
                                      showToast(res.msg);
                                    } else {
                                      setCouponStatus(res);
                                    }
                                  }}
                                >
                                  {isTamil ? 'பயன்படுத்து' : 'APPLY'}
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="coupon-shortfall-note">
                                  <><AppIcon name="lock" /> {isTamil ? `இன்னும் ₹${shortfall} சேர்க்கவும் (Min: ₹${minOrder})` : `Add ₹${shortfall} more to unlock (Min: ₹${minOrder})`}</>
                                </span>
                                <button
                                  type="button"
                                  className="coupon-action-btn locked"
                                  disabled
                                  title={isTamil ? `இன்னும் ₹${shortfall} தேவை` : `Add ₹${shortfall} more to unlock`}
                                >
                                  {isTamil ? 'பூட்டப்பட்டது' : 'LOCKED'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* View All Coupons / Show Less Toggle Button */}
                {activeCouponsList.length > 1 && (
                  <button
                    type="button"
                    className="view-all-coupons-btn"
                    onClick={() => setShowAllCoupons(prev => !prev)}
                  >
                    {showAllCoupons
                      ? (isTamil ? '▲ குறைவான கூப்பன்களைக் காட்டுக' : '▲ Show Less Coupons')
                      : (isTamil
                        ? `▼ அனைத்து கூப்பன்களையும் காண்க (${activeCouponsList.length})`
                        : `▼ View All Coupons (${activeCouponsList.length})`)}
                  </button>
                )}
              </div>

              {/* Dedicated Success Message Box */}
              {appliedCoupon && couponDiscount > 0 && (
                <div className="cart-success-msg-box" role="alert">
                  <div className="cart-success-badge">
                    <span className="cart-success-icon"><AppIcon name="check" /></span>
                  </div>
                  <div className="cart-success-body">
                    <div className="cart-success-headline">
                      {isTamil ? `வாழ்த்துகள்! '${appliedCoupon}' கூப்பன் சேர்க்கப்பட்டது!` : `Congratulations! Coupon '${appliedCoupon}' Applied!`}
                    </div>
                    <div className="cart-success-text">
                      {isTamil
                        ? `இந்த ஆர்டரில் நீங்கள் ₹${couponDiscount} தள்ளுபடி பெற்றுள்ளீர்கள். உங்கள் மொத்த சேமிப்பு: ₹${totalSavings}!`
                        : `You save ₹${couponDiscount} extra with this coupon! Total cart savings: ₹${totalSavings}!`}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cart-success-remove-btn"
                    onClick={() => {
                      removeCoupon();
                      setCouponStatus(null);
                      showToast(isTamil ? 'கூப்பன் நீக்கப்பட்டது' : 'Coupon removed');
                    }}
                    title={isTamil ? 'கூப்பனை நீக்கு' : 'Remove coupon'}
                  >
                    <><AppIcon name="close" /> {isTamil ? 'நீக்கு' : 'Remove'}</>
                  </button>
                </div>
              )}

              {/* Free Delivery Success / Progress Indicator */}
              {freeDeliveryThreshold > 0 && subTotal >= freeDeliveryThreshold ? (
                <div className="cart-free-delivery-box">
                  <AppIcon name="truck" size={16} />
                  <span>{isTamil ? 'இலவச பாதுகாப்பான டோர் டெலிவரி கிடைத்துள்ளது!' : 'You unlocked FREE Secured Odourless Delivery!'}</span>
                  {baseDeliveryCharge > 0 && <span className="free-badge">FREE ₹{baseDeliveryCharge}</span>}
                </div>
              ) : (
                freeDeliveryThreshold > 0 && baseDeliveryCharge > 0 && subTotal > 0 && (
                  <div className="cart-free-delivery-box" style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
                    <AppIcon name="truck" size={16} />
                    <span>
                      {isTamil
                        ? <>இலவச டெலிவரி பெற இன்னும் <b>₹{Math.max(0, freeDeliveryThreshold - subTotal)}</b> மதிப்புள்ள பொருட்களை சேர்க்கவும்</>
                        : <>Add <b>₹{Math.max(0, freeDeliveryThreshold - subTotal)}</b> more to get <b>FREE Delivery</b>!</>}
                    </span>
                  </div>
                )
              )}

              {/* Flipkart Style Price Details */}
              <div className="cart-price-box">
                <div className="price-summary-title">PRICE DETAILS ({totalItemsCount} Items)</div>
                <div className="price-line">
                  <span>Total MRP</span>
                  <span>₹{totalMRP}</span>
                </div>
                <div className="price-line">
                  <span>Discount on MRP</span>
                  <span style={{ color: 'var(--fk-green)', fontWeight: 700 }}>− ₹{mrpDiscount}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="price-line">
                    <span>Coupon Savings ({appliedCoupon})</span>
                    <span style={{ color: 'var(--fk-green)', fontWeight: 700 }}>− ₹{couponDiscount}</span>
                  </div>
                )}

                <div className="price-line">
                  <span>Delivery Charges</span>
                  <span>{deliveryCharge === 0 ? <b style={{ color: 'var(--fk-green)' }}>FREE</b> : `₹${deliveryCharge}`}</span>
                </div>
                <div className="price-line">
                  <span>Secured Odourless Packing</span>
                  <span style={{ color: 'var(--fk-green)', fontWeight: 700 }}>FREE</span>
                </div>
                <div className="price-line total">
                  <span>Total Amount</span>
                  <span>₹{finalPayable}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="savings-alert">
                    <AppIcon name="sparkles" /> You will save ₹{totalSavings} on this order
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-footer-total">
              <small>Total Payable</small>
              <strong>₹{finalPayable}</strong>
            </div>
            <button className="btn-place-order" onClick={proceedToCheckout}>
              {isTamil ? 'ஆர்டர் செய்க (PLACE ORDER) →' : 'PLACE ORDER →'}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

import React, { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { shopInfo } from '../../data/shopInfo';
import { playOrderPlacedSuccessSound } from '../../utils/orderSound';
import { buildUpiPayUrl, buildUpiQrCodeUrl, isMobileDevice } from '../../utils/upiHelper';
import AppIcon from '../common/AppIcon';
import useBodyScrollLock from '../../utils/useBodyScrollLock';

export default function OrderSuccessModal({ onTrackOrder }) {
  const { orderSuccessData, setOrderSuccessData, isTamil, storeSettings } = useCart();
  const [copied, setCopied] = useState(false);
  const [upiIdCopied, setUpiIdCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  useBodyScrollLock(Boolean(orderSuccessData));

  useEffect(() => {
    if (orderSuccessData) {
      setShowQr(false);
      playOrderPlacedSuccessSound();
    }
  }, [orderSuccessData?.orderId]);

  if (!orderSuccessData) return null;

  const orderId = orderSuccessData.orderId || 'JS-2026-001';
  const customer = orderSuccessData.customer || {};
  const items = Array.isArray(orderSuccessData.items) ? orderSuccessData.items : [];
  const totalAmount = orderSuccessData.totalAmount || 0;
  const date = orderSuccessData.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const paymentMode = customer.paymentMode || 'UPI';
  const status = orderSuccessData.status || 'Pending';

  const handleCopyOrderId = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const sendWhatsAppNotification = () => {
    let text = `*வணக்கம் ${shopInfo.name}! எனது ஆர்டர் விவரம்:*\n\n`;
    text += `*ஆர்டர் ID:* #${orderId}\n`;
    text += `*வாடிக்கையாளர்:* ${customer.name || 'Customer'}\n`;
    text += `*போன்:* ${customer.phone || '-'}\n`;
    text += `*முகவரி:* ${customer.address || '-'}, ${customer.city || ''} - ${customer.pincode || ''}\n\n`;
    text += `*பொருட்கள்:* \n`;

    items.forEach((it, idx) => {
      text += `${idx + 1}. ${it.nameEn || it.nameTa} (${it.weight}) x ${it.qty} = ₹${(it.price || 0) * (it.qty || 1)}\n`;
    });

    text += `\n*மொத்த தொகை:* ₹${totalAmount}\n`;
    text += `*பணம் செலுத்துதல்:* ${paymentMode}\n\n`;
    text += `தயவுசெய்து இந்த ஆர்டரை பார்சல் செய்து அனுப்பவும்!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/91${shopInfo.whatsapp}?text=${encoded}`, '_blank');
  };

  const sendUpiScreenshotToWhatsApp = () => {
    const text = isTamil
      ? `வணக்கம் ${shopInfo.name}! எனது மொபைல் எண்: ${customer.phone || '-'}. UPI payment screenshot-ஐ இணைத்து அனுப்புகிறேன். தயவுசெய்து சரிபார்க்கவும்.`
      : `Hi ${shopInfo.name}, my mobile number is ${customer.phone || '-'}. I am sharing my UPI payment screenshot for verification.`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/91${shopInfo.whatsapp}?text=${encoded}`, '_blank');
  };

  const effectiveUpiId = storeSettings?.upiId || shopInfo.upiId || `${shopInfo.phone}@okaxis`;
  const upiUri = buildUpiPayUrl({ upiId: effectiveUpiId, amount: totalAmount, orderId });
  const dynamicQrUrl = buildUpiQrCodeUrl(upiUri, 180);
  const activeQrImage = storeSettings?.upiQrImage || dynamicQrUrl;

  const handleCopyUpiId = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(effectiveUpiId);
      setUpiIdCopied(true);
      setTimeout(() => setUpiIdCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'grid' }}>
      <div className="modal-container order-success-container">
        {/* Celebration Hero Header with Confetti & Checkmark Animation */}
        <div className="order-success-hero">
          <button
            className="close-drawer"
            onClick={() => setOrderSuccessData(null)}
            aria-label="Close"
            style={{ position: 'absolute', top: '10px', right: '12px', color: '#047857', zIndex: 10, fontSize: '20px' }}
          >
            ×
          </button>

          {/* Confetti Particles */}
          <div className="success-confetti-wrap" aria-hidden="true">
            {[
              { dx: '60px', dy: '-40px', rot: '45deg', bg: '#10b981' },
              { dx: '-55px', dy: '-45px', rot: '-30deg', bg: '#f59e0b' },
              { dx: '75px', dy: '-8px', rot: '90deg', bg: '#0284c7' },
              { dx: '-70px', dy: '-12px', rot: '-60deg', bg: '#ec4899' },
              { dx: '50px', dy: '35px', rot: '120deg', bg: '#8b5cf6' },
              { dx: '-50px', dy: '30px', rot: '-110deg', bg: '#10b981' },
              { dx: '15px', dy: '-60px', rot: '15deg', bg: '#f59e0b' },
              { dx: '-20px', dy: '-65px', rot: '-45deg', bg: '#06b6d4' },
              { dx: '30px', dy: '55px', rot: '80deg', bg: '#f43f5e' },
              { dx: '-35px', dy: '50px', rot: '-95deg', bg: '#3b82f6' }
            ].map((p, idx) => (
              <span
                key={idx}
                className="confetti-particle"
                style={{
                  '--dx': p.dx,
                  '--dy': p.dy,
                  '--rot': p.rot,
                  background: p.bg,
                  width: idx % 3 === 0 ? '8px' : '6px',
                  height: idx % 2 === 0 ? '8px' : '5px',
                  borderRadius: idx % 2 === 0 ? '50%' : '2px'
                }}
              />
            ))}
          </div>

          {/* Animated Green Circle with Pulsing Ripple & SVG Checkmark */}
          <div className="success-checkmark-circle">
            <div className="success-ripple-ring" />
            <svg className="success-checkmark-svg" viewBox="0 0 52 52">
              <path className="success-checkmark-check" d="M14 27l8 8 16-16" />
            </svg>
          </div>

          <h2 className="success-order-title">
            {isTamil ? 'ஆர்டர் உறுதி செய்யப்பட்டது!' : 'Order Placed Successfully!'}
          </h2>
          <p className="success-order-subtitle">
            {isTamil
              ? 'JS Dry Fish Shop-ஐ தேர்ந்தெடுத்ததற்கு நன்றி! உங்கள் பார்சல் விரைவில் அனுப்பப்படும்.'
              : 'Thank you for choosing JS Dry Fish Shop! Your fresh dry fish will be packed soon.'}
          </p>

          {/* Copyable Order ID Badge */}
          <div className="success-order-id-badge" onClick={handleCopyOrderId} title="Click to copy Order ID">
            <span className="badge-label">{isTamil ? 'ORDER ID:' : 'ORDER ID:'}</span>
            <span className="badge-code">#{orderId}</span>
            <span className="badge-copy-btn">{copied ? <><AppIcon name="check" /> Copied</> : <><AppIcon name="copy" /> Copy</>}</span>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '12px 18px 16px' }}>
          {/* Unified Compact Status & Delivery Card */}
          <div className="success-compact-summary">
            <div className="summary-row status-row">
              <div className="status-label-group">
                <span className="summary-icon"><AppIcon name="truck" /></span>
                <span>{isTamil ? 'ஆர்டர் நிலை:' : 'Order Status:'}</span>
              </div>
              <span className="success-status-badge">
                <span className="success-status-pulse" />
                {status === 'Pending' ? (isTamil ? 'உறுதிக்காக காத்திருக்கிறது' : 'Pending Confirmation') : status}
              </span>
            </div>
            <div className="summary-row address-row">
              <span className="summary-icon"><AppIcon name="pin" /></span>
              <div className="address-text">
                <span>
                  {customer.name && <b>{customer.name}, </b>}
                  {customer.phone && <span style={{ fontWeight: 600 }}><AppIcon name="phone" /> {customer.phone} · </span>}
                  {customer.address}, {customer.city} - {customer.pincode}
                </span>
                <span className="payment-meta">
                  {date} · {isTamil ? 'பணம் செலுத்துதல்:' : 'Payment:'} <b style={{ color: '#047857' }}>{paymentMode}</b>
                </span>
              </div>
            </div>
          </div>

          {/* Compact Items Summary */}
          <div className="success-compact-items">
            <div className="compact-items-scroll">
              {items.map((it, i) => (
                <div key={i} className="compact-item-row">
                  <span>• <b>{it.nameEn || it.nameTa}</b> ({it.weight}) × {it.qty}</span>
                  <span style={{ fontWeight: 700 }}>₹{(it.price || 0) * (it.qty || 1)}</span>
                </div>
              ))}
            </div>
            <div className="compact-total-row">
              <span>{isTamil ? 'மொத்த தொகை (Total):' : 'Total Amount:'}</span>
              <span className="total-value">₹{totalAmount}</span>
            </div>
          </div>

          {/* Payment Status & Instructions Card */}
          <div style={{ background: '#ecfdf5', border: '1.5px solid #10b981', borderRadius: '12px', padding: '14px', margin: '14px 0', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>
                <AppIcon name="bolt" size={18} /> {isTamil ? 'UPI மூலம் பணம் செலுத்தவும்' : 'Pay via UPI App'}
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#065f46', lineHeight: 1.4 }}>
                {isTamil
                  ? `ஆர்டர் #${orderId}-க்கான மொத்த தொகை ₹${totalAmount}. கீழே உள்ள பட்டனை அழுத்தினால் உங்கள் மொபைலில் உள்ள UPI App தானாக திறக்கும்.`
                  : `Amount to pay for #${orderId}: ₹${totalAmount}. Tap below to launch your UPI app directly on mobile.`}
              </p>

              {/* Primary Mobile Action: Deep Link to UPI App */}
              <a
                href={upiUri}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '14.5px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  margin: '8px 0 6px',
                  cursor: 'pointer'
                }}
              >
                <AppIcon name="bolt" size={18} />
                <span>{isTamil ? `UPI ஆப் மூலம் ₹${totalAmount} செலுத்துக` : `Open UPI App to Pay ₹${totalAmount}`}</span>
              </a>
              <div style={{ fontSize: '11px', color: '#047857', marginBottom: '12px', fontWeight: 600 }}>
                Google Pay • PhonePe • Paytm • BHIM • Cred
              </div>

              {/* QR Code & Copy UPI ID Toggle */}
              <div style={{ margin: '8px 0', borderTop: '1px dashed #a7f3d0', paddingTop: '10px' }}>
                {showQr && (
                  <div style={{ marginTop: '8px', padding: '10px', background: '#ffffff', borderRadius: '10px', border: '1px solid #d1fae5', display: 'inline-block' }}>
                    <img
                      src={activeQrImage}
                      alt="UPI QR Code"
                      style={{ width: '160px', height: '160px', display: 'block', margin: '0 auto', borderRadius: '6px', objectFit: 'contain' }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px' }}>
                      {storeSettings?.upiQrImage
                        ? (isTamil ? 'கடையின் அதிகாரப்பூர்வ QR Code' : 'Shop Official QR Code')
                        : (isTamil ? 'போன் கேமரா அல்லது UPI App-ல் ஸ்கேன் செய்யவும்' : 'Scan with GPay / PhonePe / Paytm')}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowQr(prev => !prev)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #10b981',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#047857',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    width: 'fit-content',
                    margin: '8px auto 0'
                  }}
                >
                  <AppIcon name="creditCard" size={13} />
                  {showQr
                    ? (isTamil ? 'QR Code-ஐ மறைக்க' : 'Hide QR Code')
                    : (isTamil ? 'QR Code காண்க (Scan to Pay)' : 'Show QR Code to Scan')}
                </button>
              </div>

              {/* Copy UPI ID */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '6px 0 10px' }}>
                <span style={{ fontSize: '11.5px', color: '#065f46' }}>UPI ID: <strong>{effectiveUpiId}</strong></span>
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {upiIdCopied ? <><AppIcon name="check" size={11} /> Copied</> : <><AppIcon name="copy" size={11} /> Copy</>}
                </button>
              </div>

              {/* Step 2 note (No duplicate button) */}
              <div style={{ borderTop: '1px dashed #a7f3d0', paddingTop: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', color: '#065f46', display: 'block', fontWeight: 600, lineHeight: 1.4 }}>
                  {isTamil
                    ? '✓ பணம் செலுத்திய பின் கீழே உள்ள வாட்ஸ்அப் பட்டனை அழுத்தி, உங்கள் மொபைல் எண்ணுடன் payment screenshot-ஐ இணைத்து அனுப்பவும்.'
                    : '✓ After paying, use the WhatsApp button below, attach your payment screenshot, and send it with your mobile number.'}
                </span>
              </div>
            </div>

          {/* Action Buttons: Exactly ONE WhatsApp button */}
          <div className="success-actions-wrap">
            <button
              className="btn-whatsapp-order success-btn-wa"
              onClick={sendUpiScreenshotToWhatsApp}
            >
              <AppIcon name="whatsapp" />
              {isTamil ? 'Payment Screenshot-ஐ வாட்ஸ்அப்பில் அனுப்புக' : 'Share Payment Screenshot on WhatsApp'}
            </button>

            <div className="success-btn-row">
              <button
                className="btn-confirm-order success-btn-sub success-btn-track"
                onClick={() => {
                  setOrderSuccessData(null);
                  if (onTrackOrder) onTrackOrder(orderId, customer.phone);
                }}
              >
                <AppIcon name="truck" /> {isTamil ? 'ஆர்டரை ட்ராக் செய்' : 'Track Order'}
              </button>

              <button
                className="btn-confirm-order success-btn-sub success-btn-continue"
                onClick={() => setOrderSuccessData(null)}
              >
                {isTamil ? 'தொடர்ந்து ஷாப்பிங் செய்ய' : 'Continue Shopping'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import AppIcon from '../common/AppIcon';
import { trackOrderByIdAndPhone } from '../../supabase';
import { apiUrl } from '../../api';
import { shopInfo } from '../../data/shopInfo';
import { buildUpiPayUrl, buildUpiQrCodeUrl } from '../../utils/upiHelper';
import { getCustomerErrorMessage } from '../../utils/errorMessages';
import useBodyScrollLock from '../../utils/useBodyScrollLock';

const ORDER_STEPS = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];

export default function OrderTrackingModal({ isOpen, initialOrder, onClose }) {
  const { isTamil, storeSettings } = useCart();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setOrderId(initialOrder?.orderId || '');
      setPhone(initialOrder?.phone || '');
      setTrackedOrder(null);
      setError('');
    }
  }, [isOpen, initialOrder]);

  if (!isOpen) return null;

  const trackOrder = async (event) => {
    if (event) event.preventDefault();
    const cleanId = orderId.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (!cleanId) {
      setError(isTamil ? 'ஆர்டர் ID-ஐ உள்ளிடவும்.' : 'Please enter your Order ID.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setError(isTamil ? '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.' : 'Please enter your 10-digit phone number.');
      return;
    }

    setLoading(true);
    setError('');
    setTrackedOrder(null);

    try {
      // 1. Try Supabase & LocalStorage
      const result = await trackOrderByIdAndPhone(cleanId, cleanPhone);
      setTrackedOrder(result);
    } catch (supabaseError) {
      // 2. Fallback to API only if external API base URL is explicitly configured
      if (import.meta.env.VITE_API_BASE_URL) {
        try {
          const response = await fetch(apiUrl('/api/orders/track'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: cleanId, phone: cleanPhone })
          });
          const apiResult = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(apiResult.detail || 'Order not found');
          setTrackedOrder(apiResult);
          return;
        } catch (_) {}
      }

      setError(getCustomerErrorMessage(supabaseError, isTamil));
    } finally {
      setLoading(false);
    }
  };

  const statusLabels = {
    Pending: isTamil ? 'நிலுவையில்' : 'Order Placed',
    Confirmed: isTamil ? 'உறுதி செய்யப்பட்டது' : 'Confirmed',
    Packed: isTamil ? 'பேக் செய்யப்பட்டது' : 'Packed',
    Shipped: isTamil ? 'அனுப்பப்பட்டது' : 'Shipped',
    Delivered: isTamil ? 'டெலிவரி செய்யப்பட்டது' : 'Delivered',
    Cancelled: isTamil ? 'ரத்து செய்யப்பட்டது' : 'Cancelled'
  };

  const currentStep = trackedOrder ? ORDER_STEPS.indexOf(trackedOrder.status) : -1;

  return (
    <div className="modal-overlay" style={{ display: 'grid', zIndex: 1200 }}>
      <section className="modal-container" role="dialog" aria-modal="true" aria-labelledby="order-tracking-title" style={{ width: 'min(520px, 100%)' }}>
        <div className="modal-head">
          <h3 id="order-tracking-title"><AppIcon name="truck" /> {isTamil ? 'ஆர்டர் ட்ராக்கிங்' : 'Track your order'}</h3>
          <button className="close-drawer" onClick={onClose} aria-label="Close order tracking">×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
            {isTamil ? 'உங்கள் ஆர்டர் ID மற்றும் checkout-ல் கொடுத்த 10 இலக்க phone number-ஐ உள்ளிடவும்.' : 'Enter your order ID and the 10-digit phone number used at checkout.'}
          </p>
          <form onSubmit={trackOrder}>
            <div className="form-group">
              <label htmlFor="tracking-order-id">{isTamil ? 'ஆர்டர் ID' : 'Order ID'}</label>
              <input
                id="tracking-order-id"
                value={orderId}
                onChange={event => setOrderId(event.target.value.toUpperCase())}
                placeholder="eg: JS-2026-001"
                required
                maxLength={32}
              />
            </div>
            <div className="form-group">
              <label htmlFor="tracking-phone">{isTamil ? 'பதிவு செய்த தொலைபேசி எண்' : 'Checkout phone number'}</label>
              <input
                id="tracking-phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={phone}
                onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10 digit phone number"
                required
              />
            </div>
            {error && <div role="alert" style={{ background: '#fff6f5', border: '1px solid #f3d4d1', borderRadius: '8px', color: '#a54139', fontSize: '12px', lineHeight: 1.5, marginBottom: '14px', padding: '10px 12px' }}>{error}</div>}
            <button className="btn-confirm-order" type="submit" disabled={loading} style={{ width: '100%', background: 'var(--fk-blue)', marginBottom: '16px' }}>
              {loading ? (isTamil ? 'தேடுகிறது...' : 'Checking...') : (isTamil ? 'நிலையைப் பார்க்கவும்' : 'Check order status')}
            </button>
          </form>

          {trackedOrder && (
            <section aria-live="polite" style={{ border: '1px solid #dbeafe', borderRadius: '8px', padding: '14px', background: '#f8fbff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <strong>#{trackedOrder.orderId}</strong>
                <span style={{ color: trackedOrder.status === 'Cancelled' ? '#b91c1c' : '#075985', fontWeight: 700 }}>
                  {statusLabels[trackedOrder.status] || trackedOrder.status}
                </span>
              </div>
              {trackedOrder.status === 'Cancelled' ? (
                <p style={{ color: '#991b1b', fontSize: '13px', margin: 0 }}>{isTamil ? 'இந்த ஆர்டர் ரத்து செய்யப்பட்டது. உதவிக்கு கடையைத் தொடர்பு கொள்ளவும்.' : 'This order was cancelled. Contact the shop if you need help.'}</p>
              ) : (
                <div className="order-tracking-stepper">
                  {ORDER_STEPS.map((step, index) => {
                    const complete = index <= currentStep;
                    return (
                      <div key={step} style={{ color: complete ? '#0369a1' : '#94a3b8', fontSize: '10px', fontWeight: complete ? 700 : 400 }}>
                        <span style={{ display: 'grid', placeItems: 'center', width: '24px', height: '24px', margin: '0 auto 6px', borderRadius: '50%', background: complete ? '#0284c7' : '#e2e8f0', color: complete ? '#fff' : '#64748b' }}>
                          {complete ? <AppIcon name="check" size={14} /> : index + 1}
                        </span>
                        {statusLabels[step]}
                      </div>
                    );
                  })}
                </div>
              )}
              {trackedOrder.date && <small style={{ display: 'block', color: '#64748b', marginTop: '12px' }}>{isTamil ? 'ஆர்டர் தேதி: ' : 'Order date: '}{trackedOrder.date}</small>}

              {/* Payment Status Card */}
              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{isTamil ? 'பணம் செலுத்துதல்' : 'Payment Mode & Status'}</span>
                  <strong style={{ fontSize: '12.5px', color: '#1e293b' }}>
                    {trackedOrder.paymentMode && trackedOrder.paymentMode !== 'UPI' ? trackedOrder.paymentMode : 'Google Pay / PhonePe / UPI (Online)'}
                  </strong>
                </div>
                <div>
                  {trackedOrder.paymentStatus === 'Paid' ? (
                    <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '16px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <AppIcon name="checkCircle" size={13} /> {isTamil ? 'செலுத்தப்பட்டது (Paid)' : 'Paid'}
                    </span>
                  ) : (
                    <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '16px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <AppIcon name="bolt" size={13} /> {isTamil ? 'சரிபார்க்கப்படுகிறது (Pending)' : 'Pending Online Verification'}
                    </span>
                  )}
                </div>
              </div>

              {trackedOrder.paymentStatus !== 'Paid' && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <a
                    href={buildUpiPayUrl({ amount: trackedOrder.totalAmount, orderId: trackedOrder.orderId, upiId: storeSettings?.upiId || shopInfo.upiId })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                    }}
                  >
                    <AppIcon name="bolt" size={16} />
                    <span>{isTamil ? `UPI ஆப் மூலம் ₹${trackedOrder.totalAmount} செலுத்துக` : `Open UPI App to Pay ₹${trackedOrder.totalAmount}`}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setShowQr(prev => !prev)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <AppIcon name="camera" size={14} />
                    <span>{showQr ? (isTamil ? 'QR Code மறைக்க' : 'Hide QR Code') : (isTamil ? 'QR Code-ஐ காட்டுக (Scan to Pay)' : 'Show QR Code (Scan to Pay)')}</span>
                  </button>

                  {showQr && (
                    <div style={{ textAlign: 'center', padding: '10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                      <img
                        src={storeSettings?.upiQrImage || buildUpiQrCodeUrl(buildUpiPayUrl({ amount: trackedOrder.totalAmount, orderId: trackedOrder.orderId, upiId: storeSettings?.upiId || shopInfo.upiId }), 160)}
                        alt="Shop UPI QR"
                        style={{ width: '150px', height: '150px', objectFit: 'contain', margin: '0 auto', display: 'block', borderRadius: '6px' }}
                      />
                      <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600, marginTop: '6px', display: 'block' }}>
                        {storeSettings?.upiQrImage
                          ? (isTamil ? 'கடையின் QR Code' : 'Shop Official QR Code')
                          : (isTamil ? 'ஸ்கேன் செய்து செலுத்தவும்' : 'Scan to Pay with Any UPI App')}
                      </span>
                    </div>
                  )}

                  <a
                    href={`https://wa.me/91${shopInfo.whatsapp}?text=${encodeURIComponent(`*வணக்கம் ${shopInfo.name}! எனது UPI Payment Screenshot:*\n\nOrder ID: #${trackedOrder.orderId}\nPhone: ${phone}\nAmount: ₹${trackedOrder.totalAmount}\n\nI have sent payment. Please verify and confirm dispatch!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-whatsapp-order"
                    style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', textDecoration: 'none' }}
                  >
                    <AppIcon name="whatsapp" size={16} /> {isTamil ? 'வாட்ஸ்அப்பில் Screenshot பகிர்க' : 'Share Screenshot on WhatsApp'}
                  </a>
                </div>
              )}

              <button type="button" onClick={() => trackOrder(null)} disabled={loading} style={{ background: 'transparent', border: 0, color: '#0369a1', cursor: 'pointer', fontWeight: 700, marginTop: '12px', padding: 0 }}>
                {isTamil ? '↻ மீண்டும் புதுப்பி' : '↻ Refresh status'}
              </button>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

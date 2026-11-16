import React, { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { shopInfo } from '../../data/shopInfo';
import { placeOnlineOrder } from '../../supabase';
import { getCustomerProfile, saveCustomerProfile } from '../../utils/customerProfile';
import { getCustomerSession } from '../../utils/customerAuth';
import { playOrderPlacedSuccessSound } from '../../utils/orderSound';
import AppIcon from '../common/AppIcon';
import { getCustomerErrorMessage } from '../../utils/errorMessages';
import useBodyScrollLock from '../../utils/useBodyScrollLock';

export default function CheckoutModal() {
  const {
    cart,
    isCheckoutOpen,
    setIsCheckoutOpen,
    totalItemsCount,
    subTotal,
    couponDiscount,
    deliveryCharge,
    finalPayable,
    appliedCoupon,
    clearCart,
    activePincode,
    setOrderSuccessData,
    isTamil,
    showToast,
  } = useCart();

  const loggedCustomer = getCustomerSession();

  const [formData, setFormData] = useState(() => {
    const savedProfile = loggedCustomer ? getCustomerProfile() || {} : {};
    return {
      name: savedProfile.name || '',
      phone: savedProfile.phone || '',
      pincode: savedProfile.pincode || '',
      city: savedProfile.city || '',
      address: savedProfile.address || '',
      paymentMode: 'UPI'
    };
  });

  useEffect(() => {
    if (!isCheckoutOpen) return;
    const activeCustomer = getCustomerSession();
    if (activeCustomer) {
      const savedProfile = getCustomerProfile() || activeCustomer;
      setFormData(current => ({
        ...current,
        name: savedProfile.name || activeCustomer.name || '',
        phone: savedProfile.phone || activeCustomer.phone || '',
        pincode: savedProfile.pincode || activeCustomer.pincode || '',
        city: savedProfile.city || activeCustomer.city || '',
        address: savedProfile.address || activeCustomer.address || ''
      }));
    } else {
      setFormData(current => ({
        ...current,
        name: '',
        phone: '',
        pincode: '',
        city: '',
        address: ''
      }));
    }
    setPinStatus('');
    setSubmitError('');
  }, [isCheckoutOpen]);

  const [pinStatus, setPinStatus] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useBodyScrollLock(isCheckoutOpen);

  if (!isCheckoutOpen) return null;

  const handlePincodeChange = (pin) => {
    const cleanPin = pin.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, pincode: cleanPin }));
    if (cleanPin.length === 6) {
      if (cleanPin.startsWith('6')) {
        setPinStatus(isTamil ? 'தமிழ்நாடு முழுவதும் விரைவு டோர் டெலிவரி (24 - 48 மணி நேரம்)' : 'Express Door Delivery Across Tamil Nadu (24 - 48 Hours)');
      } else {
        setPinStatus(isTamil ? 'தற்போது தமிழ்நாடு முழுவதும் மட்டுமே டெலிவரி வசதி உள்ளது' : 'Delivery available across Tamil Nadu only');
      }
    } else {
      setPinStatus('');
    }
  };

  const validateForm = () => {
    const cleanName = formData.name.trim();
    const cleanPhone = formData.phone.replace(/\D/g, '');
    const cleanPin = formData.pincode.replace(/\D/g, '');
    const cleanCity = (formData.city || '').trim();
    const cleanAddress = formData.address.trim();

    if (!cleanName) {
      setSubmitError(isTamil ? 'தயவுசெய்து உங்கள் பெயரை உள்ளிடவும்.' : 'Please enter your full name.');
      return null;
    }
    if (cleanPhone.length !== 10) {
      setSubmitError(isTamil ? 'சரியான 10 இலக்க தொலைபேசி எண்ணை உள்ளிடவும்.' : 'Please enter a valid 10-digit mobile number.');
      return null;
    }
    if (cleanPin.length !== 6) {
      setSubmitError(isTamil ? 'சரியான 6 இலக்க பின்கோடை உள்ளிடவும்.' : 'Please enter a valid 6-digit pincode.');
      return null;
    }
    if (!cleanPin.startsWith('6')) {
      setSubmitError(isTamil ? 'தற்போது தமிழ்நாடு முழுவதும் மட்டுமே டெலிவரி வசதி உள்ளது (பின்கோடு 6-ல் தொடங்க வேண்டும்).' : 'Currently delivery is available only across Tamil Nadu (Pincode must start with 6).');
      return null;
    }
    if (!cleanCity) {
      setSubmitError(isTamil ? 'தயவுசெய்து உங்கள் ஊர் / மாவட்டத்தை உள்ளிடவும்.' : 'Please enter your city / district.');
      return null;
    }
    if (!cleanAddress) {
      setSubmitError(isTamil ? 'தயவுசெய்து உங்கள் முழு முகவரியை உள்ளிடவும்.' : 'Please enter your complete delivery address.');
      return null;
    }
    if (cart.length === 0) {
      setSubmitError(isTamil ? 'கூடையில் பொருட்கள் இல்லை.' : 'Your cart is empty.');
      return null;
    }

    return {
      name: cleanName,
      phone: cleanPhone,
      pincode: cleanPin,
      city: cleanCity,
      address: cleanAddress,
      paymentMode: formData.paymentMode
    };
  };

  const buildOrderPayload = (cleanCustomer) => {
    const orderItems = cart.map(item => ({
      id: item.id,
      code: item.code || '',
      nameEn: item.nameEn || '',
      nameTa: item.nameTa || '',
      weight: item.weight,
      price: item.price,
      mrp: item.mrp || item.price,
      qty: item.qty,
      img: item.img || '',
      fallbackIcon: item.fallbackIcon || 'fish'
    }));

    return {
      customer: cleanCustomer,
      items: orderItems,
      subTotal: subTotal,
      coupon: appliedCoupon || null,
      couponDiscount: couponDiscount || 0,
      deliveryCharge: deliveryCharge,
      totalAmount: finalPayable,
      itemCount: totalItemsCount,
      paymentStatus: 'UPI Pending'
    };
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const cleanCustomer = validateForm();
    if (!cleanCustomer) return;

    setSubmitting(true);
    try {
      const orderPayload = buildOrderPayload(cleanCustomer);
      const savedOrder = await placeOnlineOrder(orderPayload);

      saveCustomerProfile(cleanCustomer);
      playOrderPlacedSuccessSound();
      playOrderPlacedSuccessSound();
      setOrderSuccessData(savedOrder);
      clearCart();
      setIsCheckoutOpen(false);
      showToast(isTamil ? 'ஆர்டர் வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : 'Order placed successfully!');
    } catch (error) {
      console.error('Order submission error:', error);
      setSubmitError(
        getCustomerErrorMessage(error, isTamil)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sendOrderViaWhatsApp = async () => {
    setSubmitError('');
    const cleanCustomer = validateForm();
    if (!cleanCustomer) return;

    setSubmitting(true);
    try {
      const orderPayload = buildOrderPayload(cleanCustomer);
      const savedOrder = await placeOnlineOrder(orderPayload);
      saveCustomerProfile(cleanCustomer);

      // Format WhatsApp Message
      let text = `*வணக்கம் ${shopInfo.name}! புதிய ஆன்லைன் ஆர்டர் #${savedOrder.orderId}:*\n\n`;
      text += `*வாடிக்கையாளர்:* ${cleanCustomer.name}\n`;
      text += `*போன்:* ${cleanCustomer.phone}\n`;
      text += `*முகவரி:* ${cleanCustomer.address}, ${cleanCustomer.city} - ${cleanCustomer.pincode}\n\n`;
      text += `*ஆர்டர் செய்த கருவாடுகள்:* \n`;

      cart.forEach((c, idx) => {
        text += `${idx + 1}. ${c.nameEn || c.nameTa} (${c.weight}) x ${c.qty} = ₹${c.price * c.qty}\n`;
      });

      if (appliedCoupon && couponDiscount > 0) {
        text += `\nகூப்பன் தள்ளுபடி (${appliedCoupon}): -₹${couponDiscount}\n`;
      }
      text += `டெலிவரி கட்டணம்: ${deliveryCharge === 0 ? 'இலவசம் (FREE)' : `₹${deliveryCharge}`}\n`;
      text += `*மொத்த தொகை:* ₹${finalPayable}\n`;
      text += `*பணம் செலுத்துதல்:* ஆன்லைன் பேமென்ட் (UPI / GPay / PhonePe)\n\n`;
      text += `தயவுசெய்து இந்த ஆர்டரை உறுதி செய்து பார்சல் அனுப்பவும்! நன்றி.`;

      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/91${shopInfo.whatsapp}?text=${encoded}`, '_blank');

      playOrderPlacedSuccessSound();
      setOrderSuccessData(savedOrder);
      clearCart();
      setIsCheckoutOpen(false);
      showToast(isTamil ? 'ஆர்டர் வாட்ஸ்அப்பில் அனுப்பப்பட்டது!' : 'Order sent via WhatsApp!');
    } catch (err) {
      console.error('WhatsApp order error:', err);
      setSubmitError(getCustomerErrorMessage(err, isTamil));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'grid' }}>
      <div className="modal-container">
        <div className="modal-head">
          <h3><AppIcon name="package" /> {isTamil ? 'டெலிவரி முகவரி & ஆர்டர் உறுதி (Checkout)' : 'Checkout & Delivery Details'}</h3>
          <button className="close-drawer" onClick={() => setIsCheckoutOpen(false)} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleOrderSubmit}>
            {loggedCustomer?.phone && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#166534', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><AppIcon name="checkCircle" /> {isTamil ? 'உள்நுழைந்துள்ளீர்கள்:' : 'Logged in as:'} <b>{loggedCustomer.name || 'Customer'}</b> (<AppIcon name="phone" /> {loggedCustomer.phone})</span>
                <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>{isTamil ? 'தானாக நிரப்பப்பட்டது' : 'Auto-filled'}</span>
              </div>
            )}

            {submitError && (
              <div role="alert" style={{ background: '#fff6f5', border: '1px solid #f3d4d1', borderRadius: '8px', color: '#a54139', fontSize: '13px', lineHeight: 1.5, marginBottom: '14px', padding: '10px 12px' }}>
                <AppIcon name="alert" /> {submitError}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>{isTamil ? 'முழு பெயர் (Full Name) *' : 'Full Name *'}</label>
                <input
                  type="text"
                  required
                  placeholder="eg: Anand Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{isTamil ? 'தொலைபேசி எண் (Mobile Number) *' : 'Mobile Number (10 Digits) *'}</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{isTamil ? 'பின்கோடு (Pincode) *' : 'Pincode (6 Digits) *'}</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="eg: 628001 or 600028"
                  value={formData.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                />
                {pinStatus && (
                  <small style={{ color: 'var(--fk-green)', fontSize: '11px', fontWeight: 700, display: 'block', marginTop: '4px' }}>
                    {pinStatus}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>{isTamil ? 'ஊர் / மாவட்டம் (City/District) *' : 'City / District *'}</label>
                <input
                  type="text"
                  required
                  placeholder="eg: Chennai, Thoothukudi, Madurai"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>{isTamil ? 'முழு முகவரி (Door No, Street, Landmark) *' : 'Complete Delivery Address *'}</label>
              <textarea
                rows="2"
                required
                placeholder="Door No, Street Name, Landmark"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>{isTamil ? 'பணம் செலுத்தும் முறை (Payment Method) *' : 'Payment Mode *'}</label>
              <div
                className="payment-option-card selected"
                style={{ cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}
              >
                <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <AppIcon name="creditCard" size={16} /> {isTamil ? 'ஆன்லைன் பேமென்ட் (Google Pay / PhonePe / UPI)' : 'Online Payment (Google Pay / PhonePe / UPI)'}
                </span>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800, background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                  Instant Verified
                </span>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', marginTop: '10px', fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AppIcon name="shieldCheck" size={16} />
                <span>
                  {isTamil
                    ? '100% பாதுகாப்பான உடனடி ஆன்லைன் பேமென்ட். ஆர்டர் உறுதி செய்தவுடன் கடையின் அதிகாரப்பூர்வ QR Scanner & UPI ஆப் மூலம் செலுத்தலாம்.'
                    : '100% Secure Instant Online Payment via Shop official QR Scanner & UPI Apps (GPay / PhonePe / Paytm).'}
                </span>
              </div>
            </div>

            {/* Price Preview */}
            <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>{isTamil ? 'பொருட்கள் எண்ணிக்கை:' : 'Total Items:'}</span>
                <b>{totalItemsCount} items</b>
              </div>
              {appliedCoupon && couponDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--fk-green)' }}>
                  <span>{isTamil ? 'கூப்பன் தள்ளுபடி:' : 'Coupon Discount:'} ({appliedCoupon})</span>
                  <b>-₹{couponDiscount}</b>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>{isTamil ? 'டெலிவரி கட்டணம்:' : 'Delivery Charges:'}</span>
                <b style={{ color: 'var(--fk-green)' }}>
                  {deliveryCharge === 0 ? (isTamil ? 'இலவசம் (FREE)' : 'FREE') : `₹${deliveryCharge}`}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                <span>{isTamil ? 'செலுத்த வேண்டிய தொகை:' : 'Amount Payable:'}</span>
                <span style={{ color: '#d32f2f' }}>₹{finalPayable}</span>
              </div>
            </div>

            <div className="checkout-actions">
              <button
                type="submit"
                disabled={submitting}
                className="btn-confirm-order"
                style={{ opacity: submitting ? 0.7 : 1 }}
              >
                {submitting
                  ? (isTamil ? 'ஆர்டர் பதிவாகிறது…' : 'Saving order…')
                  : (isTamil ? 'ஆர்டரை உறுதி செய்க (Confirm Order)' : 'Confirm Order')}
              </button>
              <button
                type="button"
                disabled={submitting}
                className="btn-whatsapp-order"
                onClick={sendOrderViaWhatsApp}
              >
                <AppIcon name="whatsapp" /> {isTamil ? 'வாட்ஸ்அப் ஆர்டர்' : 'WhatsApp Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

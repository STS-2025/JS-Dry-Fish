import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import AppIcon from '../common/AppIcon';
import { shopInfo } from '../../data/shopInfo';
import { submitWholesaleRequest } from '../../supabase';
import { getCustomerErrorMessage } from '../../utils/errorMessages';
import useBodyScrollLock from '../../utils/useBodyScrollLock';

export default function WholesaleModal() {
  const { isWholesaleOpen, setIsWholesaleOpen, isTamil, showToast } = useCart();

  const [form, setForm] = useState({
    businessName: '',
    phone: '',
    quantity: '25-50 kg',
    city: '',
    requirements: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  useBodyScrollLock(isWholesaleOpen);

  if (!isWholesaleOpen) return null;

  const handleClose = () => {
    setIsWholesaleOpen(false);
    if (isSuccess) {
      setIsSuccess(false);
      setSubmittedId('');
      setForm({
        businessName: '',
        phone: '',
        quantity: '25-50 kg',
        city: '',
        requirements: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const saved = await submitWholesaleRequest(form);
      setSubmittedId(saved?.id || 'WS-2026-001');
      setIsSuccess(true);
      showToast(isTamil ? 'மொத்த விலைப்பட்டியல் கோரிக்கை அனுப்பப்பட்டது!' : 'Wholesale quote request submitted!');
    } catch (err) {
      console.error('Error submitting wholesale request:', err);
      showToast(getCustomerErrorMessage(err, isTamil));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const text = `Vanakkam ${shopInfo.name}! I need bulk/wholesale dry fish supply.\nRequest ID: #${submittedId || 'WS-2026-001'}\nBusiness: ${form.businessName || 'Store/Hotel'}\nPhone: ${form.phone || '-'}\nCity: ${form.city || '-'}\nQuantity: ${form.quantity}\nRequirements: ${form.requirements || 'Wholesale rate list'}`;
    window.open(`https://wa.me/91${shopInfo.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="modal-overlay" style={{ display: 'grid' }}>
      <div className="modal-container">
        <div className="modal-head">
          <h3><AppIcon name="building" /> {isTamil ? 'மொத்த வியாபாரம் & ஹோட்டல் சப்ளை' : 'Wholesale & Commercial Bulk Supply'}</h3>
          <button className="close-drawer" onClick={handleClose} aria-label="Close modal">
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#e8f5e9',
                color: '#2e7d32',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                marginBottom: '16px'
              }}>
                <AppIcon name="check" size={32} />
              </div>
              <h3 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '19px' }}>
                {isTamil ? 'கோரிக்கை பதிவு செய்யப்பட்டது!' : 'Quote Request Received!'}
              </h3>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '4px 12px',
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '13px',
                marginBottom: '14px',
                border: '1px solid #bae6fd'
              }}>
                <span>{isTamil ? 'கோரிக்கை எண்:' : 'Request ID:'}</span>
                <span>#{submittedId || 'WS-2026-001'}</span>
              </div>
              <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 20px' }}>
                {isTamil
                  ? `நன்றி ${form.businessName || 'நண்பரே'}! உங்களது மொத்த வியாபார கோரிக்கை (${form.quantity}) பதிவு செய்யப்பட்டது. எங்கள் தூத்துக்குடி டீம் விரைவில் உங்களை (${form.phone}) தொடர்புகொள்ளும்.`
                  : `Thank you ${form.businessName || 'friend'}! Your wholesale bulk inquiry for ${form.quantity} has been submitted. Our Thoothukudi team will contact you at ${form.phone} shortly.`}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-whatsapp-order"
                  style={{ minWidth: '180px' }}
                  onClick={handleWhatsApp}
                >
                  <AppIcon name="whatsapp" /> {isTamil ? 'வாட்ஸ்அப் நேரடி தொடர்பு' : 'Chat on WhatsApp'}
                </button>
                <button
                  type="button"
                  className="btn-confirm-order"
                  style={{ minWidth: '140px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                  onClick={handleClose}
                >
                  {isTamil ? 'சரி / மூடு' : 'Close'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: '#555', marginBottom: '14px', lineHeight: 1.5 }}>
                {isTamil
                  ? 'தூத்துக்குடி துறைமுகத்திலிருந்து நேரடியாக 10kg, 25kg, 50kg, 100kg அளவுகளில் சிறந்த மொத்த விலையில் கருவாடு பெற்றுக்கொள்ள கீழே உள்ள விவரங்களை பூர்த்தி செய்யவும்.'
                  : 'Get wholesale prices directly from Tuticorin coastal port for 10kg, 25kg, 50kg, and 100kg+ commercial quantities. Fill in your details below.'}
              </p>

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>{isTamil ? 'நிறுவனம் / கடை / உங்கள் பெயர் *' : 'Business / Hotel / Name *'}</label>
                    <input
                      type="text"
                      required
                      placeholder={isTamil ? 'ஹோட்டல் / கடை பெயர்' : 'Hotel / Grocery Shop Name'}
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>{isTamil ? 'வாட்ஸ்அப் எண் *' : 'WhatsApp Number *'}</label>
                    <input
                      type="tel"
                      required
                      placeholder="10 Digit Mobile Number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{isTamil ? 'தேவைப்படும் அளவு *' : 'Required Quantity *'}</label>
                    <select
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    >
                      <option value="10-25 kg">10 கிலோ - 25 கிலோ (10-25 kg)</option>
                      <option value="25-50 kg">25 கிலோ - 50 கிலோ (25-50 kg)</option>
                      <option value="50-100 kg">50 கிலோ - 100 கிலோ (50-100 kg)</option>
                      <option value="100+ kg">100 கிலோவுக்கு மேல் (Commercial 100+ kg)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>{isTamil ? 'டெலிவரி ஊர் *' : 'Delivery City *'}</label>
                    <input
                      type="text"
                      required
                      placeholder="eg: Chennai, Madurai, Coimbatore"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>{isTamil ? 'தேவையான கருவாடு வகைகள்' : 'Required Fish Varieties'}</label>
                  <textarea
                    rows="2"
                    placeholder="eg: நெத்திலி 20kg, பால் சுறா 10kg, வஞ்சிரம் 15kg"
                    value={form.requirements}
                    onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  />
                </div>

                <div className="checkout-actions">
                  <button type="submit" className="btn-confirm-order" disabled={isSubmitting}>
                    {isSubmitting ? (isTamil ? 'பதிவாகிறது...' : 'Submitting...') : (isTamil ? 'விலைப்பட்டியல் கோரிக்கை அனுப்புக' : 'Request Wholesale Quote')}
                  </button>
                  <button type="button" className="btn-whatsapp-order" onClick={handleWhatsApp}>
                    <AppIcon name="whatsapp" /> {isTamil ? 'வாட்ஸ்அப் நேரடி தொடர்பு' : 'WhatsApp Chat'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

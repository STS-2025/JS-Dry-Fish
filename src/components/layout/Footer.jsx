import React from 'react';
import { useCart } from '../../context/CartContext';
import { shopInfo } from '../../data/shopInfo';
import AppIcon from '../common/AppIcon';
import gpayLogo from '../../assets/payments/gpay.png';
import phonepeLogo from '../../assets/payments/phonepe.png';
import paytmLogo from '../../assets/payments/paytm.png';
import upiLogo from '../../assets/payments/upi.png';

export default function Footer() {
  const { setSelectedCategory, isTamil } = useCart();

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    const el = document.getElementById('productsSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="fk-footer">
      <div className="footer-container">
        {/* Column 1: About */}
        <div className="footer-col">
          <h4>{isTamil ? 'எங்களை பற்றி' : 'ABOUT US'}</h4>
          <ul>
            <li>{shopInfo.name}</li>
            <li>{isTamil ? 'தூத்துக்குடி கடற்கரை (தமிழ்நாடு)' : 'Thoothukudi Sea Coast (Tamil Nadu)'}</li>
            <li>
              <a href="#wholesaleSection">{isTamil ? 'மொத்த வியாபார சலுகை (Wholesale)' : 'Wholesale & Bulk Supply'}</a>
            </li>
            <li>{isTamil ? 'இயற்கை கடல் உப்பு & சூரிய உலர்த்தல்' : 'Natural Sea-Brine Sun Drying'}</li>
            <li>{isTamil ? '100% ரசாயனம் அற்ற தரம்' : '100% Chemical-Free Standard'}</li>
          </ul>
        </div>

        {/* Column 2: Help & Logistics */}
        <div className="footer-col">
          <h4>{isTamil ? 'உதவி & டெலிவரி' : 'HELP & LOGISTICS'}</h4>
          <ul>
            <li>{isTamil ? '100% பாதுகாப்பான ஆன்லைன் பேமென்ட் (UPI & QR)' : '100% Secure Online Payment (Direct UPI & QR)'}</li>
            <li>{isTamil ? '3-அடுக்கு துர்நாற்றம் புகாத பேக்கிங்' : 'Triple-Layer Odourless Vacuum Packing'}</li>
            <li>{isTamil ? 'விரைவு டெலிவரி: 24–48 மணி நேரம்' : 'Express Delivery: 24–48 Hours'}</li>
            <li>{isTamil ? '100% தரம் & புத்துணர்ச்சி உத்தரவாதம்' : '100% Quality & Freshness Guarantee'}</li>
            <li>
              <a href={`https://wa.me/91${shopInfo.whatsapp}`} target="_blank" rel="noreferrer">
                {isTamil ? 'வாட்ஸ்அப் நேரடி ஆதரவு' : 'WhatsApp Direct Support'}
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Top Categories */}
        <div className="footer-col">
          <h4>{isTamil ? 'முக்கிய வகைகள்' : 'TOP VARIETIES'}</h4>
          <ul>
            <li><a href="#productsSection" onClick={() => handleCategoryClick('nethili')}>{isTamil ? 'நெத்திலி கருவாடு (Nethili)' : 'Nethili Anchovy (நெத்திலி)'}</a></li>
            <li><a href="#productsSection" onClick={() => handleCategoryClick('shark')}>{isTamil ? 'பால் சுறா (Milk Shark)' : 'Boneless Milk Shark (பால் சுறா)'}</a></li>
            <li><a href="#productsSection" onClick={() => handleCategoryClick('seer-fish')}>{isTamil ? 'வஞ்சரம் & கிங் ஃபிஷ்' : 'King Fish & Vanjaram (வஞ்சரம்)'}</a></li>
            <li><a href="#productsSection" onClick={() => handleCategoryClick('prawn')}>{isTamil ? 'இறால் கருவாடு (Prawn)' : 'Prawn Dry Fish (இறால்)'}</a></li>
            <li><a href="#productsSection" onClick={() => handleCategoryClick('maasi')}>{isTamil ? 'மாசி கருவாடு (Maasi)' : 'Maasi Dry Fish (மாசி)'}</a></li>
            <li><a href="#productsSection" onClick={() => handleCategoryClick('pickle')}>{isTamil ? 'கருவாடு ஊறுகாய் (Pickle)' : 'Dry Fish Pickles (ஊறுகாய்)'}</a></li>
          </ul>
        </div>

        {/* Column 4: Contact & Shop Info */}
        <div className="footer-col">
          <h4>{shopInfo.name.toUpperCase()}</h4>
          <p>
            {shopInfo.address}<br />
            <a href={`tel:+91${shopInfo.phone}`}>{isTamil ? 'தொலைபேசி' : 'Phone'}: +91 {shopInfo.phone}</a><br />
            <a href={`https://wa.me/91${shopInfo.whatsapp}`} target="_blank" rel="noreferrer">
              WhatsApp: +91 {shopInfo.whatsapp}
            </a><br />
            {isTamil ? 'தமிழ்நாடு முழுவதும் விரைவு டோர் டெலிவரி' : 'Express Door Delivery Across Tamil Nadu'}<br />
            {shopInfo.facebookUrl && (
              <a href={shopInfo.facebookUrl} target="_blank" rel="noreferrer">
                {isTamil ? `${shopInfo.name} Facebook பக்கம்` : `Follow ${shopInfo.name} on Facebook`}
              </a>
            )}
          </p>
        </div>

        {/* Column 5: Purity Promise */}
        <div className="footer-col">
          <h4>{isTamil ? 'கடலோர தூய்மை உறுதிமொழி' : 'COASTAL PURITY PROMISE'}</h4>
          <p style={{ color: '#cfd8dc', fontSize: '12px' }}>
            {isTamil 
              ? 'தூத்துக்குடி மன்னார் வளைகுடா கடல் பகுதியில் கிடைக்கும் மீன்களை இயற்கை சூரிய ஒளியில் உப்பு கலந்து காயவைத்து, சுகாதாரமான முறையில் உங்களிடம் சேர்க்கிறோம்.'
              : 'Directly sourced from Tuticorin fishermen, naturally sun-dried with pure sea brine, packed in triple-layer vacuum sealed bags. 100% smell-free during courier.'}
          </p>
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '14px', color: '#94a3b8' }}>
            <span title="Fish" style={{ display: 'inline-flex' }}>🐟</span>
            <span title="Shark" style={{ display: 'inline-flex' }}>🦈</span>
            <span title="Prawns" style={{ display: 'inline-flex' }}>🦐</span>
            <span title="Sun-Dried" style={{ display: 'inline-flex' }}>☀️</span>
            <span title="Secured Box" style={{ display: 'inline-flex' }}>📦</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div>
          © 2026 <b>{shopInfo.name}</b>. {isTamil ? 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.' : 'All Rights Reserved.'}
        </div>
        <div className="footer-accepted-container">
          <span className="footer-accepted-label">
            {isTamil ? 'ஏற்றுக்கொள்ளப்படுவது:' : 'Accepted:'} <b>{isTamil ? 'ஆன்லைன் பேமென்ட் மட்டும்' : 'Online Payment Only'}</b>
          </span>
          <div className="footer-payment-badges" aria-label="Accepted Payment Methods: Google Pay, PhonePe, Paytm, UPI">
            {/* Google Pay */}
            <span className="payment-icon-pill" title="Google Pay">
              <img src={gpayLogo} alt="Google Pay" className="payment-brand-img gpay-img" />
            </span>

            {/* PhonePe */}
            <span className="payment-icon-pill" title="PhonePe">
              <img src={phonepeLogo} alt="PhonePe" className="payment-brand-img phonepe-img" />
            </span>

            {/* Paytm */}
            <span className="payment-icon-pill" title="Paytm">
              <img src={paytmLogo} alt="Paytm" className="payment-brand-img paytm-img" />
            </span>

            {/* UPI */}
            <span className="payment-icon-pill" title="UPI">
              <img src={upiLogo} alt="UPI" className="payment-brand-img upi-img" />
            </span>
          </div>
        </div>
      </div>

      <div className="footer-credit-row">
        <div className="footer-credit">
          {isTamil ? 'வடிவமைப்பு:' : 'Designed by'}{' '}
          <a href="https://www.samudhratechsolutions.biz" target="_blank" rel="noreferrer">
            Samudhra Tech Solution
          </a>
        </div>
        <a className="footer-admin-icon" href="/admin.html" aria-label="Admin login" title="Admin login">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2.5 4.5 5.7v5.1c0 5 3.2 9.5 7.5 10.7 4.3-1.2 7.5-5.7 7.5-10.7V5.7L12 2.5Z" />
            <path d="M9.5 11.5V10a2.5 2.5 0 0 1 5 0v1.5m-6 0h7v5h-7z" />
          </svg>
        </a>
      </div>
    </footer>
  );
}

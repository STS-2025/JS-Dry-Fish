import React from 'react';
import { useCart } from '../../context/CartContext';
import AppIcon from '../common/AppIcon';

export default function DealsBar() {
  const { isTamil } = useCart();

  const rollItems = [
    {
      icon: 'sun',
      color: '#fb923c',
      text: isTamil
        ? '100% இயற்கை வெயில் உலர் · தூத்துக்குடி நேரடி சப்ளை'
        : '100% Marine Sun-Dried · Direct from Tuticorin Port'
    },
    {
      icon: 'package',
      color: '#38bdf8',
      text: isTamil
        ? 'வாசனை கசியாத 3-அடுக்கு ஏர்டைட் பேக்கிங் · 100% Smell-Proof'
        : 'Odour-Proof 3-Layer Packing · Zero Smell Guarantee'
    },
    {
      icon: 'shieldCheck',
      color: '#4ade80',
      text: isTamil
        ? '100% பாதுகாப்பான உடனடி ஆன்லைன் பேமென்ட் (Google Pay, PhonePe, UPI)'
        : '100% Secure Online Payment (Google Pay / PhonePe / UPI)'
    },
    {
      icon: 'fish',
      color: '#38bdf8',
      text: isTamil
        ? 'தூத்துக்குடி நேரடி மொத்த வியாபாரம் & ஹோட்டல் சப்ளை கிடைக்கும்'
        : 'Wholesale & Commercial Bulk Supply Available'
    }
  ];

  return (
    <div className="deals-bar-single-line">
      <div className="deals-roll-container">
        <div className="deals-roll-track">
          {[false, true].map(isDuplicate => (
            <div
              key={isDuplicate ? 'dup' : 'orig'}
              className={`deals-roll-group ${isDuplicate ? 'is-duplicate' : ''}`}
              aria-hidden={isDuplicate || undefined}
            >
              {rollItems.map((item, idx) => (
                <div className="deals-roll-item" key={idx}>
                  <span className="deals-roll-icon" style={{ color: item.color }}>
                    <AppIcon name={item.icon} size={15} />
                  </span>
                  <span className="deals-roll-text">
                    {item.text}
                  </span>
                  <span className="deals-roll-bullet">•</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

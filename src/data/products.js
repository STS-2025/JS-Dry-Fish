export { productsData } from './marketProducts';

export const categoriesList = [
  { id: 'all', nameEn: 'All Products', nameTa: 'அனைத்து பொருட்கள்', emoji: '🌊' },
  { id: 'nethili', nameEn: 'Anchovy', nameTa: 'நெத்திலி', emoji: '🐟' },
  { id: 'paarai', nameEn: 'Paarai', nameTa: 'பாறை', emoji: '🐠' },
  { id: 'seer-fish', nameEn: 'King Fish', nameTa: 'வஞ்சரம்', emoji: '🐟' },
  { id: 'squid', nameEn: 'Squid', nameTa: 'கணவா', emoji: '🦑' },
  { id: 'prawn', nameEn: 'Prawns', nameTa: 'இறால்', emoji: '🦐' },
  { id: 'shark', nameEn: 'Shark', nameTa: 'சுறா', emoji: '🦈' },
  { id: 'maasi', nameEn: 'Maasi', nameTa: 'மாசி', emoji: '🐟' },
  { id: 'pickle', nameEn: 'Pickles', nameTa: 'ஊறுகாய்', emoji: '🫙' },
  { id: 'dry-fish', nameEn: 'Other Dry Fish', nameTa: 'மற்ற கருவாடு', emoji: '🐟' }
];

export const couponsData = {
  TUTYFIRST: { discountPercent: 10, minOrder: 300, desc: '10% Instant Off for New Customers' },
  BIGFISH: { flatDiscount: 100, minOrder: 700, desc: 'Flat ₹100 Off on orders above ₹700' },
  COMBOSAVE: { discountPercent: 15, minOrder: 999, desc: '15% Off on Combo orders above ₹999' }
};

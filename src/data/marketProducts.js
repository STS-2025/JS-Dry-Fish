const imageBase = 'https://catalogue.dreamjob.net.in/product-images/7/';

const catalog = [
  ['PARAI_PATTARAI_500G', 'Paarai Pattarai Dry Fish', 'பாறை பட்டறை கருவாடு', 'paarai', '500g', 300, 'c2cb8218fd1bfbf03e7f2096b2df3146'],
  ['YELLOW_PARAI_PATTARAI_500G', 'Yellow Paarai Pattarai Dry Fish', 'மஞ்ச பாறை பட்டறை கருவாடு', 'paarai', '500g', 300, '1bd2726c2dc7fa79f3ddff6a31116160'],
  ['MAASI_POWDER_500G', 'Maasi Powder', 'மாசி தூள்', 'maasi', '500g', 300, '91e68001e9cc7b43011ccdac44141499'],
  ['OOZHI_500G', 'Oozhi Dry Fish', 'ஊழி', 'dry-fish', '500g', 200, 'bb072a2559f62afb40fd7eacc9d76694'],
  ['SQUID_500G', 'Squid Dry Fish', 'கனவா (cuttle fish)', 'squid', '500g', 350, '973816154c01c17edd82d1734372a2e4'],
  ['THUNDU_500G', 'Thundu Dry Fish', 'துண்டு', 'dry-fish', '500g', 200, 'eacc252212df48c980f63098c7d0b409'],
  ['MILK_ANTHOVY_500G', 'Milk Anchovy Dry Fish', 'பால் நெத்திலி', 'nethili', '500g', 300, 'f44e0f73f9724ed0ba00e1c97e731e2d'],
  ['NAGARA_500G', 'Nagara Dry Fish', 'நகர', 'dry-fish', '500g', 180, '6b4518d8a14bf3de344d8857aa28f0a1'],
  ['THUNDU_KARUVADU_1KG', 'Thundu Dry Fish', 'துண்டு கருவாடு', 'dry-fish', '1kg', 400, 'a9197e682f2794206966c9d68a75b81f'],
  ['KATTA_PARAI_500G', 'Katta Paarai Dry Fish', 'கட்டா பாறை', 'paarai', '500g', 240, '3d0a1e5529f68a06fc6b9ac08f5ab3a4'],
  ['KING_FISH_NEYMEEN_1KG', 'King Fish Dry Fish (Rameswaram Pattarai Neymeen)', 'கிங் ஃபிஷ் பட்டறை நெய்மீன் கருவாடு', 'seer-fish', '1kg', 1400, '726d8d1187edb3b30d58551247131548'],
  ['NO_SALT_NETHILI_1KG', 'No Salt Anchovy Dry Fish', 'உப்பு இல்லாத நெத்திலி', 'nethili', '1kg', 480, 'ec538537a15978d7cfd942c4f5f2a035'],
  ['VAALAI_500G', 'Vaalai Dry Fish', 'வாளை', 'dry-fish', '500g', 200, '60c62de46ccd9fd77e3cfa21697c4066'],
  ['RED_PRAWN_500G', 'Red Prawn Dry Fish', 'இரால் செம்மீன்', 'prawn', '500g', 250, '1f85b6862fa3b4d541aab7f69ff99646'],
  ['KOONI_PRAWN_500G', 'Kooni Prawn Dry Fish', 'கூனி இரால்', 'prawn', '500g', 240, '2feafc1d7730fc7aabf158405da243a4'],
  ['NEI_VAALAI_500G', 'Nei Vaalai Dry Fish', 'நெய் வாளை', 'dry-fish', '500g', 200, '261e53725b69a59ab3a621719c3ded7e'],
  ['MILK_SHARK_BONELESS_500G', 'Boneless Milk Shark Dry Fish', 'பால் சுறா boneless', 'shark', '500g', 300, '974519408bdeeb5ca5a3dbcad316065b'],
  ['GOA_NETHILI_CLEANED_500G', 'Goa Large Anchovy (Cleaned)', 'கோவா நெத்திலி Big size தலை சுத்தம் செய்தது', 'nethili', '500g', 400, 'efe440d661f591687c78c5c39050f3a2'],
  ['VANJARAM_NONMELTING_500G', 'Vanjaram Dry Fish (Firm Cut)', 'வஞ்சரம் (கரையாது)', 'seer-fish', '500g', 400, '234fa41eba9d0d3f72774c067f1cc12c'],
  ['FISH_PICKLE_200G', 'Fish Pickle', 'மீன் ஊறுகாய்', 'pickle', '200g', 140, '7656fc8cd0e36b295eeb4a7555b887b1'],
  ['PRAWN_PICKLE_200G', 'Prawn Pickle', 'இரால் ஊறுகாய்', 'pickle', '200g', 140, 'affb7d7c916916aa6c30264b64993ffc'],
  ['NETHILI_PICKLE_200G', 'Anchovy Pickle', 'நெத்திலி ஊறுகாய்', 'pickle', '200g', 140, '5d0088095b46566f3537e908d9ba0750'],
  ['PARAI_1KG', 'Paarai Dry Fish', 'பாறை', 'paarai', '1kg', 480, '08a9a37561ebb9489a79846ce480f62e'],
  ['BONELESS_YELLOW_TUNA_1KG', 'Boneless Yellow Tuna (Kizhavaalai)', 'சுரை bonless (yellow Tuna) கிழவாளை', 'seer-fish', '1kg', 480, '4a98835cfe7c83cb83c36e18648b29e7'],
  ['CLEANED_NETHILI_500G', 'Cleaned Anchovy Dry Fish', 'நெத்திலி தலைசுத்தம் செய்தது', 'nethili', '500g', 325, 'a4f1b5a011b4aad6fa760d67a76471c8'],
  ['SQUID_2_500G', 'Squid Dry Fish', 'கனவா squit', 'squid', '500g', 300, '963e107818f084d8532829142ca63113'],
  ['NEI_VAALAI_1KG', 'Nei Vaalai Dry Fish', 'நெய் வாளை', 'dry-fish', '1kg', 200, 'bd22a17e85a6fb02347c12b551d237dc'],
  ['AYIRAI_BABY_500G', 'Ayirai Baby Dry Fish', 'அயரை (குஞ்சு கருவாடு)', 'dry-fish', '500g', 200, 'fff561b7f492c7a30cd0e583566fd026'],
  ['NO1_PATTARAI_KODUVA_500G', 'No.1 Pattarai Koduva Dry Fish', 'No.1, பட்டறை கருவாடு (கொடுவா)', 'dry-fish', '500g', 300, '9681fa825f9493be7fc73c0be3ec4374'],
  ['MAASI_1KG', 'Maasi Dry Fish', 'மாசி', 'maasi', '1kg', 600, 'f565426d9ac2a578e75394d9aff09556'],
  ['AYILA_500G', 'Ayila Dry Fish', 'அயில', 'dry-fish', '500g', 180, '3e5be159b35bfb3332fde0b13e07d7ca'],
  ['BONELESS_PARAI_1KG', 'Boneless Paarai Dry Fish', 'பாறை bonless', 'paarai', '1kg', 480, '97f88a5a88a89574b581ae1cc3202c1d'],
  ['THIRUKKAI_1KG', 'Thirukkai Dry Fish', 'திருக்கை', 'dry-fish', '1kg', 400, '71316221548a954fc60532c4f5cdf5fa'],
  ['MURAL_500G', 'Mural Dry Fish', 'முறல்', 'dry-fish', '500g', 160, 'a0a53b472e932b153758ffa504d5d6cc'],
  ['SALAI_MATHI_1KG', 'Salai / Mathi Dry Fish', 'சாலை / மத்தி', 'dry-fish', '1kg', 240, '3a09d60714c257235ae9730a1f2e9ff6']
];

export const productsData = catalog.map(
  ([code, nameEn, nameTa, category, packSize, packPrice, image], index) => {
    return {
      id: 1001 + index,
      code,
      nameEn,
      nameTa,
      category,
      packSize,
      packPrice,
      basePrice250g: packPrice,
      baseMrp250g: packPrice,
      img: `${imageBase}${image}.webp`,
      fallbackIcon: category === 'squid' ? 'squid' : category === 'prawn' ? 'shrimp' : category === 'shark' ? 'shark' : 'fish',
      rating: 4.5,
      reviews: 1,
      assured: false,
      stock: null,
      descEn: '',
      descTa: '',
      recipe: '',
      cleaning: ''
    };
  }
);

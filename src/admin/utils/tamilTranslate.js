// Tuticorin Dry Seafood Tamil Translation & Transliteration Helper

const FISH_DICTIONARY = [
  // Compound terms first
  [/\b(dry fish|dryfish)\b/gi, 'கருவாடு'],
  [/\b(king fish|seer fish|seer|vanjaram|neymeen)\b/gi, 'வஞ்சரம் (நெய்மீன்)'],
  [/\b(anchovy|nethili)\b/gi, 'நெத்திலி'],
  [/\b(bluefin trevally|paarai|parai)\b/gi, 'பாறை'],
  [/\b(squid|cuttlefish|kanava)\b/gi, 'கணவா'],
  [/\b(prawn|prawns|shrimp|eraal)\b/gi, 'இறால்'],
  [/\b(shark|sura)\b/gi, 'சுறா'],
  [/\b(maasi|maldive fish)\b/gi, 'மாசி'],
  [/\b(tuna|soorai)\b/gi, 'சூரை'],
  [/\b(mackerel|ayila)\b/gi, 'அயில'],
  [/\b(sardine|mathi|salai)\b/gi, 'மத்தி (சாலை)'],
  [/\b(barracuda|oozhi)\b/gi, 'ஊழி'],
  [/\b(ribbon fish|vaalai)\b/gi, 'வாளை'],
  [/\b(stingray|ray fish|thirukkai)\b/gi, 'திருக்கை'],
  [/\b(sea bass|koduva)\b/gi, 'கொடுவா'],
  [/\b(nagara)\b/gi, 'நகர'],
  [/\b(crab|nandu)\b/gi, 'நண்டு'],
  [/\b(fish pickle)\b/gi, 'மீன் ஊறுகாய்'],
  [/\b(prawn pickle)\b/gi, 'இறால் ஊறுகாய்'],
  [/\b(pickle)\b/gi, 'ஊறுகாய்'],
  [/\b(powder)\b/gi, 'தூள்'],
  [/\b(pattarai)\b/gi, 'பட்டறை'],
  [/\b(head cleaned|headless)\b/gi, 'தலை சுத்தம் செய்தது'],
  [/\b(cleaned)\b/gi, 'சுத்தம் செய்தது'],
  [/\b(boneless)\b/gi, 'முள் இல்லாதது'],
  [/\b(no salt|unsalted|without salt)\b/gi, 'உப்பு இல்லாதது'],
  [/\b(salted|salt)\b/gi, 'உப்பு'],
  [/\b(milk|white)\b/gi, 'பால்'],
  [/\b(yellow)\b/gi, 'மஞ்சள்'],
  [/\b(red)\b/gi, 'சிவப்பு'],
  [/\b(non melting|firm cut)\b/gi, 'கரையாது'],
  [/\b(piece|thundu)\b/gi, 'துண்டு'],
  [/\b(baby|small)\b/gi, 'குஞ்சு'],
  [/\b(big|large)\b/gi, 'பெரிய'],
  [/\b(fresh)\b/gi, 'புதிய'],
  [/\b(fish)\b/gi, 'மீன்']
];

export function translateLocalDictionary(text) {
  if (!text || typeof text !== 'string') return '';
  let result = text.trim();
  for (const [pattern, replacement] of FISH_DICTIONARY) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export async function translateToTamil(englishText) {
  if (!englishText || !englishText.trim()) return '';
  const clean = englishText.trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ta&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        let translated = data[0].map(item => item[0]).filter(Boolean).join('');
        // Enhance with authentic Tuticorin dry seafood terms
        translated = translated
          .replace(/உலர்\s*மீன்/g, 'கருவாடு')
          .replace(/உலர்ந்த\s*மீன்/g, 'கருவாடு')
          .replace(/நெத்திலி\s*மீன்/g, 'நெத்திலி')
          .replace(/நெத்திலிகள்/g, 'நெத்திலி')
          .replace(/இறால்கள்/g, 'இறால்');
        if (translated.trim()) return translated.trim();
      }
    }
  } catch (err) {
    // Network or timeout - fallback to dictionary
  }

  return translateLocalDictionary(clean);
}

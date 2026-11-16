import React, { useState, useEffect, useRef } from 'react';
import { EMPTY_PRODUCT } from '../utils/constants';
import { translateToTamil } from '../utils/tamilTranslate';
import { getAdminErrorMessage } from '../../utils/errorMessages';

const BASE_CATEGORIES = [
  { id: 'nethili', label: 'Anchovy / நெத்திலி (nethili)' },
  { id: 'paarai', label: 'Paarai / பாறை (paarai)' },
  { id: 'seer-fish', label: 'King Fish / வஞ்சரம் (seer-fish)' },
  { id: 'squid', label: 'Squid / கணவா (squid)' },
  { id: 'prawn', label: 'Prawns / இறால் (prawn)' },
  { id: 'shark', label: 'Shark / சுறா (shark)' },
  { id: 'maasi', label: 'Maasi / மாசி (maasi)' },
  { id: 'pickle', label: 'Pickles / ஊறுகாய் (pickle)' },
  { id: 'dry-fish', label: 'Other Dry Fish / மற்ற கருவாடு (dry-fish)' }
];

const STANDARD_PACKS = ['250g', '500g', '1kg'];

// Parse gram weight from string like "250g", "1kg", "500g", "200g", "2kg"
function parseGrams(packStr) {
  if (!packStr) return 250;
  const str = String(packStr).trim().toLowerCase();
  if (str.endsWith('kg')) {
    const val = parseFloat(str) || 1;
    return val * 1000;
  }
  return parseFloat(str) || 250;
}

export default function ProductEditor({ product, onClose, onSave, existingProducts = [] }) {
  const [form, setForm] = useState(() => {
    const base = { ...EMPTY_PRODUCT, ...product };
    return base;
  });

  // Category handling
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [customCategoryId, setCustomCategoryId] = useState('');

  // Collect all unique categories
  const allCategoryOptions = React.useMemo(() => {
    const map = new Map(BASE_CATEGORIES.map(c => [c.id, c.label]));
    (existingProducts || []).forEach(p => {
      if (p.category && !map.has(p.category)) {
        map.set(p.category, `${p.category.toUpperCase()} (${p.category})`);
      }
    });
    if (form.category && !map.has(form.category)) {
      map.set(form.category, `${form.category.toUpperCase()} (${form.category})`);
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [existingProducts, form.category]);

  // Pack sizes state
  const [availablePacks, setAvailablePacks] = useState(() => {
    if (Array.isArray(product?.availablePacks) && product.availablePacks.length > 0) {
      return [...product.availablePacks];
    }
    if (product?.packSize) {
      return [product.packSize];
    }
    return ['250g', '500g', '1kg'];
  });

  // Pack Prices state: { '250g': 180, '500g': 340, '1kg': 650 }
  const [packPrices, setPackPrices] = useState(() => {
    const prices = {};
    if (product?.packPrices && typeof product.packPrices === 'object') {
      Object.entries(product.packPrices).forEach(([k, v]) => {
        prices[k] = (v === 0 || v === '0') ? '' : v;
      });
      return prices;
    }

    const basePrice = Number(product?.basePrice250g || product?.packPrice || 0);
    prices['250g'] = basePrice > 0 ? basePrice : '';
    prices['500g'] = basePrice > 0 ? basePrice * 2 : '';
    prices['1kg'] = basePrice > 0 ? basePrice * 4 : '';

    if (product?.packSize && !prices[product.packSize]) {
      const pVal = Number(product.packPrice || basePrice);
      prices[product.packSize] = pVal > 0 ? pVal : '';
    }

    return prices;
  });

  // Pack MRP Prices state
  const [packMrpPrices, setPackMrpPrices] = useState(() => {
    if (product?.packMrpPrices && typeof product.packMrpPrices === 'object') {
      const mrp = {};
      Object.entries(product.packMrpPrices).forEach(([k, v]) => {
        mrp[k] = (v === 0 || v === '0') ? '' : v;
      });
      return mrp;
    }
    const mrp = {};
    const basePrice = Number(product?.basePrice250g || product?.packPrice || 0);
    const baseMrp = Number(product?.baseMrp250g || product?.packMrpPrice || (basePrice > 0 ? Math.round(basePrice * 1.15) : 0));

    mrp['250g'] = baseMrp > 0 ? baseMrp : '';
    mrp['500g'] = baseMrp > 0 ? baseMrp * 2 : '';
    mrp['1kg'] = baseMrp > 0 ? baseMrp * 4 : '';

    if (product?.packSize && !mrp[product.packSize]) {
      const pMrp = Number(product.packMrpPrice || baseMrp);
      mrp[product.packSize] = pMrp > 0 ? pMrp : '';
    }

    return mrp;
  });

  const [customPackInput, setCustomPackInput] = useState('');
  const [isTranslatingName, setIsTranslatingName] = useState(false);
  const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);
  const [imageRatioError, setImageRatioError] = useState('');
  const [pendingNonSquareImg, setPendingNonSquareImg] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const translateTimerRef = useRef(null);
  const userEditedTaRef = useRef(Boolean(product?.nameTa));

  // Change generic form field
  const change = (key, value) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };

  // Auto-translate English product name to Tamil
  const handleNameEnChange = (e) => {
    const val = e.target.value;
    change('nameEn', val);

    // If code is empty and adding new product, suggest uppercase code
    if (!product?.id && (!form.code || form.code.endsWith('_250G') || form.code.endsWith('_500G') || form.code.endsWith('_1KG'))) {
      const generatedCode = val
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      if (generatedCode) {
        change('code', generatedCode + '_250G');
      }
    }

    // Debounced automatic translation to Tamil
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
    if (!val.trim()) return;

    translateTimerRef.current = setTimeout(async () => {
      setIsTranslatingName(true);
      try {
        const tamil = await translateToTamil(val);
        if (tamil && !userEditedTaRef.current) {
          change('nameTa', tamil);
        }
      } catch (_) {
        // Translation fallback silently fails
      } finally {
        setIsTranslatingName(false);
      }
    }, 600);
  };

  // Manual Trigger to force translate Name
  const triggerNameTranslate = async () => {
    if (!form.nameEn?.trim()) return;
    setIsTranslatingName(true);
    try {
      const tamil = await translateToTamil(form.nameEn);
      if (tamil) change('nameTa', tamil);
    } catch (_) {}
    finally {
      setIsTranslatingName(false);
    }
  };

  // Manual Trigger to translate Description
  const triggerDescTranslate = async () => {
    if (!form.descEn?.trim()) return;
    setIsTranslatingDesc(true);
    try {
      const tamil = await translateToTamil(form.descEn);
      if (tamil) change('descTa', tamil);
    } catch (_) {}
    finally {
      setIsTranslatingDesc(false);
    }
  };

  // Handle local image file upload - Strictly enforce 1:1 square ratio
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setError('');
    setImageRatioError('');
    setPendingNonSquareImg(null);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const rawDataUrl = uploadEvent.target?.result;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const ratio = w / h;

        // Strict 1:1 square verification (within 4% tolerance)
        const isSquare = Math.abs(w - h) <= 10 || (ratio >= 0.96 && ratio <= 1.04);

        if (!isSquare) {
          // DISALLOW non-square images!
          setPendingNonSquareImg(rawDataUrl);
          setImageRatioError(
            `❌ Square Image Only (1:1 Ratio): நீங்கள் தேர்ந்தெடுத்த படம் சதுர வடிவில் (1:1 Square) இல்லை (${w} × ${h} px). தயாரிப்பு படம் கட்டாயம் 1:1 சதுர வடிவில் மட்டுமே இருக்க வேண்டும்.`
          );
          change('img', ''); // Do not allow setting to form.img
          return;
        }

        // VALID 1:1 SQUARE: Standardize to 800x800 high-res compressed JPEG
        const targetSize = 800;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize, targetSize);
        ctx.drawImage(img, 0, 0, targetSize, targetSize);

        const processedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        change('img', processedDataUrl);
        setImageRatioError('');
        setPendingNonSquareImg(null);
      };
      img.onerror = () => {
        setError('Unable to read selected image. Please try another file.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Helper: Auto-crop non-square image into 1:1 square if client requests it
  const handleCropToSquare = () => {
    if (!pendingNonSquareImg) return;
    const img = new Image();
    img.onload = () => {
      const targetSize = 800;
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetSize, targetSize);

      // Center crop to 1:1 square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

      const processedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      change('img', processedDataUrl);
      setImageRatioError('');
      setPendingNonSquareImg(null);
    };
    img.src = pendingNonSquareImg;
  };

  // Toggle pack size checkbox
  const togglePackSize = (pack) => {
    setAvailablePacks(prev => {
      if (prev.includes(pack)) {
        if (prev.length === 1) {
          setError('At least one pack size must remain selected.');
          return prev;
        }
        setError('');
        return prev.filter(p => p !== pack);
      } else {
        setError('');
        const next = [...prev, pack];
        // Sort packs sensibly: 250g, 500g, 1kg, etc.
        return next.sort((a, b) => parseGrams(a) - parseGrams(b));
      }
    });
  };

  // Add custom pack size
  const handleAddCustomPack = (e) => {
    e.preventDefault();
    let custom = customPackInput.trim().toLowerCase();
    if (!custom) return;
    if (!custom.endsWith('g') && !custom.endsWith('kg')) {
      custom += 'g';
    }

    if (!availablePacks.includes(custom)) {
      setAvailablePacks(prev => [...prev, custom].sort((a, b) => parseGrams(a) - parseGrams(b)));

      // Auto-calculate its price based on 250g price
      const p250 = Number(packPrices['250g'] || 0);
      if (p250 > 0) {
        const grams = parseGrams(custom);
        const calcPrice = Math.round(p250 * (grams / 250));
        const calcMrp = Math.round(calcPrice * 1.15);
        setPackPrices(prev => ({ ...prev, [custom]: calcPrice }));
        setPackMrpPrices(prev => ({ ...prev, [custom]: calcMrp }));
      }
    }
    setCustomPackInput('');
  };

  // Update pack price with auto-calculate for other packs if 250g, 500g, or 1kg is entered
  const handlePackPriceChange = (pack, rawValue) => {
    // If input is blank or deleted with backspace, allow it to remain blank
    if (rawValue === '' || rawValue == null) {
      if (pack === '250g' || pack === '1kg' || pack === '500g') {
        // Main selling price cleared: clear all other pack prices and MRPs
        setPackPrices(prev => {
          const cleared = {};
          availablePacks.forEach(p => { cleared[p] = ''; });
          return cleared;
        });
        setPackMrpPrices(prev => {
          const cleared = {};
          availablePacks.forEach(p => { cleared[p] = ''; });
          return cleared;
        });
      } else {
        setPackPrices(prev => ({ ...prev, [pack]: '' }));
      }
      return;
    }

    // Strip leading zeros if user typed over 0 (e.g. "0150" -> "150")
    let cleaned = String(rawValue).trim();
    if (cleaned.startsWith('0') && cleaned.length > 1 && !cleaned.startsWith('0.')) {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '') cleaned = '0';
    }

    const numVal = Math.max(0, parseFloat(cleaned) || 0);

    if (numVal === 0 && (pack === '250g' || pack === '1kg' || pack === '500g')) {
      setPackPrices(prev => {
        const cleared = {};
        availablePacks.forEach(p => { cleared[p] = ''; });
        return cleared;
      });
      setPackMrpPrices(prev => {
        const cleared = {};
        availablePacks.forEach(p => { cleared[p] = ''; });
        return cleared;
      });
      return;
    }

    setPackPrices(prev => ({ ...prev, [pack]: cleaned }));

    // Auto-calculate other pack prices (supports entering 250g, 500g, or 1kg)
    if (numVal > 0) {
      let base250Price = 0;
      if (pack === '250g') {
        base250Price = numVal;
      } else if (pack === '500g') {
        base250Price = Math.round(numVal / 2);
      } else if (pack === '1kg') {
        base250Price = Math.round(numVal / 4);
      }

      if (base250Price > 0) {
        setPackPrices(prev => {
          const updated = { ...prev, [pack]: cleaned };
          if (availablePacks.includes('250g') && pack !== '250g') {
            updated['250g'] = base250Price;
          }
          if (availablePacks.includes('500g') && pack !== '500g') {
            updated['500g'] = pack === '1kg' ? Math.round(numVal / 2) : base250Price * 2;
          }
          if (availablePacks.includes('1kg') && pack !== '1kg') {
            updated['1kg'] = pack === '500g' ? numVal * 2 : base250Price * 4;
          }
          // Other custom packs: proportional weight calculation
          availablePacks.forEach(p => {
            if (p !== '250g' && p !== '500g' && p !== '1kg' && p !== pack) {
              const grams = parseGrams(p);
              updated[p] = Math.round(base250Price * (grams / 250));
            }
          });
          return updated;
        });

        // Also auto-calculate MRP (+15% standard margin)
        setPackMrpPrices(prev => {
          const updated = { ...prev };
          const mrp250 = Math.round(base250Price * 1.15);
          if (availablePacks.includes('250g')) {
            updated['250g'] = mrp250;
          }
          if (availablePacks.includes('500g')) {
            const price500 = pack === '1kg' ? Math.round(numVal / 2) : (pack === '500g' ? numVal : base250Price * 2);
            updated['500g'] = Math.round(price500 * 1.15);
          }
          if (availablePacks.includes('1kg')) {
            const price1kg = pack === '1kg' ? numVal : (pack === '500g' ? numVal * 2 : base250Price * 4);
            updated['1kg'] = Math.round(price1kg * 1.15);
          }
          availablePacks.forEach(p => {
            if (p !== '250g' && p !== '500g' && p !== '1kg') {
              const grams = parseGrams(p);
              const pPrice = Math.round(base250Price * (grams / 250));
              updated[p] = Math.round(pPrice * 1.15);
            }
          });
          return updated;
        });
      }
    }
  };

  const handlePackMrpChange = (pack, rawValue) => {
    if (rawValue === '' || rawValue == null) {
      setPackMrpPrices(prev => ({ ...prev, [pack]: '' }));
      return;
    }
    let cleaned = String(rawValue).trim();
    if (cleaned.startsWith('0') && cleaned.length > 1 && !cleaned.startsWith('0.')) {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '') cleaned = '0';
    }
    setPackMrpPrices(prev => ({ ...prev, [pack]: cleaned }));
  };

  // Submit Handler
  const submit = async event => {
    event.preventDefault();
    setError('');

    if (imageRatioError) {
      setError(imageRatioError);
      return;
    }

    if (availablePacks.length === 0) {
      setError('Please select at least one pack size.');
      return;
    }

    setBusy(true);
    try {
      const primaryPack = availablePacks.includes('250g') ? '250g' : (availablePacks.includes('500g') ? '500g' : availablePacks[0]);
      const base250Price = packPrices['250g']
        ? Number(packPrices['250g'])
        : (primaryPack === '500g'
            ? Math.round(Number(packPrices['500g'] || 0) / 2)
            : (primaryPack === '1kg'
                ? Math.round(Number(packPrices['1kg'] || 0) / 4)
                : Number(packPrices[primaryPack] || 0)));
      const base250Mrp = packMrpPrices['250g']
        ? Number(packMrpPrices['250g'])
        : Math.round(base250Price * 1.15);

      const initialRating = Number(form.rating || 0) || 4.5;
      const reviewsCount = (Number(form.reviews || 0) > 0 && Number(form.reviews) !== 50 && Number(form.reviews) !== 48)
        ? Number(form.reviews)
        : 1;

      const cleanPackPrices = {};
      Object.entries(packPrices).forEach(([k, v]) => {
        cleanPackPrices[k] = Number(v) || 0;
      });
      const cleanPackMrpPrices = {};
      Object.entries(packMrpPrices).forEach(([k, v]) => {
        cleanPackMrpPrices[k] = Number(v) || 0;
      });

      const finalProduct = {
        ...form,
        code: form.code.trim().toUpperCase().replace(/\s+/g, '_'),
        category: form.category.trim().toLowerCase(),
        nameEn: form.nameEn.trim(),
        nameTa: form.nameTa.trim() || form.nameEn.trim(),
        img: form.img || '',
        availablePacks,
        packPrices: cleanPackPrices,
        packMrpPrices: cleanPackMrpPrices,
        packSize: availablePacks.length === 1 ? availablePacks[0] : null,
        packPrice: base250Price,
        packMrpPrice: base250Mrp,
        basePrice250g: base250Price,
        baseMrp250g: base250Mrp,
        stock: form.stock === '' || form.stock == null ? null : Number(form.stock),
        rating: initialRating,
        reviews: reviewsCount,
        boneType: form.boneType || '',
        salt: form.salt || '',
        descEn: form.descEn || '',
        descTa: form.descTa || ''
      };

      await onSave(finalProduct);
      onClose();
    } catch (saveError) {
      setError(getAdminErrorMessage(saveError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <form className="admin-product-modal-container" onSubmit={submit}>
        {/* Sticky Modal Header */}
        <div className="admin-product-modal-header">
          <div>
            <span className="admin-eyebrow">CATALOG MANAGEMENT</span>
            <h2 style={{ margin: '2px 0 0', fontSize: '18px', color: '#17364b' }}>
              {product?.id ? 'Edit product' : 'Add new product'}
            </h2>
          </div>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="admin-product-modal-body">
          {error && <div className="admin-alert">{error}</div>}

          {/* Section 1: Basic Information */}
          <div className="admin-form-section-card">
            <div className="admin-section-header">
              <div className="admin-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                <span>Basic Details / அடிப்படை தகவல்</span>
              </div>
              <span className="admin-section-tag">Required</span>
            </div>

            <div className="admin-card-grid-2">
              {/* Product Code */}
              <label>
                <span>Product code <span style={{ color: '#e11d48' }}>*</span></span>
                <input
                  required
                  value={form.code}
                  placeholder="e.g. NETHILI_250G"
                  onChange={e => change('code', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                />
              </label>

              {/* Category ID */}
              <label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span>Category <span style={{ color: '#e11d48' }}>*</span></span>
                  {!isAddingNewCategory ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCategory(true)}
                      style={{ background: 'transparent', border: 0, color: '#0876b1', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      + New category
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setIsAddingNewCategory(false); setCustomCategoryId(''); }}
                      style={{ background: 'transparent', border: 0, color: '#64748b', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                    >
                      Choose existing
                    </button>
                  )}
                </div>
                {isAddingNewCategory ? (
                  <input
                    required
                    autoFocus
                    value={customCategoryId}
                    placeholder="Enter category ID (e.g. crab, tuna)"
                    onChange={e => {
                      const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                      setCustomCategoryId(cleaned);
                      change('category', cleaned);
                    }}
                  />
                ) : (
                  <select
                    value={form.category}
                    onChange={e => {
                      if (e.target.value === '__add_new__') {
                        setIsAddingNewCategory(true);
                      } else {
                        change('category', e.target.value);
                      }
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dceaf3', background: '#fff', fontSize: '13px' }}
                  >
                    {allCategoryOptions.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                    <option value="__add_new__">+ Add new category ID...</option>
                  </select>
                )}
              </label>
            </div>

            {/* Product Name English */}
            <label style={{ marginTop: '12px', display: 'grid' }}>
              <span>Product name (English) <span style={{ color: '#e11d48' }}>*</span></span>
              <input
                required
                value={form.nameEn}
                placeholder="e.g. White Anchovy Cleaned Dry Fish"
                onChange={handleNameEnChange}
              />
            </label>

            {/* Product Name Tamil with Translate Button */}
            <label style={{ marginTop: '12px', display: 'grid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', flexWrap: 'wrap', gap: '6px' }}>
                <span>Product name (தமிழ்) <span style={{ color: '#e11d48' }}>*</span></span>
                <button
                  type="button"
                  onClick={triggerNameTranslate}
                  disabled={isTranslatingName}
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="Translate from English name"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
                  </svg>
                  {isTranslatingName ? 'மொழிபெயர்க்கிறது…' : 'Auto-translate'}
                </button>
              </div>
              <input
                required
                value={form.nameTa}
                placeholder="e.g. பால் நெத்திலி தலைசுத்தம் செய்தது"
                onChange={e => {
                  userEditedTaRef.current = true;
                  change('nameTa', e.target.value);
                }}
              />
            </label>
          </div>

          {/* Section 2: Product Image */}
          <div className="admin-form-section-card">
            <div className="admin-section-header">
              <div className="admin-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Product Image / தயாரிப்பு படம் (Strict 1:1 Square)</span>
              </div>
              <span className="admin-section-tag" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                1:1 Square Only
              </span>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '11.5px', color: '#64748b', lineHeight: 1.45 }}>
              <b>கட்டாய விதி (Strict 1:1 Square):</b> தயாரிப்பு படம் கட்டாயம் <b>1:1 சதுர வடிவில் (Square - 600×600 px or 800×800 px)</b> இருக்க வேண்டும். நீளமான (Rectangle) படங்கள் அனுமதிக்கப்படாது!
            </p>

            {/* Error banner when non-square image is uploaded */}
            {imageRatioError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '14px', color: '#991b1b', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>{imageRatioError}</div>
                {pendingNonSquareImg && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleCropToSquare}
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      ✂️ இந்த படத்தை 1:1 Square-ஆக Crop செய் (Crop to 1:1 Square)
                    </button>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>அல்லது புதிய சதுரப் படத்தை தேர்வு செய்யவும்.</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: form.img ? '2px solid #22c55e' : '1.5px solid #cbd5e1', flexShrink: 0, boxSizing: 'border-box' }}>
                {form.img ? (
                  <img src={form.img} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12c2.5-3.5 6-5.3 10-5.3 4.1 0 6.7 2 10 5.3-3.3 3.3-5.9 5.3-10 5.3-4 0-7.5-1.8-10-5.3Z" />
                    <path d="m2 12-1.3-3v6L2 12Z" />
                    <circle cx="15" cy="10" r="1" fill="#94a3b8" stroke="none" />
                  </svg>
                )}
              </div>

              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--fk-blue, #0876b1)', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      <polyline points="12 11 12 17" />
                      <polyline points="9 14 12 11 15 14" />
                    </svg>
                    Choose 1:1 square image
                    <input type="file" accept="image/*" onChange={handleImageFileUpload} style={{ display: 'none' }} />
                  </label>
                  {form.img && (
                    <button
                      type="button"
                      onClick={() => {
                        change('img', '');
                        setImageRatioError('');
                        setPendingNonSquareImg(null);
                      }}
                      style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#64748b', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                  {form.img && (
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ✓ 1:1 Square Verified
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={form.img || ''}
                  placeholder="Or paste image URL (https://...)"
                  onChange={e => {
                    change('img', e.target.value);
                    setImageRatioError('');
                    setPendingNonSquareImg(null);
                  }}
                  style={{ width: '100%', fontSize: '12px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #dceaf3', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pack Sizes & Pricing */}
          <div className="admin-form-section-card">
            <div className="admin-section-header">
              <div className="admin-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                  <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                  <path d="M7 21h10" />
                  <path d="M12 3v18" />
                  <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
                </svg>
                <span>Pack Sizes & Pricing / அளவுகள் & விலை</span>
              </div>
              <span className="admin-section-tag">Required</span>
            </div>

            {/* Select pack sizes */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#38586c', display: 'block', marginBottom: '6px' }}>
                Available pack sizes:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {Array.from(new Set([...STANDARD_PACKS, ...availablePacks])).map(pack => {
                  const isSelected = availablePacks.includes(pack);
                  return (
                    <label
                      key={pack}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: isSelected ? '#eff6ff' : '#f8fafc',
                        border: `1.5px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`,
                        color: isSelected ? '#1d4ed8' : '#475569',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePackSize(pack)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <span>{pack}</span>
                    </label>
                  );
                })}
              </div>

              {/* Add custom pack input */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', maxWidth: '320px', width: '100%' }}>
                <input
                  type="text"
                  value={customPackInput}
                  placeholder="Custom pack (e.g. 200g, 2kg)"
                  onChange={e => setCustomPackInput(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomPack}
                  style={{ background: '#0284c7', color: '#fff', border: 0, padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Pricing Details */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: '8px', border: '1px solid #a7f3d0', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', lineHeight: 1.4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>250g விலை உள்ளிட்டால் 500g (2x), 1kg (4x) தானாக கணக்கிடப்படும் (250g = ₹150 -&gt; 500g = ₹300, 1kg = ₹600)</span>
                </div>
              </div>

              {/* Clean Cards for Pack Prices */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availablePacks.map(pack => (
                  <div
                    key={pack}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>Pack: {pack}</strong>
                      {pack === '250g' && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: '10px' }}>
                          Base (250g)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <label style={{ margin: 0 }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Selling Price (₹) *</span>
                        <input
                          required
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={packPrices[pack] ?? ''}
                          placeholder="₹ Price"
                          onFocus={e => {
                            if (e.target.value === '0' || e.target.value === '') {
                              handlePackPriceChange(pack, '');
                            } else {
                              e.target.select();
                            }
                          }}
                          onClick={e => {
                            if (e.target.value === '0') {
                              handlePackPriceChange(pack, '');
                            }
                          }}
                          onChange={e => handlePackPriceChange(pack, e.target.value)}
                          style={{ padding: '8px 10px', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </label>
                      <label style={{ margin: 0 }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>MRP (₹) *</span>
                        <input
                          required
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={packMrpPrices[pack] ?? ''}
                          placeholder="MRP"
                          onFocus={e => {
                            if (e.target.value === '0' || e.target.value === '') {
                              handlePackMrpChange(pack, '');
                            } else {
                              e.target.select();
                            }
                          }}
                          onClick={e => {
                            if (e.target.value === '0') {
                              handlePackMrpChange(pack, '');
                            }
                          }}
                          onChange={e => handlePackMrpChange(pack, e.target.value)}
                          style={{ padding: '8px 10px', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Stock & Attributes */}
          <div className="admin-form-section-card">
            <div className="admin-section-header">
              <div className="admin-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <span>Stock & Attributes / இருப்பு & வகைகள்</span>
              </div>
              <span className="admin-section-tag">Optional</span>
            </div>

            <div className="admin-card-grid-2">
              {/* Stock */}
              <label>
                <span>Stock (packs count)</span>
                <input
                  type="number"
                  min="0"
                  value={form.stock ?? ''}
                  placeholder="e.g. 50 (blank for untracked)"
                  onFocus={e => {
                    if (e.target.value === '0') change('stock', '');
                    else e.target.select();
                  }}
                  onChange={e => change('stock', e.target.value)}
                />
              </label>

              {/* Initial Rating */}
              <label>
                <span>Initial Rating (0 to 5)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  placeholder="e.g. 4.5"
                  onFocus={e => e.target.select()}
                  onChange={e => change('rating', e.target.value)}
                />
              </label>

              {/* Bone Type */}
              <label>
                <span>Bone Type</span>
                <select
                  value={form.boneType || ''}
                  onChange={e => change('boneType', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dceaf3', background: '#fff', fontSize: '13px' }}
                >
                  <option value="">All Types (Not specified)</option>
                  <option value="boneless">100% Boneless (முள் இல்லாதது)</option>
                  <option value="single-bone">Single Center Bone (ஒற்றை முள்)</option>
                  <option value="whole-crisp">Whole Crispy Chewable (முழு மீன்)</option>
                </select>
              </label>

              {/* Salt Content */}
              <label>
                <span>Salt Content</span>
                <select
                  value={form.salt || ''}
                  onChange={e => change('salt', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dceaf3', background: '#fff', fontSize: '13px' }}
                >
                  <option value="">All Salt Levels (Not specified)</option>
                  <option value="mild">Mild / Low Salt (மிதமான உப்பு)</option>
                  <option value="traditional">Traditional Sea Salted (பாரம்பரிய கடல் உப்பு)</option>
                </select>
              </label>
            </div>
          </div>

          {/* Section 5: Descriptions */}
          <div className="admin-form-section-card">
            <div className="admin-section-header">
              <div className="admin-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>Description / தயாரிப்பு விளக்கம்</span>
              </div>
              <span className="admin-section-tag">Details</span>
            </div>

            <label style={{ display: 'grid', marginBottom: '12px' }}>
              <span>Description (English)</span>
              <textarea
                rows="2"
                value={form.descEn}
                placeholder="Authentic coastal dry fish harvested in Tuticorin, naturally sun-dried with traditional methods."
                onChange={e => change('descEn', e.target.value)}
              />
            </label>

            <label style={{ display: 'grid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', flexWrap: 'wrap', gap: '6px' }}>
                <span>விளக்கம் (தமிழ்)</span>
                <button
                  type="button"
                  onClick={triggerDescTranslate}
                  disabled={isTranslatingDesc}
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="Translate description from English"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
                  </svg>
                  {isTranslatingDesc ? 'மொழிபெயர்க்கிறது…' : 'Translate to தமிழ்'}
                </button>
              </div>
              <textarea
                rows="2"
                value={form.descTa}
                placeholder="தூத்துக்குடி பாரம்பரிய முறைப்படி சூரிய ஒளியில் இயற்கையாக உலர்த்தப்பட்ட உயர்தர கருவாடு."
                onChange={e => change('descTa', e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Sticky Modal Footer Actions */}
        <div className="admin-product-modal-footer">
          <button type="button" className="admin-secondary-button" onClick={onClose} style={{ minHeight: '42px', padding: '0 20px' }}>
            Cancel
          </button>
          <button className="admin-primary-button" disabled={busy} style={{ minHeight: '42px', padding: '0 24px' }}>
            {busy ? 'Saving…' : (product?.id ? 'Update product' : 'Save product')}
          </button>
        </div>
      </form>
    </div>
  );
}

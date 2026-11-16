import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { productsData, couponsData } from '../data/products';
import { shopInfo } from '../data/shopInfo';
import { apiUrl } from '../api';
import {
  fetchProductOrderSummaries,
  fetchProductRatingSummaries,
  fetchAdminCoupons,
  fetchAdminSettings,
  isSupabaseConfigured,
  parseProductRow,
  submitProductRating as saveProductRating,
  supabase
} from '../supabase';

const CartContext = createContext();
const PRODUCT_RATINGS_KEY = 'atf_product_ratings';
const RATING_VOTER_ID_KEY = 'atf_rating_voter_id';

export const useCart = () => useContext(CartContext);

const readStoredProductRatings = () => {
  try {
    const saved = localStorage.getItem(PRODUCT_RATINGS_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, rating]) => Number.isInteger(rating) && rating >= 1 && rating <= 5)
    );
  } catch (error) {
    console.error('Failed to read saved product ratings', error);
    return {};
  }
};

const isValidRatingVoterId = value => (
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
);

const getRatingVoterId = () => {
  const fallbackId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const randomValue = Math.floor(Math.random() * 16);
    return (character === 'x' ? randomValue : (randomValue & 0x3) | 0x8).toString(16);
  });

  try {
    const savedId = localStorage.getItem(RATING_VOTER_ID_KEY);
    if (isValidRatingVoterId(savedId)) return savedId;

    const voterId = globalThis.crypto?.randomUUID?.() || fallbackId();
    localStorage.setItem(RATING_VOTER_ID_KEY, voterId);
    return voterId;
  } catch (error) {
    console.error('Unable to persist the product rating voter ID', error);
    return globalThis.crypto?.randomUUID?.() || fallbackId();
  }
};

export const getWeightMultiplier = (weightStr) => {
  if (weightStr === '500g') return 1.9; // 5% discount for 500g
  if (weightStr === '1kg') return 3.6;   // 10% discount for 1kg
  return 1.0; // 250g
};

export const getProductPackPrice = (product, weight) => {
  if (product?.packPrices && product.packPrices[weight] != null) {
    return Number(product.packPrices[weight]);
  }
  return product.packSize
    ? Math.round(
      Number(product.packPrice) *
      ({ '200g': 200, '250g': 250, '500g': 500, '1kg': 1000 }[weight] || 250) /
      ({ '200g': 200, '250g': 250, '500g': 500, '1kg': 1000 }[product.packSize] || 250)
    )
    : Math.round(product.basePrice250g * getWeightMultiplier(weight));
};

export const getProductPackMrp = (product, weight) => {
  if (product?.packMrpPrices && product.packMrpPrices[weight] != null) {
    return Number(product.packMrpPrices[weight]);
  }
  return product.packSize
    ? Math.round(
      Number(product.packMrpPrice ?? product.packPrice) *
      ({ '200g': 200, '250g': 250, '500g': 500, '1kg': 1000 }[weight] || 250) /
      ({ '200g': 200, '250g': 250, '500g': 500, '1kg': 1000 }[product.packSize] || 250)
    )
    : Math.round(product.baseMrp250g * getWeightMultiplier(weight));
};

export const CartProvider = ({ children }) => {
  const [products, setProducts] = useState(productsData);
  const [availableCoupons, setAvailableCoupons] = useState(couponsData);
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'JS Dry Fish Shop',
    supportPhone: shopInfo.phone,
    upiId: shopInfo.upiId || '9787453202@okaxis',
    upiQrImage: '',
    supportEmail: 'contact@antotutyfishhub.com',
    deliveryCharge: 40,
    freeDeliveryThreshold: 499
  });

  useEffect(() => {
    let active = true;
    const refreshProducts = async () => {
      // 1. Primary: Direct Supabase
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: pData } = await supabase.from('products').select('*');
          if (pData && pData.length > 0) {
            const parsedCatalog = pData.map(parseProductRow).filter(Boolean);
            const savedByCode = new Map(parsedCatalog.map(product => [product.code, product]));
            const defaultCodes = new Set(productsData.map(product => product.code));
            const mergedCatalog = [
              ...productsData
                .filter(product => savedByCode.get(product.code)?.isActive !== false)
                .map(product => savedByCode.get(product.code) || product),
              ...parsedCatalog.filter(product => !defaultCodes.has(product.code) && product.isActive !== false)
            ];
            if (active && mergedCatalog.length > 0) setProducts(mergedCatalog);
          }

          // Also load live coupons from Supabase
          try {
            const liveCoupons = await fetchAdminCoupons();
            if (active && liveCoupons && liveCoupons.length > 0) {
              const couponObj = {};
              liveCoupons.forEach(c => {
                if (c && c.code && c.isActive !== false) {
                  couponObj[c.code] = c;
                }
              });
              setAvailableCoupons(couponObj);
            }
          } catch (_) {}

          // Also load live store settings from Supabase
          try {
            const liveSettings = await fetchAdminSettings();
            if (active && liveSettings && typeof liveSettings === 'object') {
              setStoreSettings(previous => ({ ...previous, ...liveSettings }));
            }
          } catch (_) {}

          return; // Supabase data loaded successfully! Do not attempt offline /api endpoints.
        } catch (sbErr) {
          console.warn('Supabase catalog fetch fallback', sbErr);
        }
      }

      // 2. Only attempt external API endpoint if explicitly configured with a base URL
      if (import.meta.env.VITE_API_BASE_URL) {
        try {
          const [productsResponse, couponsResponse, settingsResponse] = await Promise.all([
            fetch(apiUrl('/api/products')),
            fetch(apiUrl('/api/coupons')),
            fetch(apiUrl('/api/store/settings'))
          ]);
          if (!productsResponse.ok) throw new Error(`Product API returned ${productsResponse.status}`);
          if (!couponsResponse.ok) throw new Error(`Coupon API returned ${couponsResponse.status}`);
          if (!settingsResponse.ok) throw new Error(`Store settings API returned ${settingsResponse.status}`);
          const [catalog, coupons, settings] = await Promise.all([
            productsResponse.json(),
            couponsResponse.json(),
            settingsResponse.json()
          ]);
          if (active && Array.isArray(catalog) && catalog.length > 0) setProducts(catalog);
          if (active && coupons && typeof coupons === 'object') setAvailableCoupons(coupons);
          if (active && settings && typeof settings === 'object') {
            setStoreSettings(previous => ({ ...previous, ...settings }));
          }
        } catch (error) {
          // Safe fallback to built-in catalog
        }
      }
    };

    const handleCouponsSync = async () => {
      try {
        const liveCoupons = await fetchAdminCoupons();
        if (liveCoupons && liveCoupons.length > 0) {
          const couponObj = {};
          liveCoupons.forEach(c => {
            if (c && c.code && c.isActive !== false) {
              couponObj[c.code] = c;
            }
          });
          setAvailableCoupons(couponObj);
        }
      } catch (_) {}
    };

    refreshProducts();
    const intervalId = window.setInterval(refreshProducts, 60_000);
    window.addEventListener('focus', refreshProducts);
    window.addEventListener('atf_coupons_updated', handleCouponsSync);
    window.addEventListener('storage', handleCouponsSync);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshProducts);
      window.removeEventListener('atf_coupons_updated', handleCouponsSync);
      window.removeEventListener('storage', handleCouponsSync);
    };
  }, []);

  // LocalStorage persistance
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('atf_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('atf_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isTamil, setIsTamil] = useState(() => {
    try {
      const saved = localStorage.getItem('atf_lang');
      return saved ? saved === 'ta' : false;
    } catch (_) {
      return false;
    }
  });
  const [activePincode, setActivePincode] = useState('628001');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedWeights, setSelectedWeights] = useState({});
  const [userProductRatings, setUserProductRatings] = useState(readStoredProductRatings);
  const [productRatingSummaries, setProductRatingSummaries] = useState({});
  const [productOrderSummaries, setProductOrderSummaries] = useState({});
  const [productRatingServiceStatus, setProductRatingServiceStatus] = useState(
    () => isSupabaseConfigured() ? 'loading' : 'error'
  );
  const userProductRatingsRef = useRef(userProductRatings);
  const [ratingVoterId] = useState(getRatingVoterId);
  const ratingSubmissionsInProgress = useRef(new Set());

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isWholesaleOpen, setIsWholesaleOpen] = useState(false);
  const [isPincodeModalOpen, setIsPincodeModalOpen] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '' });

  // Filters
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 2000,
    assuredOnly: false,
    packSize: 'all',
    salt: 'all', // 'all', 'mild', 'traditional'
    boneType: 'all', // 'all', 'boneless', 'single-bone', 'whole-crisp'
    minRating: 0
  });

  useEffect(() => {
    localStorage.setItem('atf_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('atf_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Clear cart and wishlist when customer signs out
  useEffect(() => {
    const handleAuthChange = (event) => {
      if (!event?.detail) {
        setCart([]);
        setWishlist([]);
        try {
          localStorage.removeItem('atf_cart');
          localStorage.removeItem('atf_wishlist');
        } catch (_) {}
      }
    };
    window.addEventListener('atf_customer_auth_change', handleAuthChange);
    return () => window.removeEventListener('atf_customer_auth_change', handleAuthChange);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return undefined;

    let active = true;
    let isRefreshing = false;
    const refreshRatingSummaries = async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const summaries = await fetchProductRatingSummaries();
        if (active) {
          setProductRatingSummaries(summaries);
          setProductRatingServiceStatus('ready');
        }
      } catch (error) {
        if (active) setProductRatingServiceStatus('error');
        console.error('Unable to load customer product ratings', error);
      } finally {
        isRefreshing = false;
      }
    };

    refreshRatingSummaries();
    const intervalId = window.setInterval(refreshRatingSummaries, 30_000);
    window.addEventListener('focus', refreshRatingSummaries);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshRatingSummaries);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return undefined;

    let active = true;
    let isRefreshing = false;
    const refreshProductOrderSummaries = async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const summaries = await fetchProductOrderSummaries();
        if (active) setProductOrderSummaries(summaries);
      } catch (error) {
        console.error('Unable to load product popularity totals', error);
      } finally {
        isRefreshing = false;
      }
    };

    refreshProductOrderSummaries();
    const intervalId = window.setInterval(refreshProductOrderSummaries, 30_000);
    window.addEventListener('focus', refreshProductOrderSummaries);
    window.addEventListener('atf_new_order', refreshProductOrderSummaries);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshProductOrderSummaries);
      window.removeEventListener('atf_new_order', refreshProductOrderSummaries);
    };
  }, []);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => {
      setToast({ show: false, msg: '' });
    }, 2500);
  };

  const submitProductRating = async (productCode, rating) => {
    if (!productCode || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Choose a product and a rating from 1 to 5.');
    }
    if (!isSupabaseConfigured() || !supabase || productRatingServiceStatus !== 'ready') {
      throw new Error('Shared product ratings are currently unavailable.');
    }
    if (ratingSubmissionsInProgress.current.has(productCode)) {
      return;
    }
    const previousRating = userProductRatingsRef.current[productCode];
    if (previousRating === rating) {
      return;
    }

    ratingSubmissionsInProgress.current.add(productCode);
    try {
      try {
        await saveProductRating(productCode, ratingVoterId, rating);
      } catch (dbErr) {
        console.warn('Could not sync rating to Supabase product_ratings (saved locally):', dbErr);
      }

      const nextUserRatings = { ...userProductRatingsRef.current, [productCode]: rating };
      userProductRatingsRef.current = nextUserRatings;
      setUserProductRatings(nextUserRatings);
      try {
        localStorage.setItem(PRODUCT_RATINGS_KEY, JSON.stringify(nextUserRatings));
      } catch (error) {
        console.error('Failed to save your product rating on this device', error);
      }

      setProductRatingSummaries(previous => {
        const current = previous[productCode] || { rating: 0, reviews: 0 };
        const isUpdate = Boolean(previousRating);
        const reviews = isUpdate ? Math.max(1, current.reviews) : current.reviews + 1;
        const totalScore = isUpdate
          ? (current.rating * current.reviews - previousRating + rating)
          : (current.rating * current.reviews + rating);
        const average = Number((totalScore / reviews).toFixed(1));
        return { ...previous, [productCode]: { rating: average, reviews } };
      });

      try {
        setProductRatingSummaries(await fetchProductRatingSummaries());
      } catch (error) {
        console.error('Rating was saved, but the latest rating summary could not be refreshed', error);
      }
    } finally {
      ratingSubmissionsInProgress.current.delete(productCode);
    }
  };

  const toggleLanguage = () => {
    setIsTamil(prev => {
      const next = !prev;
      try {
        localStorage.setItem('atf_lang', next ? 'ta' : 'en');
      } catch (_) {}
      showToast(next ? 'தமிழ் மொழிக்கு மாற்றப்பட்டது' : 'Switched to English');
      return next;
    });
  };

  const setItemWeight = (itemId, weight) => {
    setSelectedWeights(prev => ({ ...prev, [itemId]: weight }));
  };

  const getItemWeight = (itemId, fallback = '250g') => {
    if (selectedWeights[itemId]) return selectedWeights[itemId];
    return fallback;
  };

  const addToCart = (product, weight = '250g') => {
    const price = getProductPackPrice(product, weight);
    const mrp = getProductPackMrp(product, weight);

    setCart(prev => {
      const idx = prev.findIndex(item => item.id === product.id && item.weight === weight);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, {
        id: product.id,
        code: product.code,
        nameEn: product.nameEn,
        nameTa: product.nameTa,
        weight,
        price,
        mrp,
        img: product.img,
        fallbackIcon: product.fallbackIcon,
        qty: 1
      }];
    });

    showToast(`${isTamil ? product.nameTa : product.nameEn} (${weight}) added to cart!`);
  };

  const buyNow = (product, weight = '250g') => {
    addToCart(product, weight);
    setIsCartOpen(true);
  };

  const updateQty = (id, weight, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id && item.weight === weight) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (id, weight) => {
    setCart(prev => prev.filter(item => !(item.id === id && item.weight === weight)));
    showToast('Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    try { localStorage.removeItem('atf_cart'); } catch (_) {}
  };

  const clearWishlist = () => {
    setWishlist([]);
    try { localStorage.removeItem('atf_wishlist'); } catch (_) {}
  };

  const toggleWishlist = (id) => {
    const product = products.find(p => p.id === id);
    setWishlist(prev => {
      if (prev.includes(id)) {
        showToast('Removed from Wishlist');
        return prev.filter(x => x !== id);
      } else {
        showToast(`Added ${product?.nameEn || 'Item'} to Wishlist!`);
        return [...prev, id];
      }
    });
  };

  const applyCouponCode = (code) => {
    if (!code || !code.trim()) {
      return { success: false, msg: isTamil ? 'கூப்பன் குறியீட்டை உள்ளிடவும்.' : 'Please enter a coupon code.' };
    }
    const upper = code.trim().toUpperCase();
    if (!availableCoupons[upper] || availableCoupons[upper].isActive === false) {
      return { success: false, msg: isTamil ? 'கூப்பன் கிடைக்கவில்லை அல்லது காலாவதியானது.' : 'Coupon not found or no longer active.' };
    }
    const coupon = availableCoupons[upper];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const minRequired = Number(coupon.minOrder || 0);
    if (subtotal < minRequired) {
      const shortfall = minRequired - subtotal;
      return {
        success: false,
        msg: isTamil
          ? `இச்சலுகைக்கு குறைந்தபட்ச ஆர்டர் ₹${minRequired} தேவை. இன்னும் ₹${shortfall} சேர்க்கவும்.`
          : `Minimum order of ₹${minRequired} required. Add ₹${shortfall} more to apply.`
      };
    }
    setAppliedCoupon(upper);
    return {
      success: true,
      msg: isTamil ? `கூப்பன் ${upper} வெற்றிகரமாக பயன்படுத்தப்பட்டது!` : `Coupon ${upper} applied successfully!`
    };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast(isTamil ? 'கூப்பன் நீக்கப்பட்டது' : 'Coupon removed');
  };

  // Price calculations
  const totalItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalMRP = cart.reduce((sum, item) => sum + (item.mrp * item.qty), 0);
  const subTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const mrpDiscount = totalMRP - subTotal;

  let couponDiscount = 0;
  if (appliedCoupon && availableCoupons[appliedCoupon]) {
    const c = availableCoupons[appliedCoupon];
    if (c.isActive !== false && subTotal >= Number(c.minOrder || 0)) {
      if (c.flatDiscount) {
        couponDiscount = Number(c.flatDiscount);
      } else if (c.discountPercent) {
        couponDiscount = Math.round((subTotal * Number(c.discountPercent)) / 100);
      }
    } else {
      couponDiscount = 0;
    }
  }

  const freeDeliveryThreshold = Math.max(0, Number(storeSettings?.freeDeliveryThreshold ?? 499));
  const baseDeliveryCharge = Math.max(0, Number(storeSettings?.deliveryCharge ?? 40));
  
  // Delivery Charge logic:
  // 1. If subtotal is 0 (empty cart) or baseDeliveryCharge is 0 -> 0
  // 2. If freeDeliveryThreshold > 0 and subTotal >= freeDeliveryThreshold -> 0 (free delivery unlocked)
  // 3. Otherwise (including when threshold is 0/disabled) -> charge baseDeliveryCharge
  let deliveryCharge = 0;
  if (subTotal === 0 || baseDeliveryCharge === 0) {
    deliveryCharge = 0;
  } else if (freeDeliveryThreshold > 0 && subTotal >= freeDeliveryThreshold) {
    deliveryCharge = 0;
  } else {
    deliveryCharge = baseDeliveryCharge;
  }
  const finalPayable = Math.max(0, subTotal - couponDiscount + deliveryCharge);
  const totalSavings = mrpDiscount + couponDiscount;

  return (
    <CartContext.Provider value={{
      products,
      availableCoupons,
      storeSettings,
      cart,
      addToCart,
      buyNow,
      updateQty,
      removeFromCart,
      clearCart,
      totalItemsCount,
      totalMRP,
      subTotal,
      mrpDiscount,
      couponDiscount,
      deliveryCharge,
      baseDeliveryCharge,
      freeDeliveryThreshold,
      finalPayable,
      totalSavings,
      appliedCoupon,
      applyCouponCode,
      removeCoupon,
      wishlist,
      toggleWishlist,
      clearWishlist,
      isTamil,
      toggleLanguage,
      activePincode,
      setActivePincode,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      sortBy,
      setSortBy,
      productRatingSummaries,
      productOrderSummaries,
      productRatingServiceStatus,
      userProductRatings,
      submitProductRating,
      filters,
      setFilters,
      selectedWeights,
      setItemWeight,
      getItemWeight,
      isCartOpen,
      setIsCartOpen,
      quickViewProduct,
      setQuickViewProduct,
      isCheckoutOpen,
      setIsCheckoutOpen,
      isWholesaleOpen,
      setIsWholesaleOpen,
      isPincodeModalOpen,
      setIsPincodeModalOpen,
      orderSuccessData,
      setOrderSuccessData,
      toast,
      showToast
    }}>
      {children}
    </CartContext.Provider>
  );
};

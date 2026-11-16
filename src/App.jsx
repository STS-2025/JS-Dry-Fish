import React, { useEffect, useMemo, useState } from 'react';
import { getProductPackPrice, useCart } from './context/CartContext';
import Header from './components/layout/Header';
import DealsBar from './components/layout/DealsBar';
import Footer from './components/layout/Footer';
import BannerSlider from './components/home/BannerSlider';
import Categories from './components/home/Categories';
import ProductCard from './components/product/ProductCard';
import FilterSidebar from './components/product/FilterSidebar';
import QuickViewModal from './components/product/QuickViewModal';
import ReviewsSection from './components/product/ReviewsSection';
import CartDrawer from './components/cart/CartDrawer';
import CheckoutModal from './components/cart/CheckoutModal';
import OrderSuccessModal from './components/cart/OrderSuccessModal';
import OrderTrackingModal from './components/order/OrderTrackingModal';
import CustomerProfilePage from './components/profile/CustomerProfilePage';
import WholesaleModal from './components/modals/WholesaleModal';
import WishlistModal from './components/modals/WishlistModal';
import AppIcon from './components/common/AppIcon';
import { shopInfo, shopOfferings } from './data/shopInfo';

const getProductPackList = product => {
  if (product?.availablePacks && product.availablePacks.length > 0) {
    return product.availablePacks;
  }
  return product?.category === 'pickle' ? ['200g', '500g'] : ['250g', '500g', '1kg'];
};

const getTargetSortPrice = (product, targetPack = 'all') => {
  const packs = getProductPackList(product);
  const packToUse = (targetPack && targetPack !== 'all')
    ? targetPack
    : (packs.includes('250g') ? '250g' : packs[0]);
  return getProductPackPrice(product, packToUse);
};

const getStartingPrice = product => getTargetSortPrice(product, '250g');

const MOBILE_NAV_ICONS = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  fish: <><path d="M3 12c2.4-3.1 5.4-4.7 9-4.7 3.6 0 6 1.8 9 4.7-3 2.9-5.4 4.7-9 4.7-3.6 0-6.6-1.6-9-4.7Z" /><path d="m3 12-1.5-3.5v7L3 12Z" /><circle cx="15" cy="10.5" r=".7" fill="currentColor" stroke="none" /></>,
  cart: <><path d="M2.5 4h2l2.2 11.2h11.8l2-8.2H6" /><circle cx="9" cy="19" r="1.2" /><circle cx="17" cy="19" r="1.2" /></>,
  wholesale: <><path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" /><path d="M3 7.5v9L12 21l9-4.5v-9M12 12v9" /></>,
  profile: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21c.5-4 3.2-6 7.5-6s7 2 7.5 6" /></>
};

function MobileNavIcon({ name }) {
  return (
    <span className="mob-nav-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {MOBILE_NAV_ICONS[name]}
      </svg>
    </span>
  );
}

export default function App() {
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  const [orderTrackingSeed, setOrderTrackingSeed] = useState(null);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [shouldScrollToProducts, setShouldScrollToProducts] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const {
    products,
    selectedCategory,
    sortBy,
    setSortBy,
    productOrderSummaries,
    productRatingSummaries,
    filters,
    searchQuery,
    isTamil,
    totalItemsCount,
    setIsCartOpen,
    setIsWholesaleOpen,
    toast
  } = useCart();

  const openOrderTracking = (orderId = '', phone = '') => {
    setOrderTrackingSeed({ orderId, phone });
    setIsOrderTrackingOpen(true);
  };

  useEffect(() => {
    if (activePage === 'home' && shouldScrollToProducts) {
      document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
      setShouldScrollToProducts(false);
    }
  }, [activePage, shouldScrollToProducts]);

  const openProducts = () => {
    if (activePage !== 'home') {
      setShouldScrollToProducts(true);
      setActivePage('home');
      return;
    }
    document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
  };

  const ratedProducts = useMemo(() => products.map(product => {
    const summary = productRatingSummaries[product.code];
    const hasLiveSummary = summary && Number(summary.reviews) > 0 && Number(summary.rating) > 0;
    const baseRating = Number(product.rating) > 0 ? Number(product.rating) : 4.5;
    const baseReviews = (Number(product.reviews) > 0 && Number(product.reviews) !== 50 && Number(product.reviews) !== 48)
      ? Number(product.reviews)
      : 1;

    return {
      ...product,
      rating: hasLiveSummary ? Number(summary.rating) : baseRating,
      reviews: hasLiveSummary ? Number(summary.reviews) : baseReviews
    };
  }), [products, productRatingSummaries]);

  // Filtered and Sorted products computation
  const filteredProducts = useMemo(() => {
    let list = [...ratedProducts];

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    // Assured filter
    if (filters.assuredOnly) {
      list = list.filter(p => p.assured);
    }

    if (filters.packSize !== 'all') {
      list = list.filter(p => {
        const packs = getProductPackList(p);
        return packs.includes(filters.packSize) || (filters.packSize === '250g' && packs.includes('200g'));
      });
    }

    // Price range (based on selected pack size or default 250g)
    list = list.filter(p => {
      const price = getTargetSortPrice(p, filters.packSize);
      return price >= filters.minPrice && price <= filters.maxPrice;
    });

    // Bone Type
    if (filters.boneType !== 'all') {
      list = list.filter(p => p.boneType === filters.boneType);
    }

    // Salt Level
    if (filters.salt !== 'all') {
      list = list.filter(p => p.salt === filters.salt);
    }

    // Rating Filter
    if (Number(filters.minRating) > 0) {
      const minRat = Number(filters.minRating);
      list = list.filter(p => Number(p.rating || 0) >= minRat);
    }

    // Search Query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        p.nameEn.toLowerCase().includes(q) ||
        p.nameTa.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
      );
    }

    // Sorting (considers selected pack size or 250g)
    if (sortBy === 'lowToHigh') {
      list.sort((a, b) => getTargetSortPrice(a, filters.packSize) - getTargetSortPrice(b, filters.packSize) || a.id - b.id);
    } else if (sortBy === 'highToLow') {
      list.sort((a, b) => getTargetSortPrice(b, filters.packSize) - getTargetSortPrice(a, filters.packSize) || a.id - b.id);
    } else {
      list.sort((a, b) => {
        const summaryA = productOrderSummaries[a.code] || productOrderSummaries[a.nameEn];
        const summaryB = productOrderSummaries[b.code] || productOrderSummaries[b.nameEn];
        return (summaryB?.orderCount || 0) - (summaryA?.orderCount || 0) ||
          (summaryB?.unitsSold || 0) - (summaryA?.unitsSold || 0) ||
          a.id - b.id;
      });
    }

    return list;
  }, [ratedProducts, selectedCategory, sortBy, filters, searchQuery, productOrderSummaries]);

  const activeFilterCount = [
    selectedCategory !== 'all',
    filters.minPrice !== 0 || filters.maxPrice !== 2000,
    filters.assuredOnly,
    filters.packSize !== 'all',
    filters.salt !== 'all',
    filters.boneType !== 'all',
    filters.minRating > 0
  ].filter(Boolean).length;

  return (
    <div className="app-root">
      {/* Flipkart Header */}
      <Header
        onTrackOrder={() => openOrderTracking()}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenProfile={() => setActivePage('profile')}
      />

      {activePage === 'profile' ? (
        <CustomerProfilePage
          onBackToShop={() => setActivePage('home')}
          onTrackOrder={(orderId, phone) => {
            setActivePage('home');
            openOrderTracking(orderId, phone);
          }}
        />
      ) : (
        <>
      {/* Main Content */}
      <main className="main-container">
        {/* Banner Carousel */}
        <BannerSlider />

        {/* Categories Bar */}
        <Categories />

        {/* Value Strip & Deals Bar */}
        <DealsBar />

        {/* E-Commerce Layout: Sidebar + Grid */}
        <div className="shop-layout" id="productsSection">
          <FilterSidebar
            isOpen={areFiltersOpen}
            onClose={() => setAreFiltersOpen(false)}
            totalMatchingProducts={filteredProducts.length}
          />

          <section className="products-container">
            {/* Sorting Bar */}
            <div className="sorting-bar">
              <button
                type="button"
                className={`filter-toggle${areFiltersOpen ? ' active' : ''}`}
                aria-expanded={areFiltersOpen}
                aria-controls="product-filters"
                onClick={() => setAreFiltersOpen(prev => !prev)}
              >
                <AppIcon name="filter" size={15} />
                <span>{isTamil ? 'வடிகட்டிகள்' : 'Filters'}</span>
                {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
              </button>
              <span>{isTamil ? 'வரிசைப்படுத்து:' : 'Sort By:'}</span>
              <button
                className={`sort-option ${sortBy === 'popular' ? 'active' : ''}`}
                onClick={() => setSortBy('popular')}
              >
                {isTamil ? 'பிரபலமானது' : 'Popularity'}
              </button>
              <button
                className={`sort-option ${sortBy === 'lowToHigh' ? 'active' : ''}`}
                onClick={() => setSortBy('lowToHigh')}
              >
                {isTamil ? 'விலை: குறைவு முதல் அதிகம்' : 'Price -- Low to High'}
              </button>
              <button
                className={`sort-option ${sortBy === 'highToLow' ? 'active' : ''}`}
                onClick={() => setSortBy('highToLow')}
              >
                {isTamil ? 'விலை: அதிகம் முதல் குறைவு' : 'Price -- High to Low'}
              </button>
              <div className="product-count-badge">
                {isTamil ? `${filteredProducts.length} வகைகள் காட்டப்படுகின்றன` : `Showing ${filteredProducts.length} varieties`}
              </div>
            </div>

            {/* Product Grid */}
            <div className="products-grid">
              {filteredProducts.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', background: '#fff' }}>
                  <AppIcon name="search" size={48} />
                  <h3 style={{ fontSize: '18px', color: '#212121' }}>
                    {isTamil ? 'கருவாடு எதுவும் கிடைக்கவில்லை!' : 'No dry fish found!'}
                  </h3>
                  <p style={{ color: 'var(--fk-muted)', fontSize: '14px', marginTop: '6px' }}>
                    {isTamil
                      ? 'வேறு வார்த்தைகளை உள்ளிட்டு தேடவும் (எ.கா: "நெத்திலி", "இறால்", "சுறா") அல்லது ஃபில்டரை மீட்டமைக்கவும்.'
                      : 'Try searching with another keyword like "Nethili", "Prawns", "Shark" or reset your filters.'}
                  </p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>
          </section>
        </div>

        {/* Wholesale Supply Banner */}
        <div className="wholesale-banner" id="wholesaleSection">
          <div className="wholesale-info">
            <h3><AppIcon name="building" /> {isTamil ? 'ஹோட்டல் & பலசரக்கு கடை மொத்த வியாபார சலுகை!' : 'Wholesale Commercial Seafood Supply!'}</h3>
            <p>
              {isTamil
                ? 'தூத்துக்குடி துறைமுகத்திலிருந்து நேரடியாக 10kg, 25kg, 50kg, 100kg மொத்த கொள்முதலுக்கு சிறப்பு சலுகை விலை கிடைக்கும். தமிழ்நாடு முழுவதும் விரைவு டோர் டெலிவரி வசதி உண்டு.'
                : 'Direct fishing harbour dispatch for bulk buyers, restaurants, caterers, and grocery stores. 10kg to 100kg+ supply with custom packing and fast delivery across Tamil Nadu.'}
            </p>
          </div>
          <button className="wholesale-btn" onClick={() => setIsWholesaleOpen(true)}>
            <AppIcon name="phone" /> {isTamil ? 'மொத்த விலைப்பட்டியல் பெறுக' : 'Request Wholesale Quote'}
          </button>
        </div>

        {/* Story & Tradition Section */}
        <section className="story-section">
          <div className="story-content">
            <h2>{isTamil ? 'தூத்துக்குடி கருவாடு தனித்துவமானது ஏன்?' : 'Why Tuticorin Dry Fish is World Famous?'}</h2>
            <p>
              {isTamil ? (
                <>முத்துநகர் என அழைக்கப்படும் தூத்துக்குடி மன்னார் வளைகுடா கடல் பகுதியில் கிடைக்கும் மீன்கள் அபார சுவையும் அதிக சத்தும் கொண்டவை. <b>{shopInfo.name}</b> மூலமாக துறைமுகத்திலிருந்து ஃப்ரெஷ்ஷாக பிடிக்கப்படும் மீன்களை தூய கடல் உப்பில் ஊறவைத்து, சுகாதாரமான முறையில் உலர்த்தி, துர்நாற்றம் கசியாத மூன்று அடுக்கு பேக்கிங்கில் உங்களுக்கு அனுப்புகிறோம்.</>
              ) : (
                <>Hailing from the historic Pearl City of Thoothukudi on the Gulf of Mannar, our seafood is naturally rich in oceanic flavor and nutrition. Sourced fresh daily from the fishing harbour by <b>{shopInfo.name}</b>, salted with pure sea crystal salt, dried under strict hygiene, and sealed in 3-layer odour-proof packaging right to your doorstep.</>
              )}
            </p>

            <div className="features-grid">
              <div className="feat-box">
                <b>{isTamil ? 'சுத்தம் செய்யப்பட்டவை' : 'Cleaned & Ready'}</b>
                <small>{isTamil ? 'நெத்திலி தலை நீக்கப்பட்டது, பால் சுறா தோல் & முள் நீக்கப்பட்ட துண்டுகள்.' : 'Head-removed anchovies, boneless & skinless milk shark cubes.'}</small>
              </div>
              <div className="feat-box">
                <b>{isTamil ? '100% கெமிக்கல் ஃப்ரீ' : '100% Chemical-Free'}</b>
                <small>{isTamil ? 'ஃபார்மலின் அல்லது செயற்கை உப்பு பயன்படுத்தப்படுவதில்லை.' : 'Zero formalin or artificial preservatives used.'}</small>
              </div>
              <div className="feat-box">
                <b>{isTamil ? 'மண் & துகள் அற்றது' : 'Sand & Grit Free'}</b>
                <small>{isTamil ? 'மணல் படியாத பிரத்யேக மேடைகளில் சுத்தமாக உலர்த்தப்படுகிறது.' : 'Hygienically dried on elevated multi-tier racks.'}</small>
              </div>
              <div className="feat-box">
                <b>{isTamil ? 'கொரியர் துர்நாற்றம் இல்லை' : 'Zero Courier Odour'}</b>
                <small>{isTamil ? 'வெற்றிட (Vacuum-sealed) பேக்கிங் மூலம் துர்நாற்றம் எதுவும் பரவாது.' : 'Multi-layer airtight packaging prevents any smell during transit.'}</small>
              </div>
            </div>
          </div>

          <div className="story-img-box">
            <AppIcon name="anchor" size={48} />
            <h3>{shopInfo.name}</h3>
            <p>{isTamil ? 'தமிழ்நாடு முழுவதும் விரைவு டெலிவரி' : 'Express Delivery Across Tamil Nadu'}<br />{isTamil ? 'தொலைபேசி' : 'Phone'}: {shopInfo.phone}</p>
            <a
              href={`https://wa.me/91${shopInfo.whatsapp}?text=${encodeURIComponent(`Vanakkam ${shopInfo.name}! Need info about dry fish.`)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-whatsapp"
            >
              <AppIcon name="whatsapp" /> {isTamil ? 'வாட்ஸ்அப்' : 'WhatsApp'}: {shopInfo.whatsapp}
            </a>
            <a className="shop-facebook-link" href={shopInfo.facebookUrl} target="_blank" rel="noreferrer">
              {isTamil ? 'Facebook-ல் எங்களைப் பாருங்கள்' : 'Follow us on Facebook'}
            </a>
          </div>
        </section>

        <section className="offerings-section" aria-labelledby="offerings-title">
          <div className="offerings-heading">
            <div>
              <span className="offerings-eyebrow">JS DRY FISH SHOP · THOOTHUKUDI</span>
              <h2 id="offerings-title">{isTamil ? 'எங்கள் கருவாடு மற்றும் கடல் உணவு வகைகள்' : 'Our Dry Fish & Seafood Varieties'}</h2>
            </div>
            <span className="offerings-delivery"><AppIcon name="truck" /> {isTamil ? 'தமிழ்நாடு முழுவதும் விரைவு டெலிவரி' : 'Express Delivery Across Tamil Nadu'}</span>
          </div>
          <div className="offerings-list">
            {shopOfferings.map(item => <span className="offering-item" key={item.id}>{item.label}</span>)}
          </div>
        </section>

        {/* Verified Customer Reviews */}
        <ReviewsSection />
      </main>

      {/* Footer */}
      <Footer />
        </>
      )}

      {/* Mobile Bottom Navigation Bar (Flipkart App Style) */}
      <div className="mobile-bottom-nav">
        <div className={`mob-nav-item${activePage === 'home' ? ' active' : ''}`} onClick={() => { setActivePage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <MobileNavIcon name="home" />
          <span>{isTamil ? 'முகப்பு' : 'Home'}</span>
        </div>
        <div
          className="mob-nav-item"
          onClick={openProducts}
        >
          <MobileNavIcon name="fish" />
          <span>{isTamil ? 'கருவாடு' : 'Dry Fish'}</span>
        </div>
        <div className="mob-nav-item" onClick={() => setIsCartOpen(true)}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <MobileNavIcon name="cart" />
            {totalItemsCount > 0 && (
              <span className="mob-cart-badge">{totalItemsCount}</span>
            )}
          </div>
          <span>{isTamil ? 'கூடை' : 'Cart'}</span>
        </div>
        <div className="mob-nav-item" onClick={() => setIsWholesaleOpen(true)}>
          <MobileNavIcon name="wholesale" />
          <span>{isTamil ? 'மொத்தவிற்பனை' : 'Wholesale'}</span>
        </div>
        <div className={`mob-nav-item${activePage === 'profile' ? ' active' : ''}`} onClick={() => setActivePage('profile')}>
          <MobileNavIcon name="profile" />
          <span>{isTamil ? 'சுயவிவரம்' : 'Profile'}</span>
        </div>
      </div>

      {/* Modals & Slide-over Drawers */}
      <CartDrawer />
      <QuickViewModal />
      <CheckoutModal />
      <WholesaleModal />
      <OrderSuccessModal onTrackOrder={openOrderTracking} />
      <OrderTrackingModal
        isOpen={isOrderTrackingOpen}
        initialOrder={orderTrackingSeed}
        onClose={() => setIsOrderTrackingOpen(false)}
      />
      <WishlistModal isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />

      {/* Toast Notification */}
      <div className={`toast-popup ${toast.show ? 'show' : ''}`}>
        <AppIcon name="checkCircle" />
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { getCustomerSession } from '../../utils/customerAuth';
import logo from '../../assets/js-dry-fish-shop-logo.png';
import { shopInfo } from '../../data/shopInfo';

const HeaderIcon = ({ children, className = '', ...props }) => (
  <svg
    {...props}
    className={`header-icon ${className}`.trim()}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export default function Header({ onTrackOrder, onOpenWishlist, onOpenProfile }) {
  const {
    cart,
    products,
    totalItemsCount,
    finalPayable,
    wishlist,
    isTamil,
    toggleLanguage,
    activePincode,
    setIsPincodeModalOpen,
    searchQuery,
    setSearchQuery,
    setIsCartOpen,
    setIsWholesaleOpen,
    showToast
  } = useCart();

  const [loggedUser, setLoggedUser] = useState(() => getCustomerSession());

  useEffect(() => {
    const handler = (e) => setLoggedUser(e.detail);
    window.addEventListener('atf_customer_auth_change', handler);
    return () => window.removeEventListener('atf_customer_auth_change', handler);
  }, []);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleSearchInput = (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = val.trim().toLowerCase();
    const matches = products.filter(p =>
      p.nameEn.toLowerCase().includes(q) ||
      p.nameTa.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
    setSuggestions(matches.slice(0, 5));
    setShowSuggestions(matches.length > 0);
  };

  const handleSelectSuggestion = (name) => {
    setSearchQuery(name);
    setShowSuggestions(false);
    scrollToProducts();
  };

  const scrollToProducts = () => {
    const el = document.getElementById('productsSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Voice Search feature with HTTPS & browser compatibility
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast(isTamil ? 'இந்த பிரவுசரில் வாய்ஸ் தேடல் வசதி இல்லை (Chrome/Edge பயன்படுத்தவும்).' : 'Voice search not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const isLocalNetworkIp = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host);

    // Browsers (Chrome on Android / iOS Safari) strictly forbid microphone on unencrypted non-localhost origins
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
      if (isLocalNetworkIp) {
        // On local network IP, do NOT redirect to https because local dev server doesn't serve SSL
        showToast(
          isTamil
            ? 'மொபைல் பிரவுசர்கள் local HTTP IP-ல் மைக்கை அனுமதிக்காது. லைவ் தளத்தில் (https://js-dry-fish.free.nf) அல்லது HTTPS-ல் இயக்கவும்.'
            : 'Mobile browsers block mic on local HTTP (192.168.x). Test on live HTTPS site (https://js-dry-fish.free.nf) or with HTTPS dev server.'
        );
      } else if (!isLocalhost) {
        // On actual public domain running HTTP, redirect to HTTPS
        const httpsUrl = window.location.href.replace('http:', 'https:');
        showToast(isTamil ? 'வாய்ஸ் தேடலுக்கு HTTPS பாதுகாப்பு தேவை. HTTPS-க்கு மாறுகிறது...' : 'Voice search requires HTTPS. Redirecting to secure URL...');
        setTimeout(() => {
          window.location.href = httpsUrl;
        }, 1000);
        return;
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = isTamil ? 'ta-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      showToast(isTamil ? 'பேசவும்... (கருவாடு பெயரை சொல்லுங்கள்)' : 'Listening... (Speak fish name)');

      recognition.onresult = (e) => {
        setIsListening(false);
        const transcript = e.results[0]?.[0]?.transcript;
        if (transcript) {
          setSearchQuery(transcript);
          showToast(isTamil ? `தேடப்படுகிறது: "${transcript}"` : `Searching: "${transcript}"`);
          scrollToProducts();
        }
      };

      recognition.onerror = (e) => {
        setIsListening(false);
        console.warn('Voice search error:', e.error);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          if (isLocalNetworkIp && window.location.protocol !== 'https:') {
            showToast(
              isTamil
                ? 'மொபைல் பிரவுசர் அனுமதி மறுத்தது. லைவ் HTTPS வெப்சைட்டில் (https://js-dry-fish.free.nf) வாய்ஸ் தேடலை சோதிக்கவும்.'
                : 'Mobile browser blocked microphone on local IP. Please test on live HTTPS site.'
            );
          } else if (window.location.protocol !== 'https:' && !isLocalhost) {
            showToast('Voice search requires HTTPS. Please open site with https://');
          } else {
            showToast(isTamil ? 'மைக்ரோஃபோன் அனுமதி தேவை (Browser address bar-ல் mic அனுமதிக்கவும்)' : 'Microphone blocked. Please allow mic in browser settings.');
          }
        } else if (e.error === 'no-speech') {
          showToast(isTamil ? 'குரல் கேட்கவில்லை. மீண்டும் முயற்சி செய்யவும்.' : 'No speech heard. Please try again.');
        } else if (e.error === 'network') {
          showToast(isTamil ? 'இன்டர்நெட் இணைப்பு சரிபார்க்கவும்.' : 'Speech network error. Check internet connection.');
        } else {
          showToast(isTamil ? 'குரல் தேடல் தோல்வி. தட்டச்சு செய்து தேடவும்.' : 'Voice recognition failed. Try typing.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      console.error('Failed to start voice search:', err);
      showToast('Voice recognition failed. Try typing.');
    }
  };

  return (
    <header className="top-header">
      <div className="header-container">
        {/* ROW 1 (Mobile & Desktop Top): Logo on left, mobile actions on the same line */}
        <div className="header-top-row">
          {/* Logo */}
          <a href="#" className="brand-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img className="brand-logo-image" src={logo} alt="JS Dry Fish Shop logo" />
            <span className="brand-logo-name">JS DRY FISH SHOP</span>
          </a>

          {/* Mobile Right Actions: Language, Wishlist, WhatsApp */}
          <div className="header-mobile-actions">
            <button className="header-btn lang-btn" onClick={toggleLanguage} title={isTamil ? "Switch to English (EN)" : "தமிழுக்கு மாறவும் (TA)"}>
              <HeaderIcon>
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a15.5 15.5 0 0 1 0 18M12 3a15.5 15.5 0 0 0 0 18" />
              </HeaderIcon>
              <span className="lang-text">{isTamil ? 'EN' : 'TA'}</span>
            </button>

            <button
              className="header-btn header-wishlist-btn"
              onClick={onOpenWishlist}
              title={isTamil ? "விருப்பப்பட்டியல்" : "Wishlist"}
              aria-label={`Wishlist, ${wishlist.length} items`}
            >
              <HeaderIcon>
                <path d="M12 20.5s-7-4.35-9-8.18C1.53 9.28 3.26 5 7.25 5c2.1 0 3.21 1.08 4.03 2.2C12.1 6.08 13.21 5 15.31 5 19.3 5 21.03 9.28 21 12.32c-2 3.83-9 8.18-9 8.18Z" />
              </HeaderIcon>
              <span className="cart-badge">{wishlist.length}</span>
            </button>

            <a
              href={`https://wa.me/91${shopInfo.whatsapp}?text=${encodeURIComponent(`Vanakkam ${shopInfo.name}! I want to order dry fish.`)}`}
              target="_blank"
              rel="noreferrer"
              className="header-btn whatsapp-btn"
              title="Chat on WhatsApp"
              aria-label="Chat on WhatsApp"
            >
              <svg
                className="whatsapp-icon"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Search Bar with Autocomplete & Voice Search */}
        <div className="search-wrapper">
          <div className="search-box">
            <input
              type="text"
              value={searchQuery}
              placeholder={isTamil ? "கருவாடு தேடுக (எ.கா: நெத்திலி, சுறா, வஞ்சிரம்)..." : "Search dry fish (e.g. Nethili, Shark, Seer)..."}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && scrollToProducts()}
            />
            <button
              className={`search-btn ${isListening ? 'listening' : ''}`}
              onClick={handleVoiceSearch}
              title={isListening ? 'Listening...' : 'Voice Search'}
              style={{
                fontSize: '16px',
                color: isListening ? '#ef4444' : undefined,
                transform: isListening ? 'scale(1.15)' : undefined,
                transition: 'all 0.2s ease'
              }}
            >
              <HeaderIcon>
                <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
                <path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8" />
              </HeaderIcon>
            </button>
            {searchQuery && searchQuery.trim().length > 0 ? (
              <button
                type="button"
                className="search-btn search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                title="Clear search"
                aria-label="Clear search"
              >
                <HeaderIcon>
                  <path d="M18 6 6 18M6 6l12 12" />
                </HeaderIcon>
              </button>
            ) : (
              <button
                type="button"
                className="search-btn"
                onClick={scrollToProducts}
                title="Search"
                aria-label="Search"
              >
                <HeaderIcon>
                  <circle cx="11" cy="11" r="5" />
                  <path d="m16 16 4 4" />
                </HeaderIcon>
              </button>
            )}
          </div>

          {showSuggestions && (
            <div className="search-suggestions" style={{ display: 'block' }}>
              {suggestions.map(s => (
                <div
                  key={s.id}
                  className="search-suggestion-item"
                  onClick={() => handleSelectSuggestion(s.nameEn)}
                >
                  <span>
                    <HeaderIcon className="suggestion-icon">
                      <path d="M3.5 12c2.4-2.7 5.3-4.1 8.8-4.1 2.2 0 4.2.8 6 2.2 1.3 1.1 1.3 3.8 0 4.9-1.8 1.4-3.8 2.2-6 2.2-3.5 0-6.4-1.4-8.8-4.2Z" />
                      <circle cx="14.3" cy="12" r="1.1" />
                      <path d="M3.5 12H1.8M19.2 9.7l1.8-1.4M19.2 14.3l1.8 1.4" />
                    </HeaderIcon>
                    <b>{s.nameEn}</b> <small style={{ color: '#666' }}>({s.nameTa})</small>
                  </span>
                  <span style={{ color: 'var(--fk-green)', fontWeight: 700 }}>
                    ₹{s.packPrice ?? s.basePrice250g}{s.packSize ? ` / ${s.packSize}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Actions (Strictly matching user's uploaded desktop screenshot) */}
        <div className="header-actions header-desktop-actions">
          <button className="header-btn lang-btn" onClick={toggleLanguage} title={isTamil ? "Switch to English (EN)" : "தமிழுக்கு மாறவும் (TA)"}>
            <HeaderIcon>
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a15.5 15.5 0 0 1 0 18M12 3a15.5 15.5 0 0 0 0 18" />
            </HeaderIcon>
            <span className="lang-text">{isTamil ? 'EN' : 'TA'}</span>
          </button>

          <button className="header-btn wholesale-btn" onClick={() => setIsWholesaleOpen(true)} title={isTamil ? "மொத்த விற்பனை" : "Wholesale"}>
            <HeaderIcon>
              <path d="M3 8.5 12 3l9 5.5v7L12 21l-9-5.5v-7Z" />
              <path d="M3 8.5 12 14l9-5.5M12 14v7" />
            </HeaderIcon>
            <span>{isTamil ? 'மொத்த விற்பனை' : 'Wholesale'}</span>
          </button>

          <button
            className="header-btn track-btn"
            onClick={onTrackOrder}
            aria-label={isTamil ? "ஆர்டர் நிலை" : "Track Order"}
            title={isTamil ? "ஆர்டர் நிலை" : "Track Order"}
          >
            <HeaderIcon>
              <path d="M3 16V7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V16" />
              <path d="M3 16h18v2.2A1.8 1.8 0 0 1 19.2 20H4.8A1.8 1.8 0 0 1 3 18.2V16Z" />
              <path d="M7 9h10M7 12h7" />
            </HeaderIcon>
            <span>{isTamil ? 'ஆர்டர் நிலை' : 'Track Order'}</span>
          </button>

          <button
            className="header-btn header-wishlist-btn"
            onClick={onOpenWishlist}
            title={isTamil ? "விருப்பப்பட்டியல்" : "Wishlist"}
            aria-label={`Wishlist, ${wishlist.length} items`}
          >
            <HeaderIcon>
              <path d="M12 20.5s-7-4.35-9-8.18C1.53 9.28 3.26 5 7.25 5c2.1 0 3.21 1.08 4.03 2.2C12.1 6.08 13.21 5 15.31 5 19.3 5 21.03 9.28 21 12.32c-2 3.83-9 8.18-9 8.18Z" />
            </HeaderIcon>
            <span className="cart-badge">{wishlist.length}</span>
          </button>

          <button className="header-btn cart-btn" onClick={() => setIsCartOpen(true)} title={isTamil ? "கூடையைக் காண்க" : "View Cart"}>
            <HeaderIcon>
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="17" cy="18" r="1.5" />
              <path d="M3 4h2l2.5 10.5h10.6l2.1-7H6.3" />
            </HeaderIcon>
            <span className="cart-text-desktop">{isTamil ? 'கூடை' : 'Cart'}</span>
            <span className="cart-badge">{totalItemsCount}</span>
          </button>

          <a
            href={`https://wa.me/91${shopInfo.whatsapp}?text=${encodeURIComponent(`Vanakkam ${shopInfo.name}! I want to order dry fish.`)}`}
            target="_blank"
            rel="noreferrer"
            className="header-btn whatsapp-btn"
            title="Chat on WhatsApp"
            aria-label="Chat on WhatsApp"
          >
            <svg
              className="whatsapp-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </a>

          <button
            type="button"
            className="header-btn header-profile-btn"
            onClick={onOpenProfile}
            title={loggedUser?.name ? `Signed in as ${loggedUser.name}` : 'Profile'}
            aria-label="Open profile"
            style={loggedUser ? { borderColor: '#10b981', background: '#f0fdf4' } : undefined}
          >
            <HeaderIcon className="profile-icon" style={loggedUser ? { color: '#047857' } : undefined}>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 21c.5-4 3.2-6 7.5-6s7 2 7.5 6" />
            </HeaderIcon>
          </button>
        </div>
      </div>
    </header>
  );
}

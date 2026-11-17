import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SHOP_NAME = 'ANTONY DRY FISH SHOP';
const SHOP_ADDRESS = import.meta.env.VITE_SHOP_ADDRESS || 'Old Bus Stand, Thoothukudi, Tamil Nadu';
const SHOP_PHONE = import.meta.env.VITE_SHOP_PHONE || '8925151252';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseConfigured = Boolean(
  supabaseUrl.startsWith('https://') && supabaseAnonKey &&
  !supabaseUrl.includes('your-project') && !supabaseAnonKey.includes('your-supabase')
);
const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return fallback;
}

function toProduct(row, qrPriceMap = {}) {
  const saved = parseJson(row.product_json, {});
  return {
    ...saved,
    id: row.id,
    nameEn: row.name_en || saved.nameEn || row.code || 'Dry Fish',
    nameTa: row.name_ta || saved.nameTa || '',
    category: row.category || saved.category || '',
    img: row.img || saved.img || '',
    packSize: saved.packSize || '',
    basePrice250g: Number(row.base_price_250g ?? saved.basePrice250g ?? saved.packPrice ?? 0),
    availablePacks: parseJson(row.available_packs, saved.availablePacks),
    packPrices: parseJson(row.pack_prices, saved.packPrices || {}),
    qrPackPrices: qrPriceMap[row.code] || {},
    active: row.active !== false
  };
}

const gramsFor = { '200g': 200, '250g': 250, '500g': 500, '1kg': 1000 };
function packPrice(product, weight) {
  if (product.qrPackPrices?.[weight] != null) return Number(product.qrPackPrices[weight]);
  if (product.packPrices?.[weight] != null) return Number(product.packPrices[weight]);
  if (product.packSize) {
    return Math.round(Number(product.packPrice || product.basePrice250g || 0) *
      (gramsFor[weight] || 250) / (gramsFor[product.packSize] || 250));
  }
  const multiplier = weight === '500g' ? 1.9 : weight === '1kg' ? 3.6 : 1;
  return Math.round(Number(product.basePrice250g || 0) * multiplier);
}

function FishMark() {
  return <span className="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="23" fill="white" fillOpacity=".15" />
      <path d="M11 24c5.7-7.4 16.4-9 24-2.9L41 16v16l-6-5.1C27.4 33 16.7 31.4 11 24Z" fill="#ffe500" />
      <circle cx="19" cy="22" r="1.5" fill="#174ea6" />
    </svg>
  </span>;
}

function ProductCard({ product }) {
  const packs = Array.isArray(product.availablePacks) && product.availablePacks.length
    ? product.availablePacks
    : product.category === 'pickle' ? ['200g', '500g'] : ['250g', '500g', '1kg'];
  const initialWeight = packs.includes('250g') ? '250g' : packs[0];
  const [weight, setWeight] = useState(initialWeight);
  const [imageFailed, setImageFailed] = useState(false);
  const title = product.nameEn || product.nameTa || 'Dry Fish';

  return <article className="product-card">
    <div className="product-image-wrap">
      {!imageFailed && product.img
        ? <img className="product-image" src={product.img} alt={title} loading="lazy" onError={() => setImageFailed(true)} />
        : <div className="image-fallback" aria-label={title}><FishMark /></div>}
    </div>
    <div className="product-details">
      <h2 className="product-title">{title}</h2>
      {product.nameTa && <p className="product-tamil" lang="ta">{product.nameTa}</p>}
      <div className="weight-label">SELECT WEIGHT</div>
      <div className="weight-options" role="group" aria-label={`Choose weight for ${title}`}>
        {packs.map(pack => <button
          key={pack}
          className={`weight-button${weight === pack ? ' is-selected' : ''}`}
          type="button"
          aria-pressed={weight === pack}
          onClick={() => setWeight(pack)}
        >{pack === '1kg' ? '1 Kg' : pack}</button>)}
      </div>
      <div className="price-line"><span className="price-label">Price</span><span className="price-value">₹{packPrice(product, weight).toLocaleString('en-IN')}</span></div>
    </div>
  </article>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.3 8.3 0 0 1-12.3 7.2L3 20l1.2-5A8.3 8.3 0 1 1 20.5 11.7Z"/><path d="M8.6 8.1c.2-.4.4-.4.7-.4h.4c.2 0 .3.1.4.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.4.7 1 1.3 1.7 1.7.2.1.3.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.5.7c.2.1.4.2.4.4 0 .2-.1 1-.6 1.4-.5.5-1.2.7-1.8.6-1.1-.2-2.4-.8-3.5-1.8-1.2-1.1-2-2.5-2.2-3.5-.2-.8.2-1.5.6-1.8Z"/></svg>;
}

function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState(supabase ? 'loading' : 'setup');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const qrPricesSnapshot = useRef(null);

  const visibleProducts = products.filter(product => {
    const term = search.trim().toLocaleLowerCase();
    return !term || [product.nameEn, product.nameTa, product.category, product.code]
      .some(value => String(value || '').toLocaleLowerCase().includes(term));
  });

  useEffect(() => {
    if (!supabase) return;
    let current = true;
    let priceRefreshTimer;
    let priceChannel;

    const applyQrPrices = value => {
      const qrPriceMap = parseJson(value, {});
      const nextSnapshot = JSON.stringify(qrPriceMap);
      if (qrPricesSnapshot.current === nextSnapshot) return;
      qrPricesSnapshot.current = nextSnapshot;
      setProducts(previous => previous.map(product => ({
        ...product,
        qrPackPrices: qrPriceMap[product.code] || {}
      })));
    };

    const refreshQrPrices = async () => {
      const { data, error: priceError } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'qr_product_prices')
        .maybeSingle();
      if (current && !priceError) applyQrPrices(data?.value);
    };

    Promise.all([
      supabase.from('products').select('*').eq('active', true).order('id', { ascending: true }),
      supabase.from('store_settings').select('value').eq('key', 'qr_product_prices').maybeSingle()
    ])
      .then(([{ data, error: queryError }, { data: priceSettings, error: priceError }]) => {
        if (!current) return;
        if (queryError) {
          setError(queryError.message);
          setStatus('error');
          return;
        }
        if (priceError) console.warn('Unable to load QR-specific product prices:', priceError);
        const qrPriceMap = parseJson(priceSettings?.value, {});
        qrPricesSnapshot.current = JSON.stringify(qrPriceMap);
        setProducts((data || []).map(row => toProduct(row, qrPriceMap)).filter(product => product.active));
        setStatus((data || []).length ? 'ready' : 'empty');

        priceChannel = supabase
          .channel('antony-qr-prices')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'store_settings',
            filter: 'key=eq.qr_product_prices'
          }, payload => applyQrPrices(payload.new?.value))
          .subscribe();
        priceRefreshTimer = window.setInterval(refreshQrPrices, 5000);
      })
      .catch(queryError => {
        if (!current) return;
        setError(queryError.message || 'Unable to connect to the product list.');
        setStatus('error');
      });
    return () => {
      current = false;
      if (priceRefreshTimer) window.clearInterval(priceRefreshTimer);
      if (priceChannel) supabase.removeChannel(priceChannel);
    };
  }, []);

  return <div className="page-shell">
    <header className="top-header">
      <div className="header-container">
        <a className="brand" href="#products" aria-label={SHOP_NAME}>
          <FishMark />
          <span className="brand-name">{SHOP_NAME}</span>
        </a>
        <span className="header-note">LATEST PRICE LIST</span>
      </div>
    </header>

    <main id="products" className="main-content">
      <section className="intro">
        <span className="eyebrow">OUR PRODUCTS</span>
        <h1>Dry fish, priced by weight.</h1>
        <p>Choose a pack size to see its price.</p>
      </section>

      {status === 'ready' && <label className="search-box" id="product-search-box">
        <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
        <input id="product-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" />
        {search && <button className="clear-search" type="button" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
      </label>}

      {status === 'loading' && <div className="state-panel"><span className="loader" />Loading products…</div>}
      {status === 'setup' && <div className="state-panel">Product list is not configured yet.</div>}
      {status === 'error' && <div className="state-panel error-panel"><strong>Products could not be loaded.</strong><span>{error}</span><span>Please try again in a moment.</span></div>}
      {status === 'empty' && <div className="state-panel">There are no products available right now.</div>}
      {status === 'ready' && visibleProducts.length > 0 && <div className="product-grid">{visibleProducts.map(product => <ProductCard key={product.id} product={product} />)}</div>}
      {status === 'ready' && visibleProducts.length === 0 && <div className="state-panel">No products match “{search}”.</div>}
    </main>

    <footer className="shop-footer">
      <div className="footer-inner">
        <div className="footer-brand"><FishMark /><strong>{SHOP_NAME}</strong></div>
        <div className="footer-contact">
          <span className="contact-item"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>{SHOP_ADDRESS}</span>
          <a className="contact-item" href={`https://wa.me/${SHOP_PHONE.replace(/\D/g, '')}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.3 8.3 0 0 1-12.3 7.2L3 20l1.2-5A8.3 8.3 0 1 1 20.5 11.7Z"/><path d="M8.6 8.1c.2-.4.4-.4.7-.4h.4c.2 0 .3.1.4.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.4.7 1 1.3 1.7 1.7.2.1.3.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.5.7c.2.1.4.2.4.4 0 .2-.1 1-.6 1.4-.5.5-1.2.7-1.8.6-1.1-.2-2.4-.8-3.5-1.8-1.2-1.1-2-2.5-2.2-3.5-.2-.8.2-1.5.6-1.8Z"/></svg>WhatsApp: +91 {SHOP_PHONE}</a>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} {SHOP_NAME}</div>
      </div>
    </footer>

    <div className="floating-actions">
      {status === 'ready' && <button className="search-fab" type="button" onClick={() => document.getElementById('product-search')?.focus()} aria-label="Start product search">
        <span className="floating-tooltip">Search products</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
      </button>}
      <a className="whatsapp-fab" href={`https://wa.me/+91${SHOP_PHONE.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label={`Chat with ${SHOP_NAME} on WhatsApp`}>
        <span className="floating-tooltip">Chat on WhatsApp</span>
        <WhatsAppIcon />
      </a>
    </div>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);

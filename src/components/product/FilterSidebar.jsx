import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import AppIcon from '../common/AppIcon';
import { categoriesList } from '../../data/products';
import useBodyScrollLock from '../../utils/useBodyScrollLock';

export default function FilterSidebar({ isOpen = false, onClose, totalMatchingProducts }) {
  const {
    selectedCategory,
    setSelectedCategory,
    filters,
    setFilters,
    isTamil,
    products = []
  } = useCart();

  // Active category in the Left Column ('packSize', 'categories', 'priceRange', 'boneType', 'salt', 'rating')
  const [activeTab, setActiveTab] = useState('packSize');
  useBodyScrollLock(isOpen);

  const resetAll = () => {
    setSelectedCategory('all');
    setFilters({
      minPrice: 0,
      maxPrice: 2000,
      assuredOnly: false,
      packSize: 'all',
      salt: 'all',
      boneType: 'all',
      minRating: 0
    });
  };

  // Combine categories from categoriesList and dynamic product categories
  const allCategories = React.useMemo(() => {
    const map = new Map(categoriesList.map(c => [c.id, { id: c.id, nameEn: c.nameEn, nameTa: c.nameTa }]));
    products.forEach(p => {
      if (p.category && !map.has(p.category)) {
        map.set(p.category, {
          id: p.category,
          nameEn: p.category.charAt(0).toUpperCase() + p.category.slice(1),
          nameTa: p.category
        });
      }
    });
    return Array.from(map.values());
  }, [products]);

  // Compute active states for badges
  const isPackSizeActive = filters.packSize !== 'all';
  const isCategoryActive = selectedCategory !== 'all';
  const isPriceActive = filters.minPrice !== 0 || filters.maxPrice !== 2000;
  const isBoneTypeActive = Boolean(filters.boneType && filters.boneType !== 'all');
  const isSaltActive = Boolean(filters.salt && filters.salt !== 'all');
  const isRatingActive = filters.minRating > 0;

  const totalActiveFilters = [
    isPackSizeActive,
    isCategoryActive,
    isPriceActive,
    isBoneTypeActive,
    isSaltActive,
    isRatingActive
  ].filter(Boolean).length;

  const filterTabs = [
    {
      id: 'packSize',
      title: isTamil ? 'பேக் அளவு' : 'Pack Size',
      iconName: 'package',
      isActive: isPackSizeActive
    },
    {
      id: 'categories',
      title: isTamil ? 'வகைகள்' : 'Categories',
      iconName: 'fish',
      isActive: isCategoryActive
    },
    {
      id: 'priceRange',
      title: isTamil ? 'விலை வரம்பு' : 'Price Range',
      iconName: 'rupee',
      isActive: isPriceActive
    },
    {
      id: 'boneType',
      title: isTamil ? 'முள் வகை' : 'Bone Type',
      iconName: 'bone',
      isActive: isBoneTypeActive
    },
    {
      id: 'salt',
      title: isTamil ? 'உப்புத் தன்மை' : 'Salt Content',
      iconName: 'salt',
      isActive: isSaltActive
    },
    {
      id: 'rating',
      title: isTamil ? 'மதிப்பீடு' : 'Customer Rating',
      iconName: 'star',
      isActive: isRatingActive
    }
  ];

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="filters-mobile-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="product-filters"
        className={`filters-sidebar${isOpen ? ' is-open' : ''}`}
      >
        {/* Mobile Bottom-Sheet Pull Handle */}
        <div className="filter-bottomsheet-handle" aria-hidden="true" />

        {/* Header */}
        <div className="filter-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcon name="filter" size={17} className="filter-title-icon" />
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>
                {isTamil ? 'வடிகட்டிகள்' : 'Filters'}
              </h3>
              {totalActiveFilters > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--fk-blue, #0876b1)', fontWeight: 700 }}>
                  {totalActiveFilters} {isTamil ? 'தேர்வு செய்யப்பட்டுள்ளது' : 'applied'}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {totalActiveFilters > 0 && (
              <button type="button" className="clear-filters" onClick={resetAll}>
                {isTamil ? 'அனைத்தும் நீக்கு' : 'CLEAR ALL'}
              </button>
            )}
            {onClose && (
              <button
                type="button"
                className="filter-close-btn"
                onClick={onClose}
                aria-label="Close filters"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Split Container: Left = Filter By categories, Right = Values */}
        <div className="filter-split-container">
          {/* Left Column: Filter By Tabs */}
          <nav className="filter-by-nav" aria-label="Filter by categories">
            <div className="filter-by-label">
              {isTamil ? 'வடிகட்டு' : 'FILTER BY'}
            </div>
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`filter-by-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="filter-by-tab-icon">
                  <AppIcon name={tab.iconName} size={15} />
                </span>
                <span className="filter-by-tab-name">{tab.title}</span>
                {tab.isActive && <span className="filter-by-dot" title="Filter active" />}
              </button>
            ))}
          </nav>

          {/* Right Column: Values / Options of Selected Category */}
          <div className="filter-values-pane">
            {/* 1. Pack Size Options */}
            {activeTab === 'packSize' && (
              <div className="filter-options-group">
                <div className="filter-group-header-label">
                  <span>{isTamil ? 'பேக் அளவு (PACK SIZE)' : 'PACK SIZE'}</span>
                  {isPackSizeActive && (
                    <button type="button" className="filter-reset-link" onClick={() => setFilters(prev => ({ ...prev, packSize: 'all' }))}>
                      {isTamil ? 'மீட்டமை' : 'Reset'}
                    </button>
                  )}
                </div>
                {[
                  ['all', isTamil ? 'அனைத்து அளவுகள் (All Sizes)' : 'All Pack Sizes'],
                  ['250g', '250g Pack'],
                  ['500g', '500g Pack'],
                  ['1kg', '1kg Pack']
                ].map(([size, label]) => (
                  <label key={size} className={`filter-radio-row ${filters.packSize === size ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="packSizeRadio"
                      value={size}
                      checked={filters.packSize === size}
                      onChange={() => setFilters(prev => ({ ...prev, packSize: size }))}
                    />
                    <span className="filter-radio-label">{label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 2. Categories Options */}
            {activeTab === 'categories' && (
              <div className="filter-options-group">
                <div className="filter-group-header-label">
                  <span>{isTamil ? 'வகைகள் (CATEGORIES)' : 'CATEGORIES'}</span>
                  {isCategoryActive && (
                    <button type="button" className="filter-reset-link" onClick={() => setSelectedCategory('all')}>
                      {isTamil ? 'மீட்டமை' : 'Reset'}
                    </button>
                  )}
                </div>
                <label className={`filter-radio-row ${selectedCategory === 'all' ? 'checked' : ''}`}>
                  <input
                    type="radio"
                    name="catRadio"
                    value="all"
                    checked={selectedCategory === 'all'}
                    onChange={() => setSelectedCategory('all')}
                  />
                  <span className="filter-radio-label">{isTamil ? 'அனைத்து வகைகள் (All Categories)' : 'All Categories'}</span>
                </label>
                {allCategories.map(cat => (
                  <label key={cat.id} className={`filter-radio-row ${selectedCategory === cat.id ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="catRadio"
                      value={cat.id}
                      checked={selectedCategory === cat.id}
                      onChange={() => setSelectedCategory(cat.id)}
                    />
                    <span className="filter-radio-label">{isTamil ? cat.nameTa : cat.nameEn}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 3. Price Range Options */}
            {activeTab === 'priceRange' && (
              <div className="filter-options-group">
                <div className="filter-group-header-label">
                  <span>{isTamil ? 'விலை வரம்பு (PRICE RANGE)' : 'PRICE RANGE'}</span>
                  {isPriceActive && (
                    <button type="button" className="filter-reset-link" onClick={() => setFilters(prev => ({ ...prev, minPrice: 0, maxPrice: 2000 }))}>
                      {isTamil ? 'மீட்டமை' : 'Reset'}
                    </button>
                  )}
                </div>
                {[
                  { label: isTamil ? 'அனைத்து விலைகளும்' : 'All Prices', min: 0, max: 2000 },
                  { label: isTamil ? '₹300 க்கு கீழ் (Under ₹300)' : 'Under ₹300', min: 0, max: 300 },
                  { label: '₹300 - ₹500', min: 300, max: 500 },
                  { label: '₹500 - ₹1000', min: 500, max: 1000 },
                  { label: isTamil ? '₹1000 க்கு மேல் (Above ₹1000)' : 'Above ₹1000', min: 1000, max: 2000 }
                ].map(preset => {
                  const isChecked = filters.minPrice === preset.min && filters.maxPrice === preset.max;
                  return (
                    <label key={preset.label} className={`filter-radio-row ${isChecked ? 'checked' : ''}`}>
                      <input
                        type="radio"
                        name="pricePreset"
                        checked={isChecked}
                        onChange={() => setFilters(prev => ({ ...prev, minPrice: preset.min, maxPrice: preset.max }))}
                      />
                      <span className="filter-radio-label">{preset.label}</span>
                    </label>
                  );
                })}

                {/* Custom Range Selectors */}
                <div className="filter-custom-range-box">
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    {isTamil ? 'தனிப்பயன் வரம்பு (Custom Min - Max):' : 'Custom Min - Max (₹):'}
                  </span>
                  <div className="filter-price-inputs">
                    <select
                      value={filters.minPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, minPrice: Number(e.target.value) }))}
                    >
                      <option value="0">₹0</option>
                      <option value="150">₹150</option>
                      <option value="250">₹250</option>
                      <option value="350">₹350</option>
                      <option value="500">₹500</option>
                    </select>
                    <span>to</span>
                    <select
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                    >
                      <option value="300">₹300</option>
                      <option value="500">₹500</option>
                      <option value="750">₹750</option>
                      <option value="1000">₹1000</option>
                      <option value="2000">₹1500+</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Bone Type Options */}
            {activeTab === 'boneType' && (
              <div className="filter-options-group">
                <div className="filter-group-header-label">
                  <span>{isTamil ? 'முள் வகை (BONE TYPE)' : 'BONE TYPE'}</span>
                  {isBoneTypeActive && (
                    <button type="button" className="filter-reset-link" onClick={() => setFilters(prev => ({ ...prev, boneType: 'all' }))}>
                      {isTamil ? 'மீட்டமை' : 'Reset'}
                    </button>
                  )}
                </div>
                {[
                  ['all', isTamil ? 'அனைத்து வகை (All Types)' : 'All Types'],
                  ['boneless', '100% Boneless'],
                  ['single-bone', 'Single Center Bone'],
                  ['whole-crisp', 'Whole Crispy Chewable']
                ].map(([val, label]) => (
                  <label key={val} className={`filter-radio-row ${filters.boneType === val ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="boneRadio"
                      value={val}
                      checked={filters.boneType === val}
                      onChange={() => setFilters(prev => ({ ...prev, boneType: val }))}
                    />
                    <span className="filter-radio-label">{label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 5. Salt Content Options */}
            {activeTab === 'salt' && (
              <div className="filter-options-group">
                <div className="filter-group-header-label">
                  <span>{isTamil ? 'உப்புத் தன்மை (SALT CONTENT)' : 'SALT CONTENT'}</span>
                  {isSaltActive && (
                    <button type="button" className="filter-reset-link" onClick={() => setFilters(prev => ({ ...prev, salt: 'all' }))}>
                      {isTamil ? 'மீட்டமை' : 'Reset'}
                    </button>
                  )}
                </div>
                {[
                  ['all', isTamil ? 'அனைத்து உப்பு அளவு (All Salt Levels)' : 'All Salt Levels'],
                  ['mild', 'Mild / Low Salt'],
                  ['traditional', 'Traditional Sea Salted']
                ].map(([val, label]) => (
                  <label key={val} className={`filter-radio-row ${filters.salt === val ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="saltRadio"
                      value={val}
                      checked={filters.salt === val}
                      onChange={() => setFilters(prev => ({ ...prev, salt: val }))}
                    />
                    <span className="filter-radio-label">{label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 6. Customer Rating Options */}
            {activeTab === 'rating' && (
              <div className="filter-options-group">
                <div className="filter-group-header-label">
                  <span>{isTamil ? 'மதிப்பீடு (CUSTOMER RATING)' : 'CUSTOMER RATING'}</span>
                  {isRatingActive && (
                    <button type="button" className="filter-reset-link" onClick={() => setFilters(prev => ({ ...prev, minRating: 0 }))}>
                      {isTamil ? 'மீட்டமை' : 'Reset'}
                    </button>
                  )}
                </div>
                {[
                  { val: 4.5, label: isTamil ? '4.5★ & அதற்கு மேல்' : '4.5 Stars & above' },
                  { val: 4, label: isTamil ? '4★ & அதற்கு மேல்' : '4 Stars & above' },
                  { val: 3, label: isTamil ? '3★ & அதற்கு மேல்' : '3 Stars & above' },
                  { val: 0, label: isTamil ? 'அனைத்து மதிப்பீடு (All Ratings)' : 'All Ratings' }
                ].map(r => (
                  <label key={r.val} className={`filter-radio-row ${Number(filters.minRating) === r.val ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="rateRadio"
                      value={r.val}
                      checked={Number(filters.minRating) === r.val}
                      onChange={() => setFilters(prev => ({ ...prev, minRating: r.val }))}
                    />
                    <span className="filter-radio-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      {r.val > 0 ? (
                        <>
                          <span>{r.val}</span>
                          <span style={{ color: '#f59e0b', display: 'inline-flex' }}>
                            <AppIcon name="star" size={13} />
                          </span>
                          <span>{isTamil ? '& அதற்கு மேல்' : '& above'}</span>
                        </>
                      ) : (
                        r.label
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer for Mobile / Bottom Drawer */}
        <div className="filter-bottom-bar">
          <button type="button" className="filter-clear-bottom-btn" onClick={resetAll}>
            {isTamil ? 'அனைத்தும் நீக்கு' : 'Reset'}
          </button>
          <button
            type="button"
            className="filter-apply-btn"
            onClick={onClose}
          >
            {totalMatchingProducts !== undefined
              ? (isTamil ? `பயன்படுத்து (${totalMatchingProducts} தயாரிப்புகள்)` : `Apply (${totalMatchingProducts} Products)`)
              : (isTamil ? 'பயன்படுத்து' : 'Apply Filters')}
          </button>
        </div>
      </aside>
    </>
  );
}

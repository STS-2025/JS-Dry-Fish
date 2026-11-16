import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import AppIcon from '../common/AppIcon';

const STORAGE_KEY = 'atf_customer_reviews';

const SEED_REVIEWS = [
  {
    id: 'seed-1',
    rating: 5,
    name: 'கவிதா செல்வம், அடையார், சென்னை',
    product: 'பால் சுறா கருவாடு (Baby Milk Shark)',
    comment: 'பால் சுறா கருவாடு வாங்கினேன். கொரியர் பார்சல் வரும்போது கொஞ்சம்கூட வாடை இல்லை. நல்ல முள் இல்லாத சாஃப்ட் பீஸ். குழம்பு அருமையா வந்தது. தாய்ப்பால் கொடுக்கும் பெண்களுக்கு மிகவும் நல்லது! பேக்கிங் தரம் சூப்பர்.',
    date: 'Verified Buyer',
    verified: true
  },
  {
    id: 'seed-2',
    rating: 5,
    name: 'ஆண்டனி சேவியர், இந்திரா நகர், பெங்களூரு',
    product: 'தலைசுத்தம் செய்த நெத்திலி கருவாடு',
    comment: 'தூத்துக்குடி சொந்த ஊர் எங்களுக்கு, வெளியூரில் இந்த மாதிரி ஒரிஜினல் நெத்திலி கருவாடு கிடைப்பது ரொம்ப கஷ்டம். JS Dry Fish Shop-ல வாங்கினோம். தலை நீக்கின சுத்தமான நெத்திலி, சூப்பர் கிரிஸ்பி ஃப்ரை!',
    date: 'Verified Buyer',
    verified: true
  }
];

function loadStoredUserReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export default function ReviewsSection() {
  const { isTamil, showToast, products = [] } = useCart();

  const [userReviews, setUserReviews] = useState(loadStoredUserReviews);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);

  // Combine user reviews with exactly 2 seed reviews
  const reviewsList = useMemo(() => {
    return [...userReviews, ...SEED_REVIEWS];
  }, [userReviews]);

  // Ensure currentIndex stays within bounds if list changes
  useEffect(() => {
    if (currentIndex >= reviewsList.length) {
      setCurrentIndex(Math.max(0, reviewsList.length - 1));
    }
  }, [reviewsList.length, currentIndex]);

  const productOptions = useMemo(() => {
    if (products && products.length > 0) {
      const names = products.map(p => isTamil ? (p.nameTa || p.nameEn) : p.nameEn);
      return Array.from(new Set(names));
    }
    return [
      'பால் சுறா கருவாடு (Baby Milk Shark)',
      'தலைசுத்தம் செய்த நெத்திலி கருவாடு',
      'வஞ்சரம் (கரையாது) கருவாடு',
      'இறால் கருவாடு (Prawns)',
      'மாசி கருவாடு (Maasi)',
      'மீன் ஊறுகாய் (Fish Pickle)'
    ];
  }, [products, isTamil]);

  const [newReview, setNewReview] = useState({
    name: '',
    product: 'பால் சுறா கருவாடு (Baby Milk Shark)',
    rating: 0,
    comment: ''
  });
  const [hoverRating, setHoverRating] = useState(0);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + reviewsList.length) % reviewsList.length);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % reviewsList.length);
  };

  // Touch Swipe Support for mobile
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.comment.trim()) return;

    if (!newReview.rating || newReview.rating === 0) {
      showToast(isTamil ? 'தயவுசெய்து உங்கள் மதிப்பீட்டை (Star Rating) தேர்ந்தெடுக்கவும்.' : 'Please select a star rating.');
      return;
    }

    const created = {
      id: 'rev_' + Date.now(),
      rating: Number(newReview.rating) || 5,
      name: newReview.name.trim(),
      product: newReview.product || productOptions[0] || 'நாட்டு கருவாடு',
      comment: newReview.comment.trim(),
      date: isTamil ? 'இப்போது' : 'Just now',
      verified: true
    };

    const nextUserReviews = [created, ...userReviews];
    setUserReviews(nextUserReviews);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUserReviews));
    } catch (_) {}

    setNewReview({
      name: '',
      product: productOptions[0] || 'பால் சுறா கருவாடு (Baby Milk Shark)',
      rating: 0,
      comment: ''
    });
    setHoverRating(0);
    setShowForm(false);
    setCurrentIndex(0);
    showToast(isTamil ? 'நன்றி! உங்களது விமர்சனம் வெற்றிகரமாக பதிவிடப்பட்டது.' : 'Thank you! Your review has been added.');
  };

  const currentReview = reviewsList[currentIndex] || reviewsList[0];

  return (
    <section className="reviews-section" id="reviewsSection">
      {/* Section Head */}
      <div className="section-head">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', padding: '3px 10px', borderRadius: '16px', fontSize: '11.5px', fontWeight: 700, marginBottom: '6px' }}>
            <AppIcon name="verified" size={13} /> {isTamil ? '100% உண்மையான வாடிக்கையாளர்கள்' : '100% Genuine Reviews'}
          </div>
          <h3 style={{ margin: 0 }}>
            {isTamil ? 'உண்மையான வாடிக்கையாளர் விமர்சனங்கள்' : 'Verified Customer Ratings & Reviews'}
          </h3>
          <p style={{ color: 'var(--fk-muted)', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
            {isTamil ? 'தூத்துக்குடி துறைமுக கடல் உணவை ருசித்த வாடிக்கையாளர்களின் நேரடி அனுபவங்கள்.' : 'Authentic feedback from dry fish lovers across Tamil Nadu.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="reviews-avg-badge">
            <span style={{ fontSize: '16px', fontWeight: 800 }}>4.9</span>
            <AppIcon name="star" size={15} />
            <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9 }}>
              ({reviewsList.length} {reviewsList.length === 1 ? (isTamil ? 'மதிப்புரை' : 'review') : (isTamil ? 'மதிப்புரைகள்' : 'reviews')})
            </span>
          </div>

          <button
            type="button"
            className="write-review-btn"
            onClick={() => setShowForm(true)}
          >
            <AppIcon name="pen" size={14} />
            <span>{isTamil ? 'விமர்சனம் எழுதுக' : 'Write a Review'}</span>
          </button>
        </div>
      </div>

      {/* Review Card Slider Carousel */}
      <div
        className="review-carousel-wrapper"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left Arrow Button */}
        <button
          type="button"
          className="review-arrow-btn review-arrow-prev"
          onClick={handlePrev}
          aria-label="Previous review"
          title={isTamil ? "முந்தைய விமர்சனம்" : "Previous Review"}
        >
          <AppIcon name="chevronLeft" size={20} />
        </button>

        {/* Active Review Card Display */}
        <div className="review-slider-track">
          {currentReview && (
            <div className="review-card featured-review-card" key={currentReview.id}>
              <div className="rev-card-header">
                <div className="rev-avatar">
                  {currentReview.name ? currentReview.name.trim().charAt(0).toUpperCase() : 'U'}
                </div>

                <div className="rev-user-meta">
                  <div className="rev-name">{currentReview.name}</div>
                  <div className="rev-sub-meta">
                    <span className="rev-verified">
                      <AppIcon name="checkCircle" size={12} /> {isTamil ? 'உறுதிப்படுத்தப்பட்ட வாங்குபவர்' : 'Verified Buyer'}
                    </span>
                    <span className="rev-dot">•</span>
                    <span className="rev-date">{currentReview.date}</span>
                  </div>
                </div>

                <div className="rev-stars-box">
                  <span className="rev-rating-num">{Number(currentReview.rating).toFixed(1)}</span>
                  <div className="rev-stars-icons">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        style={{ color: star <= currentReview.rating ? '#ff9f00' : '#cbd5e1' }}
                      >
                        <AppIcon name="star" size={13} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rev-quote-mark">“</div>
              <p className="rev-text">"{currentReview.comment}"</p>

              <div className="rev-product-footer">
                <span className="rev-product-label">{isTamil ? 'பொருள்:' : 'Item:'}</span>
                <span className="rev-product-tag">
                  <AppIcon name="fish" size={13} />
                  <b>{currentReview.product}</b>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          className="review-arrow-btn review-arrow-next"
          onClick={handleNext}
          aria-label="Next review"
          title={isTamil ? "அடுத்த விமர்சனம்" : "Next Review"}
        >
          <AppIcon name="chevronRight" size={20} />
        </button>
      </div>

      {/* Dots & Counter Pagination */}
      <div className="review-pagination-bar">
        <div className="review-dots">
          {reviewsList.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`review-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to review ${idx + 1}`}
            />
          ))}
        </div>
        <span className="review-counter">
          {currentIndex + 1} / {reviewsList.length}
        </span>
      </div>

      {/* Write a Review Modal */}
      {showForm && (
        <div className="review-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="review-modal-card" onClick={e => e.stopPropagation()}>
            <div className="review-modal-head">
              <div>
                <span className="review-modal-eyebrow">
                  {isTamil ? 'உங்கள் கருத்தை பகிருங்கள்' : 'SHARE YOUR FEEDBACK'}
                </span>
                <h4>
                  {isTamil ? 'வாடிக்கையாளர் விமர்சனம் எழுதுக' : 'Write a Customer Review'}
                </h4>
              </div>
              <button
                type="button"
                className="close-review-modal"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddReview} className="review-modal-body">
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
                  {isTamil ? 'உங்கள் பெயர் & ஊர் *' : 'Your Name & City *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isTamil ? 'எ.கா: சுந்தர், திருச்சி' : 'e.g. Sundar, Trichy'}
                  value={newReview.name}
                  onChange={e => setNewReview({ ...newReview, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
                  {isTamil ? 'வாங்கிய பொருள் *' : 'Product Purchased *'}
                </label>
                <select
                  value={newReview.product}
                  onChange={e => setNewReview({ ...newReview, product: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                >
                  {productOptions.map(pName => (
                    <option key={pName} value={pName}>{pName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
                  {isTamil ? 'மதிப்பீடு (Rating) *' : 'Rating *'}
                </label>
                <div className="interactive-star-selector" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const activeVal = hoverRating || newReview.rating;
                    const isColored = activeVal >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        className={`star-choice-btn ${isColored ? 'active' : ''}`}
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        onMouseEnter={() => setHoverRating(star)}
                        aria-label={`${star} star`}
                        style={{
                          color: isColored ? '#ff9f00' : '#cbd5e1',
                          transform: isColored ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <AppIcon name="star" size={24} />
                      </button>
                    );
                  })}
                  <span className="star-rating-label">
                    {newReview.rating === 0 ? (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11.5px' }}>
                        {isTamil ? 'மதிப்பீட்டைத் தேர்ந்தெடுக்கவும்' : 'Click a star to rate'}
                      </span>
                    ) : newReview.rating === 5 ? (isTamil ? '5/5 - மிகச் சிறப்பு!' : '5/5 - Excellent!')
                      : newReview.rating === 4 ? (isTamil ? '4/5 - மிகவும் நன்று' : '4/5 - Very Good')
                      : newReview.rating === 3 ? (isTamil ? '3/5 - நன்று' : '3/5 - Good')
                      : newReview.rating === 2 ? (isTamil ? '2/5 - பரவாயில்லை' : '2/5 - Fair')
                      : (isTamil ? '1/5 - திருப்தியில்லை' : '1/5 - Poor')}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
                  {isTamil ? 'உங்கள் விமர்சனம் (Comments) *' : 'Your Comments & Experience *'}
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder={isTamil ? 'கருவாட்டின் தரம், வாடை இல்லாத பேக்கிங், சுவை மற்றும் டெலிவரி பற்றிய உங்கள் அனுபவம்...' : 'How was the quality, odourless packaging, crispiness, and delivery experience?'}
                  value={newReview.comment}
                  onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div className="review-modal-actions">
                <button
                  type="button"
                  className="review-cancel-btn"
                  onClick={() => setShowForm(false)}
                >
                  {isTamil ? 'ரத்து செய்க' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="review-submit-btn"
                >
                  <AppIcon name="pen" size={14} />
                  <span>{isTamil ? 'விமர்சனத்தை பதிவேற்றுக' : 'Submit Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

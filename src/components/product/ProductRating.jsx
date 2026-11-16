import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import AppIcon from '../common/AppIcon';
import { getCustomerErrorMessage, getCustomerSupportMessage } from '../../utils/errorMessages';

export default function ProductRating({ product, allowRating = false }) {
  const {
    isTamil,
    productRatingSummaries,
    productRatingServiceStatus,
    userProductRatings,
    submitProductRating
  } = useCart();
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittedRating = userProductRatings[product.code];
  const summary = productRatingSummaries[product.code];
  const hasLiveSummary = summary && Number(summary.reviews) > 0 && Number(summary.rating) > 0;
  const rating = hasLiveSummary
    ? Number(summary.rating)
    : (Number(product.rating) > 0 ? Number(product.rating) : 4.5);
  const reviews = hasLiveSummary
    ? Number(summary.reviews)
    : ((Number(product.reviews) > 0 && Number(product.reviews) !== 50 && Number(product.reviews) !== 48)
        ? Number(product.reviews)
        : 1);
  const hasRating = Number(rating) > 0;
  const ratingsUnavailable = productRatingServiceStatus === 'error';
  const canRate = productRatingServiceStatus === 'ready';

  const rateProduct = async value => {
    if (isSubmitting || value === submittedRating) return;

    setIsSubmitting(true);
    setError('');
    try {
      await submitProductRating(product.code, value);
    } catch (submitError) {
      console.error(`Unable to submit rating for ${product.code}`, submitError);
      setError(getCustomerErrorMessage(submitError, isTamil));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="customer-rating">
      <div className="rating-row customer-rating-summary">
        {hasRating ? (
          <>
            <span className="rating-badge">{Number(rating).toFixed(1)} <AppIcon name="star" size={14} /></span>
            <span className="rating-count">
              ({reviews} {reviews === 1 ? (isTamil ? 'மதிப்பீடு' : 'rating') : (isTamil ? 'மதிப்பீடுகள்' : 'ratings')})
            </span>
          </>
        ) : ratingsUnavailable ? (
          <span className="rating-count customer-rating-error">
            {getCustomerSupportMessage(isTamil)}
          </span>
        ) : (
          <span className="rating-count">{isTamil ? 'இன்னும் மதிப்பீடு இல்லை' : 'Not rated yet'}</span>
        )}
      </div>

      {allowRating && (
        <div className="customer-rating-input">
          <span className="rating-count">
            {ratingsUnavailable
              ? getCustomerSupportMessage(isTamil)
              : submittedRating
              ? (isTamil ? `உங்கள் மதிப்பீடு: ${submittedRating}/5 (மாற்ற கிளிக் செய்க)` : `Your rating: ${submittedRating}/5 (Click to change)`)
              : isTamil ? 'மதிப்பிட நட்சத்திரத்தைத் தேர்வு செய்க' : 'Rate this product'}
          </span>
          <div
            className="customer-rating-stars"
            role="group"
            aria-label={`${isTamil ? 'தயாரிப்பு மதிப்பீடு' : 'Rate'} ${product.nameEn}`}
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map(value => (
              <button
                key={value}
                type="button"
                className={`customer-rating-star${value <= (hoverRating || submittedRating || 0) ? ' selected' : ''}`}
                aria-label={isTamil ? `${value} நட்சத்திரம்` : `Rate ${value} out of 5`}
                aria-pressed={submittedRating === value}
                disabled={!canRate || isSubmitting}
                onMouseEnter={() => setHoverRating(value)}
                onFocus={() => setHoverRating(value)}
                onBlur={() => setHoverRating(0)}
                onClick={() => rateProduct(value)}
              >
                <AppIcon name="star" size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <span className="customer-rating-error" role="alert">{error}</span>}
    </div>
  );
}

import { shopInfo } from '../data/shopInfo';

/**
 * Generate standard NPCI UPI Deep Link URI (opens GPay, PhonePe, Paytm, BHIM, Cred, etc.)
 * Scheme: upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn={note}
 */
export function buildUpiPayUrl({ upiId, payeeName, amount, orderId }) {
  const vpa = upiId || shopInfo.upiId || `${shopInfo.phone}@okaxis`;
  const name = payeeName || shopInfo.name || 'JS Dry Fish Shop';
  const amt = Number(amount || 0).toFixed(2);
  const note = orderId ? `Order #${orderId} JS Dry Fish` : 'JS Dry Fish Shop Order';

  const params = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: amt,
    cu: 'INR',
    tn: note
  });

  return `upi://pay?${params.toString()}`;
}

/**
 * Generate dynamic QR Code image URL for scanning with any mobile UPI app
 */
export function buildUpiQrCodeUrl(upiUri, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(upiUri)}`;
}

/**
 * Helper to detect mobile browser environment
 */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
}

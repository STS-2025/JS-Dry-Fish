import React, { useEffect, useState } from 'react';
import {
  getCustomerSession,
  registerCustomer,
  loginCustomer,
  checkCustomerExists,
  resetCustomerPassword,
  clearCustomerSession,
  updateCustomerAccountDetails,
  fetchCustomerOrdersHistory,
  cleanPhone
} from '../../utils/customerAuth';
import { useCart } from '../../context/CartContext';
import PasswordInput from '../common/PasswordInput';
import { buildUpiPayUrl } from '../../utils/upiHelper';
import { getCustomerErrorMessage } from '../../utils/errorMessages';

const PROFILE_ICONS = {
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  package: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
  truck: <><path d="M3 6h12v11H3zM15 10h4l3 3v4h-7" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="18.5" cy="18" r="1.5" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  signOut: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  userPlus: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M19 8v6M16 11h6" /></>,
  warning: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  noAccount: <><circle cx="12" cy="8" r="3.5" /><path d="M4 20v-1a8 8 0 0 1 13.5-5.7M19 16l4 4M23 16l-4 4" /></>,
  phone: <path d="M7.2 3.5 10 3l1.5 4-2 1.8a15 15 0 0 0 5.7 5.7l1.8-2 4 1.5-.5 2.8a3 3 0 0 1-3.3 2.4A17.5 17.5 0 0 1 4.8 7a3 3 0 0 1 2.4-3.5Z" />,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  login: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  verified: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  save: <><path d="M4 3h13l3 3v15H4z" /><path d="M8 3v6h8V3M8 21v-8h8v8" /></>,
  cart: <><circle cx="9" cy="20" r="1" /><circle cx="19" cy="20" r="1" /><path d="M2 3h2l2.5 12h13l2-9H5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
  rupee: <><circle cx="12" cy="12" r="9" /><text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" stroke="none">₹</text></>,
  status: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  chevronUp: <path d="m7 14 5-5 5 5" />
};

function ProfileIcon({ name, size = 16 }) {
  return (
    <svg
      className="customer-profile-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PROFILE_ICONS[name]}
    </svg>
  );
}

export default function CustomerProfilePage({ onBackToShop, onTrackOrder }) {
  const {
    isTamil,
    clearCart,
    clearWishlist,
    userProductRatings = {},
    submitProductRating,
    showToast,
    products = []
  } = useCart();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [hoverRatings, setHoverRatings] = useState({});
  const [submittingRatingItem, setSubmittingRatingItem] = useState(null);
  
  // Clearable Form States
  const [authForm, setAuthForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    pincode: ''
  });

  // Forgot Password States
  const [forgotStep, setForgotStep] = useState(1); // 1 = Enter Phone, 2 = Enter New Password
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [notRegisteredNotice, setNotRegisteredNotice] = useState(false);

  // Profile View States
  const [showOrders, setShowOrders] = useState(false); // Controls orders display on button click
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    city: '',
    pincode: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const text = isTamil
    ? {
      title: 'என் சுயவிவரம்',
      back: '← கடைக்குத் திரும்பு',
      backToLogin: '← உள்நுழைவுக்குத் திரும்பு',
      intro: 'உங்கள் வாடிக்கையாளர் விவரங்களையும் உங்கள் ஆர்டர்களையும் நிர்வகிக்கவும்.',
      account: 'பாதுகாப்பான வாடிக்கையாளர் கணக்கு',
      recoveryEyebrow: 'கடவுச்சொல் மீட்பு · PASSWORD RECOVERY',
      recoveryTitle: 'கடவுச்சொல்லை மாற்று (Reset Password)',
      recoveryIntro: 'பதிவு செய்த 10 இலக்க மொபைல் எண்ணை உள்ளிட்டு புதிய கடவுச்சொல்லை அமைக்கவும்.',
      details: 'வாடிக்கையாளர் டெலிவரி விவரங்கள்',
      name: 'முழு பெயர்',
      phone: 'தொலைபேசி எண்',
      pincode: 'பின்கோடு (6 இலக்கங்கள்)',
      city: 'ஊர் / மாவட்டம்',
      address: 'முழு முகவரி (Door No, Street Name)',
      editDetails: 'முகவரியை திருத்து (Edit Details)',
      save: 'சேமிக்கவும்',
      cancel: 'ரத்து செய்',
      myOrdersBtn: 'என் ஆர்டர்கள் (My Orders)',
      hideOrdersBtn: 'ஆர்டர்களை மறைக்க (Hide Orders)',
      showOrdersHint: 'உங்கள் முழு ஆர்டர் பட்டியலைப் பார்க்க கிளிக் செய்யவும்',
      noOrders: 'இந்த மொபைல் எண்ணில் இன்னும் ஆர்டர்கள் இல்லை.',
      track: 'ஆர்டரை ட்ராக் செய்',
      addressSaved: 'விவரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன.',
      noAddress: 'முகவரி இன்னும் சேர்க்கப்படவில்லை.',
      notAdded: 'சேர்க்கப்படவில்லை',
      signIn: 'உள்நுழை (Sign in)',
      register: 'புதிய கணக்கு உருவாக்கு (Register)',
      password: 'கடவுச்சொல் (Password)',
      confirmPassword: 'கடவுச்சொல்லை உறுதிப்படுத்து',
      forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா? (Forgot password?)',
      newHere: 'புதிய வாடிக்கையாளரா?',
      existing: 'ஏற்கனவே கணக்கு உள்ளதா?',
      mobileHint: '10 இலக்க மொபைல் எண்',
      signOut: 'வெளியேறு (Sign out)',
      welcome: 'வணக்கம்',
      onlineBadge: 'உறுதிசெய்யப்பட்ட வாடிக்கையாளர்',
      notRegisteredTitle: 'நீங்கள் இன்னும் பதிவு செய்யவில்லை!',
      notRegisteredMsg: 'இந்த மொபைல் எண் எங்கள் பதிவேட்டில் இல்லை. தயவுசெய்து புதிய கணக்கு தொடங்கவும்.',
      registerNowBtn: 'இப்போது பதிவு செய்க (Register Now)'
    }
    : {
      title: 'My Profile',
      back: '← Back to shop',
      backToLogin: '← Back to Sign in',
      intro: 'Manage your delivery details and view all orders placed with your mobile number.',
      account: 'SECURE CUSTOMER ACCOUNT',
      recoveryEyebrow: 'PASSWORD RECOVERY',
      recoveryTitle: 'Reset Password',
      recoveryIntro: 'Enter your registered 10-digit mobile number to set a new password.',
      details: 'Customer Delivery Details',
      name: 'Full name',
      phone: 'Mobile number',
      pincode: 'Pincode (6 digits)',
      city: 'City / District',
      address: 'Complete Delivery Address',
      editDetails: 'Edit Details',
      save: 'Save changes',
      cancel: 'Cancel',
      myOrdersBtn: 'My Orders',
      hideOrdersBtn: 'Hide Orders',
      showOrdersHint: 'Click to view all order history & track shipments',
      noOrders: 'No orders placed with this mobile number yet.',
      track: 'Track Order',
      addressSaved: 'Details saved successfully.',
      noAddress: 'No address added yet.',
      notAdded: 'Not added',
      signIn: 'Sign in',
      register: 'Create Account (Register)',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot password?',
      newHere: 'New to JS Dry Fish Shop?',
      existing: 'Already have an account?',
      mobileHint: '10-digit mobile number',
      signOut: 'Sign out',
      welcome: 'Welcome',
      onlineBadge: 'VERIFIED CUSTOMER',
      notRegisteredTitle: "You haven't registered yet!",
      notRegisteredMsg: 'No account was found for this mobile number. Please create a new account to proceed.',
      registerNowBtn: 'Register Now'
    };

  // Helper to completely clear all form inputs
  const clearAllInputs = () => {
    setAuthForm({
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
      address: '',
      city: '',
      pincode: ''
    });
    setForgotPhone('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setFoundCustomer(null);
    setNotRegisteredNotice(false);
    setError('');
    setNotice('');
  };

  // Switch Auth Mode with full input reset
  const switchAuthMode = (mode) => {
    clearAllInputs();
    setAuthMode(mode);
    setForgotStep(1);
  };

  // Load existing session & orders on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    const session = getCustomerSession();
    if (session) {
      setCustomer(session);
      setEditForm({
        name: session.name || '',
        address: session.address || '',
        city: session.city || '',
        pincode: session.pincode || ''
      });
      fetchCustomerOrdersHistory(session.phone, session.id)
        .then(res => {
          if (active) setOrders(res);
        })
        .catch(error => {
          if (active) setError(getCustomerErrorMessage(error, isTamil));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => { active = false; };
  }, []);

  // Reload orders whenever customer changes
  const reloadOrders = async (phone, id) => {
    try {
      const res = await fetchCustomerOrdersHistory(phone, id);
      setOrders(res);
    } catch (error) {
      setError(getCustomerErrorMessage(error, isTamil));
    }
  };

  // Helper to match order item to product code for rating
  const resolveProductCode = (item) => {
    if (item.code) return item.code;
    const match = products.find(p => p.id === item.id || (p.nameEn && item.nameEn && p.nameEn.toLowerCase() === item.nameEn.toLowerCase()));
    if (match?.code) return match.code;
    return item.code || String(item.id || item.nameEn || 'ITEM');
  };

  // Submit product rating for ordered item
  const handleRateItem = async (item, ratingValue) => {
    const itemCode = resolveProductCode(item);
    if (!itemCode || !submitProductRating) return;
    setSubmittingRatingItem(itemCode);
    try {
      await submitProductRating(itemCode, ratingValue);
      if (showToast) {
        showToast(isTamil ? `மதிப்பீடு (${ratingValue}★) பதிவு செய்யப்பட்டது!` : `Rating (${ratingValue}★) submitted!`);
      }
    } catch (err) {
      console.error('Rating submission failed', err);
      if (showToast) {
        showToast(isTamil ? 'மதிப்பீடு சமர்ப்பிக்க முடியவில்லை.' : 'Failed to submit rating.');
      }
    } finally {
      setSubmittingRatingItem(null);
    }
  };

  // Handle Sign In or Registration submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const phone = cleanPhone(authForm.phone);
    if (phone.length !== 10) {
      setError(isTamil ? 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setBusy(true);
    try {
      if (authMode === 'register') {
        if (!authForm.name.trim()) {
          throw new Error(isTamil ? 'உங்கள் பெயரை உள்ளிடவும்.' : 'Please enter your full name.');
        }
        if (authForm.password.length < 6) {
          throw new Error(isTamil ? 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.' : 'Password must be at least 6 characters.');
        }
        if (authForm.password !== authForm.confirmPassword) {
          throw new Error(isTamil ? 'கடவுச்சொற்கள் பொருந்தவில்லை.' : 'Passwords do not match.');
        }

        const registered = await registerCustomer({
          name: authForm.name,
          phone: authForm.phone,
          password: authForm.password,
          address: authForm.address,
          city: authForm.city,
          pincode: authForm.pincode
        });

        // Clear all inputs after registration
        clearAllInputs();

        setCustomer(registered);
        setEditForm({
          name: registered.name || '',
          address: registered.address || '',
          city: registered.city || '',
          pincode: registered.pincode || ''
        });
        setNotice(isTamil ? 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது! வருக!' : 'Account created successfully! Welcome!');
        reloadOrders(registered.phone, registered.id);
      } else {
        const loggedIn = await loginCustomer({
          phone: authForm.phone,
          password: authForm.password
        });

        // Clear all inputs after login
        clearAllInputs();

        setCustomer(loggedIn);
        setEditForm({
          name: loggedIn.name || '',
          address: loggedIn.address || '',
          city: loggedIn.city || '',
          pincode: loggedIn.pincode || ''
        });
        setNotice(isTamil ? 'வெற்றிகரமாக உள்நுழைந்துள்ளீர்கள்!' : 'Signed in successfully!');
        reloadOrders(loggedIn.phone, loggedIn.id);
      }
    } catch (err) {
      setError(getCustomerErrorMessage(err, isTamil));
    } finally {
      setBusy(false);
    }
  };

  // Step 1: Verify Mobile Number for Forgot Password
  const handleVerifyForgotPhone = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setNotRegisteredNotice(false);

    const phone = cleanPhone(forgotPhone);
    if (phone.length !== 10) {
      setError(isTamil ? 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setBusy(true);
    try {
      const res = await checkCustomerExists(phone);
      if (res.exists) {
        setFoundCustomer(res.customer);
        setForgotStep(2);
        setError('');
      } else {
        setNotRegisteredNotice(true);
      }
    } catch (err) {
      setError(getCustomerErrorMessage(err, isTamil));
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Set New Password & Confirm
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (forgotNewPassword.length < 6) {
      setError(isTamil ? 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.' : 'Password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError(isTamil ? 'கடவுச்சொற்கள் பொருந்தவில்லை.' : 'Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const loggedIn = await resetCustomerPassword({
        phone: forgotPhone,
        newPassword: forgotNewPassword
      });

      // Clear all forgot password inputs after reset
      clearAllInputs();

      setCustomer(loggedIn);
      setEditForm({
        name: loggedIn.name || '',
        address: loggedIn.address || '',
        city: loggedIn.city || '',
        pincode: loggedIn.pincode || ''
      });
      setAuthMode('login');
      setNotice(isTamil ? 'புதிய கடவுச்சொல் வெற்றிகரமாக அமைக்கப்பட்டது! உள்நுழைந்துள்ளீர்கள்.' : 'Password reset successfully! You are now signed in.');
      reloadOrders(loggedIn.phone, loggedIn.id);
    } catch (err) {
      setError(getCustomerErrorMessage(err, isTamil));
    } finally {
      setBusy(false);
    }
  };

  // Handle Profile Update
  const handleEditSave = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);

    try {
      const updated = await updateCustomerAccountDetails(editForm);
      setCustomer(updated);
      setIsEditing(false);
      setNotice(text.addressSaved);
    } catch (err) {
      setError(getCustomerErrorMessage(err, isTamil));
    } finally {
      setBusy(false);
    }
  };

  // Handle Sign Out with clean reset
  const handleSignOut = () => {
    clearCustomerSession();
    clearCart?.();
    clearWishlist?.();
    clearAllInputs();
    setCustomer(null);
    setOrders([]);
    setShowOrders(false);
    setAuthMode('login');
    setIsEditing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return '#059669'; // Green
      case 'Shipped': return '#0284c7';   // Blue
      case 'Packed': return '#7c3aed';    // Purple
      case 'Confirmed': return '#0284c7'; // Blue
      case 'Cancelled': return '#dc2626'; // Red
      default: return '#d97706';          // Amber / Pending
    }
  };

  if (loading) {
    return (
      <main className="customer-profile-page main-container">
        <section className="customer-profile-auth-card" aria-live="polite">
          <p>{isTamil ? 'கணக்கு சரிபார்க்கப்படுகிறது…' : 'Checking customer account…'}</p>
        </section>
      </main>
    );
  }

  // SCREEN: Forgot Password Recovery Mode
  if (!customer && authMode === 'forgot') {
    return (
      <main className="customer-profile-page main-container">
        <section className="customer-profile-auth-card" aria-labelledby="customer-forgot-title">
          <button
            type="button"
            className="customer-profile-back"
            onClick={() => switchAuthMode('login')}
          >
            {text.backToLogin}
          </button>
          <span className="customer-profile-local-only">{text.recoveryEyebrow}</span>
          <h1 id="customer-forgot-title">{text.recoveryTitle}</h1>
          <p className="customer-profile-auth-intro">{text.recoveryIntro}</p>

          {/* STEP 1: Enter & Verify Mobile Number */}
          {forgotStep === 1 && (
            <form className="customer-profile-auth-form" onSubmit={handleVerifyForgotPhone}>
              <label>
                {text.phone} *
                <div className="customer-profile-phone-input">
                  <span>+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder={text.mobileHint}
                    value={forgotPhone}
                    onChange={e => {
                      setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setNotRegisteredNotice(false);
                      setError('');
                    }}
                    required
                    autoFocus
                  />
                </div>
              </label>

              {error && <div className="customer-profile-message error" role="alert"><ProfileIcon name="warning" /> {error}</div>}

              {/* Notice when mobile number is NOT registered in database */}
              {notRegisteredNotice && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px', marginTop: '12px', marginBottom: '14px', color: '#991b1b', fontSize: '13px', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
                    <ProfileIcon name="noAccount" /> {text.notRegisteredTitle}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    {text.notRegisteredMsg} (<ProfileIcon name="phone" /> +91 {forgotPhone})
                  </div>
                  <button
                    type="button"
                    className="btn-confirm-order"
                    style={{ width: '100%', background: '#059669', padding: '10px 14px', fontSize: '13px', fontWeight: 700 }}
                    onClick={() => {
                      const prefilledPhone = forgotPhone;
                      clearAllInputs();
                      setAuthMode('register');
                      setAuthForm(current => ({ ...current, phone: prefilledPhone }));
                    }}
                  >
                    <ProfileIcon name="userPlus" /> {text.registerNowBtn}
                  </button>
                </div>
              )}

              {!notRegisteredNotice && (
                <button type="submit" className="customer-profile-auth-submit" disabled={busy} style={{ marginTop: '14px' }}>
                  {busy
                    ? (isTamil ? 'சரிபார்க்கப்படுகிறது…' : 'Checking…')
                    : <><ProfileIcon name="search" /> {isTamil ? 'மொபைல் எண்ணை சரிபார்' : 'Verify Mobile Number'}</>}
                </button>
              )}
            </form>
          )}

          {/* STEP 2: Mobile Number Found -> Create New Password & Confirm */}
          {forgotStep === 2 && (
            <form className="customer-profile-auth-form" onSubmit={handleResetPasswordSubmit}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#166534', lineHeight: 1.4 }}>
                <ProfileIcon name="checkCircle" /> {isTamil ? 'கணக்கு உறுதி செய்யப்பட்டது:' : 'Account verified for:'} <b>{foundCustomer?.name || 'Customer'}</b> (<ProfileIcon name="phone" /> +91 {forgotPhone})
              </div>

              <label>
                {isTamil ? 'புதிய கடவுச்சொல் (New Password) *' : 'New Password *'}
                <PasswordInput
                  minLength={6}
                  placeholder={isTamil ? 'குறைந்தது 6 எழுத்துகள்' : 'Minimum 6 characters'}
                  value={forgotNewPassword}
                  onChange={e => setForgotNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>

              <label>
                {isTamil ? 'புதிய கடவுச்சொல்லை உறுதிப்படுத்து *' : 'Confirm New Password *'}
                <PasswordInput
                  minLength={6}
                  placeholder={isTamil ? 'கடவுச்சொல்லை மீண்டும் உள்ளிடவும்' : 'Re-enter your new password'}
                  value={forgotConfirmPassword}
                  onChange={e => setForgotConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>

              {error && <div className="customer-profile-message error" role="alert"><ProfileIcon name="warning" /> {error}</div>}
              {notice && <div className="customer-profile-message success" role="status"><ProfileIcon name="checkCircle" /> {notice}</div>}

              <button type="submit" className="customer-profile-auth-submit" disabled={busy} style={{ marginTop: '14px' }}>
                {busy
                  ? (isTamil ? 'கடவுச்சொல் மாற்றப்படுகிறது…' : 'Updating password…')
                  : <><ProfileIcon name="lock" /> {isTamil ? 'புதிய கடவுச்சொல் அமைத்து உள்நுழை' : 'Set New Password & Sign In'}</>}
              </button>

              <button
                type="button"
                style={{ background: 'transparent', border: 0, color: '#64748b', fontSize: '12px', cursor: 'pointer', marginTop: '12px', display: 'block', width: '100%', textAlign: 'center' }}
                onClick={() => {
                  setForgotStep(1);
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
                  setError('');
                  setNotice('');
                }}
              >
                {isTamil ? '← வேறு மொபைல் எண் மாற்ற' : '← Change mobile number'}
              </button>
            </form>
          )}

          <p className="customer-profile-auth-switch" style={{ marginTop: '18px' }}>
            {isTamil ? 'நினைவு வந்துவிட்டதா?' : 'Remembered your password?'}{' '}
            <button type="button" onClick={() => switchAuthMode('login')}>
              {text.signIn}
            </button>
          </p>
        </section>
      </main>
    );
  }

  // SCREEN: Login / Register Form
  if (!customer) {
    const isRegistering = authMode === 'register';
    return (
      <main className="customer-profile-page main-container">
        <section className="customer-profile-auth-card" aria-labelledby="customer-auth-title">
          <button type="button" className="customer-profile-back" onClick={onBackToShop}>{text.back}</button>
          <span className="customer-profile-local-only">{text.account}</span>
          <h1 id="customer-auth-title">{isRegistering ? text.register : text.signIn}</h1>
          <p className="customer-profile-auth-intro">
            {isTamil
              ? 'உங்கள் 10 இலக்க மொபைல் எண் மூலம் உங்கள் கணக்கை எளிதாக பயன்படுத்தவும். OTP காத்திருப்பு தேவையில்லை.'
              : 'Sign in or create an account with your mobile number to auto-fill delivery details and track all orders.'}
          </p>

          <form className="customer-profile-auth-form" onSubmit={handleAuthSubmit}>
            {isRegistering && (
              <label>
                {text.name} *
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="eg: Anand Kumar"
                  value={authForm.name}
                  onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                  required
                />
              </label>
            )}

            <label>
              {text.phone} *
              <div className="customer-profile-phone-input">
                <span>+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder={text.mobileHint}
                  value={authForm.phone}
                  onChange={e => setAuthForm({ ...authForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  required
                />
              </div>
            </label>

            {isRegistering && (
              <>
                <label>
                  {text.address} (Optional)
                  <textarea
                    rows="2"
                    placeholder="Door No, Street Name, Landmark"
                    value={authForm.address}
                    onChange={e => setAuthForm({ ...authForm, address: e.target.value })}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label>
                    {text.city}
                    <input
                      type="text"
                      placeholder={isTamil ? 'ஊர் / மாவட்டம்' : 'City / District'}
                      value={authForm.city}
                      onChange={e => setAuthForm({ ...authForm, city: e.target.value })}
                    />
                  </label>
                  <label>
                    {text.pincode}
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="628001"
                      value={authForm.pincode}
                      onChange={e => setAuthForm({ ...authForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    />
                  </label>
                </div>
              </>
            )}

            <label>
              {text.password} *
              <PasswordInput
                minLength={6}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                placeholder="Minimum 6 characters"
                value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
            </label>

            {/* Forgot Password link on Sign In mode */}
            {!isRegistering && (
              <div style={{ textAlign: 'right', marginTop: '-6px', marginBottom: '14px' }}>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: 'var(--fk-blue)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onClick={() => switchAuthMode('forgot')}
                >
                  {text.forgotPassword}
                </button>
              </div>
            )}

            {isRegistering && (
              <label>
                {text.confirmPassword} *
                <PasswordInput
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={authForm.confirmPassword}
                  onChange={e => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                  required
                />
              </label>
            )}

            {error && <div className="customer-profile-message error" role="alert"><ProfileIcon name="warning" /> {error}</div>}
            {notice && <div className="customer-profile-message success" role="status"><ProfileIcon name="checkCircle" /> {notice}</div>}

            <button type="submit" className="customer-profile-auth-submit" disabled={busy}>
              {busy
                ? (isTamil ? 'சரிபார்க்கப்படுகிறது…' : 'Processing…')
                : (isRegistering
                  ? <><ProfileIcon name="userPlus" /> {text.register}</>
                  : <><ProfileIcon name="login" /> {text.signIn}</>)}
            </button>
          </form>

          <p className="customer-profile-auth-switch">
            {isRegistering ? text.existing : text.newHere}{' '}
            <button type="button" onClick={() => switchAuthMode(isRegistering ? 'login' : 'register')}>
              {isRegistering ? text.signIn : text.register}
            </button>
          </p>
        </section>
      </main>
    );
  }

  // SCREEN: Logged In Customer Profile & Order History
  return (
    <main className="customer-profile-page main-container">
      <section className="customer-profile-page-card" aria-labelledby="customer-profile-title">
        
        {/* Header with Title and Back to Shop Button */}
        <div className="customer-profile-page-header">
          <div>
            <span className="customer-profile-local-only"><ProfileIcon name="verified" /> {text.onlineBadge}</span>
            <h1 id="customer-profile-title">{text.welcome}, {customer.name || 'Friend'}! <ProfileIcon name="checkCircle" size={20} /></h1>
            <p>{text.intro}</p>
          </div>
          <div className="customer-profile-header-actions">
            <button type="button" className="customer-profile-back" onClick={onBackToShop}>{text.back}</button>
          </div>
        </div>

        <div className="customer-profile-body">
          {/* Customer Details with Edit Option */}
          <section className="customer-profile-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0 }}><ProfileIcon name="pin" /> {text.details}</h4>
              {!isEditing && (
                <button
                  type="button"
                  className="customer-profile-edit-address"
                  style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 600 }}
                  onClick={() => {
                    setIsEditing(true);
                    setError('');
                    setNotice('');
                  }}
                >
                  <ProfileIcon name="edit" /> {text.editDetails}
                </button>
              )}
            </div>

            <div className="customer-profile-details-card">
              {!isEditing ? (
                <div className="customer-profile-details-list">
                  <div><span>{text.name}</span><strong>{customer.name || text.notAdded}</strong></div>
                  <div><span>{text.phone}</span><strong><ProfileIcon name="phone" /> +91 {customer.phone}</strong></div>
                  <div className="customer-profile-detail-wide">
                    <span>{text.address}</span>
                    <p>
                      {customer.address || text.noAddress}
                      {customer.city && <><br /><ProfileIcon name="pin" /> {customer.city}</>}
                      {customer.pincode && <> - {customer.pincode}</>}
                    </p>
                  </div>
                </div>
              ) : (
                <form className="customer-profile-edit-form" onSubmit={handleEditSave}>
                  <div className="customer-profile-fields">
                    <label>
                      {text.name}
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                    </label>
                    <label className="customer-profile-address">
                      {text.address}
                      <textarea
                        rows="2"
                        placeholder="Door No, Street Name, Landmark"
                        value={editForm.address}
                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </label>
                    <label>
                      {text.city}
                      <input
                        value={editForm.city}
                        onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                      />
                    </label>
                    <label>
                      {text.pincode}
                      <input
                        maxLength={6}
                        value={editForm.pincode}
                        onChange={e => setEditForm({ ...editForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      />
                    </label>
                  </div>

                  {error && <div className="customer-profile-message error" role="alert"><ProfileIcon name="warning" /> {error}</div>}
                  {notice && <div className="customer-profile-message success" role="status"><ProfileIcon name="checkCircle" /> {notice}</div>}

                  <div className="customer-profile-edit-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button type="submit" className="btn-confirm-order" disabled={busy} style={{ width: 'auto', padding: '8px 16px' }}>
                      {busy ? 'Saving…' : <><ProfileIcon name="save" /> {text.save}</>}
                    </button>
                    <button type="button" className="customer-profile-cancel" onClick={() => setIsEditing(false)}>
                      {text.cancel}
                    </button>
                  </div>
                </form>
              )}
            </div>
            {notice && !isEditing && <div className="customer-profile-message success" role="status"><ProfileIcon name="checkCircle" /> {notice}</div>}
          </section>

          {/* MY ORDERS BUTTON (While clicking My Orders, show all order history) */}
          <section className="customer-profile-section" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="customer-profile-orders-toggle-btn"
              onClick={() => setShowOrders(prev => !prev)}
              style={{ background: showOrders ? '#f0fdf4' : '#ffffff', borderColor: showOrders ? '#10b981' : '#cbd5e1' }}
            >
              <div className="customer-profile-orders-toggle-content">
                <div className="customer-profile-orders-toggle-title" style={{ color: showOrders ? '#047857' : '#0f172a' }}>
                  <ProfileIcon name="package" /> {text.myOrdersBtn} ({orders.length})
                </div>
                <div className="customer-profile-orders-toggle-hint">
                  {text.showOrdersHint}
                </div>
              </div>
              <span
                className="customer-profile-orders-toggle-action"
                style={{ color: showOrders ? '#047857' : '#0284c7', background: showOrders ? '#dcfce7' : '#f1f5f9' }}
              >
                <ProfileIcon name={showOrders ? 'chevronUp' : 'chevronDown'} />
                {showOrders ? text.hideOrdersBtn : (isTamil ? 'பார்க்க' : 'View History')}
              </span>
            </button>

            {/* ORDER HISTORY LIST (Shown while clicking My Orders button) */}
            {showOrders && (
              <div style={{ marginTop: '16px' }}>
                {orders.length === 0 ? (
                  <div className="customer-profile-empty" style={{ background: '#f8fafc', padding: '24px', borderRadius: '10px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                    <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '14px' }}>
                      {text.noOrders}
                    </p>
                    <button
                      type="button"
                      onClick={onBackToShop}
                      style={{ background: 'var(--fk-blue)', color: '#fff', border: 0, padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <ProfileIcon name="cart" /> {isTamil ? 'கருவாடு வகைகளை பார்க்கவும்' : 'Browse Dry Fish Catalog'}
                    </button>
                  </div>
                ) : (
                  <div className="customer-profile-orders">
                    {orders.map(order => (
                      <article className="customer-profile-order" key={order.orderId} style={{ borderLeft: `4px solid ${getStatusColor(order.status)}` }}>
                        <div className="customer-profile-order-heading">
                          <strong>#{order.orderId}</strong>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                background: `${getStatusColor(order.status)}15`,
                                color: getStatusColor(order.status),
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              <ProfileIcon name="status" /> {order.status || 'Pending'}
                            </span>
                            {order.paymentStatus === 'Paid' ? (
                              <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                ✓ Paid
                              </span>
                            ) : (
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                Payment Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Order Items List with Interactive Rating */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0' }}>
                          {(order.items || []).map((item, itemIdx) => {
                            const itemCode = resolveProductCode(item);
                            const ratingValue = userProductRatings[itemCode];
                            const hoverValue = hoverRatings[itemCode] || 0;
                            const isSubmitting = submittingRatingItem === itemCode;

                            return (
                              <div
                                key={item.id || item.code || itemIdx}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  padding: '8px 10px',
                                  background: '#f8fafc',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                                      {isTamil ? (item.nameTa || item.nameEn) : (item.nameEn || item.nameTa || 'Dry Fish')}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                                      {item.weight || '250g'} × {item.qty || 1}
                                    </div>
                                  </div>
                                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                    ₹{Number((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}
                                  </div>
                                </div>

                                {/* Star Rating Widget for Order Item */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                                  <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                                    {ratingValue
                                      ? (isTamil ? 'உங்கள் மதிப்பீடு:' : 'Your Rating:')
                                      : (isTamil ? 'மதிப்பிடவும்:' : 'Rate product:')}
                                  </span>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    {[1, 2, 3, 4, 5].map(star => {
                                      const isFilled = star <= (hoverValue || ratingValue || 0);
                                      return (
                                        <button
                                          key={star}
                                          type="button"
                                          disabled={isSubmitting}
                                          onMouseEnter={() => setHoverRatings(prev => ({ ...prev, [itemCode]: star }))}
                                          onMouseLeave={() => setHoverRatings(prev => ({ ...prev, [itemCode]: 0 }))}
                                          onClick={() => handleRateItem(item, star)}
                                          title={`${star} Star`}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '0 2px',
                                            fontSize: '17px',
                                            lineHeight: 1,
                                            cursor: isSubmitting ? 'wait' : 'pointer',
                                            color: isFilled ? '#f59e0b' : '#cbd5e1',
                                            transition: 'transform 0.15s ease',
                                            transform: hoverValue === star ? 'scale(1.2)' : 'none'
                                          }}
                                        >
                                          ★
                                        </button>
                                      );
                                    })}
                                    {ratingValue && (
                                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', marginLeft: '4px' }}>
                                        {ratingValue}★
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="customer-profile-order-footer">
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            <ProfileIcon name="calendar" /> {order.date || ''} · <ProfileIcon name="rupee" /> <b>₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</b> · {order.paymentMode || 'Online (UPI)'}
                          </span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {order.paymentStatus !== 'Paid' && (
                              <a
                                href={buildUpiPayUrl({ amount: order.totalAmount, orderId: order.orderId })}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#059669',
                                  color: '#ffffff',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  textDecoration: 'none'
                                }}
                              >
                                Pay UPI
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (onTrackOrder) onTrackOrder(order.orderId, customer.phone);
                              }}
                            >
                              <ProfileIcon name="truck" /> {text.track}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Bottom Sign Out Option */}
          <div style={{ marginTop: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                background: 'transparent',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ProfileIcon name="signOut" /> {text.signOut}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

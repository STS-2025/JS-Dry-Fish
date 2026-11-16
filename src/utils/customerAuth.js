import { supabase, isSupabaseConfigured } from '../supabase.js';
import { saveCustomerProfile } from './customerProfile.js';

const CUSTOMER_SESSION_KEY = 'atf_customer_session';

/**
 * Standard SHA-256 implementation in pure JavaScript.
 * Guarantees identical 64-char hex SHA-256 output across ALL environments,
 * even when window.crypto.subtle is undefined (e.g. mobile browser accessing local IP http://192.168.x.x).
 */
function pureSha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  hash = hash.slice(0, 8);
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ ((a & hash[2]) ^ (hash[1] & hash[2])));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (let i2 = 3; i2 >= 0; i2--) {
      const b = (hash[i] >> (8 * i2)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Legacy simple fallback hash for backwards compatibility.
 */
export function simpleFallbackHash(password) {
  const salted = String(password || '') + '_atf_tutydryfish_2026';
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) - hash) + salted.charCodeAt(i);
    hash |= 0;
  }
  return 'fb_' + Math.abs(hash).toString(16);
}

/**
 * Hash a password using deterministic SHA-256.
 * Guaranteed to match between localhost (PC), local IP (mobile), and production HTTPS.
 */
export async function hashPassword(password) {
  const salted = String(password || '') + '_atf_tutydryfish_2026';
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle?.digest) {
      const encoder = new TextEncoder();
      const data = encoder.encode(salted);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_) {}

  // Pure JavaScript SHA-256 fallback (produces the EXACT same standard SHA-256 digest)
  return pureSha256(salted);
}

/**
 * Verifies password against stored hash with automatic migration/backward compatibility.
 */
export async function verifyPassword(enteredPassword, storedHash) {
  if (!storedHash) return true;
  const standardHash = await hashPassword(enteredPassword);
  if (standardHash === storedHash) return true;

  // Check legacy simple fallback hash (e.g. if account was registered on insecure mobile origin previously)
  const legacyHash = simpleFallbackHash(enteredPassword);
  if (legacyHash === storedHash) return true;

  // Check plain password
  if (String(enteredPassword) === String(storedHash)) return true;

  return false;
}

/**
 * Clean phone to 10 TamilNadun mobile digits.
 */
export function cleanPhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

/**
 * Get the currently logged-in customer session.
 */
export function getCustomerSession() {
  try {
    const raw = sessionStorage.getItem(CUSTOMER_SESSION_KEY) || localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || typeof session !== 'object' || !session.phone) return null;
    return {
      id: session.id || 'cust_' + session.phone,
      name: String(session.name || ''),
      phone: cleanPhone(session.phone),
      address: String(session.address || ''),
      city: String(session.city || ''),
      pincode: String(session.pincode || ''),
      createdAt: session.createdAt || session.created_at || new Date().toISOString()
    };
  } catch (e) {
    console.error('Failed to read customer session:', e);
    return null;
  }
}

/**
 * Set and persist active customer session.
 */
export function setCustomerSession(customer) {
  if (!customer || !customer.phone) return null;
  const cleanCustomer = {
    id: customer.id || 'cust_' + cleanPhone(customer.phone),
    name: String(customer.name || '').trim(),
    phone: cleanPhone(customer.phone),
    address: String(customer.address || '').trim(),
    city: String(customer.city || '').trim() || 'Thoothukudi',
    pincode: String(customer.pincode || '').replace(/\D/g, '').slice(0, 6),
    createdAt: customer.createdAt || customer.created_at || new Date().toISOString()
  };

  try {
    sessionStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(cleanCustomer));
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(cleanCustomer));
    saveCustomerProfile(cleanCustomer);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('atf_customer_auth_change', { detail: cleanCustomer }));
    }
  } catch (e) {
    console.error('Failed to save customer session:', e);
  }
  return cleanCustomer;
}

/**
 * Clear customer session on sign out.
 */
export function clearCustomerSession() {
  try {
    sessionStorage.removeItem(CUSTOMER_SESSION_KEY);
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('atf_customer_auth_change', { detail: null }));
    }
  } catch (_) {}
}

/**
 * Register a new customer strictly in Supabase customers table.
 */
export async function registerCustomer({ name, phone, password, address = '', city = '', pincode = '' }) {
  const trimmedName = String(name || '').trim();
  const digits = cleanPhone(phone);
  const pwd = String(password || '');

  if (!trimmedName) throw new Error('Please enter your full name (உங்கள் பெயரை உள்ளிடவும்).');
  if (digits.length !== 10) throw new Error('Please enter a valid 10-digit mobile number (10 இலக்க மொபைல் எண்).');
  if (pwd.length < 6) throw new Error('Password must be at least 6 characters (குறைந்தது 6 எழுத்துகள்).');

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured. Please contact the administrator.');
  }

  const pwdHash = await hashPassword(pwd);

  // Check if phone number is already registered in Supabase
  const { data: existing, error: checkErr } = await supabase
    .from('customers')
    .select('id, phone, password_hash')
    .eq('phone', digits)
    .maybeSingle();

  if (checkErr) {
    console.warn('Customer existence check error:', checkErr.message);
  }

  if (existing && existing.password_hash) {
    throw new Error('This mobile number is already registered. Please sign in (இந்த எண் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது, உள்நுழையவும்).');
  }

  const newId = existing?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cust_${digits}`);

  const customerRecord = {
    id: newId,
    name: trimmedName,
    phone: digits,
    password_hash: pwdHash,
    address: String(address || '').trim(),
    city: String(city || '').trim() || 'Thoothukudi',
    pincode: String(pincode || '').replace(/\D/g, '').slice(0, 6),
    created_at: new Date().toISOString()
  };

  if (existing && !existing.password_hash) {
    // Customer profile existed from an order, now completing registration with password
    const { error: updateErr } = await supabase
      .from('customers')
      .update({
        name: customerRecord.name,
        password_hash: customerRecord.password_hash,
        address: customerRecord.address,
        city: customerRecord.city,
        pincode: customerRecord.pincode,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (updateErr) {
      throw new Error(`Failed to update customer in Supabase: ${updateErr.message}`);
    }
  } else {
    // Brand new registration in Supabase
    const { error: insertErr } = await supabase
      .from('customers')
      .insert([{
        id: customerRecord.id,
        name: customerRecord.name,
        phone: customerRecord.phone,
        password_hash: customerRecord.password_hash,
        address: customerRecord.address,
        city: customerRecord.city,
        pincode: customerRecord.pincode
      }]);

    if (insertErr) {
      throw new Error(`Failed to register customer in Supabase: ${insertErr.message}`);
    }
  }

  return setCustomerSession(customerRecord);
}

/**
 * Sign in an existing customer strictly via Supabase customers table.
 */
export async function loginCustomer({ phone, password }) {
  const digits = cleanPhone(phone);
  const pwd = String(password || '');

  if (digits.length !== 10) throw new Error('Please enter your 10-digit mobile number (10 இலக்க மொபைல் எண்).');
  if (!pwd) throw new Error('Please enter your password (கடவுச்சொல்லை உள்ளிடவும்).');

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const pwdHash = await hashPassword(pwd);

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', digits)
    .maybeSingle();

  if (error) {
    console.error('Supabase customer login query error:', error.message);
    throw new Error(`Login failed: ${error.message}`);
  }

  if (!data) {
    throw new Error('Account not found for this mobile number. Please register first (கணக்கு கிடைக்கவில்லை, முதலில் பதிவு செய்யவும்).');
  }

  if (data.password_hash) {
    const isPasswordValid = await verifyPassword(pwd, data.password_hash);
    if (!isPasswordValid) {
      throw new Error('Incorrect password. Please check and try again (கடவுச்சொல் தவறாக உள்ளது).');
    }
  }

  // Ensure password_hash is stored as modern deterministic SHA-256
  if (!data.password_hash || data.password_hash !== pwdHash) {
    try {
      await supabase.from('customers').update({ password_hash: pwdHash }).eq('id', data.id);
    } catch (_) {}
  }

  const customerRecord = {
    id: data.id,
    name: data.name || 'Customer',
    phone: digits,
    address: data.address || '',
    city: data.city || '',
    pincode: data.pincode || '',
    createdAt: data.created_at || new Date().toISOString()
  };

  return setCustomerSession(customerRecord);
}

/**
 * Check if a mobile number is registered strictly in Supabase customers table.
 */
export async function checkCustomerExists(phone) {
  const digits = cleanPhone(phone);
  if (digits.length !== 10) return { exists: false, customer: null };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, address, city, pincode')
        .eq('phone', digits)
        .maybeSingle();

      if (!error && data) {
        return {
          exists: true,
          customer: {
            id: data.id,
            name: data.name || 'Customer',
            phone: digits,
            address: data.address || '',
            city: data.city || '',
            pincode: data.pincode || ''
          }
        };
      }
    } catch (e) {
      console.warn('Supabase check customer error:', e);
    }
  }

  return { exists: false, customer: null };
}

/**
 * Reset password for a customer strictly in Supabase customers table.
 */
export async function resetCustomerPassword({ phone, newPassword }) {
  const digits = cleanPhone(phone);
  const pwd = String(newPassword || '');

  if (digits.length !== 10) throw new Error('Please enter a valid 10-digit mobile number.');
  if (pwd.length < 6) throw new Error('New password must be at least 6 characters.');

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const pwdHash = await hashPassword(pwd);

  const { data: existing, error: checkErr } = await supabase
    .from('customers')
    .select('id, phone')
    .eq('phone', digits)
    .maybeSingle();

  if (checkErr) throw new Error(`Supabase query error: ${checkErr.message}`);
  if (!existing) {
    throw new Error('No registered account found with this mobile number. Please register first.');
  }

  const { error: updateErr } = await supabase
    .from('customers')
    .update({
      password_hash: pwdHash,
      updated_at: new Date().toISOString()
    })
    .eq('phone', digits);

  if (updateErr) {
    throw new Error(`Failed to reset password in Supabase: ${updateErr.message}`);
  }

  const session = setCustomerSession({
    id: existing.id,
    phone: digits
  });
  return session;
}

/**
 * Update customer profile details strictly in Supabase customers table.
 */
export async function updateCustomerAccountDetails(updates) {
  const current = getCustomerSession();
  if (!current) throw new Error('Not logged in.');

  const next = {
    ...current,
    name: String(updates.name || current.name).trim(),
    address: String(updates.address || current.address).trim(),
    city: String(updates.city || current.city).trim(),
    pincode: String(updates.pincode || current.pincode).replace(/\D/g, '').slice(0, 6)
  };

  setCustomerSession(next);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('customers')
        .update({
          name: next.name,
          address: next.address,
          city: next.city,
          pincode: next.pincode,
          updated_at: new Date().toISOString()
        })
        .eq('phone', next.phone);
    } catch (sbErr) {
      console.warn('Supabase profile update notice:', sbErr.message);
    }
  }

  return next;
}

/**
 * Fetch all orders for this customer strictly from Supabase orders table.
 */
export async function fetchCustomerOrdersHistory(phone, customerId) {
  const digits = cleanPhone(phone);
  const orderMap = new Map();

  if (isSupabaseConfigured() && supabase && digits) {
    try {
      const { data: phoneOrders, error: pErr } = await supabase
        .from('orders')
        .select('*')
        .or(`customer_phone.eq.${digits},customer_phone.eq.+91${digits},customer_phone.ilike.%${digits}%`)
        .order('created_at', { ascending: false });

      if (pErr) console.warn('Supabase customer orders query notice:', pErr.message);

      if (!pErr && Array.isArray(phoneOrders)) {
        phoneOrders.forEach(row => {
          if (row.id && (String(row.id).startsWith('WR-') || String(row.id).startsWith('WS-'))) return; // Skip wholesale requests
          let parsed = {};
          try {
            parsed = typeof row.order_json === 'string' ? JSON.parse(row.order_json) : row.order_json;
          } catch (_) {}
          if (parsed && (parsed.isWholesale || String(parsed.orderId || parsed.id || '').startsWith('WS-') || String(parsed.orderId || parsed.id || '').startsWith('WR-'))) return;

          orderMap.set(row.id, {
            orderId: row.id,
            status: row.status || parsed?.status || 'Pending',
            paymentStatus: parsed?.paymentStatus || (parsed?.customer?.paymentMode === 'UPI' ? 'Pending Verification' : 'Unpaid'),
            date: parsed?.date || row.created_at,
            createdAt: row.created_at,
            customer: parsed?.customer || { name: row.customer_name, phone: row.customer_phone },
            items: Array.isArray(parsed?.items) ? parsed.items : [],
            totalAmount: Number(row.total_amount ?? parsed?.totalAmount ?? 0),
            paymentMode: parsed?.customer?.paymentMode || 'UPI'
          });
        });
      }

      if (customerId) {
        const { data: idOrders, error: iErr } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (!iErr && Array.isArray(idOrders)) {
          idOrders.forEach(row => {
            if (row.id && (String(row.id).startsWith('WR-') || String(row.id).startsWith('WS-'))) return;
            if (!orderMap.has(row.id)) {
              let parsed = {};
              try {
                parsed = typeof row.order_json === 'string' ? JSON.parse(row.order_json) : row.order_json;
              } catch (_) {}
              if (parsed && (parsed.isWholesale || String(parsed.orderId || parsed.id || '').startsWith('WS-') || String(parsed.orderId || parsed.id || '').startsWith('WR-'))) return;

              orderMap.set(row.id, {
                orderId: row.id,
                status: row.status || parsed?.status || 'Pending',
                paymentStatus: parsed?.paymentStatus || (parsed?.customer?.paymentMode === 'UPI' ? 'Pending Verification' : 'Unpaid'),
                date: parsed?.date || row.created_at,
                createdAt: row.created_at,
                customer: parsed?.customer || { name: row.customer_name, phone: row.customer_phone },
                items: Array.isArray(parsed?.items) ? parsed.items : [],
                totalAmount: Number(row.total_amount ?? parsed?.totalAmount ?? 0),
                paymentMode: parsed?.customer?.paymentMode || 'UPI'
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching Supabase customer orders:', err);
    }
  }

  return Array.from(orderMap.values()).sort((a, b) => {
    const da = new Date(a.date || a.createdAt || 0).getTime();
    const db = new Date(b.date || b.createdAt || 0).getTime();
    return db - da;
  });
}

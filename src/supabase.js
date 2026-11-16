import { createClient } from '@supabase/supabase-js';
import { apiUrl } from './api';
import { couponsData } from './data/products';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('your-project') &&
    supabaseUrl.startsWith('http')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function fetchCustomerProfile(customerId) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, address, city, pincode, created_at')
    .eq('id', customerId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load your customer profile: ${error.message}`);
  return data;
}

export async function updateCustomerProfile(customerId, profile) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('customers')
    .update({
      name: profile.name,
      address: profile.address,
      city: profile.city,
      pincode: profile.pincode,
      updated_at: new Date().toISOString()
    })
    .eq('id', customerId)
    .select('id, name, phone, address, city, pincode, created_at')
    .single();

  if (error) throw new Error(`Unable to save your customer profile: ${error.message}`);
  return data;
}

export async function fetchCustomerOrders(customerId) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_json, status, created_at, customer_phone, customer_name, total_amount')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Unable to load your orders: ${error.message}`);

  return (data || []).map(row => {
    let order;
    try {
      const parsedOrder = typeof row.order_json === 'string' ? JSON.parse(row.order_json) : row.order_json;
      order = parsedOrder && typeof parsedOrder === 'object' ? parsedOrder : {};
    } catch (parseError) {
      console.error(`Unable to parse order ${row.id} for the customer profile`, parseError);
      order = {};
    }

    return {
      ...order,
      orderId: row.id,
      status: row.status || order.status || 'Pending',
      createdAt: row.created_at || order.createdAt,
      customer: order.customer || {
        name: row.customer_name || '',
        phone: row.customer_phone || ''
      },
      items: Array.isArray(order.items) ? order.items : [],
      totalAmount: Number(row.total_amount ?? order.totalAmount ?? 0)
    };
  });
}

export async function fetchAdminCustomers() {
  const customerMap = new Map();

  // 1. Fetch from Supabase customers table if configured
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, address, city, pincode, created_at')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach(c => {
          const p = String(c.phone || '').replace(/\D/g, '').slice(-10);
          if (p) {
            customerMap.set(p, {
              id: c.id || 'cust_' + p,
              name: c.name || 'Customer',
              phone: p,
              address: c.address || '',
              city: c.city || '',
              pincode: c.pincode || '',
              createdAt: c.created_at || new Date().toISOString()
            });
          }
        });
      }
    } catch (_) {}
  }

  // 2. Also populate unique customers from Supabase orders table
  if (supabase) {
    try {
      const { data: orderRows } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, created_at, order_json')
        .order('created_at', { ascending: false });

      if (Array.isArray(orderRows)) {
        orderRows.forEach(o => {
          const p = String(o.customer_phone || '').replace(/\D/g, '').slice(-10);
          if (p && !customerMap.has(p)) {
            let parsed = null;
            try {
              parsed = typeof o.order_json === 'string' ? JSON.parse(o.order_json) : o.order_json;
            } catch (_) {}
            customerMap.set(p, {
              id: 'ord_cust_' + p,
              name: o.customer_name || parsed?.customer?.name || 'Customer',
              phone: p,
              address: parsed?.customer?.address || '',
              city: parsed?.customer?.city || '',
              pincode: parsed?.customer?.pincode || '',
              createdAt: o.created_at || new Date().toISOString()
            });
          }
        });
      }
    } catch (_) {}
  }

  return Array.from(customerMap.values());
}

export function parseProductRow(row) {
  if (!row) return null;
  let parsed = {};
  if (row.product_json) {
    try {
      parsed = typeof row.product_json === 'string' ? JSON.parse(row.product_json) : row.product_json;
    } catch (_) {}
  }
  const parseJsonField = (val, fallback) => {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch (_) { return fallback; }
  };

  return {
    ...parsed,
    id: row.id,
    code: row.code,
    nameEn: row.name_en || parsed.nameEn || '',
    nameTa: row.name_ta || parsed.nameTa || '',
    category: row.category || parsed.category || '',
    img: row.img || parsed.img || '',
    basePrice250g: row.base_price_250g != null ? Number(row.base_price_250g) : (parsed.basePrice250g || 0),
    baseMrp250g: row.base_mrp_250g != null ? Number(row.base_mrp_250g) : (parsed.baseMrp250g || 0),
    packPrice: row.base_price_250g != null ? Number(row.base_price_250g) : (parsed.packPrice || 0),
    packMrpPrice: row.base_mrp_250g != null ? Number(row.base_mrp_250g) : (parsed.packMrpPrice || 0),
    stock: row.stock != null ? Number(row.stock) : parsed.stock,
    rating: row.rating != null ? Number(row.rating) : (parsed.rating || 0),
    reviews: (Number(row.reviews ?? parsed.reviews) > 0 && Number(row.reviews ?? parsed.reviews) !== 50 && Number(row.reviews ?? parsed.reviews) !== 48)
      ? Number(row.reviews ?? parsed.reviews)
      : 1,
    boneType: row.bone_type != null ? row.bone_type : (parsed.boneType || ''),
    salt: row.salt != null ? row.salt : (parsed.salt || ''),
    descEn: row.desc_en != null ? row.desc_en : (parsed.descEn || ''),
    descTa: row.desc_ta != null ? row.desc_ta : (parsed.descTa || ''),
    availablePacks: parseJsonField(row.available_packs, parsed.availablePacks || ['250g', '500g', '1kg']),
    packPrices: parseJsonField(row.pack_prices, parsed.packPrices || {}),
    packMrpPrices: parseJsonField(row.pack_mrp_prices, parsed.packMrpPrices || {}),
    isActive: row.active !== false
  };
}

export async function fetchAdminProducts() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw new Error(`Unable to load products from Supabase: ${error.message}`);

  return (data || []).map(parseProductRow);
}

export async function saveAdminProduct(product) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const basePrice = Number(product.basePrice250g || product.packPrice || 0);
  const baseMrp = Number(product.baseMrp250g || product.packMrpPrice || Math.round(basePrice * 1.15));

  const rowWithColumns = {
    code: product.code,
    name_en: product.nameEn || '',
    name_ta: product.nameTa || '',
    category: product.category || '',
    img: product.img || '',
    base_price_250g: basePrice,
    base_mrp_250g: baseMrp,
    stock: product.stock == null || product.stock === '' ? null : Number(product.stock),
    rating: Number(product.rating || 0),
    reviews: Number(product.reviews || 0),
    bone_type: product.boneType || '',
    salt: product.salt || '',
    desc_en: product.descEn || '',
    desc_ta: product.descTa || '',
    available_packs: product.availablePacks || [],
    pack_prices: product.packPrices || {},
    pack_mrp_prices: product.packMrpPrices || {},
    product_json: JSON.stringify(product),
    active: product.isActive !== false
  };

  // Try saving with individual columns
  let { data, error } = await supabase
    .from('products')
    .upsert(rowWithColumns, { onConflict: 'code' })
    .select()
    .single();

  // If table does not yet have all individual columns, fallback safely to product_json
  if (error && (error.message?.includes('column') || error.code === '42703')) {
    const fallbackRes = await supabase
      .from('products')
      .upsert({
        code: product.code,
        product_json: JSON.stringify(product),
        active: product.isActive !== false
      }, { onConflict: 'code' })
      .select('id, code, active, product_json')
      .single();

    if (fallbackRes.error) throw new Error(`Unable to save product to Supabase: ${fallbackRes.error.message}`);
    data = fallbackRes.data;
  } else if (error) {
    throw new Error(`Unable to save product to Supabase: ${error.message}`);
  }

  return parseProductRow(data);
}

export async function setAdminProductActive(product, active) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('products')
    .upsert({
      code: product.code,
      product_json: JSON.stringify({ ...product, isActive: active }),
      active
    }, { onConflict: 'code' });

  if (error) throw new Error(`Unable to update product status in Supabase: ${error.message}`);
}

export async function fetchProductRatingSummaries() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('product_rating_summaries')
    .select('product_code, rating, reviews');

  if (error) throw new Error(`Unable to load product ratings: ${error.message}`);

  return (data || []).reduce((summaries, row) => {
    summaries[row.product_code] = {
      rating: Number(row.rating),
      reviews: Number(row.reviews)
    };
    return summaries;
  }, {});
}

export async function fetchProductOrderSummaries() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('product_order_totals')
    .select('product_code, order_count, units_sold');

  if (error) throw new Error(`Unable to load product order totals: ${error.message}`);

  return (data || []).reduce((summaries, row) => {
    summaries[row.product_code] = {
      orderCount: Number(row.order_count),
      unitsSold: Number(row.units_sold)
    };
    return summaries;
  }, {});
}

export async function submitProductRating(productCode, voterId, rating) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('product_ratings')
    .upsert(
      { product_code: productCode, voter_id: voterId, rating },
      { onConflict: 'product_code,voter_id' }
    );

  if (error) {
    const ratingError = new Error(`Unable to submit product rating: ${error.message}`);
    ratingError.code = error.code;
    throw ratingError;
  }
}

// Compatibility stubs - zero local storage usage
export function getLocalOrders() { return []; }
export function saveLocalOrder() {}
export function updateLocalOrderStatus() {}

/**
 * Generate sequential Order ID like JS-2026-001, JS-2026-002, etc.
 * Sequence starts at JS-2026-001 and increments by +1 for each order.
 */
export async function generateNextOrderId() {
  const currentYear = new Date().getFullYear();
  const prefix = `JS-${currentYear}-`;
  let maxSeq = 0;
  let supabaseChecked = false;

  // 1. Query existing order IDs from Supabase orders table (single source of truth for all users)
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .ilike('id', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!error && Array.isArray(data)) {
        supabaseChecked = true;
        for (const row of data) {
          const match = String(row.id || '').trim().match(new RegExp(`^JS-${currentYear}-(\\d+)`, 'i'));
          if (match && match[1]) {
            const seq = parseInt(match[1], 10);
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching latest order sequence from Supabase:', e);
    }
  }

  // 2. Only if Supabase was unreachable, fallback to localStorage continuity
  if (!supabaseChecked) {
    try {
      if (typeof localStorage !== 'undefined') {
        const localSeq = parseInt(localStorage.getItem(`js_last_order_seq_${currentYear}`) || '0', 10);
        if (!isNaN(localSeq) && localSeq > maxSeq) {
          maxSeq = localSeq;
        }
      }
    } catch (_) {}
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(3, '0');
  const nextOrderId = `${prefix}${padded}`;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`js_last_order_seq_${currentYear}`, String(nextSeq));
    }
  } catch (_) {}

  return nextOrderId;
}

/**
 * Place a new order:
 * 1. Generates sequential Order ID (e.g. JS-2026-001, JS-2026-002).
 * 2. Inserts directly into Supabase `orders` table.
 * 3. Broadcasts real-time new order event to Admin tabs.
 * 4. Returns the complete order details.
 */
export async function placeOnlineOrder(orderData) {
  const finalOrderId = orderData.orderId || await generateNextOrderId();

  const normalizedOrder = {
    ...orderData,
    orderId: finalOrderId,
    status: orderData.status || 'Pending',
    createdAt: orderData.createdAt || new Date().toISOString(),
    date: orderData.date || new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  };

  let savedToSupabase = false;

  // Insert into Supabase `orders` table directly
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: null }));

      let { error } = await supabase.from('orders').insert([
        {
          id: normalizedOrder.orderId,
          order_json: JSON.stringify(normalizedOrder),
          status: normalizedOrder.status,
          created_at: normalizedOrder.createdAt,
          customer_phone: String(normalizedOrder.customer?.phone || '').replace(/\D/g, '').slice(-10) || normalizedOrder.customer?.phone || '',
          customer_name: normalizedOrder.customer?.name || '',
          customer_id: sessionData?.session?.user?.id || null,
          total_amount: Number(normalizedOrder.totalAmount || 0)
        }
      ]);

      // If duplicate key collision happens, retry once with incremented sequence
      if (error && error.code === '23505') {
        const retryId = await generateNextOrderId();
        normalizedOrder.orderId = retryId;
        const retryRes = await supabase.from('orders').insert([
          {
            id: retryId,
            order_json: JSON.stringify(normalizedOrder),
            status: normalizedOrder.status,
            created_at: normalizedOrder.createdAt,
            customer_phone: String(normalizedOrder.customer?.phone || '').replace(/\D/g, '').slice(-10) || normalizedOrder.customer?.phone || '',
            customer_name: normalizedOrder.customer?.name || '',
            customer_id: sessionData?.session?.user?.id || null,
            total_amount: Number(normalizedOrder.totalAmount || 0)
          }
        ]);
        error = retryRes.error;
      }

      if (error) {
        console.error('Supabase orders table error:', error.message);
        throw new Error(`Unable to save order to Supabase: ${error.message}`);
      } else {
        savedToSupabase = true;
      }
    } catch (err) {
      console.error('Error inserting order to Supabase:', err);
      throw err;
    }
  } else {
    throw new Error('Supabase is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present.');
  }

  // Dispatch real-time notifications to Admin Dashboard tabs
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('atf_new_order', { detail: normalizedOrder }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('atf_orders_channel');
        bc.postMessage({ type: 'NEW_ORDER', order: normalizedOrder });
        bc.close();
      }
    }
  } catch (bcErr) {
    console.warn('Broadcast error:', bcErr);
  }

  return {
    ...normalizedOrder,
    savedToSupabase
  };
}

/**
 * Fetch orders for admin view (strictly from Supabase)
 */
export async function fetchAllOrders() {
  const orderMap = new Map();

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Unable to fetch orders from Supabase:', error);
      throw new Error(`Supabase orders fetch error: ${error.message}`);
    }

    if (Array.isArray(data)) {
      for (const row of data) {
        if (row.id && (String(row.id).startsWith('WR-') || String(row.id).startsWith('WS-'))) continue; // Skip wholesale requests from retail orders
        try {
          const parsed = typeof row.order_json === 'string'
            ? JSON.parse(row.order_json)
            : row.order_json;
          if (parsed && (parsed.isWholesale || String(parsed.orderId || parsed.id || '').startsWith('WR-') || String(parsed.orderId || parsed.id || '').startsWith('WS-'))) continue;
          parsed.status = row.status || parsed.status;
          if (!parsed.paymentStatus) {
            parsed.paymentStatus = (parsed.customer?.paymentMode === 'UPI') ? 'Pending Verification' : 'Unpaid';
          }
          orderMap.set(row.id, parsed);
        } catch {
          orderMap.set(row.id, {
            orderId: row.id,
            status: row.status,
            paymentStatus: 'Unpaid',
            createdAt: row.created_at,
            customer: { name: row.customer_name || 'Customer', phone: row.customer_phone || '' },
            items: [],
            totalAmount: Number(row.total_amount || 0)
          });
        }
      }
    }
  }

  return Array.from(orderMap.values());
}

/**
 * Update an order's status (Pending, Confirmed, Packed, Shipped, Delivered, Cancelled) in Supabase
 */
export async function updateOrderStatus(orderId, newStatus) {
  if (isSupabaseConfigured() && supabase) {
    // 1. Fetch current order_json to update status inside json as well
    const { data: existing } = await supabase
      .from('orders')
      .select('order_json')
      .eq('id', orderId)
      .maybeSingle();

    let updatedJson = null;
    if (existing?.order_json) {
      try {
        const parsed = typeof existing.order_json === 'string'
          ? JSON.parse(existing.order_json)
          : existing.order_json;
        parsed.status = newStatus;
        updatedJson = JSON.stringify(parsed);
      } catch (_) {}
    }

    const updates = { status: newStatus };
    if (updatedJson) updates.order_json = updatedJson;

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      console.error('Unable to update order status in Supabase:', error);
      throw new Error(`Failed to update order status in Supabase: ${error.message}`);
    }
  }
}

/**
 * Update an order's payment status (Paid, Unpaid, Pending Verification) in Supabase
 */
export async function updateOrderPaymentStatus(orderId, newPaymentStatus) {
  if (isSupabaseConfigured() && supabase) {
    const { data: existing } = await supabase
      .from('orders')
      .select('order_json')
      .eq('id', orderId)
      .maybeSingle();

    let updatedJson = null;
    if (existing?.order_json) {
      try {
        const parsed = typeof existing.order_json === 'string'
          ? JSON.parse(existing.order_json)
          : existing.order_json;
        parsed.paymentStatus = newPaymentStatus;
        updatedJson = JSON.stringify(parsed);
      } catch (_) {}
    }

    if (updatedJson) {
      const { error } = await supabase
        .from('orders')
        .update({ order_json: updatedJson })
        .eq('id', orderId);

      if (error) {
        console.error('Unable to update payment status in Supabase:', error);
        throw new Error(`Failed to update payment status in Supabase: ${error.message}`);
      }
    }
  }
}

/**
 * Track an order by orderId and 10-digit phone number
 */
export async function trackOrderByIdAndPhone(orderId, phone) {
  const cleanId = (orderId || '').trim().toUpperCase();
  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    throw new Error('Enter the 10-digit phone number used for the order.');
  }

  // 1. Try Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('track_order_by_id_and_phone', {
        p_order_id: cleanId,
        p_phone: cleanPhone
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : null;
      if (row) {
        let orderObj = null;
        try {
          orderObj = typeof row.order_json === 'string' ? JSON.parse(row.order_json) : row.order_json;
        } catch (_) {}

        const savedPhone = String(orderObj?.customer?.phone || row.customer_phone || '').replace(/\D/g, '').slice(-10);
        if (savedPhone === cleanPhone) {
          return {
            orderId: row.id,
            status: row.status || orderObj?.status || 'Pending',
            paymentStatus: orderObj?.paymentStatus || (orderObj?.customer?.paymentMode === 'UPI' ? 'Pending Verification' : 'Unpaid'),
            paymentMode: orderObj?.customer?.paymentMode || 'UPI',
            date: orderObj?.date || row.created_at,
            customer: orderObj?.customer || { phone: cleanPhone },
            items: orderObj?.items || [],
            totalAmount: orderObj?.totalAmount || row.total_amount || 0
          };
        }
      }

      // Fallback direct table query if RPC is not present or yielded no match
      const { data: directData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (directData) {
        let orderObj = null;
        try {
          orderObj = typeof directData.order_json === 'string' ? JSON.parse(directData.order_json) : directData.order_json;
        } catch (_) {}
        const savedPhone = String(orderObj?.customer?.phone || directData.customer_phone || '').replace(/\D/g, '').slice(-10);
        if (savedPhone === cleanPhone) {
          return {
            orderId: directData.id,
            status: directData.status || orderObj?.status || 'Pending',
            paymentStatus: orderObj?.paymentStatus || (orderObj?.customer?.paymentMode === 'UPI' ? 'Pending Verification' : 'Unpaid'),
            paymentMode: orderObj?.customer?.paymentMode || 'UPI',
            date: orderObj?.date || directData.created_at,
            customer: orderObj?.customer || { phone: cleanPhone },
            items: orderObj?.items || [],
            totalAmount: orderObj?.totalAmount || directData.total_amount || 0
          };
        }
      }
    } catch (err) {
      console.warn('Supabase order tracking query error:', err);
    }
  }

  throw new Error('Order ID அல்லது Phone Number பொருந்தவில்லை (Order ID or phone number did not match).');
}

const STORAGE_COUPONS_KEY = 'atf_admin_coupons';

// Compatibility stubs for coupons - strictly Supabase
export function getLocalCoupons() {
  return Object.entries(couponsData).map(([code, c]) => ({ code, ...c, isActive: true }));
}
export function saveLocalCoupon() {}
export function deleteLocalCoupon() {}

/**
 * Fetch discount coupons strictly from Supabase
 */
export async function fetchAdminCoupons() {
  let list = [];
  if (supabase) {
    try {
      const { data, error } = await supabase.from('coupons').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        list = data.map(c => {
          const json = typeof c.coupon_json === 'string' ? JSON.parse(c.coupon_json) : c.coupon_json;
          return { code: c.code, ...json, isActive: c.active !== false };
        });
        return list;
      }
    } catch (err) {
      console.warn('Unable to load coupons from Supabase:', err.message);
    }
  }

  // Fallback to initial product coupons only if Supabase table is empty
  return Object.entries(couponsData).map(([code, c]) => ({ code, ...c, isActive: true }));
}

/**
 * Save / Update a coupon strictly in Supabase
 */
export async function saveAdminCoupon(code, coupon) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase
    .from('coupons')
    .upsert({
      code,
      coupon_json: JSON.stringify(coupon),
      active: coupon.isActive !== false
    }, { onConflict: 'code' });

  if (error) {
    console.error('Supabase coupon save error:', error);
    throw new Error(`Failed to save coupon in Supabase: ${error.message}`);
  }
}

/**
 * Delete a coupon strictly from Supabase
 */
export async function deleteAdminCoupon(code) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('coupons').delete().eq('code', code);
  if (error) {
    console.error('Supabase coupon delete error:', error);
    throw new Error(`Failed to delete coupon in Supabase: ${error.message}`);
  }
}

/**
 * Toggle a coupon's active status in Supabase
 */
export async function setAdminCouponActive(code, active) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('coupons').update({ active }).eq('code', code);
  if (error) {
    console.error('Supabase coupon status update error:', error);
    throw new Error(`Failed to update coupon status in Supabase: ${error.message}`);
  }
}

/**
 * Fetch store settings from Supabase
 */
export async function fetchAdminSettings() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('store_settings').select('*');
    if (error) throw error;
    const settings = {};
    (data || []).forEach(row => {
      settings[row.key] = row.value;
    });
    return Object.keys(settings).length > 0 ? settings : null;
  } catch (err) {
    console.warn('Unable to load store settings from Supabase:', err.message);
    return null;
  }
}

/**
 * Save store settings to Supabase
 */
export async function saveAdminSettings(settings) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const entries = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value ?? '')
  }));
  const { error } = await supabase
    .from('store_settings')
    .upsert(entries, { onConflict: 'key' });
  if (error) throw new Error(`Unable to save store settings to Supabase: ${error.message}`);
}

/* ==========================================================================
   WHOLESALE QUOTE REQUESTS MANAGEMENT (STOREFRONT & ADMIN)
   ========================================================================== */

// Compatibility stubs for wholesale requests - strictly Supabase
export function getLocalWholesaleRequests() { return []; }
export function saveLocalWholesaleRequest() {}
export function updateLocalWholesaleRequestStatus() {}
export function deleteLocalWholesaleRequest() {}

/**
 * Generate sequential Wholesale ID like WS-2026-001, WS-2026-002, etc.
 * Sequence starts at WS-2026-001 and increments by +1 for each wholesale inquiry.
 */
export async function generateNextWholesaleId() {
  const currentYear = new Date().getFullYear();
  const prefix = `WS-${currentYear}-`;
  let maxSeq = 0;
  let supabaseChecked = false;

  if (isSupabaseConfigured() && supabase) {
    try {
      // 1. Query dedicated wholesale_requests table
      const { data: wsRows, error: wsError } = await supabase
        .from('wholesale_requests')
        .select('id')
        .ilike('id', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!wsError && Array.isArray(wsRows)) {
        supabaseChecked = true;
        for (const row of wsRows) {
          const match = String(row.id || '').trim().match(new RegExp(`^WS-${currentYear}-(\\d+)`, 'i'));
          if (match && match[1]) {
            const seq = parseInt(match[1], 10);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }
        }
      }

      // 2. Also query orders table (for fallback wholesale records)
      const { data: orderRows, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .ilike('id', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!orderError && Array.isArray(orderRows)) {
        supabaseChecked = true;
        for (const row of orderRows) {
          const match = String(row.id || '').trim().match(new RegExp(`^WS-${currentYear}-(\\d+)`, 'i'));
          if (match && match[1]) {
            const seq = parseInt(match[1], 10);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching latest wholesale sequence from Supabase:', e);
    }
  }

  // Fallback to localStorage continuity if Supabase was unreachable
  if (!supabaseChecked) {
    try {
      if (typeof localStorage !== 'undefined') {
        const localSeq = parseInt(localStorage.getItem(`ws_last_order_seq_${currentYear}`) || '0', 10);
        if (!isNaN(localSeq) && localSeq > maxSeq) {
          maxSeq = localSeq;
        }
      }
    } catch (_) {}
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(3, '0');
  const nextWholesaleId = `${prefix}${padded}`;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`ws_last_order_seq_${currentYear}`, String(nextSeq));
    }
  } catch (_) {}

  return nextWholesaleId;
}

/**
 * Submit a wholesale quote request from storefront (strictly saved to Supabase)
 */
export async function submitWholesaleRequest(requestData) {
  const finalId = requestData.id || await generateNextWholesaleId();
  const normalized = {
    id: finalId,
    businessName: (requestData.businessName || '').trim(),
    phone: (requestData.phone || '').trim(),
    quantity: requestData.quantity || '25-50 kg',
    city: (requestData.city || '').trim(),
    requirements: (requestData.requirements || '').trim(),
    status: requestData.status || 'Pending',
    paymentStatus: requestData.paymentStatus || 'Unpaid',
    createdAt: requestData.createdAt || new Date().toISOString(),
    date: requestData.date || new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    isWholesale: true
  };

  // Cross-tab broadcast to active Admin tabs
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('atf_new_wholesale', { detail: normalized }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('atf_wholesale_channel');
        bc.postMessage({ type: 'NEW_WHOLESALE', data: normalized });
        bc.close();
      }
    }
  } catch (_) {}

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  let savedSuccessfully = false;
  let lastError = null;

  // 1. Primary target: Dedicated `wholesale_requests` table
  try {
    const { error: wsError } = await supabase.from('wholesale_requests').insert([
      {
        id: normalized.id,
        business_name: normalized.businessName,
        phone: normalized.phone,
        quantity: normalized.quantity,
        city: normalized.city,
        requirements: normalized.requirements,
        status: normalized.status,
        created_at: normalized.createdAt,
        request_json: JSON.stringify(normalized)
      }
    ]);
    if (!wsError) {
      savedSuccessfully = true;
    } else {
      lastError = wsError;
      console.warn('Dedicated wholesale_requests table returned error:', wsError.message);
    }
  } catch (err) {
    lastError = err;
    console.warn('Dedicated wholesale_requests table not available:', err);
  }

  // 2. Secondary target: Store in Supabase `orders` table (guaranteed schema + RLS enabled)
  try {
    const { error: orderError } = await supabase.from('orders').insert([
      {
        id: normalized.id,
        order_json: JSON.stringify(normalized),
        status: normalized.status,
        created_at: normalized.createdAt,
        customer_phone: String(normalized.phone || '').replace(/\D/g, '').slice(-10) || normalized.phone || '',
        customer_name: normalized.businessName || 'Wholesale Buyer',
        total_amount: 0
      }
    ]);
    if (!orderError) {
      savedSuccessfully = true;
    } else {
      console.warn('Orders table secondary wholesale save returned error:', orderError.message);
      if (!savedSuccessfully) lastError = orderError;
    }
  } catch (err) {
    console.warn('Orders table secondary save failed:', err);
    if (!savedSuccessfully) lastError = err;
  }

  if (!savedSuccessfully && lastError) {
    throw new Error(`Failed to submit wholesale request to Supabase: ${lastError.message || lastError}`);
  }

  return normalized;
}

/**
 * Fetch wholesale requests for admin (strictly from Supabase)
 */
export async function fetchAllWholesaleRequests() {
  const reqMap = new Map();

  if (isSupabaseConfigured() && supabase) {
    // 1. Fetch from `wholesale_requests` table
    try {
      const { data, error } = await supabase
        .from('wholesale_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          try {
            const parsed = typeof row.request_json === 'string'
              ? JSON.parse(row.request_json)
              : (row.request_json || {});
            reqMap.set(row.id, {
              ...parsed,
              id: row.id,
              businessName: row.business_name || parsed.businessName || '',
              phone: row.phone || parsed.phone || '',
              quantity: row.quantity || parsed.quantity || '',
              city: row.city || parsed.city || '',
              requirements: row.requirements || parsed.requirements || '',
              status: row.status || parsed.status || 'Pending',
              paymentStatus: row.payment_status || parsed.paymentStatus || 'Unpaid',
              createdAt: row.created_at || parsed.createdAt || ''
            });
          } catch {
            reqMap.set(row.id, {
              id: row.id,
              businessName: row.business_name || '',
              phone: row.phone || '',
              quantity: row.quantity || '',
              city: row.city || '',
              requirements: row.requirements || '',
              status: row.status || 'Pending',
              paymentStatus: row.payment_status || 'Unpaid',
              createdAt: row.created_at || ''
            });
          }
        }
      }
    } catch (e) {
      console.warn('Supabase wholesale_requests table query skipped:', e);
    }

    // 2. Fetch from Supabase `orders` table (id starting with 'WS-%' or legacy 'WR-%')
    try {
      const { data: orderRows, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .or('id.ilike.WS-%,id.ilike.WR-%')
        .order('created_at', { ascending: false });

      if (!orderErr && Array.isArray(orderRows)) {
        for (const row of orderRows) {
          if (reqMap.has(row.id)) continue;
          try {
            const parsed = typeof row.order_json === 'string'
              ? JSON.parse(row.order_json)
              : (row.order_json || {});
            reqMap.set(row.id, {
              ...parsed,
              id: row.id,
              businessName: parsed.businessName || row.customer_name || 'Wholesale Buyer',
              phone: parsed.phone || row.customer_phone || '',
              quantity: parsed.quantity || 'Bulk',
              city: parsed.city || '',
              requirements: parsed.requirements || '',
              status: row.status || parsed.status || 'Pending',
              paymentStatus: parsed.paymentStatus || row.payment_status || 'Unpaid',
              createdAt: row.created_at || parsed.createdAt || ''
            });
          } catch {
            reqMap.set(row.id, {
              id: row.id,
              businessName: row.customer_name || 'Wholesale Buyer',
              phone: row.customer_phone || '',
              quantity: 'Bulk',
              city: '',
              requirements: '',
              status: row.status || 'Pending',
              paymentStatus: 'Unpaid',
              createdAt: row.created_at || ''
            });
          }
        }
      }
    } catch (e) {
      console.warn('Supabase orders table wholesale query skipped:', e);
    }
  }

  return Array.from(reqMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/**
 * Update a wholesale request status in Supabase
 */
export async function updateWholesaleRequestStatus(id, newStatus) {
  if (isSupabaseConfigured() && supabase) {
    // 1. Update in wholesale_requests table
    try {
      const { data: existing } = await supabase
        .from('wholesale_requests')
        .select('request_json')
        .eq('id', id)
        .maybeSingle();

      let updatedJson = null;
      if (existing?.request_json) {
        try {
          const parsed = typeof existing.request_json === 'string'
            ? JSON.parse(existing.request_json)
            : existing.request_json;
          parsed.status = newStatus;
          updatedJson = JSON.stringify(parsed);
        } catch (_) {}
      }
      const updates = { status: newStatus };
      if (updatedJson) updates.request_json = updatedJson;
      await supabase.from('wholesale_requests').update(updates).eq('id', id);
    } catch (_) {}

    // 2. Update in orders table if present
    try {
      const { data: existing } = await supabase
        .from('orders')
        .select('order_json')
        .eq('id', id)
        .maybeSingle();

      let updatedJson = null;
      if (existing?.order_json) {
        try {
          const parsed = typeof existing.order_json === 'string'
            ? JSON.parse(existing.order_json)
            : existing.order_json;
          parsed.status = newStatus;
          updatedJson = JSON.stringify(parsed);
        } catch (_) {}
      }
      const updates = { status: newStatus };
      if (updatedJson) updates.order_json = updatedJson;
      await supabase.from('orders').update(updates).eq('id', id);
    } catch (_) {}
  }
}

/**
 * Update a wholesale request payment status in Supabase (Unpaid, Advance Paid, Fully Paid)
 */
export async function updateWholesalePaymentStatus(id, newPaymentStatus) {
  if (isSupabaseConfigured() && supabase) {
    // 1. Update in wholesale_requests table
    try {
      const { data: existing } = await supabase
        .from('wholesale_requests')
        .select('request_json')
        .eq('id', id)
        .maybeSingle();

      let updatedJson = null;
      if (existing?.request_json) {
        try {
          const parsed = typeof existing.request_json === 'string'
            ? JSON.parse(existing.request_json)
            : existing.request_json;
          parsed.paymentStatus = newPaymentStatus;
          updatedJson = JSON.stringify(parsed);
        } catch (_) {}
      }
      const updates = { payment_status: newPaymentStatus };
      if (updatedJson) updates.request_json = updatedJson;
      await supabase.from('wholesale_requests').update(updates).eq('id', id);
    } catch (_) {
      try {
        const { data: existing } = await supabase
          .from('wholesale_requests')
          .select('request_json')
          .eq('id', id)
          .maybeSingle();
        if (existing?.request_json) {
          const parsed = typeof existing.request_json === 'string'
            ? JSON.parse(existing.request_json)
            : existing.request_json;
          parsed.paymentStatus = newPaymentStatus;
          await supabase.from('wholesale_requests').update({ request_json: JSON.stringify(parsed) }).eq('id', id);
        }
      } catch (_) {}
    }

    // 2. Update in orders table if dual-stored
    try {
      const { data: existing } = await supabase
        .from('orders')
        .select('order_json')
        .eq('id', id)
        .maybeSingle();

      let updatedJson = null;
      if (existing?.order_json) {
        try {
          const parsed = typeof existing.order_json === 'string'
            ? JSON.parse(existing.order_json)
            : existing.order_json;
          parsed.paymentStatus = newPaymentStatus;
          updatedJson = JSON.stringify(parsed);
        } catch (_) {}
      }
      const updates = {};
      if (updatedJson) updates.order_json = updatedJson;
      await supabase.from('orders').update(updates).eq('id', id);
    } catch (_) {}
  }
}

/**
 * Delete a wholesale request from Supabase
 */
export async function deleteWholesaleRequest(id) {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('wholesale_requests').delete().eq('id', id);
    } catch (_) {}
    try {
      await supabase.from('orders').delete().eq('id', id);
    } catch (_) {}
  }
}


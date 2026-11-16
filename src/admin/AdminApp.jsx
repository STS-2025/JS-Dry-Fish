import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { couponsData, productsData } from '../data/products';
import logo from '../assets/js-dry-fish-shop-logo.png';
import {
  fetchAllOrders,
  fetchAdminCustomers,
  fetchAdminProducts,
  saveAdminProduct as saveSupabaseProduct,
  setAdminProductActive,
  updateOrderStatus as updateSupabaseOrderStatus,
  updateOrderPaymentStatus,
  fetchAdminCoupons,
  saveAdminCoupon,
  deleteAdminCoupon,
  setAdminCouponActive,
  fetchAdminSettings,
  saveAdminSettings,
  fetchAllWholesaleRequests,
  updateWholesaleRequestStatus,
  updateWholesalePaymentStatus,
  deleteWholesaleRequest,
  isSupabaseConfigured,
  supabase
} from '../supabase';
import { PRODUCTS_PER_PAGE, EMPTY_PRODUCT } from './utils/constants';
import { request, formatCurrency, playChimeSound, formatRelativeTime } from './utils/adminHelpers';
import { getAdminErrorMessage, getAdminSupportMessage } from '../utils/errorMessages';
import AdminLogin from './components/AdminLogin';
import ProductEditor from './components/ProductEditor';
import StatCard from './components/StatCard';
import EmptyPanel from './components/EmptyPanel';
import NavIcon from './components/NavIcon';
import PasswordInput from '../components/common/PasswordInput';
import AppIcon from '../components/common/AppIcon';
import './AdminApp.css';

function AdminDashboard({ token, onLogout }) {
  const [tab, setTab] = useState('Overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState(productsData);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [coupons, setCoupons] = useState(Object.entries(couponsData).map(([code, c]) => ({ code, ...c, isActive: true })));
  const [couponModal, setCouponModal] = useState(null);
  const [deleteConfirmCoupon, setDeleteConfirmCoupon] = useState(null);
  const [settingsTab, setSettingsTab] = useState('details');
  const [settings, setSettings] = useState({
    storeName: 'JS Dry Fish Shop',
    supportPhone: '9787453202',
    upiId: '9787453202@okaxis',
    upiQrImage: '',
    supportEmail: 'contact@antotutyfishhub.com',
    lowStockThreshold: '10',
    deliveryCharge: '40',
    freeDeliveryThreshold: '499'
  });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [editor, setEditor] = useState(undefined);
  const [search, setSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [showArchived, setShowArchived] = useState(false);
  const [orderFilter, setOrderFilter] = useState('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [reportTimeFilter, setReportTimeFilter] = useState('all');
  const [graphViewMode, setGraphViewMode] = useState('revenue');
  const [wholesaleRequests, setWholesaleRequests] = useState([]);
  const [wholesaleFilter, setWholesaleFilter] = useState('All');
  const [wholesaleSearch, setWholesaleSearch] = useState('');
  const [selectedWholesaleDetail, setSelectedWholesaleDetail] = useState(null);
  const [wholesaleDeleteConfirm, setWholesaleDeleteConfirm] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Checking…');

  // Real-time notifications state (derived strictly from Supabase)
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close notification dropdown when clicking outside anywhere on screen
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isNotifOpen]);

  const [liveNewOrderToast, setLiveNewOrderToast] = useState(null);

  // Monthly Sales & Orders Breakdown for Graph
  const monthlyAnalytics = useMemo(() => {
    const validOrders = orders.filter(o => (o.status || '').toLowerCase() !== 'cancelled');

    // Generate last 6 months continuous timeline
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const shortName = d.toLocaleString('en-IN', { month: 'short' });
      const fullName = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });

      months.push({
        key,
        year,
        shortName,
        fullName,
        revenue: 0,
        orderCount: 0,
        unitsSold: 0
      });
    }

    const monthMap = {};
    months.forEach(m => { monthMap[m.key] = m; });

    validOrders.forEach(order => {
      let d;
      if (order.createdAt) {
        d = new Date(order.createdAt);
      } else if (order.date) {
        d = new Date(order.date);
      }
      if (!d || isNaN(d.getTime())) {
        d = new Date();
      }

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[key]) {
        monthMap[key].revenue += Number(order.totalAmount || 0);
        monthMap[key].orderCount += 1;
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach(it => {
          monthMap[key].unitsSold += Number(it.qty || 1);
        });
      }
    });

    const maxRevenue = Math.max(...months.map(m => m.revenue), 1000);
    const maxOrders = Math.max(...months.map(m => m.orderCount), 5);
    const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const totalOrders = validOrders.length;
    const bestMonth = [...months].sort((a, b) => b.revenue - a.revenue)[0];

    return {
      months,
      maxRevenue,
      maxOrders,
      totalRevenue,
      totalOrders,
      bestMonth: bestMonth && bestMonth.revenue > 0 ? bestMonth : null
    };
  }, [orders]);

  // Product Sales: which product has the highest orders (Enna product athigama order vanthuruku)
  const mostOrderedProductAnalytics = useMemo(() => {
    const now = new Date();
    let validOrders = orders.filter(o => (o.status || '').toLowerCase() !== 'cancelled');

    if (reportTimeFilter === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      validOrders = validOrders.filter(o => (o.createdAt || '').slice(0, 10) === todayStr);
    } else if (reportTimeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      validOrders = validOrders.filter(o => new Date(o.createdAt || o.date) >= weekAgo);
    } else if (reportTimeFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      validOrders = validOrders.filter(o => new Date(o.createdAt || o.date) >= monthAgo);
    }

    const productMap = {};
    let totalUnitsSold = 0;
    let totalRevenue = 0;

    validOrders.forEach(order => {
      totalRevenue += Number(order.totalAmount || 0);
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach(item => {
        const id = item.code || item.nameEn || 'Item';
        if (!productMap[id]) {
          const found = products.find(p => p.code === id || p.nameEn === id);
          productMap[id] = {
            code: item.code || found?.code || id,
            nameEn: item.nameEn || found?.nameEn || 'Seafood Item',
            nameTa: item.nameTa || found?.nameTa || '',
            category: item.category || found?.category || 'General',
            price: Number(item.price || found?.packPrice || found?.basePrice250g || 0),
            unitsSold: 0,
            ordersCount: 0,
            revenue: 0
          };
        }
        const qty = Number(item.qty || 1);
        const price = Number(item.price || productMap[id].price || 0);
        const lineTotal = item.total ? Number(item.total) : (price * qty);

        productMap[id].unitsSold += qty;
        productMap[id].ordersCount += 1;
        productMap[id].revenue += lineTotal;
        totalUnitsSold += qty;
      });
    });

    // Sort by highest order count first, then units sold, then revenue
    const orderedProducts = Object.values(productMap)
      .filter(p => p.unitsSold > 0)
      .sort((a, b) => b.ordersCount - a.ordersCount || b.unitsSold - a.unitsSold || b.revenue - a.revenue);

    const topProduct = orderedProducts.length > 0 ? orderedProducts[0] : null;

    return {
      topProduct,
      orderedProducts,
      totalUnitsSold,
      totalOrderCount: validOrders.length,
      totalRevenue,
      hasOrders: validOrders.length > 0
    };
  }, [orders, products, reportTimeFilter]);

  // Product Sales Report: Grouped by Product with each Pack Size, Price, and Sold Qty aligned
  const productSalesReport = useMemo(() => {
    const now = new Date();
    let validOrders = orders.filter(o => (o.status || '').toLowerCase() !== 'cancelled');

    if (reportTimeFilter === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      validOrders = validOrders.filter(o => (o.createdAt || '').slice(0, 10) === todayStr);
    } else if (reportTimeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      validOrders = validOrders.filter(o => new Date(o.createdAt || o.date) >= weekAgo);
    } else if (reportTimeFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      validOrders = validOrders.filter(o => new Date(o.createdAt || o.date) >= monthAgo);
    }

    const productMap = {};

    // 1. Initialize from catalogue products
    products.forEach(p => {
      const code = p.code || p.id || p.nameEn;
      const availablePacks = Array.isArray(p.availablePacks) && p.availablePacks.length > 0
        ? p.availablePacks
        : ['250g'];

      const packPrices = p.packPrices || {};
      const basePrice = Number(p.basePrice250g || p.packPrice || 0);

      const packsMap = {};
      availablePacks.forEach(size => {
        let price = Number(packPrices[size]);
        if (!price || price <= 0) {
          if (size === '250g') price = basePrice;
          else if (size === '500g') price = basePrice * 2;
          else if (size === '1 Kg' || size === '1kg') price = basePrice * 4;
          else price = basePrice;
        }

        packsMap[size] = {
          size,
          price,
          soldQty: 0,
          amount: 0
        };
      });

      productMap[code] = {
        code,
        nameEn: p.nameEn || 'Seafood Item',
        nameTa: p.nameTa || '',
        category: p.category || 'Dry Fish',
        stock: p.stock ?? '—',
        packsMap,
        totalSoldQty: 0,
        totalRevenue: 0
      };
    });

    // 2. Accumulate sales from orders for the selected time window
    validOrders.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach(item => {
        const size = item.weight || item.packSize || item.size || '250g';
        const matchedProduct = products.find(p =>
          (item.id && p.id === item.id) ||
          (item.code && p.code === item.code) ||
          (item.nameEn && p.nameEn === item.nameEn)
        );
        const code = item.code || matchedProduct?.code || matchedProduct?.id || item.nameEn || 'Item';

        if (!productMap[code]) {
          productMap[code] = {
            code,
            nameEn: item.nameEn || matchedProduct?.nameEn || 'Seafood Item',
            nameTa: item.nameTa || matchedProduct?.nameTa || '',
            category: item.category || matchedProduct?.category || 'Dry Fish',
            stock: matchedProduct?.stock ?? '—',
            packsMap: {},
            totalSoldQty: 0,
            totalRevenue: 0
          };
        }

        const price = Number(item.price || 0);
        if (!productMap[code].packsMap[size]) {
          productMap[code].packsMap[size] = {
            size,
            price,
            soldQty: 0,
            amount: 0
          };
        }

        const qty = Number(item.qty || 1);
        const lineTotal = item.total ? Number(item.total) : (price * qty);

        productMap[code].packsMap[size].soldQty += qty;
        productMap[code].packsMap[size].amount += lineTotal;
        if (price > 0 && !productMap[code].packsMap[size].price) {
          productMap[code].packsMap[size].price = price;
        }

        productMap[code].totalSoldQty += qty;
        productMap[code].totalRevenue += lineTotal;
      });
    });

    // 3. Format packs array in natural size order (250g, 500g, 1 Kg)
    const sizeOrder = ['250g', '500g', '1 Kg', '1kg'];
    const result = Object.values(productMap).map(prod => {
      const packs = Object.values(prod.packsMap).sort((a, b) => {
        const idxA = sizeOrder.indexOf(a.size);
        const idxB = sizeOrder.indexOf(b.size);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.size.localeCompare(b.size);
      });
      return {
        ...prod,
        packs: packs.length > 0 ? packs : [{ size: '250g', price: 0, soldQty: 0, amount: 0 }]
      };
    });

    // Sort products with sales first, then alphabetically
    return result.sort((a, b) => b.totalSoldQty - a.totalSoldQty || b.totalRevenue - a.totalRevenue || a.nameEn.localeCompare(b.nameEn));
  }, [orders, products, reportTimeFilter]);

  // Notifications Helpers
  const unreadNotifCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markNotificationRead = (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const showNotice = useCallback(message => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }, []);

  const handleIncomingNewOrder = useCallback((newOrder) => {
    if (!newOrder || !newOrder.orderId) return;

    playChimeSound();

    setOrders(prev => {
      if (prev.some(o => o.orderId === newOrder.orderId)) return prev;
      return [newOrder, ...prev];
    });

    const notifItem = {
      id: `notif-${newOrder.orderId}-${Date.now()}`,
      orderId: newOrder.orderId,
      customerName: newOrder.customer?.name || 'Customer',
      phone: newOrder.customer?.phone || '',
      amount: newOrder.totalAmount,
      itemsCount: Array.isArray(newOrder.items) ? newOrder.items.length : 1,
      createdAt: newOrder.createdAt || new Date().toISOString(),
      read: false,
      type: 'NEW_ORDER'
    };

    setNotifications(prev => [notifItem, ...prev.filter(n => n.orderId !== newOrder.orderId)].slice(0, 30));

    setLiveNewOrderToast({
      orderId: newOrder.orderId,
      customerName: newOrder.customer?.name || 'Customer',
      phone: newOrder.customer?.phone || '',
      amount: newOrder.totalAmount,
      itemsCount: Array.isArray(newOrder.items) ? newOrder.items.length : 1
    });

    setOverview(prev => prev ? {
      ...prev,
      orders: (prev.orders || 0) + 1,
      pendingOrders: (prev.pendingOrders || 0) + 1,
      revenue: (prev.revenue || 0) + Number(newOrder.totalAmount || 0)
    } : null);
  }, []);

  // Auto-dismiss floating toast after 8 seconds
  useEffect(() => {
    if (!liveNewOrderToast) return;
    const t = setTimeout(() => {
      setLiveNewOrderToast(null);
    }, 8000);
    return () => clearTimeout(t);
  }, [liveNewOrderToast]);

  // Real-time listener for incoming orders and wholesale requests
  useEffect(() => {
    let bcOrders;
    let bcWholesale;

    const handleIncomingWholesale = (item) => {
      if (!item) return;
      setWholesaleRequests(prev => {
        if (prev.some(r => r.id === item.id)) return prev;
        return [item, ...prev];
      });
      playChimeSound();
      const notifItem = {
        id: `notif-wholesale-${item.id}-${Date.now()}`,
        orderId: item.id,
        customerName: item.businessName || 'Wholesale Buyer',
        phone: item.phone || '',
        amount: 0,
        itemsCount: item.quantity || 'Bulk',
        createdAt: item.createdAt || new Date().toISOString(),
        read: false,
        type: 'WHOLESALE',
        data: item
      };
      setNotifications(prev => [notifItem, ...prev.filter(n => n.id !== notifItem.id)].slice(0, 30));
      showNotice(`New wholesale quote request from ${item.businessName || 'customer'}!`);
    };

    try {
      if ('BroadcastChannel' in window) {
        bcOrders = new BroadcastChannel('atf_orders_channel');
        bcOrders.onmessage = (event) => {
          if (event.data?.type === 'NEW_ORDER' && event.data?.order) {
            handleIncomingNewOrder(event.data.order);
          }
        };

        bcWholesale = new BroadcastChannel('atf_wholesale_channel');
        bcWholesale.onmessage = (event) => {
          if (event.data?.type === 'NEW_WHOLESALE' && event.data?.data) {
            handleIncomingWholesale(event.data.data);
          }
        };
      }
    } catch (_) {}

    const handleCustomOrder = (event) => {
      if (event.detail) handleIncomingNewOrder(event.detail);
    };
    window.addEventListener('atf_new_order', handleCustomOrder);

    const handleCustomWholesale = (event) => {
      if (event.detail) {
        handleIncomingWholesale(event.detail);
      }
    };
    window.addEventListener('atf_new_wholesale', handleCustomWholesale);

    const handleStorageChange = (e) => {
      if (e.key === 'atf_last_order_ts' || e.key === 'atf_orders_v1') {
        fetchAllOrders().then(latest => {
          setOrders(prev => {
            const prevIds = new Set(prev.map(o => o.orderId));
            const brandNew = latest.filter(o => !prevIds.has(o.orderId));
            if (brandNew.length > 0) brandNew.forEach(handleIncomingNewOrder);
            return latest;
          });
        }).catch(() => {});
      }
      if (e.key === 'atf_last_wholesale_ts' || e.key === 'atf_wholesale_requests') {
        fetchAllWholesaleRequests().then(latest => setWholesaleRequests(latest)).catch(() => {});
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const pollTimer = setInterval(() => {
      fetchAllOrders().then(latest => {
        setOrders(prev => {
          const prevIds = new Set(prev.map(o => o.orderId));
          const brandNew = latest.filter(o => !prevIds.has(o.orderId));
          if (brandNew.length > 0) brandNew.forEach(handleIncomingNewOrder);
          return latest;
        });
      }).catch(() => {});

      fetchAllWholesaleRequests().then(latest => {
        setWholesaleRequests(latest);
      }).catch(() => {});
    }, 12000);

    return () => {
      if (bcOrders) bcOrders.close();
      if (bcWholesale) bcWholesale.close();
      window.removeEventListener('atf_new_order', handleCustomOrder);
      window.removeEventListener('atf_new_wholesale', handleCustomWholesale);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollTimer);
    };
  }, [handleIncomingNewOrder, playChimeSound, showNotice]);

  const printPackingSlip = (order) => {
    const slipWindow = window.open('', '_blank', 'width=720,height=850');
    if (!slipWindow) return;
    const items = Array.isArray(order.items) ? order.items : [];
    slipWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order #${order.orderId} - Invoice & Packing Slip</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #002b49; padding-bottom: 14px; margin-bottom: 20px; }
          .logo-title { font-size: 22px; font-weight: 800; color: #002b49; }
          .order-id-badge { font-size: 18px; font-weight: 800; color: #168acb; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px; }
          .box-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
          th { text-align: left; padding: 10px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11.5px; text-transform: uppercase; color: #475569; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .total-row td { font-weight: 800; font-size: 15px; border-top: 2px solid #002b49; color: #047857; }
          .footer { margin-top: 36px; padding-top: 16px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 12px; color: #64748b; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-title">JS DRY FISH SHOP</div>
            <div style="font-size: 12px; color: #64748b;">Tuticorin Authentic Dry Seafood • WhatsApp: 9787453202</div>
          </div>
          <div style="text-align: right;">
            <div class="order-id-badge">#${order.orderId}</div>
            <div style="font-size: 12px; color: #64748b;">${order.date || order.createdAt}</div>
            <div style="display: inline-block; margin-top: 4px; padding: 3px 8px; background: #eff6ff; color: #1d4ed8; font-weight: 700; border-radius: 4px; font-size: 11px;">
              ${order.status || 'Confirmed'}
            </div>
          </div>
        </div>
        <div class="info-grid">
          <div class="box">
            <div class="box-title">Customer & Delivery Address</div>
            <strong>${order.customer?.name || 'Customer'}</strong><br/>
            <b>${order.customer?.phone || ''}</b><br/>
            ${order.customer?.address || ''}<br/>
            ${order.customer?.city || ''} - ${order.customer?.pincode || ''}
          </div>
          <div class="box">
            <div class="box-title">Order Information</div>
            <b>Payment Mode:</b> ${order.customer?.paymentMode || 'Online Payment (UPI)'}<br/>
            <b>Total Items:</b> ${items.reduce((s, i) => s + (i.qty || 1), 0)} packs<br/>
            <b>Delivery Type:</b> Odourless Secured Packaging (24-48 Hrs)
          </div>
        </div>
        <div class="box-title" style="margin-top: 20px;">Ordered Items</div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Product Name</th>
              <th>Weight</th>
              <th>Qty</th>
              <th>Price</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${it.nameEn || it.nameTa}</strong></td>
                <td>${it.weight || '250g'}</td>
                <td>${it.qty || 1}</td>
                <td>₹${it.price || 0}</td>
                <td style="text-align: right;">₹${(it.price || 0) * (it.qty || 1)}</td>
              </tr>
            `).join('')}
            ${order.couponDiscount ? `
              <tr>
                <td colspan="5" style="text-align: right; color: #047857;">Coupon Discount (${order.coupon || 'Discount'}):</td>
                <td style="text-align: right; color: #047857;">-₹${order.couponDiscount}</td>
              </tr>
            ` : ''}
            <tr>
              <td colspan="5" style="text-align: right; color: #64748b;">Delivery Fee:</td>
              <td style="text-align: right; color: #64748b;">${Number(order.deliveryCharge) === 0 ? 'FREE' : `₹${order.deliveryCharge || 40}`}</td>
            </tr>
            <tr class="total-row">
              <td colspan="5" style="text-align: right;">Total Amount Payable:</td>
              <td style="text-align: right;">₹${order.totalAmount || 0}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          Thank you for ordering with JS Dry Fish Shop!<br/>
          Natural Coastal Sun-Dried Fish with Zero Chemical Preservatives.
        </div>
        <div class="no-print" style="text-align: center; margin-top: 24px;">
          <button onclick="window.print()" style="padding: 10px 24px; font-weight: 700; background: #002b49; color: #ffffff; border: none; border-radius: 6px; cursor: pointer;">
            Print Invoice / Packing Slip
          </button>
        </div>
      </body>
      </html>
    `);
    slipWindow.document.close();
  };

  const printSalesReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1050,height=900');
    if (!reportWindow) {
      window.print();
      return;
    }

    const periodLabel = reportTimeFilter === 'all'
      ? 'All Time'
      : reportTimeFilter === 'month'
        ? 'This Month'
        : reportTimeFilter === 'week'
          ? 'This Week'
          : 'Today';

    const exportedDate = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const topProductName = mostOrderedProductAnalytics.topProduct
      ? `${mostOrderedProductAnalytics.topProduct.nameEn.split('(')[0].trim()}`
      : 'No orders yet';

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>JS Dry Fish Shop - Sales & Products Breakdown Report</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: landscape; margin: 10mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 24px;
            color: #0f172a;
            background: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2.5px solid #002b49;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .logo-title {
            font-size: 22px;
            font-weight: 800;
            color: #002b49;
            letter-spacing: -0.3px;
          }
          .sub-title {
            font-size: 12px;
            color: #475569;
            margin-top: 2px;
          }
          .meta-info {
            text-align: right;
            font-size: 12px;
            color: #334155;
            line-height: 1.5;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 14px;
          }
          .kpi-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .kpi-value {
            font-size: 18px;
            font-weight: 800;
            color: #002b49;
          }
          .section-heading {
            margin: 14px 0 10px;
          }
          .eyebrow {
            font-size: 10.5px;
            font-weight: 700;
            color: #0876b1;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .section-sub {
            font-size: 11.5px;
            color: #64748b;
            margin: 2px 0 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11.5px;
            table-layout: fixed;
          }
          thead {
            display: table-header-group;
          }
          tbody {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          th {
            background: #002b49 !important;
            color: #ffffff !important;
            padding: 9px 8px;
            font-size: 10.5px;
            font-weight: 700;
            border: 1px solid #002b49;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            border: 1px solid #cbd5e1;
            padding: 7px 8px;
            color: #0f172a;
            vertical-align: middle;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .col-center { text-align: center; }
          .col-left { text-align: left; }
          .col-right { text-align: right; }
          .pack-pill {
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
          }
          .sold-badge {
            display: inline-block;
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
          }
          .sold-active {
            background: #dcfce7 !important;
            color: #15803d !important;
          }
          .category-tag {
            display: inline-block;
            background: #e2e8f0;
            color: #334155;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9.5px;
            font-weight: 600;
          }
          .total-row td {
            background: #f1f5f9;
            font-weight: 800;
            font-size: 12px;
            border-top: 2px solid #002b49;
            padding: 10px 8px;
          }
          .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
            text-align: center;
            font-size: 11px;
            color: #64748b;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 16px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-weight: 700; background: #002b49; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
            Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div>
            <div class="logo-title">JS DRY FISH SHOP</div>
            <div class="sub-title">Tuticorin Authentic Dry Seafood · Live Store Sales & Product Performance Report</div>
          </div>
          <div class="meta-info">
            <div><strong>Period:</strong> ${periodLabel}</div>
            <div><strong>Exported:</strong> ${exportedDate}</div>
            <div><strong>Total Products:</strong> ${productSalesReport.length} Items Listed</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Orders Placed</div>
            <div class="kpi-value">${mostOrderedProductAnalytics.totalOrderCount} orders</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Revenue</div>
            <div class="kpi-value" style="color: #047857;">${formatCurrency(mostOrderedProductAnalytics.totalRevenue)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Most Ordered Product</div>
            <div class="kpi-value" style="font-size: 14px; line-height: 1.3;">${topProductName}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Packs Dispatched</div>
            <div class="kpi-value">${mostOrderedProductAnalytics.totalUnitsSold} packs</div>
          </div>
        </div>

        <div class="section-heading">
          <div class="eyebrow">PRODUCT SALES & SIZES BREAKDOWN</div>
          <h2 class="section-title">All Products Sold Quantities & Revenue (${productSalesReport.length} Products)</h2>
          <div class="section-sub">Itemized list of products, available pack sizes, unit price, sold quantity, and revenue.</div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="col-center" style="width: 4%;">#</th>
              <th class="col-left" style="width: 26%;">Product Name</th>
              <th class="col-center" style="width: 12%;">Category</th>
              <th class="col-center" style="width: 10%;">Stock</th>
              <th class="col-center" style="width: 11%;">Pack Size</th>
              <th class="col-right" style="width: 11%;">Unit Price</th>
              <th class="col-center" style="width: 11%;">Sold Qty</th>
              <th class="col-right" style="width: 15%;">Total Amount</th>
            </tr>
          </thead>
          ${productSalesReport.map((prod, prodIdx) => {
            const rowCount = prod.packs.length;
            const bgStyle = prodIdx % 2 === 1 ? 'background: #f8fafc;' : 'background: #ffffff;';
            return `
              <tbody>
                ${prod.packs.map((pack, pIdx) => `
                  <tr style="${bgStyle}">
                    ${pIdx === 0 ? `
                      <td rowspan="${rowCount}" class="col-center" style="font-weight: 600; color: #475569;">${prodIdx + 1}</td>
                      <td rowspan="${rowCount}" class="col-left">
                        <strong style="color: #0f172a; font-size: 12px; display: block;">${prod.nameEn}</strong>
                        ${prod.nameTa ? `<span style="font-size: 10px; color: #64748b;">${prod.nameTa}</span>` : ''}
                      </td>
                      <td rowspan="${rowCount}" class="col-center">
                        <span class="category-tag">${prod.category ? prod.category.replace(/-/g, ' ') : 'Dry Fish'}</span>
                      </td>
                      <td rowspan="${rowCount}" class="col-center" style="font-weight: 600; color: #334155;">
                        ${prod.stock !== undefined && prod.stock !== '—' ? `${prod.stock} kg` : '—'}
                      </td>
                    ` : ''}
                    <td class="col-center"><span class="pack-pill">${pack.size}</span></td>
                    <td class="col-right" style="font-weight: 600; color: #334155;">${formatCurrency(pack.price)}</td>
                    <td class="col-center">
                      <span class="sold-badge ${pack.soldQty > 0 ? 'sold-active' : ''}">
                        ${pack.soldQty} ${pack.soldQty === 1 ? 'pack' : 'packs'}
                      </span>
                    </td>
                    <td class="col-right" style="font-weight: 700; color: ${pack.amount > 0 ? '#047857' : '#94a3b8'};">
                      ${formatCurrency(pack.amount)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            `;
          }).join('')}
          <tfoot>
            <tr class="total-row">
              <td colspan="6" class="col-right" style="font-weight: 700;">Total Units Sold & Sales Amount:</td>
              <td class="col-center" style="font-weight: 800;">${mostOrderedProductAnalytics.totalUnitsSold} packs</td>
              <td class="col-right" style="font-weight: 800; color: #047857;">${formatCurrency(mostOrderedProductAnalytics.totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          JS Dry Fish Shop • Tuticorin Authentic Sun-Dried Seafood • Generated via Admin Portal
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 350);
          };
        </script>
      </body>
      </html>
    `);
    reportWindow.document.close();
  };

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  const api = (path, options = {}) => request(path, { ...options, token });

  const loadData = async () => {
    setError('');

    // 1. Primary: Direct Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const liveOrders = await fetchAllOrders();
        setOrders(liveOrders);

        try {
          setCustomers(await fetchAdminCustomers());
        } catch (customerError) {
          setCustomers([]);
          setError(getAdminErrorMessage(customerError));
        }

        let currentProducts = productsData;
        try {
          const liveProducts = await fetchAdminProducts();
          if (liveProducts && liveProducts.length > 0) {
            const savedByCode = new Map(liveProducts.map(product => [product.code, product]));
            const defaultCodes = new Set(productsData.map(product => product.code));
            currentProducts = [
              ...productsData.map(product => savedByCode.get(product.code) || product),
              ...liveProducts.filter(product => !defaultCodes.has(product.code))
            ];
            setProducts(currentProducts);
          }
        } catch (pErr) {
          console.warn('Could not load products from Supabase:', pErr);
          setError(getAdminErrorMessage(pErr));
        }

        let currentCoupons = coupons;
        try {
          const liveCoupons = await fetchAdminCoupons();
          if (liveCoupons && liveCoupons.length > 0) {
            currentCoupons = liveCoupons;
            setCoupons(liveCoupons);
          }
        } catch (couponError) {
          setError(getAdminErrorMessage(couponError));
        }

        let currentSettings = settings;
        try {
          const liveSettings = await fetchAdminSettings();
          if (liveSettings) {
            currentSettings = { ...settings, ...liveSettings };
            setSettings(currentSettings);
          }
        } catch (settingsError) {
          setError(getAdminErrorMessage(settingsError));
        }

        let liveWholesale = [];
        try {
          liveWholesale = await fetchAllWholesaleRequests();
          setWholesaleRequests(liveWholesale);
        } catch (wErr) {
          console.warn('Could not load wholesale requests:', wErr);
          setError(getAdminErrorMessage(wErr));
        }

        // Derive initial notifications directly from live Supabase data (no localStorage)
        const initialNotifs = [];
        liveOrders.slice(0, 10).forEach(o => {
          initialNotifs.push({
            id: `notif-${o.orderId}`,
            orderId: o.orderId,
            customerName: o.customer?.name || 'Customer',
            phone: o.customer?.phone || '',
            amount: o.totalAmount,
            itemsCount: Array.isArray(o.items) ? o.items.length : 1,
            createdAt: o.createdAt || new Date().toISOString(),
            read: (o.status || '').toLowerCase() !== 'pending',
            type: 'NEW_ORDER'
          });
        });
        (liveWholesale || []).slice(0, 8).forEach(w => {
          initialNotifs.push({
            id: `notif-wholesale-${w.id}`,
            orderId: w.id,
            customerName: w.businessName || 'Wholesale Buyer',
            phone: w.phone || '',
            amount: 0,
            itemsCount: w.quantity || 'Bulk',
            createdAt: w.createdAt || new Date().toISOString(),
            read: (w.status || '').toLowerCase() !== 'pending',
            type: 'WHOLESALE',
            data: w
          });
        });
        initialNotifs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setNotifications(initialNotifs.slice(0, 20));

        const pending = liveOrders.filter(o => o.status === 'Pending' || o.status === 'Confirmed').length;
        const revenue = liveOrders
          .filter(o => o.status !== 'Cancelled')
          .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

        setOverview({
          products: currentProducts.length,
          orders: liveOrders.length,
          pendingOrders: pending,
          lowStock: currentProducts.filter(p => p.stock != null && p.stock <= Number(currentSettings.lowStockThreshold || 10)).length,
          revenue: revenue,
          coupons: currentCoupons.length
        });

        setConnectionStatus('Connected');
        return;
      } catch (fbErr) {
        console.error('Supabase load error:', fbErr);
        setError(getAdminErrorMessage(fbErr));
        setConnectionStatus('Error');
        return;
      }
    }

    setError(getAdminSupportMessage());
    setConnectionStatus('Error');
  };

  useEffect(() => {
    loadData();
  }, []);

  const productCategories = useMemo(() => {
    const set = new Set();
    products.forEach(p => { if (p.category) set.add(p.category.toLowerCase()); });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(product => {
      const matchesArchive = showArchived || product.isActive !== false;
      const matchesCategory = productCategoryFilter === 'All' ||
        String(product.category || '').toLowerCase() === productCategoryFilter.toLowerCase();
      const matchesQuery = !query || [product.code, product.nameEn, product.nameTa, product.category]
        .some(value => String(value || '').toLowerCase().includes(query));
      return matchesArchive && matchesCategory && matchesQuery;
    });
  }, [products, search, showArchived, productCategoryFilter]);

  const orderCounts = useMemo(() => {
    const counts = { All: orders.length, Pending: 0, Confirmed: 0, Packed: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
    orders.forEach(o => {
      const s = o.status || 'Pending';
      if (counts[s] !== undefined) counts[s]++;
      else counts.Pending++;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (orderFilter !== 'All') {
      list = list.filter(o => (o.status || 'Pending').toLowerCase() === orderFilter.toLowerCase());
    }
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      list = list.filter(o =>
        (o.orderId && o.orderId.toLowerCase().includes(q)) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.customer?.phone && o.customer.phone.includes(q)) ||
        (o.customer?.city && o.customer.city.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, orderFilter, orderSearch]);

  const wholesaleCounts = useMemo(() => {
    const counts = { All: wholesaleRequests.length, Pending: 0, Contacted: 0, Quoted: 0, Completed: 0, Cancelled: 0 };
    wholesaleRequests.forEach(r => {
      const s = r.status || 'Pending';
      if (counts[s] !== undefined) counts[s]++;
      else counts.Pending++;
    });
    return counts;
  }, [wholesaleRequests]);

  const filteredWholesaleRequests = useMemo(() => {
    let list = [...wholesaleRequests];
    if (wholesaleFilter !== 'All') {
      list = list.filter(r => (r.status || 'Pending').toLowerCase() === wholesaleFilter.toLowerCase());
    }
    if (wholesaleSearch.trim()) {
      const q = wholesaleSearch.trim().toLowerCase();
      list = list.filter(r =>
        String(r.id || '').toLowerCase().includes(q) ||
        String(r.businessName || '').toLowerCase().includes(q) ||
        String(r.phone || '').toLowerCase().includes(q) ||
        String(r.city || '').toLowerCase().includes(q) ||
        String(r.requirements || '').toLowerCase().includes(q) ||
        String(r.quantity || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [wholesaleRequests, wholesaleFilter, wholesaleSearch]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    return customers.filter(customer => !query ||
      String(customer.name || '').toLowerCase().includes(query) ||
      String(customer.phone || '').includes(query)
    );
  }, [customers, customerSearch]);
  const selectedCustomer = customers.find(customer => customer.id === selectedCustomerId) || null;
  const selectedCustomerOrders = selectedCustomer
    ? orders.filter(order => String(order.customer?.phone || '').replace(/\D/g, '').slice(-10) === selectedCustomer.phone)
    : [];
  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const currentProductPage = Math.min(productPage, productPageCount);
  const paginatedProducts = filteredProducts.slice(
    (currentProductPage - 1) * PRODUCTS_PER_PAGE,
    currentProductPage * PRODUCTS_PER_PAGE
  );
  const firstProductOnPage = filteredProducts.length
    ? (currentProductPage - 1) * PRODUCTS_PER_PAGE + 1
    : 0;
  const lastProductOnPage = Math.min(currentProductPage * PRODUCTS_PER_PAGE, filteredProducts.length);

  const saveProduct = async product => {
    try {
      const path = product.id ? `/admin/products/${product.id}` : '/admin/products';
      const method = product.id ? 'PUT' : 'POST';
      await api(path, { method, body: JSON.stringify({ product }) });
    } catch (apiError) {
      if (!isSupabaseConfigured() || !supabase) throw apiError;
      await saveSupabaseProduct(product);
    }
    await loadData();
    showNotice(product.id ? 'Product updated.' : 'Product added.');
  };

  const archiveProduct = async product => {
    try {
      try {
        const isActive = product.isActive !== false;
        await api(`/admin/products/${product.id}${isActive ? '' : '/restore'}`, {
          method: isActive ? 'DELETE' : 'POST'
        });
      } catch (apiError) {
        if (!isSupabaseConfigured() || !supabase) throw apiError;
        await setAdminProductActive(product, product.isActive === false);
      }
      await loadData();
      showNotice(product.isActive !== false ? 'Product archived.' : 'Product restored.');
    } catch (error) {
      setError(getAdminErrorMessage(error));
    }
  };

  const changeOrderStatus = async (orderId, newStatus) => {
    try {
      await updateSupabaseOrderStatus(orderId, newStatus);
      try {
        await api(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        });
      } catch (_) {}

      // Automatically reduce stock qty when order is marked 'Packed'
      let stockNotice = '';
      if (newStatus === 'Packed') {
        const targetOrder = orders.find(o => o.orderId === orderId);
        if (targetOrder && !targetOrder.stockDeducted && Array.isArray(targetOrder.items) && targetOrder.items.length > 0) {
          let updatedList = [...products];
          let updatedAny = false;

          for (const item of targetOrder.items) {
            const itemQty = Math.max(1, Number(item.qty || 1));
            const pIdx = updatedList.findIndex(p =>
              (item.id && p.id === item.id) ||
              (item.code && p.code === item.code) ||
              (item.nameEn && p.nameEn === item.nameEn)
            );

            if (pIdx >= 0) {
              const currentStock = Number(updatedList[pIdx].stock || 0);
              const newStock = Math.max(0, currentStock - itemQty);
              const updatedP = { ...updatedList[pIdx], stock: newStock };
              updatedList[pIdx] = updatedP;
              updatedAny = true;
              try {
                await saveSupabaseProduct(updatedP);
              } catch (stockErr) {
                console.warn('Failed to reduce stock in Supabase for:', updatedP.nameEn, stockErr);
                setError(getAdminErrorMessage(stockErr));
              }
            }
          }

          if (updatedAny) {
            setProducts(updatedList);
            stockNotice = ' Product stock updated.';
          }
        }
      }

      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: newStatus, stockDeducted: newStatus === 'Packed' ? true : o.stockDeducted } : o));
      showNotice(`Order ${orderId} status updated to ${newStatus}.${stockNotice}`);
    } catch (updateError) {
      setError(getAdminErrorMessage(updateError));
    }
  };

  const changePaymentStatus = async (orderId, newPaymentStatus) => {
    try {
      await updateOrderPaymentStatus(orderId, newPaymentStatus);
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, paymentStatus: newPaymentStatus } : o));
      showNotice(`Order #${orderId} payment updated to "${newPaymentStatus}".`);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    }
  };

  const changeWholesaleStatus = async (id, newStatus) => {
    try {
      await updateWholesaleRequestStatus(id, newStatus);
      setWholesaleRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      if (selectedWholesaleDetail?.id === id) {
        setSelectedWholesaleDetail(prev => ({ ...prev, status: newStatus }));
      }
      showNotice(`Wholesale request #${id} marked as ${newStatus}.`);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    }
  };

  const changeWholesalePaymentStatus = async (id, newPaymentStatus) => {
    try {
      await updateWholesalePaymentStatus(id, newPaymentStatus);
      setWholesaleRequests(prev => prev.map(r => r.id === id ? { ...r, paymentStatus: newPaymentStatus } : r));
      if (selectedWholesaleDetail?.id === id) {
        setSelectedWholesaleDetail(prev => ({ ...prev, paymentStatus: newPaymentStatus }));
      }
      showNotice(`Wholesale request #${id} payment marked as ${newPaymentStatus}.`);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    }
  };

  const confirmDeleteWholesale = async () => {
    if (!wholesaleDeleteConfirm) return;
    const targetId = wholesaleDeleteConfirm;
    setWholesaleDeleteConfirm(null);
    try {
      await deleteWholesaleRequest(targetId);
      setWholesaleRequests(prev => prev.filter(r => r.id !== targetId));
      if (selectedWholesaleDetail?.id === targetId) {
        setSelectedWholesaleDetail(null);
      }
      showNotice(`Wholesale request #${targetId} deleted.`);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    }
  };

  const saveCoupon = async event => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const code = String(form.get('code')).trim().toUpperCase();
    const coupon = {
      desc: String(form.get('desc')),
      minOrder: Number(form.get('minOrder')),
      flatDiscount: Number(form.get('flatDiscount')),
      discountPercent: Number(form.get('discountPercent'))
    };
    let saved = false;
    let saveError;
    try {
      await api(`/admin/coupons/${encodeURIComponent(code)}`, {
        method: 'PUT',
        body: JSON.stringify({ coupon })
      });
    } catch (apiError) {
      saveError = apiError;
    }
    if (!saveError) saved = true;

    try {
      await saveAdminCoupon(code, coupon);
      saved = true;
    } catch (sbErr) {
      console.error('Could not save coupon:', sbErr);
      saveError = sbErr;
    }
    if (!saved) {
      setError(getAdminErrorMessage(saveError));
      return;
    }
    setCoupons(prev => [...prev.filter(c => c.code !== code), { code, ...coupon, isActive: true }]);
    await loadData();
    formElement.reset();
    setCouponModal(null);
    showNotice(`Coupon ${code} saved.`);
  };

  const toggleCouponStatus = async (coupon) => {
    const nextActive = coupon.isActive === false;
    try {
      await setAdminCouponActive(coupon.code, nextActive);
      setCoupons(prev => prev.map(c => c.code === coupon.code ? { ...c, isActive: nextActive } : c));
      showNotice(`Coupon ${coupon.code} ${nextActive ? 'activated' : 'disabled'}.`);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    }
  };

  const confirmDeleteCoupon = async () => {
    if (!deleteConfirmCoupon) return;
    const code = deleteConfirmCoupon;
    setDeleteConfirmCoupon(null);
    try {
      await deleteAdminCoupon(code);
      setCoupons(prev => prev.filter(c => c.code !== code));
      showNotice(`Coupon ${code} deleted.`);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    }
  };

  const handleQrImageUpload = (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        // Resize to maximum 500x500 to keep it very lightweight
        const canvas = document.createElement('canvas');
        const maxDim = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSettings(prev => ({ ...prev, upiQrImage: compressedDataUrl }));
        showNotice('UPI QR Code image loaded. Click "Save settings" to apply.');
      };
      img.src = uploadEvent.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrImage = () => {
    setSettings(prev => ({ ...prev, upiQrImage: '' }));
    showNotice('Custom QR image removed. Default dynamic QR will be used.');
  };

  const saveSettings = async event => {
    event.preventDefault();
    setBusy(true);
    try {
      if (isSupabaseConfigured() && supabase) {
        await saveAdminSettings(settings);
      }
      try {
        localStorage.setItem('atf_store_settings', JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('atf_store_settings_updated', { detail: settings }));
      } catch (_) {}
      showNotice('Store settings saved to Supabase.');
    } catch (sbErr) {
      setError(getAdminErrorMessage(sbErr));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async event => {
    event.preventDefault();
    setError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }
      const { error: passwordError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      if (passwordError) throw passwordError;
      showNotice('Admin password changed successfully.');
    } catch (passwordError) {
      setError(getAdminErrorMessage(passwordError));
    } finally {
      setBusy(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
  };

  const logout = async () => {
    if (!supabase) {
      setError(getAdminSupportMessage());
      return;
    }
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(getAdminErrorMessage(signOutError));
        return;
      }
      onLogout();
    } catch (signOutError) {
      setError(getAdminErrorMessage(signOutError));
    }
  };

  const navigation = [
    'Overview',
    'Products & stock',
    'Orders',
    'Wholesale requests',
    'Customers',
    'Reports',
    'Coupons',
    'Store settings'
  ];

  return (
    <div className="admin-shell">
      {/* Mobile Off-Canvas Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-head">
          <a className="admin-brand" href="/" onClick={() => setIsSidebarOpen(false)}>
            <img className="admin-brand-logo" src={logo} alt="JS Dry Fish Shop logo" />
            <span>JS DRY FISH SHOP</span>
          </a>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <AppIcon name="close" />
          </button>
        </div>
        <p className="admin-nav-caption">WORKSPACE</p>
        <nav className="admin-navigation">
          {navigation.map(label => (
            <button
              key={label}
              className={tab === label ? 'active' : ''}
              onClick={() => {
                setTab(label);
                setError('');
                if (label === 'Orders' || tab === 'Orders') {
                  setOrderSearch('');
                }
                if (label === 'Wholesale requests' || tab === 'Wholesale requests') {
                  setWholesaleSearch('');
                  fetchAllWholesaleRequests().then(latest => setWholesaleRequests(latest)).catch(() => {});
                }
                setIsSidebarOpen(false);
              }}
            >
              <span className="admin-nav-icon-wrap">
                <NavIcon name={label} />
              </span>
              <span className="admin-nav-label">{label}</span>
              {label === 'Orders' && (overview?.pendingOrders > 0) && (
                <b className="admin-nav-badge">{overview.pendingOrders}</b>
              )}
              {label === 'Wholesale requests' && (wholesaleCounts.Pending > 0) && (
                <b className="admin-nav-badge">{wholesaleCounts.Pending}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-sidebar-store-btn"
            title="Visit live customer storefront in a new tab"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>Visit Storefront</span>
          </a>
          <div className="admin-sidebar-status">
            <div className="admin-sidebar-status-left">
              <span className="admin-online-indicator"></span>
              <span>Store Online</span>
            </div>
            <small style={{ color: '#94a3b8' }}>JS Dry Fish</small>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        {/* Floating Live New Order Toast Alert */}
        {liveNewOrderToast && (
          <div className="admin-live-order-banner" role="alert">
            <div className="admin-live-banner-icon">
              <span className="bell-shake"><AppIcon name="bell" /></span>
            </div>
            <div className="admin-live-banner-content">
              <div className="admin-live-banner-title">
                <strong>New Customer Order Placed!</strong>
                <span className="live-order-code">#{liveNewOrderToast.orderId}</span>
              </div>
              <p className="admin-live-banner-sub">
                {liveNewOrderToast.customerName} ({liveNewOrderToast.phone}) • <b style={{ color: '#059669' }}>{formatCurrency(liveNewOrderToast.amount)}</b> • {liveNewOrderToast.itemsCount} item(s)
              </p>
            </div>
            <div className="admin-live-banner-actions">
              <button
                type="button"
                className="admin-banner-view-btn"
                onClick={() => {
                  setTab('Orders');
                  setOrderSearch(liveNewOrderToast.orderId);
                  setLiveNewOrderToast(null);
                }}
              >
                View Order →
              </button>
              <button
                type="button"
                className="admin-banner-close-btn"
                onClick={() => setLiveNewOrderToast(null)}
                title="Dismiss"
              >
                <AppIcon name="close" />
              </button>
            </div>
          </div>
        )}

        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-hamburger-btn"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              aria-label="Toggle navigation menu"
              title="Menu"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <div className="admin-topbar-title-wrap">
              <span className="admin-eyebrow">SHOP MANAGEMENT</span>
              <h1>{tab}</h1>
            </div>
          </div>
          <div className="admin-top-actions">
            {/* Notification Bell with Badge & Interactive Dropdown */}
            <div className="admin-notif-wrapper" ref={notifRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className={`admin-notif-btn ${unreadNotifCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setIsNotifOpen(prev => !prev)}
                title="Orders & Store Notifications"
              >
                <span className="admin-notif-bell-icon"><AppIcon name="bell" /></span>
                {unreadNotifCount > 0 && (
                  <span className="admin-notif-badge">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>
                )}
              </button>

              {isNotifOpen && (
                <>
                  <div className="admin-notif-backdrop" onClick={() => setIsNotifOpen(false)} />
                  <div className="admin-notif-dropdown">
                    <div className="admin-notif-dropdown-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>Notifications</strong>
                        <span className="admin-notif-count-pill">{notifications.length}</span>
                      </div>
                      <div className="admin-notif-header-actions">
                        {unreadNotifCount > 0 && (
                          <button
                            type="button"
                            className="notif-action-link"
                            onClick={markAllNotificationsRead}
                          >
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            className="notif-action-link danger"
                            onClick={clearAllNotifications}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="admin-notif-dropdown-list">
                      {notifications.length === 0 ? (
                        <div className="admin-notif-empty">
                          <AppIcon name="checkCircle" size={28} />
                          <p style={{ margin: '6px 0 2px', fontWeight: 700, color: '#1e293b' }}>All caught up!</p>
                          <small style={{ color: '#64748b' }}>New customer checkouts will pop up here in real time.</small>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`admin-notif-item ${n.read ? 'read' : 'unread'}`}
                            onClick={() => {
                              markNotificationRead(n.id);
                              if (n.type === 'WHOLESALE') {
                                setTab('Wholesale requests');
                                setWholesaleSearch(n.orderId || '');
                                fetchAllWholesaleRequests().then(latest => setWholesaleRequests(latest)).catch(() => {});
                              } else {
                                setTab('Orders');
                                setOrderSearch(n.orderId);
                              }
                              setIsNotifOpen(false);
                            }}
                          >
                            <div className="notif-item-icon">
                              <AppIcon name={n.type === 'WHOLESALE' ? 'building' : 'package'} />
                            </div>
                            <div className="notif-item-content">
                              <div className="notif-item-title">
                                <strong>{n.type === 'WHOLESALE' ? `Wholesale #${n.orderId}` : `Order #${n.orderId}`}</strong>
                                {!n.read && <span className="unread-dot" title="Unread"></span>}
                              </div>
                              <div className="notif-item-details">
                                {n.type === 'WHOLESALE'
                                  ? `${n.customerName} • ${n.itemsCount} (${n.phone || ''})`
                                  : `${n.customerName} • ${formatCurrency(n.amount)} (${n.itemsCount} items)`}
                              </div>
                              <small className="notif-item-time">{formatRelativeTime(n.createdAt)}</small>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <span className="admin-online-dot" style={{ color: connectionStatus.includes('Supabase') || connectionStatus.includes('API') ? '#16a34a' : '#ca8a04' }}>
              <span className="online-pulse-circle"></span>
              {connectionStatus}
            </span>
            <button className="admin-secondary-button" onClick={logout} title="Sign out of admin session">Sign out</button>
          </div>
        </header>

        {notice && <div className="admin-notice">{notice}</div>}
        {error && <div className="admin-alert admin-page-alert">{error}<button onClick={() => setError('')}>×</button></div>}

        {tab === 'Overview' && (
          <section className="admin-content admin-overview-redesign">
            <div className="admin-welcome-panel">
              <div>
                <span className="admin-eyebrow">STORE PERFORMANCE</span>
                <h2>JS Dry Fish Shop Management</h2>
                <p>Real-time order tracking, live inventory monitor, and sales performance dashboard.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span className="admin-welcome-live-tag">
                  <span className="live-pulse-dot"></span> LIVE REALTIME
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="admin-stats-grid">
              <StatCard label="Active products" value={overview?.products ?? products.filter(p => p.isActive !== false).length} iconType="products" />
              <StatCard label="Total orders" value={overview?.orders ?? orders.length} iconType="orders" />
              <StatCard label="Total customers" value={customers.length} iconType="customers" />
              <StatCard label="To action" value={overview?.pendingOrders ?? orderCounts.Pending} iconType="pending" accent />
              <StatCard label="Low stock" value={overview?.lowStock ?? 0} iconType="warning" accent />
              <StatCard label="Sales placed" value={formatCurrency(overview?.revenue)} iconType="revenue" />
            </div>

            <div className="admin-panel admin-quick-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-eyebrow">QUICK ACTIONS</span>
                  <h2>Manage your store</h2>
                </div>
              </div>
              <div className="admin-quick-actions">
                <button onClick={() => { setTab('Products & stock'); setEditor({ ...EMPTY_PRODUCT }); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add a product
                </button>
                <button onClick={() => { setTab('Orders'); setOrderSearch(''); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  Review orders ({orders.length})
                </button>
                <button onClick={() => { setTab('Wholesale requests'); setWholesaleSearch(''); fetchAllWholesaleRequests().then(latest => setWholesaleRequests(latest)).catch(() => {}); }} style={{ background: '#f5f3ff', color: '#5b21b6', borderColor: '#ddd6fe' }}>
                  <NavIcon name="Wholesale requests" />
                  Wholesale quotes ({wholesaleRequests.length})
                </button>
                <button onClick={() => setTab('Reports')} style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  View sales report
                </button>
                <button onClick={() => setTab('Coupons')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
                  Create a coupon
                </button>
              </div>
            </div>

            {/* Recent Orders Snapshot right on Overview */}
            <div className="admin-panel admin-recent-orders-panel" style={{ marginTop: '20px' }}>
              <div className="admin-recent-orders-header">
                <div>
                  <span className="admin-eyebrow">RECENT ORDERS</span>
                  <h3>Recent Orders ({orders.slice(0, 5).length})</h3>
                </div>
                <button
                  type="button"
                  className="admin-view-all-orders-btn"
                  onClick={() => { setTab('Orders'); setOrderSearch(''); }}
                >
                  View All Orders ({orders.length}) →
                </button>
              </div>
              {orders.length === 0 ? (
                <div className="admin-recent-orders-empty">
                  <div className="empty-icon"><AppIcon name="package" size={32} /></div>
                  <h4>No recent orders yet</h4>
                  <p>Customer orders placed online will appear here in real time.</p>
                </div>
              ) : (
                <div className="admin-table-scroll">
                  <table className="admin-recent-orders-table">
                    <thead>
                      <tr>
                        <th style={{ width: '16%' }}>Order ID</th>
                        <th style={{ width: '22%' }}>Customer</th>
                        <th style={{ width: '16%' }}>Phone</th>
                        <th style={{ width: '12%' }}>Items</th>
                        <th style={{ width: '12%' }}>Total</th>
                        <th style={{ width: '12%' }}>Status</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map(o => (
                        <tr key={o.orderId}>
                          <td>
                            <span className="admin-order-id-chip">#{o.orderId}</span>
                          </td>
                          <td>
                            <div className="admin-order-customer-cell">
                              <span className="admin-order-customer-name">{o.customer?.name || 'Customer'}</span>
                              {o.customer?.city && <span className="admin-order-customer-sub">{o.customer.city}</span>}
                            </div>
                          </td>
                          <td>
                            <span className="admin-order-phone">{o.customer?.phone || '—'}</span>
                          </td>
                          <td>
                            <span className="admin-order-items-badge">
                              {Array.isArray(o.items) ? o.items.reduce((sum, item) => sum + (item.qty || 1), 0) : 1} {Array.isArray(o.items) && o.items.reduce((sum, item) => sum + (item.qty || 1), 0) === 1 ? 'pack' : 'packs'}
                            </span>
                          </td>
                          <td>
                            <span className="admin-order-amount">{formatCurrency(o.totalAmount)}</span>
                          </td>
                          <td>
                            <span className={`admin-status-pill ${(o.status || 'Pending').toLowerCase()}`}>
                              {o.status || 'Pending'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="admin-order-manage-btn"
                              onClick={() => {
                                setTab('Orders');
                                setOrderSearch(o.orderId);
                              }}
                              title="Manage Order"
                            >
                              Manage →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'Customers' && (
          <section className="admin-content admin-customers-page">
            <div className="admin-toolbar">
              <div>
                <span className="admin-eyebrow">CUSTOMER ACCOUNTS</span>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Customer profiles and account details from the storefront.
                </p>
              </div>
              <input
                className="admin-customer-search"
                type="search"
                value={customerSearch}
                onChange={event => setCustomerSearch(event.target.value)}
                placeholder="Search name or mobile number"
                aria-label="Search customers by name or mobile number"
              />
            </div>

            {customers.length === 0 ? (
              <EmptyPanel
                title="No customer accounts yet"
                text="Customer registrations will appear here. Confirm that the latest Supabase schema has been applied and phone authentication is enabled."
              />
            ) : (
              <div className="admin-panel">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Mobile</th>
                        <th>Location</th>
                        <th>Orders</th>
                        <th>Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map(customer => {
                        const customerOrders = orders.filter(order =>
                          String(order.customer?.phone || '').replace(/\D/g, '').slice(-10) === customer.phone
                        );
                        return (
                          <tr key={customer.id}>
                            <td><strong>{customer.name || 'Customer'}</strong></td>
                            <td>{customer.phone}</td>
                            <td>{[customer.city, customer.pincode].filter(Boolean).join(' · ') || '—'}</td>
                            <td>{customerOrders.length}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-customer-view-btn"
                                onClick={() => setSelectedCustomerId(customer.id)}
                              >
                                View profile
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredCustomers.length && (
                        <tr><td className="admin-empty" colSpan="5">No customers match this search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedCustomer && (
              <section className="admin-customer-profile-panel" aria-labelledby="admin-customer-profile-title">
                <div className="admin-customer-profile-heading">
                  <div>
                    <span className="admin-eyebrow">CUSTOMER PROFILE</span>
                    <h3 id="admin-customer-profile-title">{selectedCustomer.name || 'Customer'}</h3>
                  </div>
                  <button type="button" className="admin-secondary-button" onClick={() => setSelectedCustomerId(null)}>
                    Close
                  </button>
                </div>
                <div className="admin-customer-profile-details">
                  <div><span>Mobile</span><strong>{selectedCustomer.phone}</strong></div>
                  <div><span>Joined</span><strong>{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleString('en-IN') : '—'}</strong></div>
                  <div><span>City</span><strong>{selectedCustomer.city || '—'}</strong></div>
                  <div><span>Pincode</span><strong>{selectedCustomer.pincode || '—'}</strong></div>
                  <div className="admin-customer-profile-address"><span>Address</span><strong>{selectedCustomer.address || 'No address saved'}</strong></div>
                </div>
                <div className="admin-customer-profile-orders">
                  <h4>Orders ({selectedCustomerOrders.length})</h4>
                  {selectedCustomerOrders.length ? selectedCustomerOrders.slice(0, 5).map(order => (
                    <div className="admin-customer-order-row" key={order.orderId}>
                      <strong>#{order.orderId}</strong>
                      <span>{order.status || 'Pending'}</span>
                      <b>{formatCurrency(order.totalAmount)}</b>
                    </div>
                  )) : <p>No orders found for this customer yet.</p>}
                </div>
              </section>
            )}
          </section>
        )}

        {tab === 'Products & stock' && (
          <section className="admin-content">
            <div className="admin-toolbar">
              <div>
                <span className="admin-eyebrow">CATALOG & INVENTORY</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="admin-secondary-button" aria-pressed={showArchived} onClick={() => { setShowArchived(value => !value); setProductPage(1); }}>
                  {showArchived ? 'Hide archived' : `Show archived (${products.filter(product => product.isActive === false).length})`}
                </button>
                <button className="admin-primary-button" onClick={() => setEditor({ ...EMPTY_PRODUCT })}>＋ Add product</button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="admin-category-filter-bar">
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Filter Category:
              </span>
              <div className="admin-category-pills-list">
                {productCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`admin-category-pill-btn ${productCategoryFilter.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                    onClick={() => {
                      setProductCategoryFilter(cat);
                      setProductPage(1);
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-table-tools">
                <input
                  value={search}
                  onChange={event => { setSearch(event.target.value); setProductPage(1); }}
                  placeholder="Search by product name, தமிழ் name, code..."
                />
                <span>{filteredProducts.filter(product => product.isActive !== false).length} active products</span>
              </div>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Code / Category</th>
                      <th>Price</th>
                      <th>Stock Status</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map(product => {
                      const stockVal = product.stock;
                      const isLowStock = stockVal != null && stockVal <= Number(settings.lowStockThreshold || 10);
                      const isOutOfStock = stockVal != null && stockVal === 0;

                      return (
                        <tr key={product.id || product.code}>
                          <td>
                            <div className="admin-product-cell">
                              <div>
                                <strong>{product.nameEn}</strong>
                                <small style={{ color: '#64748b' }}>{product.nameTa}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong>{product.code}</strong>
                            <small className="admin-cell-subtitle">{product.category}</small>
                          </td>
                          <td>
                            <strong>{formatCurrency(product.packPrice ?? product.basePrice250g)}</strong>
                            <small className="admin-cell-subtitle">{product.packSize || 'per 250g'}</small>
                          </td>
                          <td>
                            <span className={`admin-stock-badge ${isOutOfStock ? 'critical' : isLowStock ? 'low' : 'good'}`}>
                              {isOutOfStock ? 'Out of Stock' : isLowStock ? `Low (${stockVal} left)` : stockVal == null ? 'Untracked' : `In Stock (${stockVal})`}
                            </span>
                          </td>
                          <td>
                            <span className={`admin-status-pill ${product.isActive !== false ? 'active' : 'inactive'}`}>
                              {product.isActive !== false ? 'Active' : 'Archived'}
                            </span>
                          </td>
                          <td>
                            <div className="admin-row-actions">
                              <button onClick={() => setEditor(product)}>Edit</button>
                              <button className="danger" onClick={() => archiveProduct(product)}>
                                {product.isActive !== false ? 'Archive' : 'Restore'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredProducts.length && <tr><td className="admin-empty" colSpan="6">No matching products found.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="admin-pagination">
                <span>Showing {firstProductOnPage}–{lastProductOnPage} of {filteredProducts.length} products</span>
                <div className="admin-pagination-actions">
                  <button type="button" onClick={() => setProductPage(currentProductPage - 1)} disabled={currentProductPage === 1}>Previous</button>
                  <span>Page {currentProductPage} of {productPageCount}</span>
                  <button type="button" onClick={() => setProductPage(currentProductPage + 1)} disabled={currentProductPage === productPageCount}>Next</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'Orders' && (
          <section className="admin-content admin-orders-page">
            <div className="admin-toolbar">
              <div>
                <span className="admin-eyebrow">FULFILMENT & ORDERS</span>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Track customer checkouts, print packing slips, and update order statuses in real time.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="admin-info-chip">{orderCounts.Pending} Waiting for Action</span>
              </div>
            </div>

            {/* Orders Search (Left) & Status Filter Dropdown (Right) in Same Line */}
            <div className="admin-orders-toolbar">
              {/* Left side: Search input */}
              <div className="admin-orders-search-wrap">
                <span className="admin-orders-search-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  placeholder="Search customer name, phone, or order ID (#JS-2026-001)"
                />
                {orderSearch && (
                  <button
                    type="button"
                    className="admin-orders-clear-btn"
                    onClick={() => setOrderSearch('')}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Right side: Filter dropdown menu */}
              <div className="admin-orders-filter-wrap">
                <select
                  className="admin-orders-filter-select"
                  value={orderFilter}
                  onChange={e => setOrderFilter(e.target.value)}
                  aria-label="Filter orders by status"
                >
                  <option value="All">All Orders ({orderCounts.All})</option>
                  <option value="Pending">Pending ({orderCounts.Pending})</option>
                  <option value="Confirmed">Confirmed ({orderCounts.Confirmed})</option>
                  <option value="Packed">Packed ({orderCounts.Packed})</option>
                  <option value="Shipped">Shipped ({orderCounts.Shipped})</option>
                  <option value="Delivered">Delivered ({orderCounts.Delivered})</option>
                  <option value="Cancelled">Cancelled ({orderCounts.Cancelled})</option>
                </select>
              </div>
            </div>

            {(orderSearch || orderFilter !== 'All') && (
              <div style={{ margin: '-10px 0 16px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Showing {filteredOrders.length} of {orders.length} orders {orderFilter !== 'All' ? `(${orderFilter})` : ''}</span>
                <button
                  type="button"
                  onClick={() => { setOrderSearch(''); setOrderFilter('All'); }}
                  style={{ background: 'transparent', border: 0, color: '#0876b1', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Reset filters
                </button>
              </div>
            )}

            {!filteredOrders.length ? (
              <EmptyPanel
                title={orderSearch ? "No matching orders" : "No orders found"}
                text={orderSearch ? `No orders found matching "${orderSearch}". Try searching by phone or order ID.` : "New customer checkouts will appear here with delivery address and item breakdown."}
              />
            ) : (
              <div className="admin-order-grid">
                {filteredOrders.map(order => {
                  const customer = order.customer || {};
                  const items = Array.isArray(order.items) ? order.items : [];
                  const totalPacks = items.reduce((s, i) => s + (i.qty || 1), 0);
                  const statusClass = (order.status || 'pending').toLowerCase();

                  return (
                    <article className="admin-order-compact-card" key={order.orderId}>
                      {/* Top: Order ID + Status pill */}
                      <div className="aoc-top">
                        <span className="aoc-order-id">#{order.orderId}</span>
                        <span className={`admin-status-pill ${statusClass}`}>
                          {order.status || 'Pending'}
                        </span>
                      </div>

                      {/* Customer Name */}
                      <div className="aoc-customer">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        <span>{customer.name || 'Customer'}</span>
                      </div>

                      {/* Products */}
                      <div className="aoc-products">
                        {items.slice(0, 2).map((item, i) => (
                          <div key={i} className="aoc-product-row">
                            <span className="aoc-product-name">{item.nameEn || item.nameTa}</span>
                            <span className="aoc-product-qty">×{item.qty || 1}</span>
                          </div>
                        ))}
                        {items.length > 2 && (
                          <div className="aoc-more-items">+{items.length - 2} more item{items.length - 2 > 1 ? 's' : ''}</div>
                        )}
                      </div>

                      {/* Total Amount & Payment Status Pill */}
                      <div className="aoc-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span className="aoc-total-amount">{formatCurrency(order.totalAmount)}</span>
                          <span className="aoc-packs">{totalPacks} pack{totalPacks !== 1 ? 's' : ''} · {customer.paymentMode || 'Online (UPI)'}</span>
                        </div>
                        <div>
                          {order.paymentStatus === 'Paid' ? (
                            <span className="admin-status-pill delivered" style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <AppIcon name="checkCircle" size={12} /> Paid
                            </span>
                          ) : (
                            <span className="admin-status-pill confirmed" style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#e0f2fe', color: '#0369a1' }}>
                              <AppIcon name="bolt" size={12} /> Payment Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Update Status & Payment Select */}
                      <div className="aoc-status-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="aoc-status-label" htmlFor={`order-status-${order.orderId}`}>
                            Order Status
                          </label>
                          <select
                            id={`order-status-${order.orderId}`}
                            className="aoc-status-select"
                            value={order.status || 'Pending'}
                            onChange={e => changeOrderStatus(order.orderId, e.target.value)}
                          >
                            {['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="aoc-status-label" htmlFor={`order-payment-${order.orderId}`}>
                            Payment Status
                          </label>
                          <select
                            id={`order-payment-${order.orderId}`}
                            className="aoc-status-select"
                            style={{
                              fontWeight: 700,
                              color: order.paymentStatus === 'Paid' ? '#047857' : '#0284c7',
                              borderColor: order.paymentStatus === 'Paid' ? '#86efac' : '#cbd5e1'
                            }}
                            value={order.paymentStatus === 'Paid' ? 'Paid' : 'Pending Verification'}
                            onChange={e => changePaymentStatus(order.orderId, e.target.value)}
                          >
                            <option value="Pending Verification">Payment Pending</option>
                            <option value="Paid">✓ Paid</option>
                          </select>
                        </div>
                      </div>

                      {/* View Full Details */}
                      <button
                        type="button"
                        className="aoc-view-btn"
                        onClick={() => setExpandedOrderId(order.orderId)}
                      >
                        View Full Details
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Full Details Drawer */}
            {expandedOrderId && (() => {
              const order = filteredOrders.find(o => o.orderId === expandedOrderId);
              if (!order) return null;
              const customer = order.customer || {};
              const items = Array.isArray(order.items) ? order.items : [];
              const phone = customer.phone || '';
              const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);

              return (
                <div className="aoc-drawer-overlay" onClick={() => setExpandedOrderId(null)}>
                  <div className="aoc-drawer" onClick={e => e.stopPropagation()}>
                    <div className="aoc-drawer-head">
                      <div>
                        <span className="admin-eyebrow">ORDER DETAILS</span>
                        <h3>#{order.orderId}</h3>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {order.date || order.createdAt} · <b>{customer.paymentMode || 'Online (UPI)'}</b>
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`admin-status-pill ${(order.status || 'pending').toLowerCase()}`}>
                          {order.status || 'Pending'}
                        </span>
                        <button className="close-drawer aoc-drawer-close" onClick={() => setExpandedOrderId(null)} aria-label="Close">×</button>
                      </div>
                    </div>

                    <div className="aoc-drawer-body">
                      {/* Customer & Delivery */}
                      <div className="aoc-drawer-section">
                        <div className="aoc-drawer-section-title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                          Customer & Delivery
                        </div>
                        <div className="aoc-drawer-info-grid">
                          <div><span className="aoc-info-label">Name</span><span className="aoc-info-val">{customer.name || '—'}</span></div>
                          <div><span className="aoc-info-label">Phone</span><span className="aoc-info-val">{phone || '—'}</span></div>
                          <div style={{ gridColumn: '1 / -1' }}><span className="aoc-info-label">Address</span><span className="aoc-info-val">{customer.address}, {customer.city} - {customer.pincode}</span></div>
                        </div>
                        {cleanPhone && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                            <a href={`tel:${cleanPhone}`} className="admin-secondary-button" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                              <AppIcon name="phone" /> Call
                            </a>
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`வணக்கம் ${customer.name || 'Customer'}, உங்கள் JS Dry Fish Shop ஆர்டர் #${order.orderId} (${order.status || 'Pending'}) உறுதி செய்யப்பட்டது! மொத்த தொகை: ₹${order.totalAmount}.`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="admin-secondary-button"
                              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#16a34a', borderColor: '#bbf7d0' }}
                            >
                              <AppIcon name="whatsapp" /> WhatsApp
                            </a>
                            <button
                              type="button" className="admin-secondary-button"
                              onClick={() => { navigator.clipboard.writeText(order.orderId); showNotice(`Order ID #${order.orderId} copied!`); }}
                              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <AppIcon name="copy" /> Copy Order ID
                            </button>
                            <button type="button" className="admin-secondary-button" onClick={() => printPackingSlip(order)} style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AppIcon name="printer" /> Print Slip
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Items Ordered */}
                      <div className="aoc-drawer-section">
                        <div className="aoc-drawer-section-title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                          Items Ordered ({items.length})
                        </div>
                        <div className="aoc-drawer-items">
                          {items.map((item, idx) => (
                            <div key={idx} className="aoc-drawer-item-row">
                              <div className="aoc-item-name">
                                <b>{item.nameEn || item.nameTa}</b>
                                <span>{item.weight}</span>
                              </div>
                              <span className="aoc-item-qty">×{item.qty || 1}</span>
                              <span className="aoc-item-price">{formatCurrency((item.price || 0) * (item.qty || 1))}</span>
                            </div>
                          ))}
                          {order.couponDiscount > 0 && (
                            <div className="aoc-drawer-item-row aoc-coupon-row">
                              <span><AppIcon name="tag" /> Coupon ({order.coupon})</span>
                              <span></span>
                              <span style={{ color: '#047857', fontWeight: 700 }}>−₹{order.couponDiscount}</span>
                            </div>
                          )}
                          <div className="aoc-drawer-total-row">
                            <span>Total Amount</span>
                            <span className="aoc-drawer-total-val">{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Verification & Status */}
                      <div className="aoc-drawer-section">
                        <div className="aoc-drawer-section-title">
                          <AppIcon name="cash" size={14} />
                          Payment Status & Verification
                        </div>
                        <div className="aoc-drawer-info-grid">
                          <div>
                            <span className="aoc-info-label">Payment Mode</span>
                            <span className="aoc-info-val"><b>{customer.paymentMode === 'UPI' || !customer.paymentMode ? 'Google Pay / PhonePe / UPI (Online)' : customer.paymentMode}</b></span>
                          </div>
                          <div>
                            <span className="aoc-info-label">Current Payment Status</span>
                            <span className="aoc-info-val">
                              {order.paymentStatus === 'Paid' ? (
                                <span className="admin-status-pill delivered" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <AppIcon name="checkCircle" size={13} /> Paid & Verified
                                </span>
                              ) : (
                                <span className="admin-status-pill confirmed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1' }}>
                                  <AppIcon name="bolt" size={13} /> Payment Pending Verification
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="admin-secondary-button"
                            style={{
                              background: order.paymentStatus === 'Paid' ? '#f8fafc' : '#ecfdf5',
                              color: order.paymentStatus === 'Paid' ? '#475569' : '#047857',
                              borderColor: order.paymentStatus === 'Paid' ? '#cbd5e1' : '#6ee7b7',
                              fontWeight: 700,
                              fontSize: '12.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onClick={() => changePaymentStatus(order.orderId, order.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid')}
                          >
                            <AppIcon name={order.paymentStatus === 'Paid' ? 'close' : 'check'} size={14} />
                            {order.paymentStatus === 'Paid' ? 'Mark as Unpaid' : '✓ Mark as Paid (Payment Received)'}
                          </button>

                          {customer.paymentMode === 'UPI' && cleanPhone && (
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`வணக்கம் ${customer.name || 'Customer'}, உங்கள் JS Dry Fish Shop ஆர்டர் #${order.orderId} (₹${order.totalAmount})-க்கான UPI Payment Screenshot அனுப்பவும். Verify செய்து பார்சல் உடனடியாக அனுப்பப்படும்!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-secondary-button"
                              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', color: '#16a34a', borderColor: '#bbf7d0', fontWeight: 600 }}
                            >
                              <AppIcon name="whatsapp" size={14} /> Ask Screenshot on WhatsApp
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Update Status */}
                      <div className="aoc-drawer-section aoc-drawer-status-section">
                        <div className="aoc-drawer-section-title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                          Update Order Status
                        </div>
                        <div className="aoc-drawer-status-grid">
                          {['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(s => (
                            <button
                              key={s}
                              type="button"
                              className={`aoc-status-chip-btn ${s.toLowerCase()} ${(order.status || 'Pending') === s ? 'active' : ''}`}
                              onClick={() => changeOrderStatus(order.orderId, s)}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {tab === 'Wholesale requests' && (
          <section className="admin-content admin-wholesale-page">
            <div className="admin-toolbar">
              <div>
                <span className="admin-eyebrow">COMMERCIAL & WHOLESALE INQUIRIES</span>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Track customer wholesale quote requests, required bulk weights, fish varieties, and contact details.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="admin-info-chip" style={{ background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }}>
                  {wholesaleCounts.Pending} Waiting for Action
                </span>
              </div>
            </div>

            {/* Wholesale Search & Status Filter */}
            <div className="admin-orders-toolbar">
              <div className="admin-orders-search-wrap">
                <span className="admin-orders-search-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={wholesaleSearch}
                  onChange={e => setWholesaleSearch(e.target.value)}
                  placeholder="Search store name, phone, city, or required fish variety"
                />
                {wholesaleSearch && (
                  <button
                    type="button"
                    className="admin-orders-clear-btn"
                    onClick={() => setWholesaleSearch('')}
                    title="Clear search"
                  >
                    <AppIcon name="close" size={12} />
                  </button>
                )}
              </div>

              <div className="admin-orders-filter-wrap">
                <select
                  className="admin-orders-filter-select"
                  value={wholesaleFilter}
                  onChange={e => setWholesaleFilter(e.target.value)}
                >
                  <option value="All">All Requests ({wholesaleCounts.All})</option>
                  <option value="Pending">Pending ({wholesaleCounts.Pending})</option>
                  <option value="Contacted">Contacted ({wholesaleCounts.Contacted})</option>
                  <option value="Quoted">Quoted ({wholesaleCounts.Quoted})</option>
                  <option value="Completed">Completed ({wholesaleCounts.Completed})</option>
                  <option value="Cancelled">Cancelled ({wholesaleCounts.Cancelled})</option>
                </select>
              </div>
            </div>

            {(wholesaleSearch || wholesaleFilter !== 'All') && (
              <div style={{ margin: '-10px 0 16px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Showing {filteredWholesaleRequests.length} of {wholesaleRequests.length} requests {wholesaleFilter !== 'All' ? `(${wholesaleFilter})` : ''}</span>
                <button
                  type="button"
                  onClick={() => { setWholesaleSearch(''); setWholesaleFilter('All'); }}
                  style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  Reset filters
                </button>
              </div>
            )}

            {wholesaleRequests.length === 0 ? (
              <EmptyPanel
                title="No wholesale requests yet"
                text="When customers or hotels submit wholesale inquiries via 'Request Wholesale Quote', their requests will appear here in real time."
              />
            ) : (
              <div className="admin-panel">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <AppIcon name="clock" size={13} /> Request ID / Date
                          </span>
                        </th>
                        <th>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <AppIcon name="user" size={13} /> Business / Buyer
                          </span>
                        </th>
                        <th>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <AppIcon name="mapPin" size={13} /> Location
                          </span>
                        </th>
                        <th>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <AppIcon name="package" size={13} /> Quantity
                          </span>
                        </th>
                        <th>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <AppIcon name="fish" size={13} /> Fish Varieties / Notes
                          </span>
                        </th>
                        <th>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <AppIcon name="checkCircle" size={13} /> Status
                          </span>
                        </th>
                        <th>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <AppIcon name="cash" size={13} /> Payment Status
                          </span>
                        </th>
                        <th>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <AppIcon name="sliders" size={13} /> Quick Actions
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWholesaleRequests.map(req => {
                        const statusColors = {
                          Pending: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
                          Contacted: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
                          Quoted: { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
                          Completed: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
                          Cancelled: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' }
                        };
                        const sc = statusColors[req.status] || statusColors.Pending;
                        const payStyles = {
                          'Unpaid': { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
                          'Advance Paid': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
                          'Fully Paid': { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }
                        };
                        const currentPay = req.paymentStatus || 'Unpaid';
                        const ps = payStyles[currentPay] || payStyles['Unpaid'];
                        const cleanPhone = String(req.phone || '').replace(/\D/g, '').slice(-10);
                        const waText = `Vanakkam ${req.businessName || ''}! This is regarding your wholesale dry fish quote request for ${req.quantity} (${req.requirements || ''}) at JS Dry Fish Shop.`;

                        return (
                          <tr key={req.id}>
                            <td>
                              <strong>{req.id}</strong>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                {req.date || (req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN') : '—')}
                              </div>
                            </td>
                            <td>
                              <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>{req.businessName || 'Business Buyer'}</strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                <span style={{ fontSize: '12px', color: '#475569' }}>{req.phone}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '13px', fontWeight: 500 }}>{req.city || '—'}</span>
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#0f172a',
                                whiteSpace: 'nowrap'
                              }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <AppIcon name="package" size={13} /> {req.quantity}
                                </span>
                              </span>
                            </td>
                            <td style={{ maxWidth: '240px' }}>
                              <p style={{
                                margin: 0,
                                fontSize: '12px',
                                color: '#334155',
                                lineHeight: 1.4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {req.requirements || 'Wholesale rate list requested'}
                              </p>
                            </td>
                            <td>
                              <select
                                value={req.status || 'Pending'}
                                onChange={e => changeWholesaleStatus(req.id, e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  border: `1px solid ${sc.border}`,
                                  background: sc.bg,
                                  color: sc.text,
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Quoted">Quoted</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td>
                              <select
                                value={currentPay}
                                onChange={e => changeWholesalePaymentStatus(req.id, e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  border: `1px solid ${ps.border}`,
                                  background: ps.bg,
                                  color: ps.text,
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="Unpaid">Unpaid</option>
                                <option value="Advance Paid">Advance Paid</option>
                                <option value="Fully Paid">Fully Paid</option>
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {cleanPhone && (
                                  <>
                                    <a
                                      href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(waText)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="WhatsApp Direct Message"
                                      aria-label="WhatsApp Direct Message"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '32px',
                                        height: '32px',
                                        background: '#25D366',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        textDecoration: 'none'
                                      }}
                                    >
                                      <AppIcon name="whatsapp" size={15} />
                                    </a>
                                    <a
                                      href={`tel:+91${cleanPhone}`}
                                      title="Call customer"
                                      aria-label="Call customer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '32px',
                                        height: '32px',
                                        background: '#0284c7',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        textDecoration: 'none'
                                      }}
                                    >
                                      <AppIcon name="phone" size={15} />
                                    </a>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedWholesaleDetail(req)}
                                  title="View Request Details"
                                  aria-label="View Request Details"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                >
                                  <AppIcon name="eye" size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWholesaleDeleteConfirm(req.id)}
                                  title="Delete Request"
                                  aria-label="Delete Request"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                >
                                  <AppIcon name="trash" size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredWholesaleRequests.length && (
                        <tr><td className="admin-empty" colSpan="8">No wholesale requests match this filter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'Reports' && (
          <section className="admin-content admin-reports-page">
            {/* Printable Report Header for PDF export */}
            <div className="admin-print-header">
              <div className="admin-print-header-content">
                <div>
                  <h1 className="admin-print-title">JS DRY FISH SHOP</h1>
                  <p className="admin-print-sub">Tuticorin Authentic Dry Seafood · Live Store Sales & Product Report</p>
                </div>
                <div className="admin-print-meta">
                  <div><strong>Period:</strong> {reportTimeFilter === 'all' ? 'All Time' : reportTimeFilter === 'month' ? 'This Month' : reportTimeFilter === 'week' ? 'This Week' : 'Today'}</div>
                  <div><strong>Exported:</strong> {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
              </div>
            </div>

            <div className="admin-toolbar admin-reports-toolbar">
              <div>
                <span className="admin-eyebrow">REPORTS & ANALYTICS</span>
                <h2>Sales Analytics & Monthly Graph</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Live customer order performance, most ordered products, and monthly revenue trends.
                </p>
              </div>
              <div className="admin-report-actions">
                <div className="admin-report-time-tabs">
                  {[
                    ['all', 'All Time'],
                    ['month', 'This Month'],
                    ['week', 'This Week'],
                    ['today', 'Today']
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`admin-report-tab-btn ${reportTimeFilter === key ? 'active' : ''}`}
                      onClick={() => setReportTimeFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="admin-secondary-button admin-print-btn"
                  onClick={printSalesReport}
                  title="Export report as PDF file or print"
                >
                  <AppIcon name="printer" /> Print / Export PDF
                </button>
              </div>
            </div>

            {/* Top KPI Cards: Total Orders, Total Revenue, Top Product, Packs Sold */}
            <div className="admin-stats-grid admin-reports-stats-grid">
              <StatCard
                label="Total Orders Placed"
                value={`${mostOrderedProductAnalytics.totalOrderCount} orders`}
                iconType="orders"
              />
              <StatCard
                label="Total Order Amount Value"
                value={formatCurrency(mostOrderedProductAnalytics.totalRevenue)}
                iconType="revenue"
              />
              <StatCard
                label="Most Ordered Product"
                value={mostOrderedProductAnalytics.topProduct ? `${mostOrderedProductAnalytics.topProduct.nameEn.split('(')[0].trim()}` : 'No orders yet'}
                iconType="trophy"
              />
              <StatCard
                label="Total Packs Dispatched"
                value={`${mostOrderedProductAnalytics.totalUnitsSold} packs`}
                iconType="units"
                accent
              />
            </div>

            {/* Spotlight Card: Enna product athigama order vanthuruku */}
            {mostOrderedProductAnalytics.hasOrders && mostOrderedProductAnalytics.topProduct ? (
              <div className="admin-panel admin-top-product-feature">
                <div className="admin-top-product-badge">
                  <span><AppIcon name="crown" /> MOST ORDERED PRODUCT (அதிகமாக ஆர்டர் செய்யப்பட்ட பொருள்)</span>
                </div>
                <div className="admin-top-product-content">
                  <div className="admin-top-product-info">
                    <div className="admin-top-product-title-wrap">
                      <h2>{mostOrderedProductAnalytics.topProduct.nameEn}</h2>
                      {mostOrderedProductAnalytics.topProduct.nameTa && (
                        <span className="tamil-hero-title">({mostOrderedProductAnalytics.topProduct.nameTa})</span>
                      )}
                      <span className="product-cat-tag">{mostOrderedProductAnalytics.topProduct.category}</span>
                    </div>
                    <div className="admin-top-product-metrics-grid">
                      <div className="tp-metric-card">
                        <span className="tp-lbl">Customer Orders</span>
                        <strong className="tp-val text-blue">{mostOrderedProductAnalytics.topProduct.ordersCount}</strong>
                        <small>orders placed for this item</small>
                      </div>
                      <div className="tp-metric-card">
                        <span className="tp-lbl">Total Packs Sold</span>
                        <strong className="tp-val text-green">{mostOrderedProductAnalytics.topProduct.unitsSold}</strong>
                        <small>packs ordered & dispatched</small>
                      </div>
                      <div className="tp-metric-card">
                        <span className="tp-lbl">Total Sales Value</span>
                        <strong className="tp-val text-emerald">{formatCurrency(mostOrderedProductAnalytics.topProduct.revenue)}</strong>
                        <small>revenue from this item</small>
                      </div>
                      <div className="tp-metric-card">
                        <span className="tp-lbl">Item Unit Price</span>
                        <strong className="tp-val">{formatCurrency(mostOrderedProductAnalytics.topProduct.price)}</strong>
                        <small>per pack starting price</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="admin-panel admin-empty-report-card">
                <AppIcon name="package" size={38} />
                <h3>No Customer Orders for Selected Period</h3>
                <p>
                  All metrics on this page are generated purely from original customer orders. Once customers place orders, the most ordered product, total order count, and revenue will calculate automatically in real time.
                </p>
              </div>
            )}

            {/* Monthly Performance Graph (monthly graph mattum show pannanum) */}
            <div className="admin-panel admin-monthly-chart-panel">
              <div className="admin-chart-heading">
                <div>
                  <span className="admin-eyebrow">SALES TREND</span>
                  <h3>Monthly Sales & Order Graph (Last 6 Months)</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                    Visual monthly distribution of store revenue and order volume.
                  </p>
                </div>
                <div className="admin-chart-view-toggle">
                  <button
                    type="button"
                    className={`chart-mode-btn ${graphViewMode === 'revenue' ? 'active' : ''}`}
                    onClick={() => setGraphViewMode('revenue')}
                  >
                    Revenue (₹)
                  </button>
                  <button
                    type="button"
                    className={`chart-mode-btn ${graphViewMode === 'orders' ? 'active' : ''}`}
                    onClick={() => setGraphViewMode('orders')}
                  >
                    Order Count
                  </button>
                </div>
              </div>

              <div className="admin-chart-body">
                <div className="admin-bars-wrapper">
                  {monthlyAnalytics.months.map(m => {
                    const isRevenue = graphViewMode === 'revenue';
                    const val = isRevenue ? m.revenue : m.orderCount;
                    const max = isRevenue ? monthlyAnalytics.maxRevenue : monthlyAnalytics.maxOrders;
                    const pct = max > 0 ? Math.min(100, Math.max(val > 0 ? (val / max) * 100 : 4, 4)) : 4;
                    const isHighest = isRevenue
                      ? m.revenue > 0 && m.revenue === Math.max(...monthlyAnalytics.months.map(x => x.revenue))
                      : m.orderCount > 0 && m.orderCount === Math.max(...monthlyAnalytics.months.map(x => x.orderCount));

                    return (
                      <div key={m.key} className="admin-chart-col">
                        <div className="admin-bar-value-label">
                          {isRevenue ? formatCurrency(m.revenue) : `${m.orderCount} ord`}
                        </div>
                        <div className="admin-bar-track">
                          <div
                            className={`admin-bar-pillar ${isHighest ? 'highest' : ''} ${val > 0 ? 'has-data' : 'empty'}`}
                            style={{ height: `${pct}%` }}
                            title={`${m.fullName}: ${formatCurrency(m.revenue)} (${m.orderCount} orders, ${m.unitsSold} packs)`}
                          >
                            {val > 0 && <span className="bar-glow-cap"></span>}
                          </div>
                        </div>
                        <div className="admin-col-month-label">{m.shortName}</div>
                        <div className="admin-col-sub-pill">
                          {isRevenue ? `${m.orderCount} ord` : formatCurrency(m.revenue)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Summary Legend */}
              <div className="admin-chart-footer">
                <div className="chart-stat-item">
                  <span>6-Month Revenue:</span>
                  <strong>{formatCurrency(monthlyAnalytics.totalRevenue)}</strong>
                </div>
                <div className="chart-stat-item">
                  <span>Total Orders:</span>
                  <strong>{monthlyAnalytics.totalOrders} orders</strong>
                </div>
                {monthlyAnalytics.bestMonth && (
                  <div className="chart-stat-item highlight">
                    <span><AppIcon name="trophy" /> Best Month:</span>
                    <strong>{monthlyAnalytics.bestMonth.fullName} ({formatCurrency(monthlyAnalytics.bestMonth.revenue)})</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Other Top Ordered Products Leaderboard (Only products with actual orders - max 5) */}
            {mostOrderedProductAnalytics.orderedProducts.length > 1 && (
              <div className="admin-panel admin-other-top-products">
                <div className="admin-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <div style={{ flex: '1 1 auto', minWidth: '260px' }}>
                    <span className="admin-eyebrow" style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, color: '#0876b1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      ORDER RANKINGS
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                      Top Ordered Products Leaderboard
                    </h3>
                  </div>
                  <div style={{ flexShrink: 0, alignSelf: 'flex-start', paddingTop: '2px' }}>
                    <span className="admin-info-chip">{mostOrderedProductAnalytics.orderedProducts.length} Products with Orders</span>
                  </div>
                </div>
                <div className="admin-top-products-list">
                  {mostOrderedProductAnalytics.orderedProducts.slice(0, 5).map((prod, idx) => (
                    <div key={prod.code} className="admin-ranked-item">
                      <div className={`rank-tag rank-${idx + 1}`}>#{idx + 1}</div>
                      <div className="ranked-details">
                        <strong>{prod.nameEn}</strong>
                        {prod.nameTa && <span className="ranked-sub">{prod.nameTa}</span>}
                      </div>
                      <div className="ranked-stat">
                        <span className="stat-lbl">Orders:</span>
                        <strong>{prod.ordersCount}</strong>
                      </div>
                      <div className="ranked-stat">
                        <span className="stat-lbl">Packs:</span>
                        <strong>{prod.unitsSold}</strong>
                      </div>
                      <div className="ranked-stat revenue">
                        <span className="stat-lbl">Revenue:</span>
                        <strong>{formatCurrency(prod.revenue)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Product Sales Breakdown by Pack Size (PDF & Reports display) */}
            <div className="admin-panel admin-report-products-panel">
              <div className="admin-report-panel-header">
                <span className="admin-eyebrow">PRODUCT SALES & SIZES BREAKDOWN</span>
                <div className="admin-report-title-row">
                  <h3>All Products Sold Quantities & Revenue</h3>
                  <span className="admin-info-chip">{productSalesReport.length} Products Listed</span>
                </div>
                <p>
                  Itemized list of products, available pack sizes, unit price, sold quantity, and revenue.
                </p>
              </div>
              <div className="admin-table-scroll">
                <table className="admin-table admin-report-table">
                  <thead>
                    <tr>
                      <th className="col-center" style={{ width: '5%' }}>#</th>
                      <th className="col-left" style={{ width: '25%' }}>Product Name</th>
                      <th className="col-center" style={{ width: '12%' }}>Category</th>
                      <th className="col-center" style={{ width: '11%' }}>Current Stock</th>
                      <th className="col-center" style={{ width: '11%' }}>Pack Size</th>
                      <th className="col-right" style={{ width: '11%' }}>Unit Price</th>
                      <th className="col-center" style={{ width: '11%' }}>Sold Qty</th>
                      <th className="col-right" style={{ width: '14%' }}>Total Amount</th>
                    </tr>
                  </thead>
                  {productSalesReport.map((prod, prodIdx) => {
                    const rowCount = prod.packs.length;
                    const isAlt = prodIdx % 2 === 1;
                    const hasSales = prod.totalSoldQty > 0;
                    return (
                      <tbody key={prod.code || prodIdx} className="product-report-tbody">
                        {prod.packs.map((pack, pIdx) => {
                          const isLastPack = pIdx === rowCount - 1;
                          return (
                            <tr
                              key={pIdx}
                              className={`product-report-row ${hasSales ? 'report-row-active' : 'report-row-zero'} ${isAlt ? 'report-row-alt' : 'report-row-white'} ${isLastPack ? 'product-last-row' : ''}`}
                            >
                              {pIdx === 0 && (
                                <>
                                  <td
                                    rowSpan={rowCount}
                                    className="report-parent-cell col-center"
                                    style={{ fontWeight: 600, color: '#475569' }}
                                  >
                                    {prodIdx + 1}
                                  </td>
                                  <td
                                    rowSpan={rowCount}
                                    className="report-parent-cell col-left"
                                  >
                                    <strong style={{ color: '#0f172a', fontSize: '13px', display: 'block' }}>{prod.nameEn}</strong>
                                    {prod.nameTa && <span className="product-tamil-sub">{prod.nameTa}</span>}
                                  </td>
                                  <td
                                    rowSpan={rowCount}
                                    className="report-parent-cell col-center"
                                  >
                                    <span className="product-cat-tag">
                                      {prod.category ? prod.category.replace(/-/g, ' ') : 'Dry Fish'}
                                    </span>
                                  </td>
                                  <td
                                    rowSpan={rowCount}
                                    className="report-parent-cell col-center"
                                    style={{ fontWeight: 600, color: '#334155' }}
                                  >
                                    {prod.stock !== undefined && prod.stock !== '—' ? `${prod.stock} kg` : '—'}
                                  </td>
                                </>
                              )}
                              <td className="report-pack-cell col-center">
                                <span className="admin-pack-size-pill">{pack.size}</span>
                              </td>
                              <td className="report-pack-cell col-right" style={{ fontWeight: 600, color: '#334155' }}>
                                {formatCurrency(pack.price)}
                              </td>
                              <td className="report-pack-cell col-center">
                                <span className={`admin-sold-qty-badge ${pack.soldQty > 0 ? 'sold-active' : ''}`}>
                                  {pack.soldQty} {pack.soldQty === 1 ? 'pack' : 'packs'}
                                </span>
                              </td>
                              <td
                                className="report-pack-cell col-right"
                                style={{
                                  fontWeight: 700,
                                  color: pack.amount > 0 ? '#047857' : '#94a3b8'
                                }}
                              >
                                {formatCurrency(pack.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  })}
                  {productSalesReport.length === 0 && (
                    <tbody>
                      <tr>
                        <td colSpan="8" className="admin-empty col-center">No products found in catalogue.</td>
                      </tr>
                    </tbody>
                  )}
                  {productSalesReport.length > 0 && (
                    <tfoot>
                      <tr className="admin-report-total-row">
                        <td colSpan="6" className="col-right" style={{ fontWeight: 700 }}>
                          Total Units Sold & Sales Amount:
                        </td>
                        <td className="col-center" style={{ fontWeight: 800 }}>
                          {mostOrderedProductAnalytics.totalUnitsSold} packs
                        </td>
                        <td className="col-right" style={{ fontWeight: 800, color: '#047857' }}>
                          {formatCurrency(mostOrderedProductAnalytics.totalRevenue)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === 'Coupons' && (
          <section className="admin-content">
            <div className="admin-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="admin-eyebrow">PROMOTIONS</span>
                <h2>Discount codes ({coupons.length})</h2>
              </div>
              <button
                type="button"
                className="admin-primary-button"
                onClick={() => setCouponModal({})}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ fontSize: '15px' }}>＋</span> Create coupon
              </button>
            </div>

            {coupons.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1', margin: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: '#64748b' }}>
                  <AppIcon name="coupon" size={32} />
                </div>
                <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '6px' }}>No discount coupons yet</h3>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Create promo codes and discounts to share with your customers.</p>
                <button type="button" className="admin-primary-button" onClick={() => setCouponModal({})}>
                  ＋ Create first coupon
                </button>
              </div>
            ) : (
              <div className="admin-coupon-grid" style={{ marginTop: '16px' }}>
                {coupons.map(coupon => (
                  <article className="admin-coupon-card" key={coupon.code} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="admin-coupon-icon">◇</span>
                        <strong style={{ fontSize: '15px' }}>{coupon.code}</strong>
                      </div>
                      <span
                        className={`admin-status-pill ${coupon.isActive !== false ? 'active' : 'inactive'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleCouponStatus(coupon)}
                        title="Click to toggle active status"
                      >
                        {coupon.isActive !== false ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p style={{ margin: 0 }}>{coupon.desc || 'Store discount'}</p>
                    <small style={{ color: '#64748b' }}>
                      Minimum cart: {formatCurrency(coupon.minOrder)} · {coupon.discountPercent ? `${coupon.discountPercent}% off` : `${formatCurrency(coupon.flatDiscount)} off`}
                    </small>
                    <div className="admin-coupon-actions">
                      <button
                        type="button"
                        className="admin-coupon-action-btn"
                        onClick={() => setCouponModal(coupon)}
                        title="Edit coupon"
                      >
                        <AppIcon name="pen" size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        className={`admin-coupon-action-btn ${coupon.isActive !== false ? 'warning' : 'activate'}`}
                        onClick={() => toggleCouponStatus(coupon)}
                        title={coupon.isActive !== false ? 'Disable coupon' : 'Activate coupon'}
                      >
                        <AppIcon name={coupon.isActive !== false ? 'lock' : 'check'} size={13} />
                        {coupon.isActive !== false ? 'Disable' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="admin-coupon-action-btn danger"
                        onClick={() => setDeleteConfirmCoupon(coupon.code)}
                        title="Delete coupon"
                      >
                        <AppIcon name="trash" size={13} /> Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Modal for Confirming Coupon Deletion (replaces window.confirm) */}
            {deleteConfirmCoupon && (
              <div className="admin-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setDeleteConfirmCoupon(null)}>
                <div className="admin-coupon-modal-card admin-confirm-dialog-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <AppIcon name="trash" size={24} />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#0f172a' }}>Delete Coupon?</h3>
                  <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#64748b', lineHeight: 1.5 }}>
                    Are you sure you want to permanently delete coupon code <strong>"{deleteConfirmCoupon}"</strong>? This action cannot be undone.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() => setDeleteConfirmCoupon(null)}
                      style={{ justifyContent: 'center', minHeight: '38px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteCoupon}
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        minHeight: '38px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <AppIcon name="trash" size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal for Creating or Editing a Coupon */}
            {couponModal !== null && (
              <div className="admin-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setCouponModal(null)}>
                <div className="admin-coupon-modal-card">
                  <div className="admin-modal-head">
                    <div>
                      <span className="admin-eyebrow">PROMOTIONS</span>
                      <h2>{couponModal.code ? `Edit coupon (${couponModal.code})` : 'Create discount coupon'}</h2>
                    </div>
                    <button
                      type="button"
                      className="admin-icon-button"
                      onClick={() => setCouponModal(null)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={saveCoupon}>
                    <div className="admin-coupon-form-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
                      <label>
                        <span>Coupon code <span style={{ color: '#e11d48' }}>*</span></span>
                        <input
                          required
                          name="code"
                          minLength="3"
                          maxLength="24"
                          defaultValue={couponModal.code || ''}
                          readOnly={!!couponModal.code}
                          placeholder="e.g. SUMMER15 or FIRST50"
                          style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, background: couponModal.code ? '#f1f5f9' : '#fff' }}
                        />
                      </label>
                      <label>
                        <span>Minimum order amount (₹) <span style={{ color: '#e11d48' }}>*</span></span>
                        <input required name="minOrder" type="number" min="0" defaultValue={couponModal.minOrder ?? 0} placeholder="0" />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label>
                          <span>Flat discount (₹)</span>
                          <input name="flatDiscount" type="number" min="0" defaultValue={couponModal.flatDiscount ?? 0} placeholder="₹" />
                        </label>
                        <label>
                          <span>Discount (%)</span>
                          <input name="discountPercent" type="number" min="0" max="100" defaultValue={couponModal.discountPercent ?? 0} placeholder="%" />
                        </label>
                      </div>
                      <label className="admin-form-wide">
                        <span>Offer description</span>
                        <input name="desc" defaultValue={couponModal.desc || ''} placeholder="e.g. 15% off on orders above ₹499" />
                      </label>
                    </div>
                    <div className="admin-form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                      <button type="button" className="admin-secondary-button" onClick={() => setCouponModal(null)} style={{ flex: '1 1 110px', minHeight: '40px', justifyContent: 'center' }}>
                        Cancel
                      </button>
                      <button className="admin-primary-button" style={{ flex: '1 1 150px', minHeight: '40px', justifyContent: 'center' }}>
                        Save coupon
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'Store settings' && (
          <section className="admin-content admin-settings-page">
            <div className="admin-settings-wrapper">
              <div className="admin-toolbar admin-settings-toolbar">
                <div>
                  <span className="admin-eyebrow">STORE PROFILE</span>
                
                </div>
              </div>

              {/* Neatly aligned 2-tab segmented control */}
              <div className="admin-settings-tab-bar">
                <button
                  type="button"
                  className={`admin-settings-tab-btn ${settingsTab === 'details' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('details')}
                >
                  <AppIcon name="building" size={16} /> Store Details
                </button>
                <button
                  type="button"
                  className={`admin-settings-tab-btn ${settingsTab === 'security' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('security')}
                >
                  <AppIcon name="lock" size={16} /> Security
                </button>
              </div>

              {settingsTab === 'details' && (
                <form className="admin-panel admin-settings-form" onSubmit={saveSettings}>
                  <h3>Business details</h3>
                  <p>Store name and support contacts are shown in the storefront.</p>
                  <label>Store name<input value={settings.storeName ?? ''} onFocus={e => e.target.select()} onChange={event => setSettings({ ...settings, storeName: event.target.value })} /></label>
                  <label>Support phone (10 digits)<input value={settings.supportPhone ?? ''} onFocus={e => e.target.select()} onChange={event => setSettings({ ...settings, supportPhone: event.target.value })} /></label>
                  <label>Shop UPI ID (GPay / PhonePe auto-pay)<input value={settings.upiId ?? ''} placeholder="eg: 9787453202@okaxis" onFocus={e => e.target.select()} onChange={event => setSettings({ ...settings, upiId: event.target.value })} /></label>

                  
                  <label>Support email<input type="email" value={settings.supportEmail ?? ''} onFocus={e => e.target.select()} onChange={event => setSettings({ ...settings, supportEmail: event.target.value })} /></label>
                  <label>Low stock alert threshold<input type="number" min="0" value={settings.lowStockThreshold ?? ''} onFocus={e => e.target.select()} onChange={event => setSettings({ ...settings, lowStockThreshold: event.target.value })} /></label>

                  {/* Delivery Charges & Shipping Policy Configuration */}
                  <div style={{ marginTop: '16px', marginBottom: '16px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px' }}>
                      <AppIcon name="truck" size={16} /> Delivery Charges & Shipping Policy
                    </div>
                    <p style={{ margin: '0 0 12px', fontSize: '11.5px', color: '#64748b', lineHeight: 1.4 }}>
                      Set standard delivery fees and free shipping threshold. Changes reflect instantly in customer cart & checkout calculations.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <label style={{ margin: 0, fontWeight: 600, fontSize: '12.5px' }}>
                        Standard Delivery Charge (₹)
                        <input
                          type="number"
                          min="0"
                          value={settings.deliveryCharge ?? ''}
                          placeholder="e.g. 40"
                          onFocus={e => e.target.select()}
                          onChange={event => setSettings({ ...settings, deliveryCharge: event.target.value })}
                        />
                        <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '3px', fontWeight: 400 }}>
                          Default fee applied when order is below free delivery threshold.
                        </span>
                      </label>

                      <label style={{ margin: 0, fontWeight: 600, fontSize: '12.5px' }}>
                        Free Delivery Threshold (₹)
                        <input
                          type="number"
                          min="0"
                          value={settings.freeDeliveryThreshold ?? ''}
                          placeholder="e.g. 499"
                          onFocus={e => e.target.select()}
                          onChange={event => setSettings({ ...settings, freeDeliveryThreshold: event.target.value })}
                        />
                        <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '3px', fontWeight: 400 }}>
                          Orders at or above this amount get FREE shipping. Set 0 to disable free delivery (all orders pay standard fee).
                        </span>
                      </label>
                    </div>
                  </div>

                  <button className="admin-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
                </form>
              )}

              {settingsTab === 'security' && (
                <form className="admin-panel admin-settings-form admin-password-form" onSubmit={changePassword}>
                  <h3>Security & Admin Password</h3>
                  <p>Set a new password for signing into this admin panel.</p>
                  <label>
                    New password
                    <PasswordInput
                      autoComplete="new-password"
                      minLength={6}
                      value={passwordForm.newPassword}
                      onChange={event => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Confirm new password
                    <PasswordInput
                      autoComplete="new-password"
                      minLength={6}
                      value={passwordForm.confirmPassword}
                      onChange={event => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                      required
                    />
                  </label>
                  <button className="admin-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
                </form>
              )}
            </div>
          </section>
        )}
      </main>
      {editor && <ProductEditor product={editor} onClose={() => setEditor(undefined)} onSave={saveProduct} existingProducts={products} />}

      {/* Modal for Wholesale Request Full Details */}
      {selectedWholesaleDetail && (
        <div className="admin-wholesale-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setSelectedWholesaleDetail(null)}>
          <div className="admin-wholesale-detail-card" role="dialog" aria-modal="true">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span className="admin-eyebrow">WHOLESALE INQUIRY DETAILS</span>
                <h3 style={{ margin: '4px 0 0', color: '#1e293b', fontSize: '18px' }}>
                  {selectedWholesaleDetail.businessName || 'Business Buyer'}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Request #{selectedWholesaleDetail.id}</span>
              </div>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => setSelectedWholesaleDetail(null)}
                style={{ padding: '6px 12px', minHeight: '32px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <AppIcon name="close" size={13} /> Close
              </button>
            </div>

            <div className="admin-wholesale-grid">
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AppIcon name="phone" size={12} /> Phone / WhatsApp
                </span>
                <strong>{selectedWholesaleDetail.phone || '—'}</strong>
              </div>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AppIcon name="mapPin" size={12} /> Delivery City
                </span>
                <strong>{selectedWholesaleDetail.city || '—'}</strong>
              </div>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AppIcon name="package" size={12} /> Required Quantity
                </span>
                <strong style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AppIcon name="package" size={13} /> {selectedWholesaleDetail.quantity}
                </strong>
              </div>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AppIcon name="clock" size={12} /> Submitted Date
                </span>
                <strong>{selectedWholesaleDetail.date || (selectedWholesaleDetail.createdAt ? new Date(selectedWholesaleDetail.createdAt).toLocaleString('en-IN') : '—')}</strong>
              </div>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AppIcon name="cash" size={12} /> Payment Status
                </span>
                <strong style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: selectedWholesaleDetail.paymentStatus === 'Fully Paid' ? '#15803d' : (selectedWholesaleDetail.paymentStatus === 'Advance Paid' ? '#92400e' : '#b91c1c')
                }}>
                  <AppIcon name="cash" size={13} /> {selectedWholesaleDetail.paymentStatus || 'Unpaid'}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: '14px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AppIcon name="fish" size={12} /> Required Fish Varieties & Notes
              </span>
              <div className="admin-wholesale-requirements-box">
                {selectedWholesaleDetail.requirements || 'Wholesale rate list requested.'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AppIcon name="checkCircle" size={13} /> Status:
                  </span>
                  <select
                    value={selectedWholesaleDetail.status || 'Pending'}
                    onChange={e => changeWholesaleStatus(selectedWholesaleDetail.id, e.target.value)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AppIcon name="cash" size={13} /> Payment:
                  </span>
                  <select
                    value={selectedWholesaleDetail.paymentStatus || 'Unpaid'}
                    onChange={e => changeWholesalePaymentStatus(selectedWholesaleDetail.id, e.target.value)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Advance Paid">Advance Paid</option>
                    <option value="Fully Paid">Fully Paid</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedWholesaleDetail.phone && (
                  <>
                    <a
                      href={`https://wa.me/91${String(selectedWholesaleDetail.phone).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Vanakkam ${selectedWholesaleDetail.businessName || ''}! This is regarding your wholesale dry fish quote request for ${selectedWholesaleDetail.quantity} at JS Dry Fish Shop.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-primary-button"
                      style={{ background: '#25D366', borderColor: '#25D366', minHeight: '36px', padding: '0 12px', fontSize: '12px', textDecoration: 'none' }}
                    >
                      <AppIcon name="whatsapp" /> Chat WhatsApp
                    </a>
                    <a
                      href={`tel:+91${String(selectedWholesaleDetail.phone).replace(/\D/g, '').slice(-10)}`}
                      className="admin-secondary-button"
                      style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px', textDecoration: 'none' }}
                    >
                      <AppIcon name="phone" /> Call
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setWholesaleDeleteConfirm(selectedWholesaleDetail.id)}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    minHeight: '36px',
                    padding: '0 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <AppIcon name="trash" size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Confirming Wholesale Request Deletion */}
      {wholesaleDeleteConfirm && (
        <div className="admin-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setWholesaleDeleteConfirm(null)}>
          <div className="admin-coupon-modal-card admin-confirm-dialog-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <AppIcon name="trash" size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#0f172a' }}>Delete Wholesale Request?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to remove wholesale inquiry <strong>#{wholesaleDeleteConfirm}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => setWholesaleDeleteConfirm(null)}
                style={{ justifyContent: 'center', minHeight: '38px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-primary-button"
                onClick={confirmDeleteWholesale}
                style={{ justifyContent: 'center', minHeight: '38px', background: '#dc2626', borderColor: '#dc2626' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminApp() {
  const [token, setToken] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authError, setAuthError] = useState('');
  const isAdminSession = useRef(false);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setIsCheckingSession(false);
      return undefined;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        isAdminSession.current = false;
        setToken(null);
      }
      if (event === 'TOKEN_REFRESHED' && session && isAdminSession.current) {
        setToken(session.access_token);
      }
    });

    const restoreSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) return;

        const { data: isAdmin, error: authorizationError } = await supabase.rpc('admin_is_authorized');
        if (authorizationError) throw authorizationError;
        if (!isAdmin) {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) throw signOutError;
          setAuthError(getAdminSupportMessage());
          return;
        }

        isAdminSession.current = true;
        if (active) setToken(data.session.access_token);
      } catch (sessionError) {
        if (active) setAuthError(getAdminErrorMessage(sessionError));
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error('Unable to clear an unverified Supabase session:', signOutError);
      } finally {
        if (active) setIsCheckingSession(false);
      }
    };

    restoreSession();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = accessToken => {
    setAuthError('');
    isAdminSession.current = true;
    setToken(accessToken);
  };

  const signOut = () => {
    isAdminSession.current = false;
    setToken(null);
  };

  if (isCheckingSession) {
    return (
      <main className="admin-login-page">
        <section className="admin-validating-card" role="status" aria-live="polite">
          <div className="admin-fish-stage">
            <div className="admin-fish-circle"></div>
            <div className="admin-fish-glow"></div>
            <div className="admin-fish-bubble admin-fish-bubble-1"></div>
            <div className="admin-fish-bubble admin-fish-bubble-2"></div>
            <div className="admin-fish-bubble admin-fish-bubble-3"></div>
            <div className="admin-fish-icon-wrap">
              <svg width="68" height="68" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Coastal Fish theme */}
                <path d="M52 32C44 20 28 16 12 24C6 27 2 32 2 32C2 32 6 37 12 40C28 48 44 44 52 32Z" fill="#168acb" />
                <path d="M50 32L62 19V45L50 32Z" fill="#0876b1" />
                <path d="M25 21C27 16 31 13 35 13C36 17 35 21 33 23" fill="#34aadc" />
                <path d="M25 43C27 48 31 51 35 51C36 47 35 43 33 41" fill="#34aadc" />
                <circle cx="15" cy="29" r="3.2" fill="#ffffff" />
                <circle cx="14.5" cy="29" r="1.6" fill="#07334f" />
                <path d="M29 25C32 29 32 35 29 39" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
                <path d="M37 27C40 30 40 34 37 37" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
              </svg>
            </div>
          </div>
          <h2 className="admin-validating-title">Validating JS Dry Fish Admin…</h2>
          <p className="admin-validating-sub">Securing Tuticorin coastal merchant portal</p>
          <div className="admin-validating-bar">
            <div className="admin-validating-bar-fill"></div>
          </div>
        </section>
      </main>
    );
  }

  return token
    ? <AdminDashboard token={token} onLogout={signOut} />
    : <AdminLogin onLogin={handleLogin} initialError={authError} />;
}

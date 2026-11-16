import React from 'react';

const iconShapes = {
  anchor: <><path d="M12 5v15M5 10h14M7 15a5 5 0 0 0 10 0M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /><path d="m3 13 2 2 2-2M17 13l2 2 2-2" /></>,
  alert: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
  building: <><path d="M3 21h18M5 21V5l7-3 7 3v16M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-5h4v5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
  cash: <><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9h.01M18 15h.01" /></>,
  cart: <><circle cx="9" cy="20" r="1" /><circle cx="19" cy="20" r="1" /><path d="M2 3h2l2.5 12h13l2-9H5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  chef: <><path d="M6 20h12M7 16h10l1 4H6l1-4ZM6 16a4 4 0 1 1 1-7.9A5 5 0 0 1 17 9a3.5 3.5 0 0 1 1 7" /></>,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  chevronUp: <path d="m7 14 5-5 5 5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  coupon: <><path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6Z" /><path d="M13 5v2M13 11v2M13 17v2" /></>,
  crown: <><path d="m3 8 5 4 4-7 4 7 5-4-2 12H5L3 8Z" /><path d="M5 20h14" /></>,
  fish: <><path d="M2 12c2.5-3.5 6-5.3 10-5.3 4.1 0 6.7 2 10 5.3-3.3 3.3-5.9 5.3-10 5.3-4 0-7.5-1.8-10-5.3Z" /><path d="m2 12-1.3-3v6L2 12Z" /><circle cx="15" cy="10" r=".8" fill="currentColor" stroke="none" /></>,
  gift: <><rect x="3" y="10" width="18" height="11" rx="1" /><path d="M2 7h20v4H2zM12 7v14M12 7H8.5a2.5 2.5 0 1 1 2.5-2.5V7ZM12 7h3.5A2.5 2.5 0 1 0 13 4.5V7Z" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />,
  jar: <><path d="M7 3h10v3l2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8l2-2V3Z" /><path d="M7 6h10M6 11h12" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  login: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  logout: <><path d="M14 17l5-5-5-5M19 12H7" /><path d="M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" /></>,
  mapPin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  message: <><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.4 8.4 0 0 1 12.5 3h.5a8.4 8.4 0 0 1 8 8v.5Z" /><path d="M8 12h8M8 9h5" /></>,
  pen: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  phone: <path d="M7.2 3.5 10 3l1.5 4-2 1.8a15 15 0 0 0 5.7 5.7l1.8-2 4 1.5-.5 2.8a3 3 0 0 1-3.3 2.4A17.5 17.5 0 0 1 4.8 7a3 3 0 0 1 2.4-3.5Z" />,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  printer: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6zM18 12h.01" /></>,
  package: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
  review: <><path d="m12 3 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3Z" /><path d="m17 17 4 4" /></>,
  rupee: <><circle cx="12" cy="12" r="9" /><text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" stroke="none">₹</text></>,
  save: <><path d="M4 3h13l3 3v15H4z" /><path d="M8 3v6h8V3M8 21v-8h8v8" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  shark: <><path d="M2 12c3-4 6.8-5.8 11-5.2l2-3 2 4 5 4-5 4-2 4-2-3C8 18.5 4 16.5 2 12Z" /><circle cx="16" cy="10" r=".8" fill="currentColor" stroke="none" /></>,
  shrimp: <><path d="M20 7a7 7 0 1 0 0 10M18 8l-3 2M18 16l-3-2M10 6 8 3M7 10H3M7 14H3M10 18l-2 3" /><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  squid: <><path d="M12 3c-4 0-7 3-7 7 0 3 2 5 3 6l-2 5 4-3 2 3 2-3 4 3-2-5c1-1 3-3 3-6 0-4-3-7-7-7Z" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  tag: <><path d="M20 13 13 20l-10-10V3h7l10 10Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" /></>,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" /></>,
  truck: <><path d="M3 6h12v11H3zM15 10h4l3 3v4h-7" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="18.5" cy="18" r="1.5" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></>,
  userPlus: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M19 8v6M16 11h6" /></>,
  verified: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  water: <><path d="M2 8c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7 0M2 15c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7 0" /></>,
  whatsapp: <><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.6a8.5 8.5 0 1 1 16.3-3.9Z" /><path d="M9 8.5c.4 2.4 2.1 4.1 4.5 4.5l1-1.2 2 .8-.2 1.8c-3.4 1-8.2-3.8-7.2-7.2l1.8-.2.8 2L10.5 10" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />,
  sparkles: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  chevronLeft: <path d="m14 18-6-6 6-6" />,
  chevronRight: <path d="m10 18 6-6-6-6" />,
  status: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  log: <><path d="M4 21V7l8-4 8 4v14M7 11h2m6 0h2m-10 4h2m6 0h2M10 21v-4h4v4" /></>,
  shower: <><path d="M4 10a8 8 0 0 1 16 0M12 10v3M6 16l.01.01M10 17l.01.01M14 17l.01.01M18 16l.01.01" /></>,
  creditCard: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.7 1.1-1.7 2.7M12 17h.01" /></>,
  filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
  scale: <><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></>,
  bone: <><path d="M2 12h20M7 7l3 5-3 5M12 6l3 6-3 6M17 8l2 4-2 4"/><circle cx="21" cy="12" r="1" fill="currentColor"/></>,
  salt: <><path d="M9 3h6v3l2 2.5V20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8.5L9 6V3Z"/><path d="M8 8.5h8"/><circle cx="12" cy="13" r=".7" fill="currentColor"/><circle cx="10" cy="16" r=".7" fill="currentColor"/><circle cx="14" cy="16" r=".7" fill="currentColor"/></>,
  eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  sliders: <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>
};

export default function AppIcon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={`app-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'star' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {iconShapes[name] || iconShapes.help}
    </svg>
  );
}

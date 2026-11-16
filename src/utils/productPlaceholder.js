const illustrations = {
  fish: '<path d="M2 12c2.5-3.5 6-5.3 10-5.3 4.1 0 6.7 2 10 5.3-3.3 3.3-5.9 5.3-10 5.3-4 0-7.5-1.8-10-5.3Z"/><path d="m2 12-1.3-3v6L2 12Z"/><circle cx="15" cy="10" r=".8" fill="#2874a6" stroke="none"/>',
  squid: '<path d="M12 3c-4 0-7 3-7 7 0 3 2 5 3 6l-2 5 4-3 2 3 2-3 4 3-2-5c1-1 3-3 3-6 0-4-3-7-7-7Z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>',
  shrimp: '<path d="M20 7a7 7 0 1 0 0 10M18 8l-3 2M18 16l-3-2M10 6 8 3M7 10H3M7 14H3M10 18l-2 3"/><circle cx="16" cy="12" r="1"/>',
  shark: '<path d="M2 12c3-4 6.8-5.8 11-5.2l2-3 2 4 5 4-5 4-2 4-2-3C8 18.5 4 16.5 2 12Z"/><circle cx="16" cy="10" r=".8"/>'
};

export function getProductPlaceholder(icon = 'fish', size = 400) {
  const shape = illustrations[icon] || illustrations.fish;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f1f7ff"/><g transform="translate(36 20) scale(1.25)" fill="none" stroke="#2874a6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${shape}</g><text x="50" y="82" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#004b70">Anto Tuty Fish Hub</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

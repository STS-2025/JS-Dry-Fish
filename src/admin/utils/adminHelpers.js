import { apiUrl } from '../../api';

export async function request(path, { token, ...options } = {}) {
  const response = await fetch(apiUrl(`/api${path}`), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options?.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.detail || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

// Gentle audio chime for new customer orders (Web Audio API - zero dependencies)
export const playChimeSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (_) {}
};

export const formatRelativeTime = (isoDate) => {
  if (!isoDate) return 'Just now';
  try {
    const d = new Date(isoDate);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 45) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return 'Recently';
  }
};

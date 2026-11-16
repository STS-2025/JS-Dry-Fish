/**
 * Plays a warm, celebratory ascending chime when a customer places an order.
 * Uses Web Audio API - zero external audio files, zero latency, works offline.
 */
export function playOrderPlacedSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Melodic celebration sequence (4-note ascending chord):
    // C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz) -> C6 (1046.50Hz)
    const notes = [
      { freq: 523.25, time: 0.00, duration: 0.22, gain: 0.28 },
      { freq: 659.25, time: 0.11, duration: 0.22, gain: 0.32 },
      { freq: 783.99, time: 0.22, duration: 0.26, gain: 0.36 },
      { freq: 1046.50, time: 0.35, duration: 0.65, gain: 0.42 }
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Triangle wave creates a warm, rich marimba/chime tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime + time);
      gainNode.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + time + 0.025);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration);
    });

    // High sparkling overtone on the final peak note (C7 bell shimmer)
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(2093.0, ctx.currentTime + 0.35);

    bellGain.gain.setValueAtTime(0.0001, ctx.currentTime + 0.35);
    bellGain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.38);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.95);

    bell.connect(bellGain);
    bellGain.connect(ctx.destination);

    bell.start(ctx.currentTime + 0.35);
    bell.stop(ctx.currentTime + 0.95);
  } catch (err) {
    console.warn('Audio chime playback error:', err);
  }
}

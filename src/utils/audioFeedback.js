// Enterprise Audio & Haptic Feedback Engine for Microfinance Operations
// 100% offline Web Audio API synthesis (zero external mp3/wav files required)

const STORAGE_KEY = 'alr_sound_feedback_enabled';
let inMemorySoundEnabled = true;

export function isSoundEnabled() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return inMemorySoundEnabled;
  }
  const val = localStorage.getItem(STORAGE_KEY);
  return val === null ? true : val === 'true';
}

export function setSoundEnabled(enabled) {
  inMemorySoundEnabled = Boolean(enabled);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  }
}

let sharedAudioCtx = null;

function getSharedAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContext();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (_) {
    return null;
  }
}

/**
 * Plays an authentic crisp cash-register bell chime (dual-frequency harmonic)
 * and triggers mobile haptic vibration.
 */
export function playCashRegisterChime() {
  // Mobile Haptic Vibration
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([35, 30, 60]);
    }
  } catch (e) {
    // Ignore vibration restrictions
  }

  if (!isSoundEnabled()) return;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Primary Bell Tone: B5 (987.77 Hz) sliding to E6 (1318.51 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now);
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.07);

    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.38);

    // Harmonic Sparkle / Coin Drop: B6 (1975.53 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1975.53, now + 0.06);

    gain2.gain.setValueAtTime(0.18, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn('Audio chime notice:', err);
  }
}

/**
 * Plays a soft, subtle descending double-pip tone when a collection is undone / reverted.
 */
export function playUndoSound() {
  // Gentle single buzz on mobile
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
  } catch (e) {}

  if (!isSoundEnabled()) return;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15); // A4

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch (err) {
    console.warn('Undo audio notice:', err);
  }
}

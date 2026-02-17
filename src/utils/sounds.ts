/**
 * Web Audio API ile gerçekçi satranç ses efektleri.
 * Ahşap taş sesleri, noise tabanlı sentezleme.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Noise buffer oluştur (ahşap ses efektleri için) */
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  return buffer;
}

/** Ahşap tık sesi (gerçekçi taş bırakma) */
function playWoodClick(pitch = 1, volume = 0.3, decay = 0.06) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Noise kaynağı (ahşap tık)
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, decay + 0.05);

  // Bandpass filtre (ahşap tonalite)
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(800 * pitch, now);
  bandpass.Q.setValueAtTime(2, now);

  // Highpass (düşük freakansları kes)
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.setValueAtTime(300, now);

  // Zarf (envelope)
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + decay);

  noise.connect(bandpass);
  bandpass.connect(highpass);
  highpass.connect(gainNode);
  gainNode.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + decay + 0.05);
}

/** Kısa ton (ek efektler için) */
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

/** Normal hamle sesi — ahşap taş bırakma */
export function playMoveSound() {
  playWoodClick(1.0, 0.35, 0.07);
}

/** Taş alma sesi — daha sert, çift tık */
export function playCaptureSound() {
  playWoodClick(1.3, 0.45, 0.05);
  setTimeout(() => playWoodClick(0.8, 0.25, 0.08), 30);
}

/** Şah çekme sesi — ahşap + uyarı tonu */
export function playCheckSound() {
  playWoodClick(1.5, 0.3, 0.04);
  setTimeout(() => playTone(880, 0.12, 'sine', 0.06), 50);
  setTimeout(() => playTone(1100, 0.08, 'sine', 0.04), 120);
}

/** Oyun sonu sesi */
export function playGameOverSound() {
  playTone(440, 0.25, 'sine', 0.1);
  setTimeout(() => playTone(350, 0.25, 'sine', 0.08), 200);
  setTimeout(() => playTone(260, 0.5, 'sine', 0.06), 400);
}

/** Rok sesi — çift ahşap tık */
export function playCastleSound() {
  playWoodClick(0.9, 0.3, 0.06);
  setTimeout(() => playWoodClick(1.1, 0.35, 0.07), 120);
}

/** Terfi sesi — yükselen ses */
export function playPromoteSound() {
  playWoodClick(1.2, 0.3, 0.05);
  setTimeout(() => playTone(523, 0.08, 'sine', 0.06), 60);
  setTimeout(() => playTone(659, 0.08, 'sine', 0.06), 130);
  setTimeout(() => playTone(784, 0.08, 'sine', 0.06), 200);
  setTimeout(() => playTone(1047, 0.12, 'sine', 0.05), 270);
}

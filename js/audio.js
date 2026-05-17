let ctx, master, isPlaying = false, nextTime = 0, beat = 0, muted = false;
let currentTrack = 'calm';

const A1 = 55, B1 = 61.74, C2 = 65.41, D2 = 73.42, E2 = 82.41, F2 = 87.31, G2 = 98;
const A2 = 110, B2 = 123.47, C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196;
const A3 = 220, B3 = 246.94, C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392;
const A4 = 440, Bb4 = 466.16, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, C6 = 1046.50;

const tracks = {
  calm: {
    beatDur: 0.32, bassType: 'sawtooth', leadType: 'square', bassGain: 0.12, leadGain: 0.08,
    bass:   [A2, A2, E3, E3, G3, G3, D3, D3],
    melody: [A4, C5, E4, G4, A4, G4, E4, D4],
  },
  battle: {
    beatDur: 0.20, bassType: 'sawtooth', leadType: 'square', bassGain: 0.15, leadGain: 0.10,
    bass:   [D2, D2, D2, A2, F2, F2, F2, C3],
    melody: [D4, F4, A4, D5, C5, A4, F4, A4],
  },
  boss: {
    beatDur: 0.45, bassType: 'sawtooth', leadType: 'triangle', bassGain: 0.18, leadGain: 0.12,
    bass:   [B1, B1, G2, G2, F2, F2, D2, D2],
    melody: [F4, G4, Bb4, G4, F4, D4, F4, G4],
  },
  victory: {
    beatDur: 0.15, bassType: 'square', leadType: 'square', bassGain: 0.13, leadGain: 0.12,
    bass:   [C2, C3, C2, C3, G2, G3, G2, G3],
    melody: [C5, E5, G5, E5, C5, G5, C6, G5],
  },
  defeat: {
    beatDur: 0.5, bassType: 'triangle', leadType: 'triangle', bassGain: 0.13, leadGain: 0.11,
    bass:   [A2, A2, F2, F2, D2, D2, E2, A1],
    melody: [E5, D5, C5, A4, B4, A4, G4, A3],
  },
};

function note(freq, time, dur, type, gain) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(gain, time + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(env);
  env.connect(master);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

function schedule() {
  if (!isPlaying) return;
  const tr = tracks[currentTrack];
  while (nextTime < ctx.currentTime + 0.2) {
    const t = nextTime;
    const i = beat % tr.bass.length;
    note(tr.bass[i],   t, tr.beatDur * 0.9, tr.bassType, tr.bassGain);
    note(tr.melody[i], t, tr.beatDur * 0.6, tr.leadType, tr.leadGain);
    nextTime += tr.beatDur;
    beat++;
  }
  setTimeout(schedule, 60);
}

export function startMusic() {
  if (isPlaying) return;
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.25;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  nextTime = ctx.currentTime + 0.1;
  isPlaying = true;
  schedule();
}

export function setTrack(name) {
  if (!tracks[name] || name === currentTrack) return;
  currentTrack = name;
  beat = 0;
  if (ctx) nextTime = ctx.currentTime + 0.05;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.25;
  return muted;
}

export function isMuted() { return muted; }

export function sfxCannon() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.35, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 0.2);
}

export function sfxTurret() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1400, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.18, t + 0.003);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 0.12);
}

export function sfxWarning() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const offset of [0, 0.18]) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t + offset);
    env.gain.setValueAtTime(0, t + offset);
    env.gain.linearRampToValueAtTime(0.22, t + offset + 0.005);
    env.gain.linearRampToValueAtTime(0.22, t + offset + 0.1);
    env.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.15);
    osc.connect(env);
    env.connect(master);
    osc.start(t + offset);
    osc.stop(t + offset + 0.16);
  }
}

export function sfxEarthquake() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 1.5;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 250;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.35;
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(t);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 55;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.5, t + 0.05);
  env.gain.linearRampToValueAtTime(0.3, t + 1.0);
  env.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 1.55);
}

export function sfxFlood() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 1.8;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.6;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.35, t + 0.3);
  env.gain.linearRampToValueAtTime(0.25, t + 1.2);
  env.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
  noise.connect(filter);
  filter.connect(env);
  env.connect(master);
  noise.start(t);
}

export function sfxVolcano() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(35, t + 0.5);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.55, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 0.85);
  const dur = 1.0;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.3;
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(t);
}

export function sfxHeal() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [[523.25, 0], [659.25, 0.06], [783.99, 0.12]];
  for (const [freq, off] of notes) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, t + off);
    env.gain.linearRampToValueAtTime(0.2, t + off + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, t + off + 0.28);
    osc.connect(env);
    env.connect(master);
    osc.start(t + off);
    osc.stop(t + off + 0.3);
  }
}

export function sfxHurt() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.22);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.28, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 0.3);
}

export function sfxArrow() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.15);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.15, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 0.2);
}

export function sfxGun() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(700, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.07);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.22, t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function sfxBomb() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 0.5;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.4;
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(t);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(28, t + 0.4);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.6, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 0.55);
}

export function sfxTrap() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.25;
  noise.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(t);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.45, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + 0.3);
}

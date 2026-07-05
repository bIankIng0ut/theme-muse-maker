let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
  if (typeof window !== "undefined") {
    try { localStorage.setItem("vantage_sfx_muted", v ? "1" : "0"); } catch {}
  }
}

export function isMuted() {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem("vantage_sfx_muted");
    if (v !== null) muted = v === "1";
  } catch {}
  return muted;
}

export function playClick() {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(880, t);
  o.frequency.exponentialRampToValueAtTime(1760, t + 0.05);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 0.14);

  const o2 = ac.createOscillator();
  const g2 = ac.createGain();
  o2.type = "sine";
  o2.frequency.setValueAtTime(2640, t);
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.03, t + 0.004);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o2.connect(g2).connect(ac.destination);
  o2.start(t);
  o2.stop(t + 0.1);
}

export function playCinematic() {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;

  // Deep sub boom
  const boom = ac.createOscillator();
  const boomG = ac.createGain();
  boom.type = "sine";
  boom.frequency.setValueAtTime(80, t0);
  boom.frequency.exponentialRampToValueAtTime(30, t0 + 2.5);
  boomG.gain.setValueAtTime(0.0001, t0);
  boomG.gain.exponentialRampToValueAtTime(0.35, t0 + 0.2);
  boomG.gain.exponentialRampToValueAtTime(0.0001, t0 + 3);
  boom.connect(boomG).connect(ac.destination);
  boom.start(t0); boom.stop(t0 + 3);

  // Rising synth pad
  const pad = ac.createOscillator();
  const padG = ac.createGain();
  pad.type = "sawtooth";
  pad.frequency.setValueAtTime(110, t0 + 0.3);
  pad.frequency.exponentialRampToValueAtTime(660, t0 + 3.5);
  const filt = ac.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.setValueAtTime(400, t0 + 0.3);
  filt.frequency.exponentialRampToValueAtTime(6000, t0 + 3.5);
  padG.gain.setValueAtTime(0.0001, t0 + 0.3);
  padG.gain.exponentialRampToValueAtTime(0.12, t0 + 1.5);
  padG.gain.exponentialRampToValueAtTime(0.0001, t0 + 4);
  pad.connect(filt).connect(padG).connect(ac.destination);
  pad.start(t0 + 0.3); pad.stop(t0 + 4);

  // Whoosh (filtered noise)
  const bufSize = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const nFilt = ac.createBiquadFilter();
  nFilt.type = "bandpass";
  nFilt.frequency.setValueAtTime(400, t0 + 0.8);
  nFilt.frequency.exponentialRampToValueAtTime(8000, t0 + 2.2);
  nFilt.Q.value = 1.5;
  const nG = ac.createGain();
  nG.gain.setValueAtTime(0.0001, t0 + 0.8);
  nG.gain.exponentialRampToValueAtTime(0.25, t0 + 1.6);
  nG.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.5);
  noise.connect(nFilt).connect(nG).connect(ac.destination);
  noise.start(t0 + 0.8); noise.stop(t0 + 2.6);

  // Sparkle chimes
  const notes = [1046, 1318, 1568, 2093, 2637];
  notes.forEach((f, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    const start = t0 + 2.2 + i * 0.18;
    o.type = "sine";
    o.frequency.setValueAtTime(f, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
    o.connect(g).connect(ac.destination);
    o.start(start); o.stop(start + 1.3);
  });

  // Impact hit
  const hit = ac.createOscillator();
  const hitG = ac.createGain();
  hit.type = "triangle";
  hit.frequency.setValueAtTime(220, t0 + 2.4);
  hit.frequency.exponentialRampToValueAtTime(55, t0 + 3.2);
  hitG.gain.setValueAtTime(0.0001, t0 + 2.4);
  hitG.gain.exponentialRampToValueAtTime(0.4, t0 + 2.45);
  hitG.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.6);
  hit.connect(hitG).connect(ac.destination);
  hit.start(t0 + 2.4); hit.stop(t0 + 3.6);
}

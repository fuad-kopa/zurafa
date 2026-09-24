// Synthesised WebAudio sounds: no assets, no licences.

export type SoundName = 'move' | 'capture' | 'check' | 'promote' | 'end' | 'illegal';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

// iOS only allows an AudioContext to start from a user gesture.
export function unlockAudio(): void {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function knock(ac: AudioContext, at: number, freq: number, gain: number, dur: number): void {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq * 9;
  band.Q.value = 1.2;
  const ng = ac.createGain();
  ng.gain.value = gain * 0.7;
  noise.connect(band).connect(ng).connect(ac.destination);
  noise.start(at);

  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, at + dur);
  const og = ac.createGain();
  og.gain.setValueAtTime(gain, at);
  og.gain.exponentialRampToValueAtTime(0.0001, at + dur * 2.5);
  osc.connect(og).connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur * 2.6);
}

function tone(ac: AudioContext, at: number, freq: number, gain: number, dur: number, type: OscillatorType = 'triangle'): void {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

export function playSound(name: SoundName): void {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const ac = ctx;
  const t = ac.currentTime + 0.005;
  switch (name) {
    case 'move':
      knock(ac, t, 130, 0.5, 0.045);
      break;
    case 'capture':
      knock(ac, t, 95, 0.75, 0.06);
      knock(ac, t + 0.055, 150, 0.4, 0.035);
      break;
    case 'check':
      knock(ac, t, 130, 0.45, 0.045);
      tone(ac, t + 0.03, 660, 0.12, 0.16);
      tone(ac, t + 0.13, 880, 0.12, 0.2);
      break;
    case 'promote':
      knock(ac, t, 130, 0.45, 0.045);
      [523, 659, 784].forEach((f, i) => tone(ac, t + 0.04 + i * 0.08, f, 0.1, 0.22));
      break;
    case 'end':
      [392, 523, 659, 784].forEach((f, i) => tone(ac, t + i * 0.13, f, 0.12, 0.5, 'sine'));
      break;
    case 'illegal':
      tone(ac, t, 160, 0.1, 0.12, 'square');
      break;
  }
}

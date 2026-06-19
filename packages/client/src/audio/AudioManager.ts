/**
 * AudioManager — Web Audio API wrapper with distance-based volume.
 *
 * Handles mobile audio unlock (AudioContext must be resumed inside a user gesture).
 * Generates richer placeholder tones with harmonics until real audio files are provided.
 */

const MAX_AUDIBLE_DISTANCE = 200; // meters

export type SoundId =
  | 'bow-draw'
  | 'bow-release'
  | 'arrow-land'
  | 'arrow-whiz'
  | 'arrow-flight'
  | 'ui-click'
  | 'ambient'
  | 'kill'
  | 'hurt'
  | 'hitmarker';

interface SoundDef {
  buffer: AudioBuffer | null;
  loop: boolean;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private sounds = new Map<SoundId, SoundDef>();
  private activeSources = new Map<string, AudioBufferSourceNode>();
  private unlocked = false;
  private ambientKey: string | null = null;

  constructor() {
    // Defer AudioContext creation to first user gesture
  }

  /** Must be called inside a user gesture (tap/click) to unlock mobile audio. */
  async unlock() {
    if (this.unlocked && this.ctx) {
      // Already unlocked — just resume if browser re-suspended
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }
      return;
    }

    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;

    // Generate richer placeholder tones
    this.generateBowDraw();
    this.generateBowRelease();
    this.generateArrowLand();
    this.generateArrowWhiz();
    this.generateArrowFlight();
    this.generateUIClick();
    this.generateAmbient();
    this.generateKill();
    this.generateHurt();
    this.generateHitmarker();
  }

  // --- Richer placeholder tone generators ---

  /** Bow draw: rising tension creak with harmonics */
  private generateBowDraw() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 1.0;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t * 8) * Math.min(1, (dur - t) * 8);
      // Rising pitch creak (80 -> 200 Hz) with harmonics
      const freq = 80 + t * 120;
      const v = Math.sin(2 * Math.PI * freq * t) * 0.15
        + Math.sin(2 * Math.PI * freq * 2.02 * t) * 0.08
        + Math.sin(2 * Math.PI * freq * 3.01 * t) * 0.04
        + (Math.random() - 0.5) * 0.02; // subtle noise for texture
      d[i] = v * env;
    }
    this.sounds.set('bow-draw', { buffer: buf, loop: true });
  }

  /** Bow release: sharp twang with quick decay */
  private generateBowRelease() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 0.25;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Rapid exponential decay
      const env = Math.exp(-t * 15);
      // Bright twang with detuned harmonics
      const v = Math.sin(2 * Math.PI * 320 * t) * 0.2
        + Math.sin(2 * Math.PI * 640 * t) * 0.12
        + Math.sin(2 * Math.PI * 960 * t) * 0.06
        + Math.sin(2 * Math.PI * 420 * t) * 0.05; // inharmonic for "string" feel
      d[i] = v * env;
    }
    this.sounds.set('bow-release', { buffer: buf, loop: false });
  }

  /** Arrow land: dull thud with brief rumble */
  private generateArrowLand() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 0.3;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 12);
      // Low thud + noise burst
      const v = Math.sin(2 * Math.PI * 80 * t) * 0.25
        + Math.sin(2 * Math.PI * 55 * t) * 0.15
        + (Math.random() - 0.5) * 0.15 * Math.exp(-t * 30); // impact noise burst
      d[i] = v * env;
    }
    this.sounds.set('arrow-land', { buffer: buf, loop: false });
  }

  /** Arrow whiz: quick high-pitched whoosh */
  private generateArrowWhiz() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 0.2;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Bell-shaped envelope
      const env = Math.sin(Math.PI * t / dur) * 0.3;
      // Dropping pitch whoosh (800 -> 400 Hz) + noise
      const freq = 800 - t * 2000;
      const v = Math.sin(2 * Math.PI * freq * t) * 0.15
        + (Math.random() - 0.5) * 0.2; // wind noise
      d[i] = v * env;
    }
    this.sounds.set('arrow-whiz', { buffer: buf, loop: false });
  }

  /** Arrow flight: looping wind hum */
  private generateArrowFlight() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 0.5;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t * 20) * Math.min(1, (dur - t) * 20);
      // Subtle wind + flutter
      const v = Math.sin(2 * Math.PI * 280 * t) * 0.05
        + Math.sin(2 * Math.PI * 310 * t + Math.sin(t * 40) * 0.5) * 0.06
        + (Math.random() - 0.5) * 0.06;
      d[i] = v * env;
    }
    this.sounds.set('arrow-flight', { buffer: buf, loop: true });
  }

  /** UI click: short, clean blip */
  private generateUIClick() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 0.06;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 60);
      d[i] = Math.sin(2 * Math.PI * 800 * t) * 0.15 * env;
    }
    this.sounds.set('ui-click', { buffer: buf, loop: false });
  }

  /** Ambient bed: soft filtered wind hum, seamless loop for gameplay atmosphere */
  private generateAmbient() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 3.0;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    // Low-passed noise + slow LFO swell, with crossfaded ends for a seamless loop.
    let last = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const noise = (Math.random() - 0.5);
      last = last * 0.96 + noise * 0.04; // simple one-pole low-pass
      const swell = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.12 * t);
      const drone = Math.sin(2 * Math.PI * 60 * t) * 0.015;
      d[i] = (last * 0.9 + drone) * (0.35 + swell * 0.35);
    }
    // Crossfade last 0.3s into the start to avoid a seam click.
    const xf = Math.floor(sr * 0.3);
    for (let i = 0; i < xf; i++) {
      const a = i / xf;
      d[i] = d[i] * a + d[len - xf + i] * (1 - a);
    }
    this.sounds.set('ambient', { buffer: buf, loop: true });
  }

  /** Kill sting: bright rising triad, confident and short */
  private generateKill() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 0.5;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    // Major triad arpeggio: A4 -> C#5 -> E5
    const notes = [440, 554, 659];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const step = Math.min(notes.length - 1, Math.floor(t / 0.1));
      const freq = notes[step];
      const noteT = t - step * 0.1;
      const env = Math.exp(-noteT * 6) * Math.min(1, t * 40);
      d[i] = (Math.sin(2 * Math.PI * freq * t) * 0.18
        + Math.sin(2 * Math.PI * freq * 2 * t) * 0.06) * env;
    }
    this.sounds.set('kill', { buffer: buf, loop: false });
  }

  /** Hurt: harsh low impact + noise crunch when the local player is hit */
  private generateHurt() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 0.4;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 9);
      const v = Math.sin(2 * Math.PI * 70 * t) * 0.3
        + Math.sin(2 * Math.PI * 110 * t) * 0.12
        + (Math.random() - 0.5) * 0.35 * Math.exp(-t * 22);
      d[i] = v * env;
    }
    this.sounds.set('hurt', { buffer: buf, loop: false });
  }

  /** Hitmarker: crisp double-tick confirming a landed shot */
  private generateHitmarker() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const dur = 0.09;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 70);
      d[i] = (Math.sin(2 * Math.PI * 1400 * t) * 0.16
        + Math.sin(2 * Math.PI * 2100 * t) * 0.08) * env;
    }
    this.sounds.set('hitmarker', { buffer: buf, loop: false });
  }

  /** Start the looping ambient bed (no-op if already playing). */
  startAmbient() {
    if (this.ambientKey || !this.unlocked) return;
    this.ambientKey = this.play('ambient');
  }

  /** Stop the ambient bed. */
  stopAmbient() {
    if (this.ambientKey) {
      this.stop(this.ambientKey);
      this.ambientKey = null;
    }
  }

  /**
   * Load a sound from a URL. Call after unlock.
   */
  async load(id: SoundId, url: string, loop = false) {
    if (!this.ctx) return;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.sounds.set(id, { buffer, loop });
    } catch {
      console.warn(`Failed to load sound: ${id} from ${url}`);
    }
  }

  /**
   * Play a sound with optional distance-based volume attenuation.
   * @param id Sound identifier
   * @param options Position info for distance attenuation
   * @returns A key string to stop the sound later (for looping sounds)
   */
  play(id: SoundId, options?: {
    listenerX?: number;
    listenerZ?: number;
    sourceX?: number;
    sourceZ?: number;
  }): string | null {
    if (!this.ctx || !this.unlocked) return null;

    // Re-resume if browser suspended the context (e.g. after tab switch)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const def = this.sounds.get(id);
    if (!def?.buffer) return null;

    // Distance attenuation
    let volume = 1;
    if (options?.sourceX !== undefined && options?.listenerX !== undefined) {
      const dx = (options.sourceX ?? 0) - (options.listenerX ?? 0);
      const dz = (options.sourceZ ?? 0) - (options.listenerZ ?? 0);
      const dist = Math.sqrt(dx * dx + dz * dz);
      volume = Math.max(0, 1 - dist / MAX_AUDIBLE_DISTANCE);
      if (volume <= 0) return null; // too far to hear
    }

    const source = this.ctx.createBufferSource();
    source.buffer = def.buffer;
    source.loop = def.loop;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();

    const key = `${id}-${Date.now()}`;
    this.activeSources.set(key, source);
    source.onended = () => this.activeSources.delete(key);

    return key;
  }

  /** Stop a specific playing sound by key. */
  stop(key: string) {
    const source = this.activeSources.get(key);
    if (source) {
      try { source.stop(); } catch { /* already stopped */ }
      this.activeSources.delete(key);
    }
  }

  /** Stop all currently playing sounds. */
  stopAll() {
    for (const [, source] of this.activeSources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.activeSources.clear();
  }

  dispose() {
    this.stopAll();
    this.ctx?.close();
  }
}

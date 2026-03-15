/**
 * AudioManager — Web Audio API wrapper with distance-based volume.
 *
 * Handles mobile audio unlock (AudioContext must be resumed inside a user gesture).
 * Preloads sounds from files or generates placeholder tones.
 * Plays with optional distance attenuation.
 */

const MAX_AUDIBLE_DISTANCE = 200; // meters

export type SoundId = 'bow-draw' | 'bow-release' | 'arrow-land' | 'arrow-whiz' | 'arrow-flight';

interface SoundDef {
  buffer: AudioBuffer | null;
  loop: boolean;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private sounds = new Map<SoundId, SoundDef>();
  private activeSources = new Map<string, AudioBufferSourceNode>();
  private unlocked = false;

  constructor() {
    // Defer AudioContext creation to first user gesture
  }

  /** Must be called inside a user gesture (tap/click) to unlock mobile audio. */
  async unlock() {
    if (this.unlocked) return;

    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.unlocked = true;

    // Generate placeholder tones for all sounds
    this.generatePlaceholder('bow-draw', 220, 0.8, true);
    this.generatePlaceholder('bow-release', 440, 0.15, false);
    this.generatePlaceholder('arrow-land', 150, 0.2, false);
    this.generatePlaceholder('arrow-whiz', 600, 0.15, false);
    this.generatePlaceholder('arrow-flight', 300, 0.5, true);
  }

  /**
   * Generate a simple sine wave placeholder tone.
   * These will be replaced with real audio files later.
   */
  private generatePlaceholder(id: SoundId, freq: number, duration: number, loop: boolean) {
    if (!this.ctx) return;

    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Sine wave with fade in/out envelope
      const env = Math.min(1, t * 20) * Math.min(1, (duration - t) * 20);
      data[i] = Math.sin(2 * Math.PI * freq * t) * 0.3 * env;
    }

    this.sounds.set(id, { buffer, loop });
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
    for (const [key, source] of this.activeSources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.activeSources.clear();
  }

  dispose() {
    this.stopAll();
    this.ctx?.close();
  }
}

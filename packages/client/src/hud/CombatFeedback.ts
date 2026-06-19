/**
 * CombatFeedback — screen-space juice for the moment-to-moment combat loop:
 * a red damage vignette when you're hit, a hitmarker when you land a shot,
 * and a punchy kill banner on elimination.
 *
 * All effects are fire-and-forget DOM overlays driven by CSS transitions.
 */
export class CombatFeedback {
  private vignette: HTMLDivElement;
  private hitMarker: HTMLDivElement;
  private killBanner: HTMLDivElement;
  private hitTimer = 0;
  private killTimer = 0;

  constructor(parent: HTMLElement) {
    // --- Damage vignette (red radial flash on taking damage) ---
    this.vignette = document.createElement('div');
    Object.assign(this.vignette.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      opacity: '0',
      zIndex: '60',
      background:
        'radial-gradient(ellipse at center, rgba(170,0,0,0) 45%, rgba(170,0,0,0.85) 100%)',
      transition: 'opacity 0.45s ease-out',
    });
    parent.appendChild(this.vignette);

    // --- Hitmarker (four ticks forming an X at screen center) ---
    this.hitMarker = document.createElement('div');
    Object.assign(this.hitMarker.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '28px',
      height: '28px',
      transform: 'translate(-50%, -50%) scale(1.4)',
      pointerEvents: 'none',
      opacity: '0',
      zIndex: '61',
      transition: 'opacity 0.12s ease-out, transform 0.12s ease-out',
    });
    for (const rot of [45, -45]) {
      for (const sign of [-1, 1]) {
        const tick = document.createElement('div');
        Object.assign(tick.style, {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '10px',
          height: '2px',
          background: '#fff',
          boxShadow: '0 0 4px rgba(0,0,0,0.8)',
          transformOrigin: 'left center',
          transform: `rotate(${rot}deg) translateX(${sign * 7}px)`,
        });
        this.hitMarker.appendChild(tick);
      }
    }
    parent.appendChild(this.hitMarker);

    // --- Kill banner (big punch-in text) ---
    this.killBanner = document.createElement('div');
    Object.assign(this.killBanner.style, {
      position: 'absolute',
      top: '24%',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(0.6)',
      pointerEvents: 'none',
      opacity: '0',
      zIndex: '62',
      fontSize: '34px',
      fontWeight: '800',
      letterSpacing: '1px',
      color: '#fff',
      textShadow: '0 0 18px rgba(255,90,40,0.9), 2px 2px 4px rgba(0,0,0,0.8)',
      whiteSpace: 'nowrap',
      transition: 'opacity 0.18s ease-out, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
    });
    parent.appendChild(this.killBanner);
  }

  /** Red flash when the local player takes a hit. */
  flashDamage(intensity = 1) {
    this.vignette.style.transition = 'opacity 0.04s ease-out';
    this.vignette.style.opacity = String(Math.min(1, 0.85 * intensity));
    requestAnimationFrame(() => {
      this.vignette.style.transition = 'opacity 0.5s ease-out';
      this.vignette.style.opacity = '0';
    });
  }

  /** Confirmation marker when the local player lands a shot. */
  showHitmarker() {
    this.hitMarker.style.transition = 'none';
    this.hitMarker.style.opacity = '1';
    this.hitMarker.style.transform = 'translate(-50%, -50%) scale(1.4)';
    requestAnimationFrame(() => {
      this.hitMarker.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
      this.hitMarker.style.opacity = '0';
      this.hitMarker.style.transform = 'translate(-50%, -50%) scale(1.0)';
    });
  }

  /** Big banner on an elimination, e.g. "ELIMINATED Bob". */
  showKill(text: string) {
    clearTimeout(this.killTimer);
    this.killBanner.textContent = text;
    this.killBanner.style.opacity = '1';
    this.killBanner.style.transform = 'translate(-50%, -50%) scale(1.0)';
    this.killTimer = window.setTimeout(() => {
      this.killBanner.style.opacity = '0';
      this.killBanner.style.transform = 'translate(-50%, -50%) scale(0.85)';
    }, 1600);
  }

  dispose() {
    clearTimeout(this.hitTimer);
    clearTimeout(this.killTimer);
    this.vignette.remove();
    this.hitMarker.remove();
    this.killBanner.remove();
  }
}

/**
 * Archery ranging reticle — inverted-T with tick marks along
 * horizontal and vertical axes. Tightens and glows golden on draw.
 */
export class Crosshair {
  private el: HTMLDivElement;
  private parts: HTMLDivElement[] = [];
  private pin: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    });

    const color = 'rgba(255, 255, 255, 0.45)';
    const thin = '1px';

    // --- Horizontal crossbar (centered at top) ---
    const hBar = this.makePart({
      left: '-40px', top: '0', width: '80px', height: thin,
      transform: 'translateY(-50%)',
    }, color);

    // Horizontal ticks (small vertical marks along the horizontal bar)
    const hTickSpacing = 8;
    const hTickCount = 5; // ticks per side
    for (let i = 1; i <= hTickCount; i++) {
      // Left side
      this.makePart({
        left: `${-i * hTickSpacing}px`, top: '0',
        width: thin, height: '5px',
        transform: 'translate(-50%, -50%)',
      }, color);
      // Right side
      this.makePart({
        left: `${i * hTickSpacing}px`, top: '0',
        width: thin, height: '5px',
        transform: 'translate(-50%, -50%)',
      }, color);
    }

    // --- Vertical post (extends downward from center) ---
    const vLength = 56;
    const vBar = this.makePart({
      left: '0', top: '0', width: thin, height: `${vLength}px`,
      transform: 'translateX(-50%)',
    }, color);

    // Vertical ticks (small horizontal marks along the vertical post)
    const vTickSpacing = 8;
    const vTickCount = Math.floor(vLength / vTickSpacing);
    for (let i = 1; i <= vTickCount; i++) {
      this.makePart({
        left: '0', top: `${i * vTickSpacing}px`,
        width: '5px', height: thin,
        transform: 'translate(-50%, -50%)',
      }, color);
    }

    // Center aiming dot
    this.pin = document.createElement('div');
    Object.assign(this.pin.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '3px',
      height: '3px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.9)',
      transform: 'translate(-50%, -50%)',
      transition: 'background 0.15s, box-shadow 0.15s, width 0.15s, height 0.15s',
    });
    this.el.appendChild(this.pin);

    parent.appendChild(this.el);
  }

  private makePart(style: Record<string, string>, bg: string): HTMLDivElement {
    const div = document.createElement('div');
    Object.assign(div.style, {
      position: 'absolute',
      background: bg,
      transition: 'background 0.15s, box-shadow 0.15s, opacity 0.15s',
      ...style,
    });
    this.parts.push(div);
    this.el.appendChild(div);
    return div;
  }

  /**
   * Update reticle based on draw force (0 = idle, 1 = fully drawn).
   * Scales tighter and shifts white to gold.
   */
  setDrawForce(force: number) {
    // No scaling — reticle stays the same size.
    // Color: translucent white at rest -> warm gold on full draw
    const r = 255;
    const g = Math.round(255 - force * 55);
    const b = Math.round(255 - force * 205);
    const alpha = 0.45 + force * 0.5; // subtle at rest, solid on draw
    const color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    const glowAlpha = force * 0.45;
    const glowSize = 2 + force * 6;
    const shadow = force > 0.05
      ? `0 0 ${glowSize}px rgba(255, 200, 50, ${glowAlpha})`
      : 'none';

    for (const part of this.parts) {
      part.style.background = color;
      part.style.boxShadow = shadow;
    }

    // Pin fills with gold glow
    this.pin.style.background = `rgba(${r}, ${g}, ${Math.round(b * 0.6)}, ${0.6 + force * 0.35})`;
    this.pin.style.boxShadow = shadow;
  }

  dispose() {
    this.el.remove();
  }
}

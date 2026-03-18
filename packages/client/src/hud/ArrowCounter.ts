import { PACING } from '@bojo-dojo/common';

/**
 * Arrow count state holder kept for gameplay logic.
 * The visible ammo UI lives in the bottom inventory bar.
 */
export class ArrowCounter {
  private el: HTMLDivElement;
  private countEl: HTMLSpanElement;
  private _count: number;

  constructor(parent: HTMLElement) {
    this._count = PACING.STARTING_ARROWS;

    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      top: '16px',
      left: '16px',
      display: 'none',
      fontSize: '20px',
      fontWeight: 'bold',
      textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      transition: 'transform 0.15s ease-out, color 0.3s',
      transformOrigin: 'left center',
    });

    // Arrow icon (unicode)
    const icon = document.createElement('span');
    icon.textContent = '\u{1F3F9} ';
    this.el.appendChild(icon);

    this.countEl = document.createElement('span');
    this.countEl.textContent = String(this._count);
    this.el.appendChild(this.countEl);

    parent.appendChild(this.el);
  }

  get count() { return this._count; }

  set count(val: number) {
    const prev = this._count;
    this._count = Math.max(0, val);
    this.countEl.textContent = String(this._count);

    // Pop animation on decrement
    if (val < prev) {
      this.el.style.transform = 'scale(1.3)';
      setTimeout(() => { this.el.style.transform = 'scale(1)'; }, 150);
    }

    // Low ammo warning
    if (this._count <= 2 && this._count > 0) {
      this.el.style.color = '#ffc832';
    } else if (this._count === 0) {
      this.el.style.color = '#ff4444';
    } else {
      this.el.style.color = '#ffffff';
    }
  }

  dispose() {
    this.el.remove();
  }
}

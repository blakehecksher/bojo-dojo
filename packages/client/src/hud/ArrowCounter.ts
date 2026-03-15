import { PACING } from '@bojo-dojo/common';

/**
 * Arrow count display — top-left corner.
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
      fontSize: '18px',
      fontWeight: 'bold',
      textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
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
    this._count = Math.max(0, val);
    this.countEl.textContent = String(this._count);
  }

  dispose() {
    this.el.remove();
  }
}

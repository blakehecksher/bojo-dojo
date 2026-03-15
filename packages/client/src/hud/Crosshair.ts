/**
 * Centered crosshair overlay.
 */
export class Crosshair {
  private el: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '24px',
      height: '24px',
      pointerEvents: 'none',
    });

    // Horizontal line
    const h = document.createElement('div');
    Object.assign(h.style, {
      position: 'absolute',
      top: '50%',
      left: '0',
      width: '100%',
      height: '2px',
      background: 'rgba(255, 255, 255, 0.7)',
      transform: 'translateY(-50%)',
    });
    this.el.appendChild(h);

    // Vertical line
    const v = document.createElement('div');
    Object.assign(v.style, {
      position: 'absolute',
      left: '50%',
      top: '0',
      height: '100%',
      width: '2px',
      background: 'rgba(255, 255, 255, 0.7)',
      transform: 'translateX(-50%)',
    });
    this.el.appendChild(v);

    // Center dot
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.9)',
      transform: 'translate(-50%, -50%)',
    });
    this.el.appendChild(dot);

    parent.appendChild(this.el);
  }

  dispose() {
    this.el.remove();
  }
}

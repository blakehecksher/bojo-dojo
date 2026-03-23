/**
 * Full-viewport soft blue glow overlay indicating active shield.
 * Uses a CSS box-shadow inset on a full-screen div.
 */
export class ShieldGlow {
  private el: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      boxShadow: 'inset 0 0 60px 20px rgba(100, 200, 255, 0.25)',
      opacity: '0',
      transition: 'opacity 0.4s ease',
      zIndex: '0',
    });
    parent.appendChild(this.el);
  }

  setActive(active: boolean) {
    this.el.style.opacity = active ? '1' : '0';
  }

  dispose() {
    this.el.remove();
  }
}

export class StatusBanner {
  readonly element: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    Object.assign(this.element.style, {
      position: 'absolute',
      bottom: '84px',
      left: '50%',
      transform: 'translateX(-50%)',
      minWidth: '180px',
      padding: '8px 14px',
      borderRadius: '999px',
      background: 'rgba(0,0,0,0.48)',
      color: '#fff',
      fontSize: '14px',
      textAlign: 'center',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.2s',
    });
    parent.appendChild(this.element);
  }

  show(text: string, tone: 'neutral' | 'warning' = 'neutral') {
    this.element.textContent = text;
    this.element.style.background = tone === 'warning'
      ? 'rgba(119, 34, 34, 0.72)'
      : 'rgba(0,0,0,0.48)';
    this.element.style.opacity = '1';
  }

  hide() {
    this.element.style.opacity = '0';
  }

  dispose() {
    this.element.remove();
  }
}

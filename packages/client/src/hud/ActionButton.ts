export class ActionButton {
  readonly element: HTMLButtonElement;
  private readonly baseTransform: string;

  constructor(parent: HTMLElement, text: string, style: Partial<CSSStyleDeclaration>) {
    this.element = document.createElement('button');
    this.element.textContent = text;
    this.baseTransform = (style.transform as string) || '';
    Object.assign(this.element.style, {
      position: 'absolute',
      padding: '10px 16px',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(0,0,0,0.35)',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 'bold',
      pointerEvents: 'auto',
      touchAction: 'none',
      cursor: 'pointer',
      transition: 'transform 0.1s, background 0.15s, box-shadow 0.15s',
      ...style,
    });

    this.element.addEventListener('pointerenter', () => {
      this.element.style.transform = `${this.baseTransform} scale(1.03)`.trim();
      this.element.style.background = 'rgba(0,0,0,0.5)';
    });
    this.element.addEventListener('pointerleave', () => {
      this.element.style.transform = this.baseTransform || 'scale(1)';
      this.element.style.background = (style.background as string) || 'rgba(0,0,0,0.35)';
    });
    this.element.addEventListener('pointerdown', () => {
      this.element.style.transform = `${this.baseTransform} scale(0.97)`.trim();
    });
    this.element.addEventListener('pointerup', () => {
      this.element.style.transform = `${this.baseTransform} scale(1.03)`.trim();
    });

    parent.appendChild(this.element);
  }

  setLabel(text: string) {
    this.element.textContent = text;
  }

  setVisible(visible: boolean) {
    this.element.style.display = visible ? 'block' : 'none';
  }

  setEnabled(enabled: boolean) {
    this.element.disabled = !enabled;
    this.element.style.opacity = enabled ? '1' : '0.45';
  }

  onPress(cb: () => void) {
    this.element.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      cb();
    });
  }

  dispose() {
    this.element.remove();
  }
}

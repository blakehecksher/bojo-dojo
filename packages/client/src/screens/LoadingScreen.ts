/**
 * Loading screen — shown during terrain generation.
 */
export class LoadingScreen {
  private overlay: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      background: '#000',
      zIndex: '300',
      pointerEvents: 'auto',
    });

    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '32px',
      height: '32px',
      border: '3px solid rgba(255,255,255,0.2)',
      borderTop: '3px solid #fff',
      borderRadius: '50%',
      animation: 'loading-spin 0.8s linear infinite',
    });
    this.overlay.appendChild(spinner);

    const text = document.createElement('div');
    text.textContent = 'Generating terrain...';
    Object.assign(text.style, {
      fontSize: '16px',
      color: 'rgba(255,255,255,0.7)',
    });
    this.overlay.appendChild(text);

    // Inject keyframe animation
    const style = document.createElement('style');
    style.textContent = '@keyframes loading-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);

    this.overlay.style.display = 'none';
    parent.appendChild(this.overlay);
  }

  show() {
    this.overlay.style.display = 'flex';
  }

  hide() {
    this.overlay.style.display = 'none';
  }

  dispose() {
    this.overlay.remove();
  }
}

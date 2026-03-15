/**
 * Round end overlay — shows result and tap-to-continue.
 */
export class RoundEndScreen {
  private overlay: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private subtitleEl: HTMLDivElement;

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
      background: 'rgba(0, 0, 0, 0.6)',
      zIndex: '100',
      pointerEvents: 'auto',
      opacity: '0',
      transition: 'opacity 0.3s',
    });

    this.titleEl = document.createElement('div');
    Object.assign(this.titleEl.style, {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#fff',
      textShadow: '2px 2px 6px rgba(0,0,0,0.8)',
      marginBottom: '12px',
    });
    this.overlay.appendChild(this.titleEl);

    this.subtitleEl = document.createElement('div');
    Object.assign(this.subtitleEl.style, {
      fontSize: '16px',
      color: 'rgba(255,255,255,0.7)',
    });
    this.overlay.appendChild(this.subtitleEl);

    this.overlay.style.display = 'none';
    parent.appendChild(this.overlay);
  }

  show(title: string, subtitle: string, onTap?: () => void) {
    this.titleEl.textContent = title;
    this.subtitleEl.textContent = subtitle;
    this.overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
    });

    if (onTap) {
      const handler = () => {
        this.overlay.removeEventListener('pointerdown', handler);
        this.hide();
        onTap();
      };
      this.overlay.addEventListener('pointerdown', handler);
    }
  }

  hide() {
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      this.overlay.style.display = 'none';
    }, 300);
  }

  dispose() {
    this.overlay.remove();
  }
}

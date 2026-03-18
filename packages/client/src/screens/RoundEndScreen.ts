export class RoundEndScreen {
  private overlay: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private subtitleEl: HTMLDivElement;
  private actionsEl: HTMLDivElement;

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
      transition: 'opacity 0.3s ease-out',
    });

    this.titleEl = document.createElement('div');
    Object.assign(this.titleEl.style, {
      fontSize: '42px',
      fontWeight: 'bold',
      color: '#fff',
      textShadow: '0 0 20px rgba(255, 200, 50, 0.3), 2px 2px 6px rgba(0,0,0,0.8)',
      marginBottom: '12px',
      transform: 'scale(0.5)',
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    });
    this.overlay.appendChild(this.titleEl);

    this.subtitleEl = document.createElement('div');
    Object.assign(this.subtitleEl.style, {
      fontSize: '16px',
      color: 'rgba(255,255,255,0.7)',
      opacity: '0',
      transition: 'opacity 0.3s ease-out 0.2s',
      marginBottom: '12px',
    });
    this.overlay.appendChild(this.subtitleEl);

    this.actionsEl = document.createElement('div');
    Object.assign(this.actionsEl.style, {
      display: 'flex',
      gap: '10px',
      opacity: '0',
      transition: 'opacity 0.3s ease-out 0.25s',
    });
    this.overlay.appendChild(this.actionsEl);

    this.overlay.style.display = 'none';
    parent.appendChild(this.overlay);
  }

  show(
    title: string,
    subtitle: string,
    onTap?: () => void,
    actions?: Array<{ label: string; onPress: () => void }>,
  ) {
    this.titleEl.textContent = title;
    this.subtitleEl.textContent = subtitle;
    this.actionsEl.innerHTML = '';

    if (actions?.length) {
      actions.forEach((action) => {
        const button = document.createElement('button');
        button.textContent = action.label;
        Object.assign(button.style, {
          padding: '10px 18px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          fontWeight: 'bold',
          cursor: 'pointer',
          pointerEvents: 'auto',
        });
        button.addEventListener('pointerdown', (event) => {
          event.stopPropagation();
          this.hide();
          action.onPress();
        });
        this.actionsEl.appendChild(button);
      });
    }

    this.overlay.style.display = 'flex';
    this.titleEl.style.transform = 'scale(0.5)';
    this.subtitleEl.style.opacity = '0';
    this.actionsEl.style.opacity = '0';
    this.overlay.style.opacity = '0';

    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
      this.titleEl.style.transform = 'scale(1)';
      this.subtitleEl.style.opacity = '1';
      this.actionsEl.style.opacity = actions?.length ? '1' : '0';
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
    this.titleEl.style.transform = 'scale(0.8)';
    setTimeout(() => {
      this.overlay.style.display = 'none';
    }, 300);
  }

  dispose() {
    this.overlay.remove();
  }
}

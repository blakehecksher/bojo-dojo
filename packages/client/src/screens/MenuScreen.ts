/**
 * Main menu — Create Game / Join Game buttons.
 * Polished with transitions, hover states, and fade-in.
 */
const PLAYER_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
];

export class MenuScreen {
  private overlay: HTMLDivElement;
  private codeInput!: HTMLInputElement;
  private selectedColorIndex = 0;
  private onCreateGame?: (name: string, colorIndex: number) => void;
  private onJoinGame?: (code: string, name: string, colorIndex: number) => void;
  private onOfflinePlay?: () => void;

  constructor(parent: HTMLElement) {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'absolute',
      top: '0', left: '0',
      width: '100%', height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      background: 'rgba(0, 0, 0, 0.85)',
      zIndex: '200',
      pointerEvents: 'auto',
      opacity: '0',
      transition: 'opacity 0.3s ease-out',
    });

    // Title
    const title = document.createElement('div');
    title.textContent = 'BOJO DOJO';
    Object.assign(title.style, {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#fff',
      letterSpacing: '6px',
      marginBottom: '24px',
      textShadow: '0 0 20px rgba(255, 200, 50, 0.3), 3px 3px 8px rgba(0,0,0,0.8)',
    });
    this.overlay.appendChild(title);

    // Name input
    const nameInput = document.createElement('input');
    nameInput.placeholder = 'Your name';
    nameInput.maxLength = 16;
    nameInput.value = localStorage.getItem('bojo-player-name') || `Player ${Math.floor(Math.random() * 999)}`;
    Object.assign(nameInput.style, {
      padding: '10px 16px',
      fontSize: '16px',
      borderRadius: '6px',
      border: '2px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.08)',
      color: '#fff',
      outline: 'none',
      width: '200px',
      textAlign: 'center',
      transition: 'border-color 0.2s, background 0.2s',
    });
    nameInput.addEventListener('focus', () => {
      nameInput.style.borderColor = 'rgba(255, 200, 50, 0.5)';
      nameInput.style.background = 'rgba(255,255,255,0.12)';
    });
    nameInput.addEventListener('blur', () => {
      nameInput.style.borderColor = 'rgba(255,255,255,0.2)';
      nameInput.style.background = 'rgba(255,255,255,0.08)';
      if (nameInput.value.trim()) {
        localStorage.setItem('bojo-player-name', nameInput.value.trim());
      }
    });
    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim()) {
        localStorage.setItem('bojo-player-name', nameInput.value.trim());
      }
    });
    this.overlay.appendChild(nameInput);

    // Color picker row
    this.selectedColorIndex = parseInt(localStorage.getItem('bojo-player-color') || '0', 10) || 0;
    const colorRow = document.createElement('div');
    Object.assign(colorRow.style, {
      display: 'flex',
      gap: '10px',
      marginBottom: '8px',
    });
    const colorSwatches: HTMLDivElement[] = [];
    PLAYER_COLORS.forEach((color, i) => {
      const swatch = document.createElement('div');
      Object.assign(swatch.style, {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: color,
        cursor: 'pointer',
        border: i === this.selectedColorIndex ? '3px solid #fff' : '3px solid transparent',
        boxShadow: i === this.selectedColorIndex ? `0 0 10px ${color}` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      });
      swatch.addEventListener('pointerdown', () => {
        this.selectedColorIndex = i;
        localStorage.setItem('bojo-player-color', String(i));
        colorSwatches.forEach((s, j) => {
          s.style.border = j === i ? '3px solid #fff' : '3px solid transparent';
          s.style.boxShadow = j === i ? `0 0 10px ${PLAYER_COLORS[j]}` : 'none';
        });
      });
      colorSwatches.push(swatch);
      colorRow.appendChild(swatch);
    });
    this.overlay.appendChild(colorRow);

    // Create button
    const createBtn = this.makeButton('Create Game', true);
    createBtn.addEventListener('pointerdown', () => {
      this.onCreateGame?.(nameInput.value || 'Player', this.selectedColorIndex);
    });
    this.overlay.appendChild(createBtn);

    // Join section
    const joinRow = document.createElement('div');
    Object.assign(joinRow.style, { display: 'flex', gap: '8px', alignItems: 'center' });

    this.codeInput = document.createElement('input');
    const codeInput = this.codeInput;
    codeInput.placeholder = '000000';
    codeInput.maxLength = 6;
    codeInput.inputMode = 'numeric';
    codeInput.pattern = '[0-9]*';
    Object.assign(codeInput.style, {
      padding: '10px 16px',
      fontSize: '16px',
      borderRadius: '6px',
      border: '2px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.08)',
      color: '#fff',
      outline: 'none',
      width: '120px',
      textAlign: 'center',
      transition: 'border-color 0.2s, background 0.2s',
    });
    codeInput.addEventListener('focus', () => {
      codeInput.style.borderColor = 'rgba(255, 200, 50, 0.5)';
      codeInput.style.background = 'rgba(255,255,255,0.12)';
    });
    codeInput.addEventListener('blur', () => {
      codeInput.style.borderColor = 'rgba(255,255,255,0.2)';
      codeInput.style.background = 'rgba(255,255,255,0.08)';
    });
    joinRow.appendChild(codeInput);

    const joinBtn = this.makeButton('Join');
    joinBtn.addEventListener('pointerdown', () => {
      const code = codeInput.value.trim();
      if (code) this.onJoinGame?.(code, nameInput.value || 'Player', this.selectedColorIndex);
    });
    joinRow.appendChild(joinBtn);
    this.overlay.appendChild(joinRow);

    // Offline practice button
    const offlineBtn = this.makeButton('Practice (Offline)');
    Object.assign(offlineBtn.style, {
      marginTop: '8px',
      fontSize: '14px',
      padding: '8px 20px',
      opacity: '0.6',
      background: 'rgba(255, 255, 255, 0.08)',
    });
    offlineBtn.addEventListener('pointerdown', () => {
      this.onOfflinePlay?.();
    });
    this.overlay.appendChild(offlineBtn);

    this.overlay.style.display = 'none';
    parent.appendChild(this.overlay);
  }

  private makeButton(text: string, primary = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;

    const bg = primary ? 'rgba(255, 200, 50, 0.2)' : 'rgba(255, 255, 255, 0.12)';
    const bgHover = primary ? 'rgba(255, 200, 50, 0.35)' : 'rgba(255, 255, 255, 0.22)';
    const bgActive = primary ? 'rgba(255, 200, 50, 0.5)' : 'rgba(255, 255, 255, 0.3)';
    const border = primary ? '1px solid rgba(255, 200, 50, 0.3)' : '1px solid rgba(255,255,255,0.15)';

    Object.assign(btn.style, {
      padding: '12px 28px',
      fontSize: '18px',
      fontWeight: 'bold',
      borderRadius: '8px',
      border,
      background: bg,
      color: '#fff',
      cursor: 'pointer',
      minWidth: '120px',
      transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
      boxShadow: 'none',
    });

    btn.addEventListener('pointerenter', () => {
      btn.style.background = bgHover;
      btn.style.transform = 'scale(1.03)';
      if (primary) btn.style.boxShadow = '0 0 12px rgba(255, 200, 50, 0.2)';
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.background = bg;
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = 'none';
    });
    btn.addEventListener('pointerdown', () => {
      btn.style.background = bgActive;
      btn.style.transform = 'scale(0.97)';
    });
    btn.addEventListener('pointerup', () => {
      btn.style.background = bgHover;
      btn.style.transform = 'scale(1.03)';
    });

    return btn;
  }

  on(events: { onCreate?: (name: string, colorIndex: number) => void; onJoin?: (code: string, name: string, colorIndex: number) => void; onOffline?: () => void }) {
    this.onCreateGame = events.onCreate;
    this.onJoinGame = events.onJoin;
    this.onOfflinePlay = events.onOffline;
  }

  /** Pre-fill the join room code input. */
  setJoinCode(code: string) {
    this.codeInput.value = code;
  }

  show() {
    this.overlay.style.display = 'flex';
    // Force reflow, then transition opacity
    void this.overlay.offsetHeight;
    this.overlay.style.opacity = '1';
  }

  hide() {
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      this.overlay.style.display = 'none';
    }, 300);
  }

  dispose() { this.overlay.remove(); }
}

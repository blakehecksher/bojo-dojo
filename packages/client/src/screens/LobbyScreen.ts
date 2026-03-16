/**
 * Lobby screen — shows room code, connected players, and start button.
 */
export class LobbyScreen {
  private overlay: HTMLDivElement;
  private codeEl: HTMLDivElement;
  private shareBtn: HTMLButtonElement;
  private playerListEl: HTMLDivElement;
  private startBtn: HTMLButtonElement;
  private statusEl: HTMLDivElement;
  private onStart?: () => void;

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
    });

    // Connection status indicator
    this.statusEl = document.createElement('div');
    Object.assign(this.statusEl.style, {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.5)',
      marginBottom: '12px',
      display: 'none',
    });
    this.overlay.appendChild(this.statusEl);

    // Room code
    const codeLabel = document.createElement('div');
    codeLabel.textContent = 'Room Code:';
    Object.assign(codeLabel.style, { fontSize: '14px', color: 'rgba(255,255,255,0.6)' });
    this.overlay.appendChild(codeLabel);

    this.codeEl = document.createElement('div');
    Object.assign(this.codeEl.style, {
      fontSize: '36px',
      fontWeight: 'bold',
      letterSpacing: '6px',
      color: '#fff',
      marginBottom: '8px',
      cursor: 'pointer',
    });
    this.codeEl.title = 'Click to copy';
    this.codeEl.addEventListener('pointerdown', () => {
      navigator.clipboard?.writeText(this.codeEl.textContent || '');
    });
    this.overlay.appendChild(this.codeEl);

    // Share link button
    this.shareBtn = document.createElement('button');
    this.shareBtn.textContent = 'Share Link';
    Object.assign(this.shareBtn.style, {
      padding: '8px 20px',
      fontSize: '14px',
      borderRadius: '6px',
      border: '1px solid rgba(255,255,255,0.3)',
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      cursor: 'pointer',
      marginBottom: '8px',
    });
    this.shareBtn.addEventListener('pointerdown', () => {
      const code = this.codeEl.textContent || '';
      const url = `${location.origin}${location.pathname}?room=${code}`;
      navigator.clipboard?.writeText(url);
      this.shareBtn.textContent = 'Copied!';
      setTimeout(() => { this.shareBtn.textContent = 'Share Link'; }, 2000);
    });
    this.overlay.appendChild(this.shareBtn);

    // Player list
    const playersLabel = document.createElement('div');
    playersLabel.textContent = 'Players:';
    Object.assign(playersLabel.style, {
      fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '12px',
    });
    this.overlay.appendChild(playersLabel);

    this.playerListEl = document.createElement('div');
    Object.assign(this.playerListEl.style, {
      display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center',
      minHeight: '40px',
    });
    this.overlay.appendChild(this.playerListEl);

    // Start button
    this.startBtn = document.createElement('button');
    this.startBtn.textContent = 'Start Match';
    Object.assign(this.startBtn.style, {
      padding: '14px 32px',
      fontSize: '20px',
      fontWeight: 'bold',
      borderRadius: '8px',
      border: 'none',
      background: 'rgba(46, 204, 113, 0.3)',
      color: '#fff',
      cursor: 'pointer',
      marginTop: '16px',
      display: 'none', // hidden until host
    });
    this.startBtn.addEventListener('pointerdown', () => this.onStart?.());
    this.overlay.appendChild(this.startBtn);

    // Waiting text (for non-hosts)
    const waitingEl = document.createElement('div');
    waitingEl.id = 'lobby-waiting';
    waitingEl.textContent = 'Waiting for host to start...';
    Object.assign(waitingEl.style, {
      fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '16px',
    });
    this.overlay.appendChild(waitingEl);

    this.overlay.style.display = 'none';
    parent.appendChild(this.overlay);
  }

  setRoomCode(code: string) {
    this.codeEl.textContent = code.toUpperCase();
  }

  setPlayers(players: Array<{ id: string; displayName: string }>) {
    this.playerListEl.innerHTML = '';
    for (const p of players) {
      const el = document.createElement('div');
      el.textContent = p.displayName;
      Object.assign(el.style, { fontSize: '18px', color: '#fff' });
      this.playerListEl.appendChild(el);
    }
  }

  setIsHost(isHost: boolean) {
    this.startBtn.style.display = isHost ? 'block' : 'none';
    const waiting = this.overlay.querySelector('#lobby-waiting') as HTMLElement;
    if (waiting) waiting.style.display = isHost ? 'none' : 'block';
  }

  setStatus(text: string | null, isError = false) {
    if (text) {
      this.statusEl.textContent = text;
      this.statusEl.style.display = 'block';
      this.statusEl.style.color = isError ? '#e74c3c' : 'rgba(255,255,255,0.5)';
    } else {
      this.statusEl.style.display = 'none';
    }
  }

  onStartMatch(cb: () => void) { this.onStart = cb; }

  show() { this.overlay.style.display = 'flex'; }
  hide() { this.overlay.style.display = 'none'; }

  dispose() { this.overlay.remove(); }
}

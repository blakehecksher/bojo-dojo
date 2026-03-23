/**
 * Lobby screen — shows room code, connected players, and start button.
 * Polished with transitions, hover states, and pulsing status.
 */
export class LobbyScreen {
  private overlay: HTMLDivElement;
  private codeEl: HTMLDivElement;
  private shareBtn: HTMLButtonElement;
  private playerListEl: HTMLDivElement;
  private startBtn: HTMLButtonElement;
  private statusEl: HTMLDivElement;
  private waitingEl: HTMLDivElement;
  private hideTimeoutId: number | null = null;
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
      opacity: '0',
      transition: 'opacity 0.3s ease-out',
    });

    // Connection status indicator
    this.statusEl = document.createElement('div');
    Object.assign(this.statusEl.style, {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.5)',
      marginBottom: '12px',
      display: 'none',
      transition: 'color 0.2s, opacity 0.2s',
    });
    this.overlay.appendChild(this.statusEl);

    // Room code label
    const codeLabel = document.createElement('div');
    codeLabel.textContent = 'Room Code:';
    Object.assign(codeLabel.style, { fontSize: '14px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' });
    this.overlay.appendChild(codeLabel);

    this.codeEl = document.createElement('div');
    Object.assign(this.codeEl.style, {
      fontSize: '36px',
      fontWeight: 'bold',
      letterSpacing: '8px',
      color: '#fff',
      marginBottom: '8px',
      cursor: 'pointer',
      textShadow: '0 0 15px rgba(255, 200, 50, 0.2)',
      transition: 'text-shadow 0.2s',
    });
    this.codeEl.title = 'Click to copy';
    this.codeEl.addEventListener('pointerdown', () => {
      navigator.clipboard?.writeText(this.codeEl.textContent || '');
      this.codeEl.style.textShadow = '0 0 25px rgba(255, 200, 50, 0.6)';
      setTimeout(() => {
        this.codeEl.style.textShadow = '0 0 15px rgba(255, 200, 50, 0.2)';
      }, 400);
    });
    this.overlay.appendChild(this.codeEl);

    // Share link button
    this.shareBtn = document.createElement('button');
    this.shareBtn.textContent = 'Share Link';
    Object.assign(this.shareBtn.style, {
      padding: '8px 20px',
      fontSize: '14px',
      borderRadius: '6px',
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.08)',
      color: '#fff',
      cursor: 'pointer',
      marginBottom: '8px',
      transition: 'background 0.15s, transform 0.1s',
    });
    this.shareBtn.addEventListener('pointerenter', () => {
      this.shareBtn.style.background = 'rgba(255,255,255,0.18)';
      this.shareBtn.style.transform = 'scale(1.03)';
    });
    this.shareBtn.addEventListener('pointerleave', () => {
      this.shareBtn.style.background = 'rgba(255,255,255,0.08)';
      this.shareBtn.style.transform = 'scale(1)';
    });
    this.shareBtn.addEventListener('pointerdown', async () => {
      const code = this.codeEl.textContent || '';
      const url = `${location.origin}${location.pathname}?room=${code}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: 'Bojo Dojo', text: `Join my game!`, url });
        } catch {
          // User cancelled share — that's fine
        }
      } else {
        navigator.clipboard?.writeText(url);
        this.shareBtn.textContent = 'Copied!';
        this.shareBtn.style.background = 'rgba(46, 204, 113, 0.3)';
        setTimeout(() => {
          this.shareBtn.textContent = 'Share Link';
          this.shareBtn.style.background = 'rgba(255,255,255,0.08)';
        }, 2000);
      }
    });
    this.overlay.appendChild(this.shareBtn);

    // Player list
    const playersLabel = document.createElement('div');
    playersLabel.textContent = 'Players:';
    Object.assign(playersLabel.style, {
      fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '12px', letterSpacing: '1px',
    });
    this.overlay.appendChild(playersLabel);

    this.playerListEl = document.createElement('div');
    Object.assign(this.playerListEl.style, {
      display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center',
      minHeight: '40px',
    });
    this.overlay.appendChild(this.playerListEl);

    // How to play
    const howToPlay = document.createElement('div');
    Object.assign(howToPlay.style, {
      marginTop: '16px',
      padding: '12px 20px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      maxWidth: '280px',
      textAlign: 'center',
      lineHeight: '1.5',
    });
    const howTitle = document.createElement('div');
    howTitle.textContent = 'How to Play';
    Object.assign(howTitle.style, {
      fontSize: '13px',
      fontWeight: 'bold',
      color: 'rgba(255, 255, 255, 0.7)',
      letterSpacing: '1px',
      marginBottom: '8px',
      textTransform: 'uppercase',
    });
    howToPlay.appendChild(howTitle);

    const tips = [
      'Swipe to look around',
      'Pull the right slider down to draw, release to fire',
      'Tap Teleport to switch arrow types',
      'Pick up shields (blue glow) for one free hit',
      'Last player alive wins the round',
    ];
    const tipList = document.createElement('div');
    Object.assign(tipList.style, { textAlign: 'left' });
    for (const tip of tips) {
      const line = document.createElement('div');
      line.textContent = `\u2022  ${tip}`;
      Object.assign(line.style, {
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.45)',
        marginBottom: '4px',
      });
      tipList.appendChild(line);
    }
    howToPlay.appendChild(tipList);
    this.overlay.appendChild(howToPlay);

    // Start button
    this.startBtn = document.createElement('button');
    this.startBtn.textContent = 'Start Match';
    Object.assign(this.startBtn.style, {
      padding: '14px 32px',
      fontSize: '20px',
      fontWeight: 'bold',
      borderRadius: '8px',
      border: '1px solid rgba(46, 204, 113, 0.3)',
      background: 'rgba(46, 204, 113, 0.25)',
      color: '#fff',
      cursor: 'pointer',
      marginTop: '16px',
      display: 'none',
      transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
    });
    this.startBtn.addEventListener('pointerenter', () => {
      this.startBtn.style.background = 'rgba(46, 204, 113, 0.4)';
      this.startBtn.style.transform = 'scale(1.03)';
      this.startBtn.style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.25)';
    });
    this.startBtn.addEventListener('pointerleave', () => {
      this.startBtn.style.background = 'rgba(46, 204, 113, 0.25)';
      this.startBtn.style.transform = 'scale(1)';
      this.startBtn.style.boxShadow = 'none';
    });
    this.startBtn.addEventListener('pointerdown', () => {
      this.startBtn.style.transform = 'scale(0.97)';
      this.onStart?.();
    });
    this.startBtn.addEventListener('pointerup', () => {
      this.startBtn.style.transform = 'scale(1.03)';
    });
    this.overlay.appendChild(this.startBtn);

    // Waiting text (for non-hosts) — pulsing
    this.waitingEl = document.createElement('div');
    this.waitingEl.textContent = 'Waiting for host to start the match...';
    Object.assign(this.waitingEl.style, {
      fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '16px',
      animation: 'lobby-pulse 2s ease-in-out infinite',
    });
    this.overlay.appendChild(this.waitingEl);

    // Inject pulse keyframe if not already present
    if (!document.getElementById('lobby-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'lobby-pulse-style';
      style.textContent = `@keyframes lobby-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`;
      document.head.appendChild(style);
    }

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
      Object.assign(el.style, {
        fontSize: '18px', color: '#fff',
        padding: '4px 16px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '4px',
        animation: 'lobby-pulse 0.3s ease-out',
      });
      this.playerListEl.appendChild(el);
    }
  }

  setIsHost(isHost: boolean) {
    this.startBtn.style.display = isHost ? 'block' : 'none';
    this.waitingEl.style.display = isHost ? 'none' : 'block';
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

  show() {
    if (this.hideTimeoutId !== null) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
    this.overlay.style.display = 'flex';
    void this.overlay.offsetHeight;
    this.overlay.style.opacity = '1';
  }

  hide() {
    this.overlay.style.opacity = '0';
    if (this.hideTimeoutId !== null) clearTimeout(this.hideTimeoutId);
    this.hideTimeoutId = window.setTimeout(() => {
      this.overlay.style.display = 'none';
      this.hideTimeoutId = null;
    }, 300);
  }

  dispose() { this.overlay.remove(); }
}

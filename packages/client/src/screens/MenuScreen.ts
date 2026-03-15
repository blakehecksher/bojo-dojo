/**
 * Main menu — Create Game / Join Game buttons.
 */
export class MenuScreen {
  private overlay: HTMLDivElement;
  private codeInput!: HTMLInputElement;
  private onCreateGame?: (name: string) => void;
  private onJoinGame?: (code: string, name: string) => void;

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

    // Title
    const title = document.createElement('div');
    title.textContent = 'BOJO DOJO';
    Object.assign(title.style, {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#fff',
      letterSpacing: '4px',
      marginBottom: '24px',
      textShadow: '3px 3px 8px rgba(0,0,0,0.8)',
    });
    this.overlay.appendChild(title);

    // Name input
    const nameInput = document.createElement('input');
    nameInput.placeholder = 'Your name';
    nameInput.maxLength = 16;
    nameInput.value = `Player ${Math.floor(Math.random() * 999)}`;
    Object.assign(nameInput.style, {
      padding: '10px 16px',
      fontSize: '16px',
      borderRadius: '6px',
      border: '2px solid rgba(255,255,255,0.3)',
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      outline: 'none',
      width: '200px',
      textAlign: 'center',
    });
    this.overlay.appendChild(nameInput);

    // Create button
    const createBtn = this.makeButton('Create Game');
    createBtn.addEventListener('pointerdown', () => {
      this.onCreateGame?.(nameInput.value || 'Player');
    });
    this.overlay.appendChild(createBtn);

    // Join section
    const joinRow = document.createElement('div');
    Object.assign(joinRow.style, { display: 'flex', gap: '8px', alignItems: 'center' });

    this.codeInput = document.createElement('input');
    const codeInput = this.codeInput;
    codeInput.placeholder = 'Room code';
    codeInput.maxLength = 8;
    Object.assign(codeInput.style, {
      padding: '10px 16px',
      fontSize: '16px',
      borderRadius: '6px',
      border: '2px solid rgba(255,255,255,0.3)',
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      outline: 'none',
      width: '120px',
      textAlign: 'center',
      textTransform: 'uppercase',
    });
    joinRow.appendChild(codeInput);

    const joinBtn = this.makeButton('Join');
    joinBtn.addEventListener('pointerdown', () => {
      const code = codeInput.value.trim().toUpperCase();
      if (code) this.onJoinGame?.(code, nameInput.value || 'Player');
    });
    joinRow.appendChild(joinBtn);
    this.overlay.appendChild(joinRow);

    this.overlay.style.display = 'none';
    parent.appendChild(this.overlay);
  }

  private makeButton(text: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: '12px 28px',
      fontSize: '18px',
      fontWeight: 'bold',
      borderRadius: '8px',
      border: 'none',
      background: 'rgba(255, 255, 255, 0.15)',
      color: '#fff',
      cursor: 'pointer',
      minWidth: '120px',
    });
    return btn;
  }

  on(events: { onCreate?: (name: string) => void; onJoin?: (code: string, name: string) => void }) {
    this.onCreateGame = events.onCreate;
    this.onJoinGame = events.onJoin;
  }

  /** Pre-fill the join room code input. */
  setJoinCode(code: string) {
    this.codeInput.value = code.toUpperCase();
  }

  show() { this.overlay.style.display = 'flex'; }
  hide() { this.overlay.style.display = 'none'; }

  dispose() { this.overlay.remove(); }
}

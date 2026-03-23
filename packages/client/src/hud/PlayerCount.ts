/**
 * Player count indicator — top-right corner.
 * Tap to toggle between player count and room code.
 */
export class PlayerCount {
  private el: HTMLDivElement;
  private _total = 0;
  private _alive = 0;
  private _showAlive = false;
  private _roomCode = '';
  private _showingCode = false;
  private _codeTimeout: number | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      fontSize: '16px',
      fontWeight: 'bold',
      textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      pointerEvents: 'auto',
      cursor: 'pointer',
      color: '#ffffff',
      display: 'none',
      userSelect: 'none',
      padding: '4px 8px',
    });
    this.el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.toggleCode();
    });
    parent.appendChild(this.el);
  }

  update(total: number, alive: number, showAlive: boolean) {
    this._total = total;
    this._alive = alive;
    this._showAlive = showAlive;
    if (!this._showingCode) this.render();
  }

  setRoomCode(code: string) {
    this._roomCode = code;
  }

  show() {
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
    this._showingCode = false;
    if (this._codeTimeout) clearTimeout(this._codeTimeout);
  }

  private toggleCode() {
    if (this._showingCode) {
      this._showingCode = false;
      if (this._codeTimeout) clearTimeout(this._codeTimeout);
      this.render();
    } else if (this._roomCode) {
      this._showingCode = true;
      this.el.textContent = `Room: ${this._roomCode}`;
      // Auto-revert after 4 seconds
      if (this._codeTimeout) clearTimeout(this._codeTimeout);
      this._codeTimeout = window.setTimeout(() => {
        this._showingCode = false;
        this.render();
      }, 4000);
    }
  }

  private render() {
    if (this._showAlive) {
      this.el.textContent = `\u{1F464} ${this._alive} alive`;
    } else {
      this.el.textContent = `\u{1F464} ${this._total} players`;
    }
  }

  dispose() {
    if (this._codeTimeout) clearTimeout(this._codeTimeout);
    this.el.remove();
  }
}

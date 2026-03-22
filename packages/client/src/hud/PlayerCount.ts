/**
 * Player count indicator — top-right corner.
 * Shows how many players are connected and how many are alive.
 */
export class PlayerCount {
  private el: HTMLDivElement;
  private _connected = 0;
  private _alive = 0;
  private _showAlive = false;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      fontSize: '16px',
      fontWeight: 'bold',
      textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      color: '#ffffff',
      display: 'none',
    });
    parent.appendChild(this.el);
  }

  update(connected: number, alive: number, showAlive: boolean) {
    this._connected = connected;
    this._alive = alive;
    this._showAlive = showAlive;
    this.render();
  }

  show() {
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
  }

  private render() {
    if (this._showAlive) {
      this.el.textContent = `\u{1F464} ${this._alive}/${this._connected} alive`;
    } else {
      this.el.textContent = `\u{1F464} ${this._connected} players`;
    }
  }

  dispose() {
    this.el.remove();
  }
}

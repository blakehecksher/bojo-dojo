import type { ServerMessage, ClientMessage } from '@bojo-dojo/common';

/**
 * PartyKit WebSocket connection wrapper.
 * Uses raw WebSocket (partysocket package can be added later for auto-reconnect).
 * Handles JSON serialize/deserialize and typed message dispatch.
 */
export class GameConnection {
  private ws: WebSocket | null = null;
  private handlers: Array<(msg: ServerMessage) => void> = [];
  private _connected = false;
  private _playerId: string | null = null;

  get connected() { return this._connected; }
  get playerId() { return this._playerId; }

  /**
   * Connect to a PartyKit room.
   * @param host PartyKit host (e.g., "localhost:1999" or "bojo-dojo.username.partykit.dev")
   * @param roomId Room identifier
   * @param displayName Player's display name
   */
  connect(host: string, roomId: string, displayName: string) {
    const protocol = host.startsWith('localhost') ? 'ws' : 'wss';
    const url = `${protocol}://${host}/party/${roomId}?name=${encodeURIComponent(displayName)}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this._connected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;

        // Capture player ID from ROOM_JOINED
        if (msg.type === 'ROOM_JOINED') {
          this._playerId = msg.playerId;
        }

        for (const handler of this.handlers) {
          handler(msg);
        }
      } catch {
        console.warn('Failed to parse server message:', event.data);
      }
    };

    this.ws.onclose = () => {
      this._connected = false;
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  /** Send a message to the server. */
  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** Register a handler for server messages. */
  onMessage(handler: (msg: ServerMessage) => void) {
    this.handlers.push(handler);
  }

  /** Disconnect. */
  disconnect() {
    this.ws?.close();
    this.ws = null;
    this._connected = false;
  }
}

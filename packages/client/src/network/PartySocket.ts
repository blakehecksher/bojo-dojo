import type { ServerMessage, ClientMessage } from '@bojo-dojo/common';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

export interface ConnectionCallbacks {
  onStateChange?: (state: ConnectionState, reason?: string) => void;
}

/**
 * PartyKit WebSocket connection wrapper.
 * Uses raw WebSocket (partysocket package can be added later for auto-reconnect).
 * Handles JSON serialize/deserialize and typed message dispatch.
 */
export class GameConnection {
  private ws: WebSocket | null = null;
  private handlers: Array<(msg: ServerMessage) => void> = [];
  private _state: ConnectionState = 'idle';
  private _playerId: string | null = null;
  private stateCallbacks: ConnectionCallbacks = {};
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;

  get state() { return this._state; }
  get connected() { return this._state === 'connected'; }
  get playerId() { return this._playerId; }

  /** Register callbacks for connection state changes. */
  onState(callbacks: ConnectionCallbacks) {
    this.stateCallbacks = callbacks;
  }

  private setState(state: ConnectionState, reason?: string) {
    this._state = state;
    this.stateCallbacks.onStateChange?.(state, reason);
  }

  /**
   * Connect to a PartyKit room.
   * @param host PartyKit host (e.g., "localhost:1999" or "bojo-dojo.username.partykit.dev")
   * @param roomId Room identifier
   * @param displayName Player's display name
   */
  connect(host: string, roomId: string, displayName: string) {
    // Clean up any existing connection
    this.disconnect();

    const protocol = host.startsWith('localhost') ? 'ws' : 'wss';
    const url = `${protocol}://${host}/party/${roomId}?name=${encodeURIComponent(displayName)}`;

    this.setState('connecting');

    // Timeout if connection doesn't open within 8 seconds
    this.connectTimeout = setTimeout(() => {
      if (this._state === 'connecting') {
        this.ws?.close();
        this.setState('error', 'Connection timed out');
      }
    }, 8000);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null; }
      this.setState('connected');
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
      if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null; }
      // Only fire 'closed' if we were previously connected (not if we errored)
      if (this._state === 'connected') {
        this.setState('closed', 'Connection lost');
      } else if (this._state === 'connecting') {
        this.setState('error', 'Could not connect to server');
      }
    };

    this.ws.onerror = () => {
      // onerror always fires before onclose, so let onclose handle state transition
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
    if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null; }
    this.ws?.close();
    this.ws = null;
    if (this._state !== 'idle') {
      this.setState('idle');
    }
  }
}

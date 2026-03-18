import type { ClientMessage, ServerMessage } from '@bojo-dojo/common';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

export interface ConnectionCallbacks {
  onStateChange?: (state: ConnectionState, reason?: string) => void;
}

function getClientId() {
  const key = 'bojo-dojo-client-id';
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `player-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

export class GameConnection {
  private ws: WebSocket | null = null;
  private handlers: Array<(msg: ServerMessage) => void> = [];
  private _state: ConnectionState = 'idle';
  private _playerId: string | null = null;
  private stateCallbacks: ConnectionCallbacks = {};
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private clientId = getClientId();

  get state() { return this._state; }
  get connected() { return this._state === 'connected'; }
  get playerId() { return this._playerId; }
  get stableClientId() { return this.clientId; }

  onState(callbacks: ConnectionCallbacks) {
    this.stateCallbacks = callbacks;
  }

  private setState(state: ConnectionState, reason?: string) {
    this._state = state;
    this.stateCallbacks.onStateChange?.(state, reason);
  }

  connect(host: string, roomId: string, displayName: string, colorIndex = 0) {
    this.disconnect();

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${host}/party/${roomId}?name=${encodeURIComponent(displayName)}&clientId=${encodeURIComponent(this.clientId)}&color=${colorIndex}`;

    this.setState('connecting');
    this.connectTimeout = setTimeout(() => {
      if (this._state === 'connecting') {
        this.ws?.close();
        this.setState('error', 'Connection timed out');
      }
    }, 8000);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      this.setState('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        if (msg.type === 'ROOM_JOINED') {
          this._playerId = msg.playerId;
        }
        if (msg.type === 'ROOM_LOCKED') {
          this.setState('error', msg.reason);
        }
        for (const handler of this.handlers) handler(msg);
      } catch (err) {
        const preview = typeof event.data === 'string' ? event.data.slice(0, 120) : '(non-string)';
        console.warn('Failed to parse server message:', preview, err);
      }
    };

    this.ws.onclose = () => {
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      if (this._state === 'connected') {
        this.setState('closed', 'Connection lost');
      } else if (this._state === 'connecting') {
        this.setState('error', 'Could not connect to server');
      }
    };

    this.ws.onerror = () => {
      // Let onclose drive the state change.
    };
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(handler: (msg: ServerMessage) => void) {
    this.handlers.push(handler);
  }

  disconnect() {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    this.ws?.close();
    this.ws = null;
    if (this._state !== 'idle') {
      this.setState('idle');
    }
  }
}

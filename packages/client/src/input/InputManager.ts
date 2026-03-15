/**
 * InputManager — multi-touch pointer routing.
 *
 * Each pointerdown is offered to handlers in priority order.
 * The first handler whose hit zone contains the down position claims that pointer.
 * All subsequent move/up/cancel events for that pointer go only to the claiming handler.
 * This prevents a thumbstick drag from also rotating the camera.
 */

export interface InputHandler {
  /** Name for debugging. */
  name: string;
  /** Returns true if this handler's zone contains the screen point (px). */
  hitTest(x: number, y: number): boolean;
  /** Called when this handler wins a pointer. */
  onPointerDown(e: PointerEvent): void;
  /** Called for tracked pointer moves. */
  onPointerMove(e: PointerEvent): void;
  /** Called when the tracked pointer lifts or is cancelled. */
  onPointerUp(e: PointerEvent): void;
}

export class InputManager {
  /** Handlers in priority order (first match wins). */
  private handlers: InputHandler[] = [];
  /** Which handler owns each active pointer. */
  private claims = new Map<number, InputHandler>();

  constructor(private element: HTMLElement) {
    element.addEventListener('pointerdown', this.onDown, { passive: false });
    element.addEventListener('pointermove', this.onMove, { passive: false });
    element.addEventListener('pointerup', this.onUp);
    element.addEventListener('pointercancel', this.onUp);

    // Prevent default touch behaviors (scroll, zoom)
    element.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }

  /** Register a handler. First registered = highest priority. */
  register(handler: InputHandler) {
    this.handlers.push(handler);
  }

  private onDown = (e: PointerEvent) => {
    e.preventDefault();
    for (const handler of this.handlers) {
      if (handler.hitTest(e.clientX, e.clientY)) {
        this.claims.set(e.pointerId, handler);
        handler.onPointerDown(e);
        return;
      }
    }
    // No handler claimed — falls through (e.g., center of screen → last handler is swipe camera)
  };

  private onMove = (e: PointerEvent) => {
    e.preventDefault();
    const handler = this.claims.get(e.pointerId);
    if (handler) {
      handler.onPointerMove(e);
    }
  };

  private onUp = (e: PointerEvent) => {
    const handler = this.claims.get(e.pointerId);
    if (handler) {
      handler.onPointerUp(e);
      this.claims.delete(e.pointerId);
    }
  };

  dispose() {
    this.element.removeEventListener('pointerdown', this.onDown);
    this.element.removeEventListener('pointermove', this.onMove);
    this.element.removeEventListener('pointerup', this.onUp);
    this.element.removeEventListener('pointercancel', this.onUp);
  }
}

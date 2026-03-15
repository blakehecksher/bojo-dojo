import { Crosshair } from './Crosshair';
import { ArrowCounter } from './ArrowCounter';
import { Timer } from './Timer';
import { InventorySlots } from './InventorySlots';

/**
 * HUD — HTML overlay container managing all UI elements.
 */
export class HUD {
  readonly element: HTMLDivElement;
  readonly crosshair: Crosshair;
  readonly arrowCounter: ArrowCounter;
  readonly timer: Timer;
  readonly inventory: InventorySlots;

  constructor() {
    this.element = document.getElementById('hud') as HTMLDivElement;

    this.crosshair = new Crosshair(this.element);
    this.arrowCounter = new ArrowCounter(this.element);
    this.timer = new Timer(this.element);
    this.inventory = new InventorySlots(this.element);
  }

  dispose() {
    this.crosshair.dispose();
    this.arrowCounter.dispose();
    this.timer.dispose();
    this.inventory.dispose();
  }
}

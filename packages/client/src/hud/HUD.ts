import { Crosshair } from './Crosshair';
import { ArrowCounter } from './ArrowCounter';
import { Timer } from './Timer';
import { InventorySlots } from './InventorySlots';
import { ActionButton } from './ActionButton';
import { StatusBanner } from './StatusBanner';
import { PlayerCount } from './PlayerCount';
import { Minimap } from './Minimap';
import { ShieldGlow } from './ShieldGlow';
import { ShowcaseScoreboard } from './ShowcaseScoreboard';

/**
 * HUD — HTML overlay container managing all UI elements.
 */
export class HUD {
  readonly element: HTMLDivElement;
  readonly crosshair: Crosshair;
  readonly arrowCounter: ArrowCounter;
  readonly timer: Timer;
  readonly inventory: InventorySlots;
  readonly fletchButton: ActionButton;
  readonly teleportButton: ActionButton;
  readonly spectatorButton: ActionButton;
  readonly statusBanner: StatusBanner;
  readonly zoneBanner: StatusBanner;
  readonly playerCount: PlayerCount;
  readonly minimap: Minimap;
  readonly shieldGlow: ShieldGlow;
  readonly showcaseScoreboard: ShowcaseScoreboard;

  constructor() {
    this.element = document.getElementById('hud') as HTMLDivElement;

    this.crosshair = new Crosshair(this.element);
    this.arrowCounter = new ArrowCounter(this.element);
    this.timer = new Timer(this.element);
    this.inventory = new InventorySlots(this.element);
    this.statusBanner = new StatusBanner(this.element);
    this.zoneBanner = new StatusBanner(this.element);
    this.zoneBanner.element.style.bottom = '126px';
    this.fletchButton = new ActionButton(this.element, 'Fletch', {
      right: '16px',
      bottom: '76px',
      background: 'rgba(84, 54, 24, 0.55)',
    });
    this.teleportButton = new ActionButton(this.element, 'Teleport', {
      right: '16px',
      bottom: '130px',
      background: 'rgba(17, 62, 82, 0.55)',
    });
    this.spectatorButton = new ActionButton(this.element, 'Next Spectator', {
      left: '50%',
      top: '58px',
      transform: 'translateX(-50%)',
      background: 'rgba(40, 40, 70, 0.55)',
      display: 'none',
    });
    this.playerCount = new PlayerCount(this.element);
    this.minimap = new Minimap(this.element);
    this.shieldGlow = new ShieldGlow(this.element);
    this.showcaseScoreboard = new ShowcaseScoreboard(this.element);
  }

  dispose() {
    this.crosshair.dispose();
    this.arrowCounter.dispose();
    this.timer.dispose();
    this.inventory.dispose();
    this.fletchButton.dispose();
    this.teleportButton.dispose();
    this.spectatorButton.dispose();
    this.statusBanner.dispose();
    this.zoneBanner.dispose();
    this.playerCount.dispose();
    this.minimap.dispose();
    this.shieldGlow.dispose();
    this.showcaseScoreboard.dispose();
  }
}

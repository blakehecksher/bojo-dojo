const SLOT_COUNT = 4;
const SLOT_SIZE = 40; // px
const GAP = 8;

/**
 * Inventory slots at bottom-center of screen.
 * Shows arrow types / pickups.
 */
export class InventorySlots {
  private container: HTMLDivElement;
  private slots: HTMLDivElement[] = [];

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    const totalWidth = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * GAP;

    Object.assign(this.container.style, {
      position: 'absolute',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: `${GAP}px`,
      width: `${totalWidth}px`,
      pointerEvents: 'none',
    });

    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = document.createElement('div');
      Object.assign(slot.style, {
        width: `${SLOT_SIZE}px`,
        height: `${SLOT_SIZE}px`,
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '6px',
        background: 'rgba(0, 0, 0, 0.2)',
      });
      this.slots.push(slot);
      this.container.appendChild(slot);
    }

    parent.appendChild(this.container);
  }

  /** Set content of a slot (index 0-3). */
  setSlot(index: number, content: string) {
    if (this.slots[index]) {
      this.slots[index].textContent = content;
      Object.assign(this.slots[index].style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
      });
    }
  }

  dispose() {
    this.container.remove();
  }
}

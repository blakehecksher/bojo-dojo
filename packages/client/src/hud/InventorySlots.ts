type InventoryState = {
  arrows: number;
  teleportArrows: number;
  hasShield: boolean;
  selectedArrowType: 'normal' | 'teleport';
};

const SLOT_SIZE = 52;
const GAP = 8;
const LABELS = ['Arrows', 'Teleport', 'Shield'];

export class InventorySlots {
  private container: HTMLDivElement;
  private slots: HTMLDivElement[] = [];

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    const totalWidth = LABELS.length * SLOT_SIZE + (LABELS.length - 1) * GAP;

    Object.assign(this.container.style, {
      position: 'absolute',
      top: '12px',
      right: '16px',
      display: 'flex',
      gap: `${GAP}px`,
      width: `${totalWidth}px`,
      pointerEvents: 'none',
    });

    LABELS.forEach((label) => {
      const slot = document.createElement('div');
      Object.assign(slot.style, {
        width: `${SLOT_SIZE}px`,
        height: `${SLOT_SIZE}px`,
        border: '2px solid rgba(255, 255, 255, 0.25)',
        borderRadius: '8px',
        background: 'rgba(0, 0, 0, 0.26)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        textAlign: 'center',
        color: '#fff',
      });

      const value = document.createElement('div');
      value.textContent = '-';
      Object.assign(value.style, {
        fontSize: '16px',
        fontWeight: 'bold',
      });

      const caption = document.createElement('div');
      caption.textContent = label;
      Object.assign(caption.style, {
        fontSize: '10px',
        opacity: '0.8',
      });

      slot.appendChild(value);
      slot.appendChild(caption);
      this.slots.push(slot);
      this.container.appendChild(slot);
    });

    parent.appendChild(this.container);
  }

  setInventory(state: InventoryState) {
    const [arrows, teleport, shield] = this.slots;
    (arrows.firstChild as HTMLDivElement).textContent = String(state.arrows);
    (teleport.firstChild as HTMLDivElement).textContent = String(state.teleportArrows);
    (shield.firstChild as HTMLDivElement).textContent = state.hasShield ? 'ON' : '--';

    arrows.style.borderColor = state.selectedArrowType === 'normal'
      ? 'rgba(255, 200, 50, 0.85)'
      : 'rgba(255,255,255,0.25)';
    arrows.style.boxShadow = state.selectedArrowType === 'normal'
      ? '0 0 12px rgba(255, 200, 50, 0.35)'
      : 'none';

    teleport.style.borderColor = state.selectedArrowType === 'teleport'
      ? 'rgba(79, 211, 255, 0.85)'
      : 'rgba(255,255,255,0.25)';
    teleport.style.boxShadow = state.selectedArrowType === 'teleport'
      ? '0 0 12px rgba(79, 211, 255, 0.35)'
      : 'none';

    shield.style.borderColor = state.hasShield
      ? 'rgba(102, 216, 255, 0.85)'
      : 'rgba(255,255,255,0.25)';
    shield.style.boxShadow = state.hasShield
      ? '0 0 12px rgba(102, 216, 255, 0.25)'
      : 'none';
  }

  dispose() {
    this.container.remove();
  }
}

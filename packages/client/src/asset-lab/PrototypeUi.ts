import { prototypePalette } from './palette';

type ButtonTone = 'primary' | 'secondary';
type ChipTone = 'neutral' | 'good' | 'warning';

export function createPrototypeButton(label: string, tone: ButtonTone = 'primary'): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = label;

  const isPrimary = tone === 'primary';
  Object.assign(button.style, {
    padding: '12px 20px',
    borderRadius: '999px',
    border: `2px solid ${toCssHex(isPrimary ? prototypePalette.uiStroke : prototypePalette.stoneMid)}`,
    background: isPrimary
      ? `linear-gradient(180deg, ${toCssHex(prototypePalette.bannerRed)}, ${toCssHex(prototypePalette.woodDark)})`
      : `linear-gradient(180deg, ${toCssHex(prototypePalette.uiPanelAlt)}, ${toCssHex(prototypePalette.uiPanel)})`,
    color: toCssHex(prototypePalette.uiText),
    fontSize: '15px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    boxShadow: `0 8px 18px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)`,
    cursor: 'pointer',
  });

  return button;
}

export function createPrototypeStatusChip(label: string, tone: ChipTone): HTMLDivElement {
  const chip = document.createElement('div');

  const toneColor =
    tone === 'good'
      ? prototypePalette.teleportGlow
      : tone === 'warning'
        ? prototypePalette.zoneWarning
        : prototypePalette.paper;

  Object.assign(chip.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    border: `1px solid ${toCssHex(toneColor)}`,
    background: `rgba(23, 20, 17, 0.88)`,
    color: toCssHex(prototypePalette.uiText),
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  });

  const dot = document.createElement('div');
  Object.assign(dot.style, {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: toCssHex(toneColor),
    boxShadow: `0 0 10px ${toCssHex(toneColor)}`,
  });

  const text = document.createElement('span');
  text.textContent = label;

  chip.appendChild(dot);
  chip.appendChild(text);
  return chip;
}

export function createPrototypeCrosshair(): HTMLDivElement {
  const root = document.createElement('div');
  Object.assign(root.style, {
    position: 'relative',
    width: '46px',
    height: '46px',
    pointerEvents: 'none',
  });

  const ring = document.createElement('div');
  Object.assign(ring.style, {
    position: 'absolute',
    inset: '6px',
    borderRadius: '50%',
    border: `2px solid rgba(248, 240, 218, 0.45)`,
    boxShadow: `0 0 16px rgba(248, 240, 218, 0.14)`,
  });
  root.appendChild(ring);

  const lines = [
    { top: '0', left: '50%', width: '2px', height: '14px', transform: 'translateX(-50%)' },
    { bottom: '0', left: '50%', width: '2px', height: '14px', transform: 'translateX(-50%)' },
    { left: '0', top: '50%', width: '14px', height: '2px', transform: 'translateY(-50%)' },
    { right: '0', top: '50%', width: '14px', height: '2px', transform: 'translateY(-50%)' },
  ];

  lines.forEach((style) => {
    const line = document.createElement('div');
    Object.assign(line.style, {
      position: 'absolute',
      background: `rgba(248, 240, 218, 0.92)`,
      boxShadow: `0 0 12px rgba(248, 240, 218, 0.35)`,
      ...style,
    });
    root.appendChild(line);
  });

  const center = document.createElement('div');
  Object.assign(center.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: toCssHex(prototypePalette.teleportGlow),
    transform: 'translate(-50%, -50%)',
    boxShadow: `0 0 12px ${toCssHex(prototypePalette.teleportGlow)}`,
  });
  root.appendChild(center);

  return root;
}

export function createPrototypeInventoryBar(labels = ['Arrow x5', 'Teleport x1', 'Shield', 'Bundle']): HTMLDivElement {
  const container = document.createElement('div');
  Object.assign(container.style, {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  });

  labels.forEach((label, index) => {
    const slot = document.createElement('div');
    Object.assign(slot.style, {
      minWidth: '88px',
      padding: '10px 12px',
      borderRadius: '14px',
      border: `1px solid ${toCssHex(index === 1 ? prototypePalette.teleport : prototypePalette.uiStroke)}`,
      background: `linear-gradient(180deg, rgba(45, 36, 28, 0.92), rgba(23, 20, 17, 0.92))`,
      color: toCssHex(prototypePalette.uiText),
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '0.05em',
      textAlign: 'center',
      textTransform: 'uppercase',
      boxShadow: `0 10px 20px rgba(0, 0, 0, 0.22)`,
    });
    slot.textContent = label;
    container.appendChild(slot);
  });

  return container;
}

export function createPrototypeMenuCard(title: string, subtitle: string): HTMLDivElement {
  const card = document.createElement('div');
  Object.assign(card.style, {
    width: '320px',
    padding: '22px',
    borderRadius: '24px',
    border: `1px solid ${toCssHex(prototypePalette.uiStroke)}`,
    background: `linear-gradient(180deg, rgba(45, 36, 28, 0.96), rgba(23, 20, 17, 0.96))`,
    color: toCssHex(prototypePalette.uiText),
    boxShadow: `0 24px 50px rgba(0, 0, 0, 0.32)`,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  });

  const heading = document.createElement('div');
  heading.textContent = title;
  Object.assign(heading.style, {
    fontSize: '30px',
    fontWeight: '800',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  });

  const body = document.createElement('div');
  body.textContent = subtitle;
  Object.assign(body.style, {
    fontSize: '14px',
    lineHeight: '1.5',
    color: `rgba(248, 240, 218, 0.82)`,
  });

  const actions = document.createElement('div');
  Object.assign(actions.style, {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  });

  actions.appendChild(createPrototypeButton('Create Game', 'primary'));
  actions.appendChild(createPrototypeButton('Practice', 'secondary'));

  card.appendChild(heading);
  card.appendChild(body);
  card.appendChild(actions);
  return card;
}

export function createPrototypeHudPreview(): HTMLDivElement {
  const shell = document.createElement('div');
  Object.assign(shell.style, {
    width: '460px',
    height: '240px',
    borderRadius: '24px',
    overflow: 'hidden',
    border: `1px solid rgba(169, 138, 87, 0.55)`,
    background: `radial-gradient(circle at top, rgba(86, 240, 208, 0.12), transparent 40%), linear-gradient(180deg, rgba(22, 18, 15, 0.95), rgba(12, 10, 8, 0.98))`,
    boxShadow: `0 24px 50px rgba(0, 0, 0, 0.32)`,
    position: 'relative',
  });

  const topRow = document.createElement('div');
  Object.assign(topRow.style, {
    position: 'absolute',
    top: '16px',
    left: '16px',
    right: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });
  topRow.appendChild(createPrototypeStatusChip('Arrows 5', 'neutral'));
  topRow.appendChild(createPrototypeStatusChip('Zone Stable', 'good'));

  const crosshair = createPrototypeCrosshair();
  Object.assign(crosshair.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  });

  const bottomRow = document.createElement('div');
  Object.assign(bottomRow.style, {
    position: 'absolute',
    left: '16px',
    right: '16px',
    bottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  });

  bottomRow.appendChild(createPrototypeStatusChip('Pull 78%', 'warning'));
  bottomRow.appendChild(createPrototypeInventoryBar());

  shell.appendChild(topRow);
  shell.appendChild(crosshair);
  shell.appendChild(bottomRow);
  return shell;
}

function toCssHex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

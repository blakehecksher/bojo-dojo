const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c',
];

export class ShowcaseScoreboard {
  private el: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      display: 'none',
      flexDirection: 'column',
      gap: '4px',
      zIndex: '150',
      pointerEvents: 'none',
    });
    parent.appendChild(this.el);
  }

  update(scores: Record<string, number>, players: { id: string; colorIndex: number; displayName: string }[]) {
    this.el.innerHTML = '';

    const entries = players
      .map((p) => ({ id: p.id, color: PLAYER_COLORS[p.colorIndex] ?? '#fff', score: scores[p.id] ?? 0, name: p.displayName }))
      .sort((a, b) => b.score - a.score);

    for (const entry of entries) {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#fff',
        textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      });

      const dot = document.createElement('div');
      Object.assign(dot.style, {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: entry.color,
        flexShrink: '0',
      });

      const label = document.createElement('span');
      label.textContent = `${entry.score}`;
      label.style.fontWeight = 'bold';

      row.appendChild(dot);
      row.appendChild(label);
      this.el.appendChild(row);
    }
  }

  show() { this.el.style.display = 'flex'; }
  hide() { this.el.style.display = 'none'; }

  dispose() { this.el.remove(); }
}

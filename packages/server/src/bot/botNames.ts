const BOT_NAMES = [
  'Robin Hood',
  'Legolas',
  'Hawkeye',
  'Artemis',
  'Cupid',
  'William Tell',
  'Katniss',
  'Green Arrow',
  'Merida',
  'Hanzo',
  'Bullseye',
  'Quiver',
  'Fletcher',
  'Bowstring',
  'Longbow',
];

export function pickBotNames(count: number): string[] {
  const shuffled = [...BOT_NAMES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

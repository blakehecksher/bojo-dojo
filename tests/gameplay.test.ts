import { test, expect } from '@playwright/test';

/**
 * Gameplay tests — offline single-player mode.
 *
 * The game starts at the menu. Tests click "Practice (Offline)" to enter gameplay.
 * All tests use window.__game to inspect internal state.
 * Input is simulated via pointer events on the canvas (right-25% = pull slider zone).
 */

const STARTING_ARROWS = 5;

test.describe('Offline gameplay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });
    // Navigate to offline mode via menu
    await page.getByText('Practice (Offline)').click();
    await page.waitForFunction(() => {
      const g = (window as any).__game;
      return g && g.phase === 'offline';
    }, { timeout: 10_000 });
  });

  test('round starts active with correct arrow count', async ({ page }) => {
    const { roundActive, arrowCount } = await page.evaluate(() => {
      const g = (window as any).__game;
      return {
        roundActive: g.roundActive,
        arrowCount: g.hud.arrowCounter.count,
      };
    });

    expect(roundActive).toBe(true);
    expect(arrowCount).toBe(STARTING_ARROWS);
  });

  test('arrow counter displays starting count in DOM', async ({ page }) => {
    // The ArrowCounter appends "🏹 5" text to the HUD
    const hudText = await page.locator('#hud').innerText();
    expect(hudText).toContain(String(STARTING_ARROWS));
  });

  test('firing an arrow decrements the arrow counter', async ({ page }) => {
    const viewport = page.viewportSize()!;
    // Pull slider hit zone: x > 75% of viewport width
    const sliderX = Math.floor(viewport.width * 0.88);
    const startY = Math.floor(viewport.height * 0.4);
    const endY = startY + 180; // 180px drag → ~90% draw force, above cancel zone

    // Simulate: pointerdown → pointermove → pointerup on canvas
    await page.mouse.move(sliderX, startY);
    await page.mouse.down();
    await page.mouse.move(sliderX, endY, { steps: 10 });
    await page.mouse.up();

    // Give the game a frame to process the fire event
    await page.waitForTimeout(200);

    const arrowCount = await page.evaluate(() => (window as any).__game.hud.arrowCounter.count);
    expect(arrowCount).toBe(STARTING_ARROWS - 1);
  });

  test('enemy player marker exists in scene', async ({ page }) => {
    const hasEnemyMarker = await page.evaluate(() => {
      const g = (window as any).__game;
      return g.playerMarkers.has('enemy');
    });
    expect(hasEnemyMarker).toBe(true);
  });

  test('heightmap is generated with correct dimensions', async ({ page }) => {
    const heightmapInfo = await page.evaluate(() => {
      const g = (window as any).__game;
      const hm = g.heightmap;
      return {
        width: hm?.width,
        depth: hm?.depth,
        hasHeights: hm?.heights instanceof Float32Array,
      };
    });
    expect(heightmapInfo.width).toBe(100); // resolution from TERRAIN_BASE
    expect(heightmapInfo.depth).toBe(100);
    expect(heightmapInfo.hasHeights).toBe(true);
  });

  test('spawn points are valid distance apart', async ({ page }) => {
    const distance = await page.evaluate(() => {
      const g = (window as any).__game;
      const s = g.spawns;
      const a = s.local;
      const b = s.enemy;
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      return Math.sqrt(dx * dx + dz * dz);
    });
    // DEBUG_CLOSE_SPAWN places at ~5m; production uses MIN_DISTANCE_2P = 80m
    expect(distance).toBeGreaterThan(3);
  });
});

test.describe('Menu screen', () => {
  test('menu shows BOJO DOJO title on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });

    // Menu is shown by default on startup
    await expect(page.getByText('BOJO DOJO')).toBeVisible();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
    await expect(page.getByText('Create Game')).toBeVisible();
    await expect(page.getByText('Practice (Offline)')).toBeVisible();
  });

  test('menu has name input with default value', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });

    const nameInput = page.getByPlaceholder('Your name');
    await expect(nameInput).toBeVisible();
    const value = await nameInput.inputValue();
    expect(value).toMatch(/^Player \d+$/);
  });

  test('URL room code pre-fills join input', async ({ page }) => {
    await page.goto('/?room=ABCD');
    await page.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });

    const codeInput = page.getByPlaceholder('Room code');
    const value = await codeInput.inputValue();
    expect(value).toBe('ABCD');
  });
});

test.describe('Lobby screen', () => {
  test('lobby shows share link button', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });

    await page.evaluate(() => {
      const g = (window as any).__game;
      g.lobbyScreen.setRoomCode('TEST');
      g.lobbyScreen.show();
    });

    await expect(page.getByText('Share Link')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

/**
 * Smoke tests — does the game load at all?
 * These run fast and should always pass before anything else.
 */

test.describe('Smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('pageerror', (err) => {
      throw new Error(`Uncaught page error: ${err.message}`);
    });
    await page.goto('/');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Bojo Dojo');
  });

  test('canvas is present and sized', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('HUD element is present', async ({ page }) => {
    const hud = page.locator('#hud');
    await expect(hud).toBeAttached();
  });

  test('window.__game exists after load', async ({ page }) => {
    // Give the game a moment to initialise (Three.js scene setup)
    await page.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });
    const phase = await page.evaluate(() => (window as any).__game.phase);
    expect(phase).toBe('offline');
  });

  test('no uncaught JS errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // navigate fresh to be sure
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });
    expect(errors).toHaveLength(0);
  });

  test('theme-color meta tag is present', async ({ page }) => {
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBe('#000000');
  });

  test('game exposes loading screen', async ({ page }) => {
    const hasLoadingScreen = await page.evaluate(() => {
      const g = (window as any).__game;
      return typeof g.loadingScreen?.show === 'function' && typeof g.loadingScreen?.hide === 'function';
    });
    expect(hasLoadingScreen).toBe(true);
  });
});

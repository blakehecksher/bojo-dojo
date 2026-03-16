import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Multiplayer tests — two browser contexts simulate host + joiner
 * connecting through the local PartyKit server (localhost:1999).
 *
 * Tests are serial: each depends on the state left by the previous one
 * (lobby → match → gameplay).
 */

test.describe('Connection state', () => {
  test('lobby shows error when server is unreachable', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });

    // Point connection at a bad host to force failure
    await page.evaluate(() => {
      const g = (window as any).__game;
      g.connection.connect('localhost:19999', 'FAKE', 'Tester');
      g.phase = 'lobby';
      g.menuScreen.hide();
      g.lobbyScreen.setRoomCode('FAKE');
      g.lobbyScreen.setStatus('Connecting...');
      g.lobbyScreen.show();
    });

    // Wait for connection to fail (error or closed state)
    await page.waitForFunction(
      () => {
        const s = (window as any).__game.connection.state;
        return s === 'error' || s === 'closed';
      },
      { timeout: 10_000 },
    );

    // Lobby should show an error message
    const status = await page.evaluate(
      () => (window as any).__game.lobbyScreen.statusEl.textContent,
    );
    expect(status).toBeTruthy();
    expect(status).toMatch(/connect|timed out|failed/i);
  });
});

test.describe.serial('Multiplayer', () => {
  let hostContext: BrowserContext;
  let joinContext: BrowserContext;
  let hostPage: Page;
  let joinPage: Page;
  let roomCode: string;

  test.beforeAll(async ({ browser }) => {
    hostContext = await browser.newContext();
    joinContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    joinPage = await joinContext.newPage();
  });

  test.afterAll(async () => {
    await hostContext?.close();
    await joinContext?.close();
  });

  test('host creates a game and sees lobby with connection status', async () => {
    await hostPage.goto('/');
    await hostPage.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });

    // Click Create Game (triggers pointerdown handler)
    await hostPage.getByText('Create Game').click();

    // Should show "Connecting..." while WebSocket opens
    await hostPage.waitForFunction(
      () => (window as any).__game.connection.state === 'connecting'
        || (window as any).__game.connection.state === 'connected',
      { timeout: 5_000 },
    );

    // Wait for lobby phase AND Start Match button (means ROOM_JOINED was received)
    await hostPage.waitForFunction(
      () => (window as any).__game.phase === 'lobby',
      { timeout: 10_000 },
    );
    await expect(hostPage.getByText('Start Match')).toBeVisible({ timeout: 5_000 });
    await expect(hostPage.getByText('Room Code:')).toBeVisible();

    // Connection should be established
    const connState = await hostPage.evaluate(() => (window as any).__game.connection.state);
    expect(connState).toBe('connected');

    // Capture room code for joiner
    roomCode = await hostPage.evaluate(
      () => (window as any).__game.lobbyScreen.codeEl.textContent,
    );
    expect(roomCode).toMatch(/^[A-Z0-9]{4}$/);
  });

  test('joiner connects and both see each other in lobby', async () => {
    // Joiner navigates with room code pre-filled
    await joinPage.goto(`/?room=${roomCode}`);
    await joinPage.waitForFunction(() => !!(window as any).__game, { timeout: 10_000 });

    // Click Join
    await joinPage.getByText('Join').click();

    // Wait for joiner to enter lobby
    await joinPage.waitForFunction(
      () => (window as any).__game.phase === 'lobby',
      { timeout: 10_000 },
    );

    // Both should see 2 players in the lobby
    await hostPage.waitForFunction(
      () => (window as any).__game.lobbyPlayers?.length === 2,
      { timeout: 10_000 },
    );
    await joinPage.waitForFunction(
      () => (window as any).__game.lobbyPlayers?.length === 2,
      { timeout: 10_000 },
    );
  });

  test('host starts match and both players enter game', async () => {
    await hostPage.getByText('Start Match').click();

    // Both should transition to 'playing'
    await hostPage.waitForFunction(
      () => (window as any).__game.phase === 'playing',
      { timeout: 15_000 },
    );
    await joinPage.waitForFunction(
      () => (window as any).__game.phase === 'playing',
      { timeout: 15_000 },
    );

    // Both should have a heightmap
    const hostHasMap = await hostPage.evaluate(() => !!(window as any).__game.heightmap);
    const joinHasMap = await joinPage.evaluate(() => !!(window as any).__game.heightmap);
    expect(hostHasMap).toBe(true);
    expect(joinHasMap).toBe(true);
  });

  test('both players see each others markers', async () => {
    const hostMarkers = await hostPage.evaluate(
      () => (window as any).__game.playerMarkers.size,
    );
    const joinMarkers = await joinPage.evaluate(
      () => (window as any).__game.playerMarkers.size,
    );
    expect(hostMarkers).toBeGreaterThanOrEqual(1);
    expect(joinMarkers).toBeGreaterThanOrEqual(1);
  });

  test('both players have the same seed', async () => {
    const hostSeed = await hostPage.evaluate(() => (window as any).__game.seed);
    const joinSeed = await joinPage.evaluate(() => (window as any).__game.seed);
    expect(hostSeed).toBe(joinSeed);
    expect(hostSeed).toBeGreaterThan(0);
  });

  test('round is active on both clients', async () => {
    const hostActive = await hostPage.evaluate(() => (window as any).__game.roundActive);
    const joinActive = await joinPage.evaluate(() => (window as any).__game.roundActive);
    expect(hostActive).toBe(true);
    expect(joinActive).toBe(true);
  });

  test('arrow fired by host appears on joiner', async () => {
    const joinArrowsBefore = await joinPage.evaluate(
      () => (window as any).__game.activeArrows.length,
    );

    // Host fires an arrow via pull slider
    const viewport = hostPage.viewportSize()!;
    const sliderX = Math.floor(viewport.width * 0.88);
    const startY = Math.floor(viewport.height * 0.4);
    const endY = startY + 180;

    await hostPage.mouse.move(sliderX, startY);
    await hostPage.mouse.down();
    await hostPage.mouse.move(sliderX, endY, { steps: 10 });
    await hostPage.mouse.up();

    // Wait for joiner to receive the arrow (server relays ARROW_FIRED)
    await joinPage.waitForFunction(
      (prev: number) => (window as any).__game.activeArrows.length > prev,
      joinArrowsBefore,
      { timeout: 5_000 },
    );
  });

  test('arrow fired by joiner appears on host', async () => {
    const hostArrowsBefore = await hostPage.evaluate(
      () => (window as any).__game.activeArrows.length,
    );

    // Joiner fires an arrow
    const viewport = joinPage.viewportSize()!;
    const sliderX = Math.floor(viewport.width * 0.88);
    const startY = Math.floor(viewport.height * 0.4);
    const endY = startY + 180;

    await joinPage.mouse.move(sliderX, startY);
    await joinPage.mouse.down();
    await joinPage.mouse.move(sliderX, endY, { steps: 10 });
    await joinPage.mouse.up();

    // Wait for host to receive the arrow
    await hostPage.waitForFunction(
      (prev: number) => (window as any).__game.activeArrows.length > prev,
      hostArrowsBefore,
      { timeout: 5_000 },
    );
  });
});

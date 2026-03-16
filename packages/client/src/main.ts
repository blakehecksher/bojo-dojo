import { Game } from './game/Game';

// Bootstrap the game — shows menu on startup; offline play and multiplayer accessible from there
const game = new Game();

// Expose for debugging
(window as unknown as Record<string, unknown>).__game = game;

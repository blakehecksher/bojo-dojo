import { Game } from './game/Game';

// Bootstrap the game
const game = new Game();

// Start offline single-player by default (menu will allow networked play)
game.startOffline();

// Expose for debugging
(window as unknown as Record<string, unknown>).__game = game;

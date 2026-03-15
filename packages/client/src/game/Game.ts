import {
  generateHeightmap, sampleHeight, generateSpawnPoints, checkTrajectoryHits,
  TERRAIN_BASE, SPAWN, INPUT, PACING,
  computeTrajectory, forceToSpeed, getPreviewPoints,
} from '@bojo-dojo/common';
import type { Vec3, TrajectoryPoint, ServerMessage, HeightmapData } from '@bojo-dojo/common';
import * as THREE from 'three';
import { SceneManager } from '../renderer/SceneManager';
import { createTerrainMesh } from '../renderer/TerrainMesh';
import { createSky } from '../renderer/SkyBox';
import { placeObstacles } from '../renderer/ObstaclePlacer';
import { InputManager } from '../input/InputManager';
import { SwipeCamera } from '../input/SwipeCamera';
import { Thumbstick } from '../input/Thumbstick';
import { PullSlider } from '../input/PullSlider';
import { HUD } from '../hud/HUD';
import { BowModel } from '../renderer/BowModel';
import { TrajectoryLine } from '../renderer/TrajectoryLine';
import { ArrowModel } from '../renderer/ArrowModel';
import { PlayerMarker } from '../renderer/PlayerMarker';
import { Round } from './Round';
import { RoundEndScreen } from '../screens/RoundEndScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { AudioManager } from '../audio/AudioManager';
import { GameConnection } from '../network/PartySocket';

const DEG2RAD = Math.PI / 180;

// PartyKit host — configured via Vite env var, defaults to localhost
const PARTYKIT_HOST = (import.meta as { env?: Record<string, string> }).env?.VITE_PARTYKIT_HOST || 'localhost:1999';

export type GamePhase = 'menu' | 'lobby' | 'playing' | 'offline';

/**
 * Top-level game orchestrator.
 * Manages state machine: menu -> lobby -> playing (or offline single-player).
 */
export class Game {
  // Core
  private sceneManager: SceneManager;
  private hud: HUD;
  private audio: AudioManager;

  // Screens
  private menuScreen: MenuScreen;
  private lobbyScreen: LobbyScreen;
  private roundEndScreen: RoundEndScreen;

  // Input
  private inputManager!: InputManager;
  private thumbstick!: Thumbstick;
  private pullSlider!: PullSlider;
  private swipeCamera!: SwipeCamera;

  // Rendering
  private bowModel!: BowModel;
  private trajectoryLine!: TrajectoryLine;
  private activeArrows: ArrowModel[] = [];
  private playerMarkers = new Map<string, PlayerMarker>();

  // State
  phase: GamePhase = 'menu';
  private heightmap: HeightmapData | null = null;
  private seed = 0;
  private localPlayerId = 'local';
  private spawns: Record<string, Vec3> = {};
  private isDrawing = false;
  private drawSoundKey: string | null = null;
  private round!: Round;
  private roundActive = false;

  // Network
  private connection: GameConnection;
  private isHost = false;
  private lobbyPlayers: Array<{ id: string; displayName: string }> = [];

  // Terrain objects to clean up between matches
  private terrainObjects: THREE.Object3D[] = [];

  constructor() {
    this.sceneManager = new SceneManager();
    this.hud = new HUD();
    this.audio = new AudioManager();
    this.connection = new GameConnection();

    // Screens
    this.menuScreen = new MenuScreen(this.hud.element);
    this.lobbyScreen = new LobbyScreen(this.hud.element);
    this.roundEndScreen = new RoundEndScreen(this.hud.element);

    // Audio unlock on first interaction
    const unlockAudio = () => {
      this.audio.unlock();
      document.removeEventListener('pointerdown', unlockAudio);
    };
    document.addEventListener('pointerdown', unlockAudio);

    this.setupInput();
    this.setupMenuHandlers();
    this.setupNetworkHandlers();
    this.setupFrameLoop();

    // Check URL for room code (join via shared link)
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      // Auto-join: show menu with prefilled code
      this.showMenu();
    } else {
      this.showMenu();
    }

    this.sceneManager.start();
  }

  // --- Setup ---

  private setupInput() {
    this.inputManager = new InputManager(this.sceneManager.renderer.domElement);
    this.thumbstick = new Thumbstick(this.hud.element);
    this.pullSlider = new PullSlider(this.hud.element);
    this.swipeCamera = new SwipeCamera(this.sceneManager.camera);

    this.inputManager.register(this.thumbstick);
    this.inputManager.register(this.pullSlider);
    this.inputManager.register(this.swipeCamera);

    this.bowModel = new BowModel(this.sceneManager.camera);
    this.trajectoryLine = new TrajectoryLine(this.sceneManager.scene);

    this.round = new Round({
      onTick: (r) => this.hud.timer.sync(r),
      onEnd: (reason) => {
        this.roundActive = false;
        if (reason === 'timeout') {
          this.roundEndScreen.show('Time\'s Up!', 'Draw — tap to continue', () => {
            if (this.phase === 'offline') this.startOfflineRound();
          });
        }
      },
    });

    this.pullSlider.on({
      onDrawStart: () => {
        this.isDrawing = true;
        this.drawSoundKey = this.audio.play('bow-draw');
      },
      onDrawChange: (force) => {
        this.bowModel.setDrawForce(force);
        if (force > INPUT.PULL_SLIDER_CANCEL_ZONE && this.heightmap) {
          this.trajectoryLine.update(
            getPreviewPoints(this.computeTrajectory(force))
          );
        } else {
          this.trajectoryLine.hide();
        }
      },
      onFire: (force) => {
        if (this.drawSoundKey) { this.audio.stop(this.drawSoundKey); this.drawSoundKey = null; }
        this.audio.play('bow-release');
        this.fireArrow(force);
      },
      onCancel: () => {
        if (this.drawSoundKey) { this.audio.stop(this.drawSoundKey); this.drawSoundKey = null; }
        this.bowModel.setDrawForce(0);
        this.trajectoryLine.hide();
        this.isDrawing = false;
      },
    });
  }

  private setupMenuHandlers() {
    this.menuScreen.on({
      onCreate: (name) => {
        // Generate a random room code
        const roomCode = this.generateRoomCode();
        this.connection.connect(PARTYKIT_HOST, roomCode, name);
        this.phase = 'lobby';
        this.menuScreen.hide();
        this.lobbyScreen.setRoomCode(roomCode);
        this.lobbyScreen.show();
      },
      onJoin: (code, name) => {
        this.connection.connect(PARTYKIT_HOST, code, name);
        this.phase = 'lobby';
        this.menuScreen.hide();
        this.lobbyScreen.setRoomCode(code);
        this.lobbyScreen.show();
      },
    });

    this.lobbyScreen.onStartMatch(() => {
      this.connection.send({ type: 'START_MATCH' });
    });
  }

  private setupNetworkHandlers() {
    this.connection.onMessage((msg: ServerMessage) => {
      switch (msg.type) {
        case 'ROOM_JOINED':
          this.localPlayerId = msg.playerId;
          this.isHost = msg.isHost;
          this.lobbyPlayers = msg.players;
          this.lobbyScreen.setPlayers(msg.players);
          this.lobbyScreen.setIsHost(msg.isHost);
          break;

        case 'PLAYER_JOINED':
          this.lobbyPlayers.push({ id: msg.playerId, displayName: msg.displayName });
          this.lobbyScreen.setPlayers(this.lobbyPlayers);
          break;

        case 'PLAYER_LEFT':
          this.lobbyPlayers = this.lobbyPlayers.filter((p) => p.id !== msg.playerId);
          this.lobbyScreen.setPlayers(this.lobbyPlayers);
          // Remove player marker if in game
          const marker = this.playerMarkers.get(msg.playerId);
          if (marker) { marker.dispose(); this.playerMarkers.delete(msg.playerId); }
          break;

        case 'MAP_SEED':
          this.seed = msg.seed;
          break;

        case 'SPAWN_ASSIGNMENT':
          this.spawns = msg.spawns;
          this.initGameWorld();
          this.lobbyScreen.hide();
          this.phase = 'playing';
          break;

        case 'ROUND_START':
          this.startNetworkRound();
          break;

        case 'TIMER_SYNC':
          this.hud.timer.sync(msg.remainingSeconds);
          break;

        case 'ARROW_FIRED':
          // Another player fired — animate their arrow locally
          this.animateRemoteArrow(msg);
          break;

        case 'PLAYER_HIT':
          this.handlePlayerHit(msg.targetId);
          break;

        case 'ROUND_END':
          this.handleRoundEnd(msg.winnerId, msg.scores);
          break;

        case 'MATCH_OVER':
          this.handleMatchOver(msg.winnerId, msg.scores);
          break;
      }
    });
  }

  private setupFrameLoop() {
    this.sceneManager.onFrame((dt) => {
      // Thumbstick fine aim
      if (this.thumbstick.dx !== 0 || this.thumbstick.dy !== 0) {
        const speed = INPUT.THUMBSTICK_MAX_SPEED * DEG2RAD;
        this.swipeCamera.applyDelta(
          -this.thumbstick.dx * speed * dt,
          -this.thumbstick.dy * speed * dt,
        );
      }

      // Update trajectory preview while drawing
      if (this.isDrawing && this.pullSlider.force > INPUT.PULL_SLIDER_CANCEL_ZONE && this.heightmap) {
        this.trajectoryLine.update(
          getPreviewPoints(this.computeTrajectory(this.pullSlider.force))
        );
      }

      // Update arrow flights
      for (const arrow of this.activeArrows) {
        arrow.update(dt);
      }
    });
  }

  // --- Game World ---

  private initGameWorld() {
    this.clearWorld();

    this.heightmap = generateHeightmap(this.seed, TERRAIN_BASE);

    const terrain = createTerrainMesh(this.heightmap);
    this.sceneManager.scene.add(terrain);
    this.terrainObjects.push(terrain);

    const sky = createSky();
    this.sceneManager.scene.add(sky);
    this.terrainObjects.push(sky);

    const obstacles = placeObstacles(this.seed, this.heightmap, TERRAIN_BASE);
    this.sceneManager.scene.add(obstacles);
    this.terrainObjects.push(obstacles);

    // Position camera at local spawn
    const mySpawn = this.spawns[this.localPlayerId];
    if (mySpawn) {
      this.sceneManager.camera.position.set(
        mySpawn.x,
        mySpawn.y + SPAWN.PLAYER_EYE_HEIGHT,
        mySpawn.z,
      );
    }

    // Place markers for other players
    let colorIdx = 0;
    for (const [id, pos] of Object.entries(this.spawns)) {
      if (id === this.localPlayerId) continue;
      const marker = new PlayerMarker(this.sceneManager.scene, id, colorIdx++);
      marker.setPosition(pos.x, pos.y, pos.z);
      this.playerMarkers.set(id, marker);
    }
  }

  private clearWorld() {
    for (const obj of this.terrainObjects) {
      this.sceneManager.scene.remove(obj);
    }
    this.terrainObjects = [];

    for (const [, marker] of this.playerMarkers) marker.dispose();
    this.playerMarkers.clear();

    for (const arrow of this.activeArrows) arrow.dispose();
    this.activeArrows = [];
  }

  // --- Round Management ---

  private startNetworkRound() {
    this.roundActive = true;
    this.hud.arrowCounter.count = PACING.STARTING_ARROWS;
    this.bowModel.setDrawForce(0);
    this.trajectoryLine.hide();
    this.isDrawing = false;

    // Reset player markers visibility
    for (const [id, pos] of Object.entries(this.spawns)) {
      if (id === this.localPlayerId) continue;
      const marker = this.playerMarkers.get(id);
      if (marker) {
        marker.setPosition(pos.x, pos.y, pos.z);
        marker.mesh.visible = true;
      }
    }

    // Clear arrows from previous round
    for (const a of this.activeArrows) a.dispose();
    this.activeArrows = [];

    // Reset camera to spawn
    const mySpawn = this.spawns[this.localPlayerId];
    if (mySpawn) {
      this.sceneManager.camera.position.set(
        mySpawn.x,
        mySpawn.y + SPAWN.PLAYER_EYE_HEIGHT,
        mySpawn.z,
      );
    }

    const extraPlayers = Math.max(0, Object.keys(this.spawns).length - 2);
    const roundTime = PACING.BASE_ROUND_TIME + extraPlayers * PACING.TIME_PER_EXTRA_PLAYER;
    this.round.start(roundTime);
    this.hud.timer.start(roundTime);
  }

  // --- Arrow Mechanics ---

  private computeTrajectory(force: number): TrajectoryPoint[] {
    const pos = this.sceneManager.camera.position;
    const dir = new THREE.Vector3();
    this.sceneManager.camera.getWorldDirection(dir);
    return computeTrajectory(
      { x: pos.x, y: pos.y, z: pos.z },
      { x: dir.x, y: dir.y, z: dir.z },
      forceToSpeed(force),
      { getTerrainHeight: (x, z) => sampleHeight(this.heightmap!, x, z) },
    );
  }

  private fireArrow(force: number) {
    if (!this.roundActive) return;
    if (this.hud.arrowCounter.count <= 0) return;
    this.hud.arrowCounter.count--;

    const pos = this.sceneManager.camera.position;
    const dir = new THREE.Vector3();
    this.sceneManager.camera.getWorldDirection(dir);
    const origin = { x: pos.x, y: pos.y, z: pos.z };
    const direction = { x: dir.x, y: dir.y, z: dir.z };

    const trajectory = this.computeTrajectory(force);

    // Animate locally (optimistic)
    const arrow = new ArrowModel(this.sceneManager.scene, true);
    arrow.launch(trajectory, (landPos) => {
      const cam = this.sceneManager.camera.position;
      this.audio.play('arrow-land', {
        listenerX: cam.x, listenerZ: cam.z,
        sourceX: landPos.x, sourceZ: landPos.z,
      });
    });
    this.activeArrows.push(arrow);

    // In offline mode, check hits locally
    if (this.phase === 'offline') {
      const players = [...this.playerMarkers.entries()]
        .filter(([, m]) => m.mesh.visible)
        .map(([id]) => ({ id, position: this.spawns[id] }));

      const hit = checkTrajectoryHits(trajectory, players, this.localPlayerId);
      if (hit) {
        const marker = this.playerMarkers.get(hit.targetId);
        if (marker) marker.mesh.visible = false;
        this.roundActive = false;
        this.round.end('hit');
        this.roundEndScreen.show('Hit!', 'Tap to play again', () => this.startOfflineRound());
      }
    }

    // In networked mode, send to server
    if (this.phase === 'playing') {
      this.connection.send({
        type: 'ARROW_FIRED',
        origin,
        direction,
        force,
      });
    }

    this.bowModel.setDrawForce(0);
    this.trajectoryLine.hide();
    this.isDrawing = false;
  }

  private animateRemoteArrow(msg: { origin: Vec3; direction: Vec3; force: number }) {
    if (!this.heightmap) return;
    const trajectory = computeTrajectory(
      msg.origin, msg.direction, forceToSpeed(msg.force),
      { getTerrainHeight: (x, z) => sampleHeight(this.heightmap!, x, z) },
    );
    const arrow = new ArrowModel(this.sceneManager.scene, false);
    arrow.launch(trajectory, (landPos) => {
      const cam = this.sceneManager.camera.position;
      this.audio.play('arrow-land', {
        listenerX: cam.x, listenerZ: cam.z,
        sourceX: landPos.x, sourceZ: landPos.z,
      });
    });
    this.activeArrows.push(arrow);
  }

  // --- Network Event Handlers ---

  private handlePlayerHit(targetId: string) {
    const marker = this.playerMarkers.get(targetId);
    if (marker) marker.mesh.visible = false;

    if (targetId === this.localPlayerId) {
      // We got hit
      this.roundActive = false;
    }
  }

  private handleRoundEnd(winnerId: string | null, scores: Record<string, number>) {
    this.roundActive = false;
    this.round.end('none');

    const winnerName = winnerId
      ? this.lobbyPlayers.find((p) => p.id === winnerId)?.displayName || 'Unknown'
      : null;
    const title = winnerId === this.localPlayerId
      ? 'Round Won!'
      : winnerId
        ? `${winnerName} wins!`
        : 'Draw!';
    const scoreText = Object.entries(scores)
      .map(([id, s]) => `${this.lobbyPlayers.find((p) => p.id === id)?.displayName || id}: ${s}`)
      .join('  |  ');

    this.roundEndScreen.show(title, scoreText);
    // Round end screen auto-dismissed when server sends ROUND_START
  }

  private handleMatchOver(winnerId: string, scores: Record<string, number>) {
    this.roundActive = false;
    this.round.end('none');

    const winnerName = this.lobbyPlayers.find((p) => p.id === winnerId)?.displayName || 'Unknown';
    const title = winnerId === this.localPlayerId ? 'You Win the Match!' : `${winnerName} wins!`;
    const scoreText = Object.entries(scores)
      .map(([id, s]) => `${this.lobbyPlayers.find((p) => p.id === id)?.displayName || id}: ${s}`)
      .join('  |  ');

    this.roundEndScreen.show(title, scoreText, () => {
      this.clearWorld();
      this.phase = 'menu';
      this.showMenu();
    });
  }

  // --- Offline / Single-Player ---

  /** Start an offline single-player practice round. */
  startOffline() {
    this.phase = 'offline';
    this.menuScreen.hide();
    this.lobbyScreen.hide();

    this.seed = Math.floor(Math.random() * 2147483647);
    this.heightmap = generateHeightmap(this.seed, TERRAIN_BASE);

    this.clearWorld();
    const terrain = createTerrainMesh(this.heightmap);
    this.sceneManager.scene.add(terrain);
    this.terrainObjects.push(terrain);
    const sky = createSky();
    this.sceneManager.scene.add(sky);
    this.terrainObjects.push(sky);
    const obs = placeObstacles(this.seed, this.heightmap, TERRAIN_BASE);
    this.sceneManager.scene.add(obs);
    this.terrainObjects.push(obs);

    const spawnPts = generateSpawnPoints(this.seed, this.heightmap, 2);
    this.localPlayerId = 'local';
    this.spawns = { local: spawnPts[0], enemy: spawnPts[1] };

    this.sceneManager.camera.position.set(
      spawnPts[0].x,
      spawnPts[0].y + SPAWN.PLAYER_EYE_HEIGHT,
      spawnPts[0].z,
    );

    const marker = new PlayerMarker(this.sceneManager.scene, 'enemy', 0);
    marker.setPosition(spawnPts[1].x, spawnPts[1].y, spawnPts[1].z);
    this.playerMarkers.set('enemy', marker);

    this.startOfflineRound();
  }

  private startOfflineRound() {
    this.roundActive = true;
    this.hud.arrowCounter.count = PACING.STARTING_ARROWS;

    for (const [, marker] of this.playerMarkers) marker.mesh.visible = true;
    for (const a of this.activeArrows) a.dispose();
    this.activeArrows = [];

    this.bowModel.setDrawForce(0);
    this.trajectoryLine.hide();
    this.isDrawing = false;

    const mySpawn = this.spawns[this.localPlayerId];
    if (mySpawn) {
      this.sceneManager.camera.position.set(
        mySpawn.x,
        mySpawn.y + SPAWN.PLAYER_EYE_HEIGHT,
        mySpawn.z,
      );
    }

    this.round.start(PACING.BASE_ROUND_TIME);
    this.hud.timer.start(PACING.BASE_ROUND_TIME);
  }

  // --- Menu ---

  private showMenu() {
    this.menuScreen.show();
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}

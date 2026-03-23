import {
  ArrowType,
  INPUT,
  MatchState,
  PACING,
  PlayerPublicState,
  SPAWN,
  type HeightmapData,
  type ServerMessage,
  type TrajectoryPoint,
  type Vec3,
  type WorldLayout,
  type ZoneState,
  checkTrajectoryHits,
  computeTrajectory,
  forceToSpeed,
  generateHeightmap,
  generateWorldLayout,
  getPreviewPoints,
  sampleHeight,
} from '@bojo-dojo/common';
import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import { HUD } from '../hud/HUD';
import { InputManager } from '../input/InputManager';
import { PullSlider } from '../input/PullSlider';
import { SwipeCamera } from '../input/SwipeCamera';
import { Thumbstick } from '../input/Thumbstick';
import { GameConnection } from '../network/PartySocket';
import { ArrowModel } from '../renderer/ArrowModel';
import { BowModel } from '../renderer/BowModel';
import { placeObstacles } from '../renderer/ObstaclePlacer';
import { PickupMarkers } from '../renderer/PickupMarkers';
import { PlayerMarker } from '../renderer/PlayerMarker';
import { SceneManager } from '../renderer/SceneManager';
import { createSky } from '../renderer/SkyBox';
import { createTerrainMesh } from '../renderer/TerrainMesh';
import { TrajectoryLine } from '../renderer/TrajectoryLine';
import { ZoneRing } from '../renderer/ZoneRing';
import { LoadingScreen } from '../screens/LoadingScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { RoundEndScreen } from '../screens/RoundEndScreen';
import { Round } from './Round';

const DEG2RAD = Math.PI / 180;
const PARTYKIT_HOST = (import.meta as { env?: Record<string, string> }).env?.VITE_PARTYKIT_HOST || `${window.location.hostname}:1999`;

export type GamePhase = 'menu' | 'lobby' | 'playing' | 'offline';

function cloneVec3(position: Vec3): Vec3 {
  return { x: position.x, y: position.y, z: position.z };
}

function distanceSquared(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

export class Game {
  private sceneManager: SceneManager;
  private hud: HUD;
  private audio: AudioManager;
  private menuScreen: MenuScreen;
  private lobbyScreen: LobbyScreen;
  private roundEndScreen: RoundEndScreen;
  private loadingScreen: LoadingScreen;
  private inputManager!: InputManager;
  private thumbstick!: Thumbstick;
  private pullSlider!: PullSlider;
  private swipeCamera!: SwipeCamera;
  private bowModel!: BowModel;
  private trajectoryLine!: TrajectoryLine;
  private zoneRing!: ZoneRing;
  private pickupMarkers!: PickupMarkers;
  private activeArrows: ArrowModel[] = [];
  private landedArrowMeshes = new Map<string, ArrowModel>();
  private playerMarkers = new Map<string, PlayerMarker>();
  phase: GamePhase = 'menu';
  private world: WorldLayout | null = null;
  private worldKey: string | null = null;
  private worldInitKey: string | null = null;
  private worldInitPromise: Promise<void> | null = null;
  private matchState: MatchState | null = null;
  private heightmap: HeightmapData | null = null;
  private seed = 0;
  private localPlayerId = 'local';
  private spawns: Record<string, Vec3> = {};
  private isDrawing = false;
  private round!: Round;
  private roundActive = false;
  private selectedArrowType: ArrowType = 'normal';
  private remoteViews = new Map<string, { yaw: number; pitch: number }>();
  private spectatorTargetId: string | null = null;
  private currentZone: ZoneState | null = null;
  private connection: GameConnection;
  private isHost = false;
  private lobbyPlayers: Array<{ id: string; displayName: string }> = [];
  private terrainObjects: THREE.Object3D[] = [];
  private viewSyncIntervalId: number | null = null;
  private offlineEnemyAlive = true;
  private offlineArrowCount = PACING.STARTING_ARROWS;
  private offlineTeleportArrows = PACING.TELEPORT_ARROWS_PER_ROUND;
  private offlineHasShield = false;
  private matchStateRetryId: number | null = null;
  private pendingTeleportArrow: ArrowModel | null = null;
  private pendingTeleportPos: Vec3 | null = null;
  private hintUntil = 0;

  constructor() {
    this.sceneManager = new SceneManager();
    this.hud = new HUD();
    this.audio = new AudioManager();
    this.connection = new GameConnection();
    this.menuScreen = new MenuScreen(this.hud.element);
    this.lobbyScreen = new LobbyScreen(this.hud.element);
    this.roundEndScreen = new RoundEndScreen(this.hud.element);
    this.loadingScreen = new LoadingScreen(this.hud.element);

    const unlockAudio = () => {
      this.audio.unlock();
      document.documentElement.requestFullscreen?.({ navigationUI: 'hide' } as FullscreenOptions).catch(() => {});
    };
    // Unlock on first tap, and re-unlock on subsequent taps if browser re-suspended
    document.addEventListener('pointerdown', unlockAudio, { once: false });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.sceneManager.pause();
      else this.sceneManager.resume();
    });

    this.setupInput();
    this.setupHUDButtons();
    this.setupMenuHandlers();
    this.setupNetworkHandlers();
    this.setupConnectionStateHandlers();
    this.setupFrameLoop();
    this.setupViewSync();
    const roomFromUrl = new URLSearchParams(window.location.search).get('room');
    const savedSession = sessionStorage.getItem('bojo-session');

    // Only auto-rejoin if there's a ?room= param (returning from share sheet).
    // Plain refresh should show the menu fresh.
    if (savedSession && roomFromUrl) {
      try {
        const session = JSON.parse(savedSession) as { roomCode: string; name: string; colorIndex: number };
        this.joinRoom(session.roomCode, session.name, session.colorIndex);
      } catch {
        sessionStorage.removeItem('bojo-session');
        this.showMenu();
        this.menuScreen.setJoinCode(roomFromUrl);
      }
    } else {
      sessionStorage.removeItem('bojo-session');
      this.showMenu();
      if (roomFromUrl) this.menuScreen.setJoinCode(roomFromUrl);
    }

    this.sceneManager.start();
  }

  private getLocalPlayerState(): PlayerPublicState | null {
    return this.matchState?.players.find((player) => player.id === this.localPlayerId) ?? null;
  }

  private canAct() {
    if (this.phase === 'offline') return this.roundActive;
    const player = this.getLocalPlayerState();
    return !!player
      && this.phase === 'playing'
      && this.matchState?.phase === 'playing'
      && player.alive
      && !player.spectating
      && !player.isFletching;
  }

  private isSpectating() {
    return !!this.getLocalPlayerState()?.spectating && this.phase === 'playing';
  }

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
    this.zoneRing = new ZoneRing(this.sceneManager.scene);
    this.pickupMarkers = new PickupMarkers(this.sceneManager.scene);
    this.round = new Round({
      onTick: (remaining) => this.hud.timer.sync(remaining),
      onEnd: (reason) => {
        this.roundActive = false;
        if (reason === 'timeout' && this.phase === 'offline') {
          this.roundEndScreen.show('Time\'s Up!', 'Tap to play again', () => this.startOfflineRound());
        }
      },
    });
    this.pullSlider.on({
      onDrawStart: () => {
        if (!this.canAct() || !this.heightmap) return;
        this.isDrawing = true;
      },
      onDrawChange: (force) => {
        if (!this.isDrawing) return;
        this.bowModel.setDrawForce(force);
        this.hud.crosshair.setDrawForce(force);
        if (force <= INPUT.PULL_SLIDER_CANCEL_ZONE || !this.heightmap) {
          this.trajectoryLine.hide();
        }
      },
      onFire: (force) => {
        if (!this.isDrawing) return;
        this.audio.play('bow-release');
        this.fireArrow(force);
      },
      onCancel: () => {
        this.resetDrawState();
      },
    });
  }

  private setupHUDButtons() {
    this.hud.fletchButton.onPress(() => {
      if (this.phase === 'offline') return;
      const player = this.getLocalPlayerState();
      if (!player || !player.alive || player.spectating || this.matchState?.phase !== 'playing') return;
      this.connection.send({ type: player.isFletching ? 'FLETCH_CANCEL' : 'FLETCH_START' });
    });
    this.hud.teleportButton.onPress(() => {
      if (this.phase === 'offline') {
        if (this.offlineTeleportArrows <= 0) return;
        this.selectedArrowType = this.selectedArrowType === 'normal' ? 'teleport' : 'normal';
        this.syncHudState();
        return;
      }
      const player = this.getLocalPlayerState();
      if (this.phase !== 'playing' || !player || player.teleportArrows <= 0) return;
      this.selectedArrowType = this.selectedArrowType === 'normal' ? 'teleport' : 'normal';
      this.syncHudState();
    });
    this.hud.spectatorButton.onPress(() => {
      this.cycleSpectatorTarget();
    });
  }

  private joinRoom(roomCode: string, name: string, colorIndex: number) {
    sessionStorage.setItem('bojo-session', JSON.stringify({ roomCode, name, colorIndex }));
    this.connection.connect(PARTYKIT_HOST, roomCode, name, colorIndex);
    this.phase = 'lobby';
    this.menuScreen.hide();
    this.lobbyScreen.setRoomCode(roomCode);
    this.lobbyScreen.setStatus('Connecting...');
    this.lobbyScreen.show();
  }

  private setupMenuHandlers() {
    this.menuScreen.on({
      onCreate: (name, colorIndex) => {
        this.joinRoom(this.generateRoomCode(), name, colorIndex);
      },
      onJoin: (code, name, colorIndex) => {
        this.joinRoom(code, name, colorIndex);
      },
      onOffline: () => {
        this.startOffline();
      },
    });
    this.lobbyScreen.onStartMatch(() => {
      this.connection.send({ type: 'START_MATCH' });
    });
  }

  private setupNetworkHandlers() {
    this.connection.onMessage(async (msg: ServerMessage) => {
      switch (msg.type) {
        case 'ROOM_JOINED':
          this.localPlayerId = msg.playerId;
          this.isHost = msg.isHost;
          this.lobbyPlayers = msg.players;
          this.lobbyScreen.setPlayers(msg.players);
          this.lobbyScreen.setIsHost(msg.isHost);
          break;
        case 'MATCH_STATE':
          this.stopMatchStateRetry();
          try {
            await this.applyMatchState(msg.state);
          } catch (error) {
            console.error('MATCH_STATE apply failed', error);
          }
          break;
        case 'ROOM_LOCKED':
          this.lobbyScreen.setStatus(msg.reason, true);
          break;
        case 'PLAYER_JOINED':
          this.lobbyPlayers = [...this.lobbyPlayers, { id: msg.playerId, displayName: msg.displayName }];
          this.lobbyScreen.setPlayers(this.lobbyPlayers);
          break;
        case 'PLAYER_LEFT':
          this.lobbyPlayers = this.lobbyPlayers.filter((player) => player.id !== msg.playerId);
          this.lobbyScreen.setPlayers(this.lobbyPlayers);
          if (this.playerMarkers.has(msg.playerId)) {
            this.playerMarkers.get(msg.playerId)?.dispose();
            this.playerMarkers.delete(msg.playerId);
          }
          break;
        case 'ROUND_START':
          this.phase = 'playing';
          this.menuScreen.hide();
          this.lobbyScreen.hide();
          this.roundEndScreen.hide();
          this.roundActive = true;
          this.resetDrawState();
          this.clearRenderedArrows();
          this.startMatchStateRetry();
          if (msg.roundNumber === 1) {
            this.hud.statusBanner.show('Swipe to aim \u2022 Pull right slider to fire');
            this.hintUntil = Date.now() + 4000;
            setTimeout(() => {
              this.hintUntil = 0;
              this.hud.statusBanner.hide();
            }, 4000);
          }
          break;
        case 'ARROW_FIRED':
          this.animateRemoteArrow(msg.origin, msg.direction, msg.force);
          break;
        case 'ARROW_LANDED':
          this.ensureLandedArrow(msg.arrowId, msg.position);
          break;
        case 'PLAYER_HIT':
          this.handlePlayerHit(msg.targetId, msg.blockedByShield);
          break;
        case 'ROUND_END':
          this.handleRoundEnd(msg.winnerId, msg.scores);
          break;
        case 'MATCH_OVER':
          this.handleMatchOver(msg.winnerId, msg.scores);
          break;
        case 'FLETCH_START':
          if (msg.playerId === this.localPlayerId) this.hud.statusBanner.show(`Fletching... ${msg.durationSeconds}s`);
          break;
        case 'FLETCH_COMPLETE':
          if (msg.playerId === this.localPlayerId) {
            this.hud.statusBanner.show(`Arrow crafted (${msg.arrows})`);
            setTimeout(() => this.hud.statusBanner.hide(), 1200);
          }
          break;
        case 'PLAYER_TELEPORT':
          if (msg.playerId === this.localPlayerId) {
            // Store position — will apply when the arrow animation lands
            this.pendingTeleportPos = { ...msg.position };
          } else {
            this.playerMarkers.get(msg.playerId)?.setPosition(msg.position.x, msg.position.y, msg.position.z);
          }
          break;
        case 'PICKUP_ACQUIRED':
          if (msg.playerId === this.localPlayerId) {
            this.hud.statusBanner.show(`Picked up ${msg.pickupType}`);
            setTimeout(() => this.hud.statusBanner.hide(), 1200);
          }
          break;
        case 'ZONE_UPDATE':
          this.currentZone = msg.zone;
          this.zoneRing.update(msg.zone);
          break;
        case 'ZONE_WARNING':
          if (msg.playerId === this.localPlayerId) {
            if (msg.remainingSeconds <= 0) {
              this.hud.zoneBanner.hide();
            } else {
              this.hud.zoneBanner.show(`Return to zone: ${msg.remainingSeconds}s`, 'warning');
            }
          }
          break;
        case 'PLAYER_VIEW':
          this.remoteViews.set(msg.playerId, { yaw: msg.yaw, pitch: msg.pitch });
          break;
        case 'TIMER_SYNC':
          this.hud.timer.sync(msg.remainingSeconds);
          break;
      }
    });
  }

  private setupConnectionStateHandlers() {
    this.connection.onState({
      onStateChange: (state, reason) => {
        switch (state) {
          case 'connecting':
            this.lobbyScreen.setStatus('Connecting...');
            break;
          case 'connected':
            this.lobbyScreen.setStatus('Connected', false);
            break;
          case 'error':
          case 'closed':
            if (this.phase === 'lobby' || this.phase === 'playing') {
              this.tryAutoReconnect(reason);
            }
            break;
        }
      },
    });
  }

  private tryAutoReconnect(reason?: string) {
    const raw = sessionStorage.getItem('bojo-session');
    if (!raw) {
      if (this.phase === 'lobby') this.lobbyScreen.setStatus(reason || 'Disconnected', true);
      else this.showMenu();
      return;
    }
    try {
      const session = JSON.parse(raw) as { roomCode: string; name: string; colorIndex: number };
      this.lobbyScreen.setStatus('Reconnecting...', false);
      this.lobbyScreen.setRoomCode(session.roomCode);
      if (this.phase !== 'lobby') {
        this.menuScreen.hide();
        this.lobbyScreen.show();
      }
      this.phase = 'lobby';
      setTimeout(() => {
        this.connection.connect(PARTYKIT_HOST, session.roomCode, session.name, session.colorIndex);
      }, 1000);
    } catch {
      this.showMenu();
    }
  }

  private setupFrameLoop() {
    this.sceneManager.onFrame((dt) => {
      if (!this.isSpectating()) {
        this.swipeCamera.update();
        if (this.thumbstick.dx !== 0 || this.thumbstick.dy !== 0) {
          const speed = INPUT.THUMBSTICK_MAX_SPEED * DEG2RAD;
          this.swipeCamera.applyDelta(
            -this.thumbstick.dx * speed * dt,
            -this.thumbstick.dy * speed * dt,
          );
        }
      } else {
        this.updateSpectatorCamera();
      }

      if (this.isDrawing && this.pullSlider.force > INPUT.PULL_SLIDER_CANCEL_ZONE && this.heightmap) {
        this.trajectoryLine.update(getPreviewPoints(this.computePreviewTrajectory(this.pullSlider.force)));
      }

      for (const arrow of [...this.activeArrows]) arrow.update(dt);
      this.bowModel.update(dt);
      for (const marker of this.playerMarkers.values()) marker.update(dt);
      this.pickupMarkers.update(dt);

      // Smooth minimap tracking from camera position
      if (this.heightmap && (this.phase === 'playing' || this.phase === 'offline')) {
        const cam = this.sceneManager.camera.position;
        const angles = this.swipeCamera.getAngles();
        if (this.matchState?.players && this.phase === 'playing') {
          const spectating = this.isSpectating();
          this.hud.minimap.update(this.localPlayerId, this.matchState.players, angles.yaw, spectating);
        } else if (this.phase === 'offline') {
          this.hud.minimap.updateLocal(cam.x, cam.z, 0, angles.yaw);
        }
      }
    });
  }

  private setupViewSync() {
    this.viewSyncIntervalId = window.setInterval(() => {
      if (this.phase !== 'playing' || !this.connection.connected || this.isSpectating()) return;
      const player = this.getLocalPlayerState();
      if (!player || !player.alive) return;
      const angles = this.swipeCamera.getAngles();
      this.connection.send({ type: 'PLAYER_VIEW', yaw: angles.yaw, pitch: angles.pitch });
    }, 200);
  }

  private async applyMatchState(state: MatchState) {
    const previousState = this.matchState;
    const previousWorldKey = this.worldKey;
    const previousLocal = previousState?.players.find((player) => player.id === this.localPlayerId) ?? null;
    this.matchState = state;
    this.lobbyPlayers = state.players.map((player) => ({ id: player.id, displayName: player.displayName }));
    this.lobbyScreen.setPlayers(this.lobbyPlayers);
    this.hud.timer.sync(state.roundTimeRemaining);
    this.hud.playerCount.setRoomCode(state.roomCode);
    this.roundActive = state.phase === 'playing';

    if (state.world) {
      await this.ensureWorldLoaded(state.world);
      this.syncNetworkPlayers(state.players);
      this.pickupMarkers.sync(state.world.pickups);
      this.syncLandedArrows(state.landedArrows);
    } else {
      this.pickupMarkers.sync([]);
      this.syncLandedArrows([]);
    }

    this.currentZone = state.zone;
    this.zoneRing.update(state.zone);

    // Hide zone banner if local player is back inside the zone
    const localForZone = state.players.find((p) => p.id === this.localPlayerId);
    if (localForZone && localForZone.zoneGraceRemaining === null) {
      this.hud.zoneBanner.hide();
    }

    if (state.phase === 'lobby') {
      this.phase = 'lobby';
      this.lobbyScreen.setIsHost(this.isHost);
      this.menuScreen.hide();
      this.lobbyScreen.show();
    } else {
      this.phase = 'playing';
      this.menuScreen.hide();
      this.lobbyScreen.hide();
    }

    const local = this.getLocalPlayerState();
    if (local) {
      this.spawns = Object.fromEntries(state.players.map((player) => [player.id, cloneVec3(player.position)]));
      if (!local.spectating) {
        // Don't snap camera while a teleport arrow is in flight — it'll snap on landing
        const teleportInFlight = !!this.pendingTeleportArrow;
        const shouldSnapCamera = !teleportInFlight && (
          !previousLocal
          || previousState?.currentRound !== state.currentRound
          || previousState?.phase !== state.phase
          || previousWorldKey !== this.worldKey
          || distanceSquared(previousLocal.position, local.position) > 9
        );
        const shouldReorient = !previousLocal
          || previousState?.currentRound !== state.currentRound
          || previousState?.phase !== state.phase
          || previousWorldKey !== this.worldKey;
        if (shouldSnapCamera) this.snapLocalCamera(local.position, shouldReorient);
      } else if (!this.spectatorTargetId || !state.players.find((player) => player.id === this.spectatorTargetId && player.alive)) {
        this.spectatorTargetId = state.players.find((player) => player.alive && player.id !== local.id)?.id ?? null;
      }
    }

    this.syncHudState();
  }

  private snapLocalCamera(position: Vec3, reorient: boolean) {
    this.sceneManager.camera.position.set(
      position.x,
      position.y + SPAWN.PLAYER_EYE_HEIGHT,
      position.z,
    );

    if (!reorient) return;

    const focusTarget = this.getSpawnFocusTarget(position);
    const dx = focusTarget.x - position.x;
    const dz = focusTarget.z - position.z;
    const yaw = Math.abs(dx) + Math.abs(dz) > 0.001
      ? Math.atan2(dx, -dz)
      : 0;
    this.swipeCamera.setLook(yaw, -0.18);
  }

  private getSpawnFocusTarget(position: Vec3): Vec3 {
    const preferredTargets = [
      ...Object.values(this.spawns).filter((spawn) => distanceSquared(spawn, position) > 36),
      ...(this.world ? [this.world.zone.center] : []),
      { x: 0, y: position.y, z: 0 },
    ];

    return preferredTargets[0] ?? { x: position.x, y: position.y, z: position.z - 12 };
  }

  private async ensureWorldLoaded(world: WorldLayout) {
    const nextWorldKey = `${world.seed}:${world.terrain.mapSize}:${world.spawns.length}`;
    if (this.worldKey === nextWorldKey) {
      this.world = world;
      this.seed = world.seed;
      return;
    }

    if (this.worldInitKey === nextWorldKey && this.worldInitPromise) {
      await this.worldInitPromise;
      this.world = world;
      this.seed = world.seed;
      return;
    }

    this.worldInitKey = nextWorldKey;
    this.worldInitPromise = this.initGameWorld(world);
    try {
      await this.worldInitPromise;
    } finally {
      if (this.worldInitKey === nextWorldKey) {
        this.worldInitKey = null;
        this.worldInitPromise = null;
      }
    }
  }

  private async initGameWorld(world: WorldLayout) {
    const nextWorldKey = `${world.seed}:${world.terrain.mapSize}:${world.spawns.length}`;
    const generatedHeightmap = generateHeightmap(world.seed, world.terrain);
    this.world = world;
    this.seed = world.seed;
    this.heightmap = generatedHeightmap;
    this.loadingScreen.show();
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.clearWorld();

    try {
      const terrain = createTerrainMesh(generatedHeightmap);
      this.sceneManager.scene.add(terrain);
      this.terrainObjects.push(terrain);

      const sky = createSky();
      this.sceneManager.scene.add(sky);
      this.terrainObjects.push(sky);

      const obstacles = placeObstacles(world.obstacles);
      this.sceneManager.scene.add(obstacles);
      this.terrainObjects.push(obstacles);

      // Only mark world as loaded AFTER all scene objects are successfully created
      this.worldKey = nextWorldKey;
      this.hud.minimap.setHeightmap(generatedHeightmap);
    } catch (err) {
      console.error('[initGameWorld] Failed to build scene objects:', err);
      // Do NOT set worldKey so the next MATCH_STATE retries world creation
      throw err;
    } finally {
      this.loadingScreen.hide();
    }
  }

  private clearWorld() {
    for (const object of this.terrainObjects) this.sceneManager.scene.remove(object);
    this.terrainObjects = [];
    for (const marker of this.playerMarkers.values()) marker.dispose();
    this.playerMarkers.clear();
    this.pickupMarkers.sync([]);
    this.clearRenderedArrows();
    this.zoneRing.update(null);
  }

  private clearRenderedArrows() {
    for (const arrow of this.activeArrows) arrow.dispose();
    this.activeArrows = [];
    this.landedArrowMeshes.clear();
  }

  private syncNetworkPlayers(players: PlayerPublicState[]) {
    const activeIds = new Set<string>();
    for (const player of players) {
      if (player.id === this.localPlayerId) continue;
      activeIds.add(player.id);
      let marker = this.playerMarkers.get(player.id);
      if (!marker) {
        marker = new PlayerMarker(this.sceneManager.scene, player.id, player.colorIndex);
        this.playerMarkers.set(player.id, marker);
      }
      marker.setPosition(player.position.x, player.position.y, player.position.z);
      marker.mesh.visible = player.alive;
      marker.setShield(player.hasShield);
    }
    for (const [id, marker] of this.playerMarkers) {
      if (activeIds.has(id)) continue;
      marker.dispose();
      this.playerMarkers.delete(id);
    }
  }

  private syncLandedArrows(landedArrows: MatchState['landedArrows']) {
    const ids = new Set(landedArrows.map((arrow) => arrow.id));
    for (const arrow of landedArrows) this.ensureLandedArrow(arrow.id, arrow.position);
    for (const [id, arrow] of this.landedArrowMeshes) {
      if (ids.has(id)) continue;
      this.disposeArrow(arrow);
      this.landedArrowMeshes.delete(id);
    }
  }

  private ensureLandedArrow(id: string, position: Vec3) {
    if (this.landedArrowMeshes.has(id)) return;
    const arrow = new ArrowModel(this.sceneManager.scene, false);
    arrow.placeAt(position.x, position.y, position.z);
    this.landedArrowMeshes.set(id, arrow);
    this.activeArrows.push(arrow);
  }

  private syncHudState() {
    const local = this.getLocalPlayerState();
    this.hud.inventory.hide();
    this.hud.fletchButton.setVisible(false);

    if (this.phase === 'offline') {
      this.hud.teleportButton.setVisible(this.roundActive);
      this.hud.teleportButton.setEnabled(true);
      this.hud.teleportButton.setLabel(this.selectedArrowType === 'teleport' ? 'Teleport Armed' : 'Teleport');
      this.hud.spectatorButton.setVisible(false);
      this.hud.zoneBanner.hide();
      this.hud.statusBanner.hide();
      this.hud.playerCount.hide();
      this.hud.shieldGlow.setActive(this.offlineHasShield);
      this.bowModel.setVisible(true);
      this.swipeCamera.setEnabled(true);
      this.swipeCamera.setForcedPitchOffset(0);
      if (this.roundActive) {
        const cam = this.sceneManager.camera.position;
        const angles = this.swipeCamera.getAngles();
        this.hud.minimap.updateLocal(cam.x, cam.z, 0, angles.yaw);
        this.hud.minimap.show();
      } else {
        this.hud.minimap.hide();
      }
      return;
    }

    if (!local) {
      this.hud.spectatorButton.setVisible(false);
      this.hud.playerCount.hide();
      this.hud.shieldGlow.setActive(false);
      return;
    }

    // Update player count indicator
    if (this.matchState) {
      const total = this.matchState.players.length;
      const alive = this.matchState.players.filter((p) => p.alive).length;
      const isPlaying = this.matchState.phase === 'playing';
      this.hud.playerCount.update(total, alive, isPlaying);
      this.hud.playerCount.show();

      if (isPlaying) {
        const angles = this.swipeCamera.getAngles();
        const spectating = !!local?.spectating;
        this.hud.minimap.update(this.localPlayerId, this.matchState.players, angles.yaw, spectating);
        this.hud.minimap.show();
      } else {
        this.hud.minimap.hide();
      }
    }

    this.hud.shieldGlow.setActive(local.hasShield);
    this.hud.spectatorButton.setVisible(false); // hidden for now

    const isPlaying = this.matchState?.phase === 'playing';
    this.hud.teleportButton.setVisible(!!isPlaying && local.alive && !local.spectating);
    this.hud.teleportButton.setEnabled(true);
    this.hud.teleportButton.setLabel(this.selectedArrowType === 'teleport' ? 'Teleport Armed' : 'Teleport');

    if (!local.spectating) {
      if (Date.now() >= this.hintUntil) this.hud.statusBanner.hide();
      this.swipeCamera.setForcedPitchOffset(0);
      this.bowModel.setVisible(true);
      this.pullSlider.setVisible(true);
      this.swipeCamera.setEnabled(true);
    } else {
      this.bowModel.setVisible(false);
      this.pullSlider.setVisible(false);
      // Spectator uses its own camera control — enable swipe for orbit
      this.swipeCamera.setEnabled(true);
    }
  }

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

  private computePreviewTrajectory(force: number): TrajectoryPoint[] {
    const pos = this.sceneManager.camera.position;
    const dir = new THREE.Vector3();
    this.sceneManager.camera.getWorldDirection(dir);
    return computeTrajectory(
      { x: pos.x, y: pos.y, z: pos.z },
      { x: dir.x, y: dir.y, z: dir.z },
      forceToSpeed(force),
      {
        dt: 1 / 30,
        maxTime: 3,
        getTerrainHeight: (x, z) => sampleHeight(this.heightmap!, x, z),
      },
    );
  }

  private fireArrow(force: number) {
    if (!this.heightmap) return;
    if (this.phase === 'offline') {
      this.fireOfflineArrow(force);
      return;
    }
    if (!this.canAct()) return;
    const local = this.getLocalPlayerState();
    if (!local) return;

    const direction = new THREE.Vector3();
    this.sceneManager.camera.getWorldDirection(direction);
    const arrowType = this.selectedArrowType === 'teleport' && local.teleportArrows > 0 ? 'teleport' : 'normal';
    const trajectory = this.computeTrajectory(force);
    this.hud.minimap.setArrowTrail(trajectory.map((p) => p.position));
    const arrow = new ArrowModel(this.sceneManager.scene, true);
    this.activeArrows.push(arrow);

    if (arrowType === 'teleport') {
      this.pendingTeleportArrow = arrow;
      this.pendingTeleportPos = null;
    }

    arrow.launch(trajectory, (landPos) => {
      const cam = this.sceneManager.camera.position;
      this.audio.play('arrow-land', {
        listenerX: cam.x,
        listenerZ: cam.z,
        sourceX: landPos.x,
        sourceZ: landPos.z,
      });

      // Apply deferred teleport when arrow lands
      if (arrow === this.pendingTeleportArrow) {
        const teleportTarget = this.pendingTeleportPos ?? { x: landPos.x, y: landPos.y, z: landPos.z };
        this.snapLocalCamera(teleportTarget, false);
        this.pendingTeleportArrow = null;
        this.pendingTeleportPos = null;
      }

      setTimeout(() => this.disposeArrow(arrow), 150);
    });

    if (arrowType === 'normal') this.hud.arrowCounter.count = Math.max(0, this.hud.arrowCounter.count - 1);
    this.connection.send({
      type: 'ARROW_FIRED',
      direction: { x: direction.x, y: direction.y, z: direction.z },
      force,
      arrowType,
    });
    if (arrowType === 'teleport') this.selectedArrowType = 'normal';
    this.resetDrawState();
    this.bowModel.fireRecoil();
  }

  private fireOfflineArrow(force: number) {
    if (!this.roundActive) return;
    const arrowType = this.selectedArrowType === 'teleport' && this.offlineTeleportArrows > 0 ? 'teleport' : 'normal';
    if (arrowType === 'normal' && this.offlineArrowCount <= 0) return;
    if (arrowType === 'teleport' && this.offlineTeleportArrows <= 0) return;

    if (arrowType === 'normal') {
      this.offlineArrowCount--;
    } else {
      this.offlineTeleportArrows--;
    }
    this.hud.arrowCounter.count = this.offlineArrowCount;

    const trajectory = this.computeTrajectory(force);
    this.hud.minimap.setArrowTrail(trajectory.map((p) => p.position));
    const arrow = new ArrowModel(this.sceneManager.scene, true);
    this.activeArrows.push(arrow);

    if (arrowType === 'teleport') {
      this.pendingTeleportArrow = arrow;
      this.pendingTeleportPos = null;
    }

    arrow.launch(trajectory, (landPos) => {
      // Apply offline teleport when arrow lands
      if (arrow === this.pendingTeleportArrow) {
        const clampedPos = this.clampToMapBounds(landPos.x, landPos.y, landPos.z);
        this.snapLocalCamera(clampedPos, false);
        this.pendingTeleportArrow = null;
        this.pendingTeleportPos = null;
      }
    });

    if (arrowType !== 'teleport') {
      const players = this.offlineEnemyAlive ? [{ id: 'enemy', position: this.spawns.enemy }] : [];
      const hit = checkTrajectoryHits(trajectory, players, this.localPlayerId);
      if (hit) {
        const hitDelayMs = Math.max(50, hit.hitTime * 1000);
        setTimeout(() => {
          if (!this.offlineEnemyAlive) return;
          this.offlineEnemyAlive = false;
          const marker = this.playerMarkers.get('enemy');
          if (marker) marker.mesh.visible = false;
          this.roundActive = false;
          this.round.end('hit');
          this.roundEndScreen.show('Hit!', 'Tap to play again', () => this.startOfflineRound());
        }, hitDelayMs);
      }
    }

    if (arrowType === 'teleport') this.selectedArrowType = 'normal';
    this.resetDrawState();
    this.bowModel.fireRecoil();
    this.syncHudState();
  }

  private animateRemoteArrow(origin: Vec3, direction: Vec3, force: number) {
    if (!this.heightmap) return;
    const trajectory = computeTrajectory(origin, direction, forceToSpeed(force), {
      getTerrainHeight: (x, z) => sampleHeight(this.heightmap!, x, z),
    });
    const arrow = new ArrowModel(this.sceneManager.scene, false);
    this.activeArrows.push(arrow);
    arrow.launch(trajectory, (landPos) => {
      const cam = this.sceneManager.camera.position;
      this.audio.play('arrow-land', {
        listenerX: cam.x,
        listenerZ: cam.z,
        sourceX: landPos.x,
        sourceZ: landPos.z,
      });
      setTimeout(() => this.disposeArrow(arrow), 150);
    });
  }

  private disposeArrow(arrow: ArrowModel) {
    arrow.dispose();
    this.activeArrows = this.activeArrows.filter((entry) => entry !== arrow);
  }

  private resetDrawState() {
    this.isDrawing = false;
    this.bowModel.setDrawForce(0);
    this.hud.crosshair.setDrawForce(0);
    this.trajectoryLine.hide();
  }

  private handlePlayerHit(targetId: string, blockedByShield: boolean) {
    const marker = this.playerMarkers.get(targetId);
    if (marker) {
      marker.flashHit();
      if (!blockedByShield) setTimeout(() => { marker.mesh.visible = false; }, 300);
    }
    if (targetId === this.localPlayerId) {
      if (blockedByShield) {
        this.hud.statusBanner.show('Shield absorbed the hit');
        setTimeout(() => this.hud.statusBanner.hide(), 1200);
      } else {
        this.hud.statusBanner.show('You were hit');
      }
    }
  }

  private handleRoundEnd(winnerId: string | null, scores: Record<string, number>) {
    this.roundActive = false;
    const winnerName = winnerId ? this.lobbyPlayers.find((player) => player.id === winnerId)?.displayName || winnerId : null;
    const title = winnerId === this.localPlayerId ? 'Round Won!' : winnerId ? `${winnerName} wins!` : 'Draw!';
    const scoreText = Object.entries(scores)
      .map(([id, score]) => `${this.lobbyPlayers.find((player) => player.id === id)?.displayName || id}: ${score}`)
      .join('  |  ');
    this.roundEndScreen.show(title, scoreText);
  }

  private handleMatchOver(winnerId: string, scores: Record<string, number>) {
    this.roundActive = false;
    const winnerName = this.lobbyPlayers.find((player) => player.id === winnerId)?.displayName || winnerId;
    const title = winnerId === this.localPlayerId ? 'You Win the Match!' : `${winnerName} wins!`;
    const scoreText = Object.entries(scores)
      .map(([id, score]) => `${this.lobbyPlayers.find((player) => player.id === id)?.displayName || id}: ${score}`)
      .join('  |  ');
    if (this.isHost) {
      this.roundEndScreen.show(title, scoreText, undefined, [
        { label: 'Rematch', onPress: () => this.connection.send({ type: 'START_MATCH' }) },
        { label: 'New Map', onPress: () => this.connection.send({ type: 'START_NEW_MAP' }) },
      ]);
    } else {
      this.roundEndScreen.show(title, `${scoreText}  |  Waiting for host...`);
    }
  }

  async startOffline() {
    this.phase = 'offline';
    this.menuScreen.hide();
    this.lobbyScreen.hide();
    const generated = generateWorldLayout(Math.floor(Math.random() * 2147483647), 2);
    await this.initGameWorld(generated.layout);
    this.localPlayerId = 'local';
    this.spawns = { local: cloneVec3(generated.layout.spawns[0]), enemy: cloneVec3(generated.layout.spawns[1]) };
    const marker = new PlayerMarker(this.sceneManager.scene, 'enemy', 0);
    marker.setPosition(this.spawns.enemy.x, this.spawns.enemy.y, this.spawns.enemy.z);
    this.playerMarkers.set('enemy', marker);
    this.snapLocalCamera(this.spawns.local, true);
    this.startOfflineRound();
    this.syncHudState();
  }

  private startOfflineRound() {
    this.offlineEnemyAlive = true;
    this.offlineArrowCount = PACING.STARTING_ARROWS;
    this.offlineTeleportArrows = PACING.TELEPORT_ARROWS_PER_ROUND;
    this.offlineHasShield = false;
    this.selectedArrowType = 'normal';
    this.roundActive = true;
    this.playerMarkers.get('enemy')?.mesh && (this.playerMarkers.get('enemy')!.mesh.visible = true);
    this.snapLocalCamera(this.spawns.local, true);
    this.clearRenderedArrows();
    this.resetDrawState();
    this.round.start(PACING.BASE_ROUND_TIME);
    this.hud.timer.start(PACING.BASE_ROUND_TIME);
    this.syncHudState();
  }

  private updateSpectatorCamera() {
    const local = this.getLocalPlayerState();
    if (!local?.spectating || !this.matchState || !this.world) return;

    // Bird's-eye orbit: swipe rotates around map center, pitch controls elevation
    const angles = this.swipeCamera.getAngles();
    const orbitYaw = angles.yaw;
    // Clamp pitch: -0.15 (nearly level) to 1.3 (nearly top-down)
    const orbitPitch = Math.max(0.15, Math.min(1.3, -angles.pitch + 0.8));
    const mapSize = this.world.terrain.mapSize;
    const orbitDist = mapSize * 0.7;

    const horizontalDist = Math.cos(orbitPitch) * orbitDist;
    const height = Math.sin(orbitPitch) * orbitDist;

    const cx = Math.sin(orbitYaw) * horizontalDist;
    const cz = Math.cos(orbitYaw) * horizontalDist;
    this.sceneManager.camera.position.set(cx, Math.max(10, height), cz);
    this.sceneManager.camera.lookAt(0, 0, 0);

    const aliveCount = this.matchState.players.filter((p) => p.alive).length;
    this.hud.statusBanner.show(`Spectating \u2014 ${aliveCount} alive`);
  }

  private cycleSpectatorTarget() {
    if (!this.matchState) return;
    const candidates = this.matchState.players.filter((player) => player.alive && player.id !== this.localPlayerId);
    if (candidates.length === 0) return;
    const currentIndex = candidates.findIndex((player) => player.id === this.spectatorTargetId);
    this.spectatorTargetId = candidates[(currentIndex + 1 + candidates.length) % candidates.length].id;
  }

  private clampToMapBounds(x: number, y: number, z: number): Vec3 {
    if (!this.world || !this.heightmap) return { x, y, z };
    const half = this.world.terrain.mapSize / 2;
    const buffer = 5;
    const cx = Math.max(-half + buffer, Math.min(half - buffer, x));
    const cz = Math.max(-half + buffer, Math.min(half - buffer, z));
    const cy = sampleHeight(this.heightmap, cx, cz);
    return { x: cx, y: cy, z: cz };
  }

  showMenu() {
    sessionStorage.removeItem('bojo-session');
    this.stopMatchStateRetry();
    this.roundActive = false;
    this.matchState = null;
    this.world = null;
    this.worldKey = null;
    this.worldInitKey = null;
    this.worldInitPromise = null;
    this.heightmap = null;
    this.currentZone = null;
    this.connection.disconnect();
    this.clearWorld();
    this.menuScreen.show();
    this.lobbyScreen.hide();
    this.roundEndScreen.hide();
    this.phase = 'menu';
    this.selectedArrowType = 'normal';
    this.hud.fletchButton.setVisible(false);
    this.hud.teleportButton.setVisible(false);
    this.hud.spectatorButton.setVisible(false);
    this.hud.statusBanner.hide();
    this.hud.zoneBanner.hide();
    this.hud.playerCount.hide();
    this.hud.minimap.hide();
    this.hud.shieldGlow.setActive(false);
  }

  private startMatchStateRetry() {
    this.stopMatchStateRetry();
    let attempts = 0;
    this.matchStateRetryId = window.setInterval(() => {
      attempts++;
      if (this.worldKey || this.phase !== 'playing' || !this.connection.connected || attempts > 10) {
        this.stopMatchStateRetry();
        return;
      }
      this.connection.send({ type: 'REQUEST_MATCH_STATE' });
    }, 1000);
  }

  private stopMatchStateRetry() {
    if (this.matchStateRetryId !== null) {
      clearInterval(this.matchStateRetryId);
      this.matchStateRetryId = null;
    }
  }

  private generateRoomCode(): string {
    let code = '';
    for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10).toString();
    return code;
  }
}

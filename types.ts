
export type GameState = 'MENU' | 'PLAYING' | 'GAME_OVER' | 'SHOP' | 'UPGRADE' | 'REPLAY' | 'USERNAME_INPUT' | 'FRIENDS' | 'COUNTDOWN' | 'TUTORIAL' | 'INBOX' | 'PASS' | 'QUESTS' | 'SPIN';

export interface Vector2 {
  x: number;
  y: number;
}

export interface ReplayFrame {
  ballPos: Vector2;
  ballRot: number;
  leftFoot: Vector2;
  rightFoot: Vector2;
  isLeftActive: boolean;
  isRightActive: boolean;
  leftTarget: Vector2 | null;
  rightTarget: Vector2 | null;
  particles: Particle[];
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  life: number;
  color: string;
  size: number;
  type?: 'sparkle' | 'snow' | 'leaf'; // Added types for weather
  rotation?: number;
}

export interface Decoration {
  x: number;
  y: number;
  type: 'flower' | 'pebble' | 'grass_tuft';
  color: string;
  size: number;
}

export interface BallState {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  rotation: number;
  angularVel: number;
}

export interface PlayerState {
  x: number;
  y: number;
  leftFoot: Vector2;
  rightFoot: Vector2;
  leftTarget: Vector2 | null;
  rightTarget: Vector2 | null;
  isLeftActive: boolean;
  isRightActive: boolean;
  leftFootVel: Vector2;
  rightFootVel: Vector2;
  leftVelHistory: Vector2[];
  rightVelHistory: Vector2[];
  facing: 1 | -1;
}

export interface PlayerStats {
  speed: number;
  touch: number;
  reach: number;
}

export interface PlayerSkinConfig {
  id: string;
  name: string;
  price: number;
  colorSkin: string;
  colorJersey: string;
  colorShorts: string;
  colorBoots: string;
  colorHair: string;
  hairStyle?: 'normal' | 'curly' | 'afro';
  jerseyNumber: number;
  baseLives: number;
  baseStats?: PlayerStats;
}

export interface BallSkinConfig {
  id: string;
  name: string;
  price: number;
  colorBase: string;
  colorAccent: string;
  extraLives: number;
}

export interface StadiumSkinConfig {
  id: string;
  name: string;
  price: number;
  skyColorTop: string;
  skyColorBottom: string;
  pitchColorTop: string;
  pitchColorBottom: string;
  standColorPrimary: string;
  standColorSecondary: string;
  accentColor: string;
  architecture: 'TRAINING' | 'BOWL' | 'WALL' | 'CLASSIC';
  environment: 'GRASS' | 'SNOW' | 'SAND' | 'AUTUMN'; // Added environment
  crowdDensity: number; // 0 to 1
}

export interface BootSkinConfig {
  id: string;
  name: string;
  price: number;
  colorPrimary: string;
  colorSecondary: string;
  trail?: boolean;
}

export interface ShopItem {
  id: string;
  type: 'PLAYER' | 'BALL' | 'STADIUM' | 'BOOTS';
  name: string;
  description: string;
  price: number;
  config: PlayerSkinConfig | BallSkinConfig | StadiumSkinConfig | BootSkinConfig;
  hidden?: boolean; // For legacy/special exclusives
}

export interface Friend {
  id: string;
  name: string;
  highScore: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'error';
  timestamp: number;
  read: boolean;
}

export interface Quest {
    id: string;
    description: string;
    target: number;
    current: number;
    xpReward: number;
    isClaimed: boolean;
    type: 'ADD_FRIEND' | 'SCORE_GAME' | 'PLAY_GAMES' | 'TOTAL_SCORE' | 'EARN_TOKENS';
}

export interface SeasonPassProgress {
    level: number;
    currentXp: number;
    claimedRewards: number[]; // Array of level numbers
}

export interface UserData {
  username?: string;
  userId?: string; // Unique ID code (e.g., Name#1234)
  tokens: number;
  inventory: string[]; // List of IDs
  friends?: Friend[];
  equippedPlayerId: string;
  equippedBallId: string;
  equippedStadiumId: string;
  equippedBootsId?: string; // New: Custom Boots
  playerLevels: Record<string, PlayerStats>; // Map playerId -> stats
  tutorialCompleted?: boolean; // Track if tutorial is done
  seasonPass?: SeasonPassProgress;
  quests?: Quest[];
  availableFreeUpgrades?: number;
  lastQuestReset?: number; // Timestamp of last daily quest generation
  lastFreeSpinTime?: number; // New: Timestamp of last free spin
}

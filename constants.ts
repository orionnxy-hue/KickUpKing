
import { ShopItem, PlayerSkinConfig, BallSkinConfig, StadiumSkinConfig, BootSkinConfig, Quest } from "./types";

export const PHYSICS = {
  GRAVITY_BASE: 0.65,
  GRAVITY_MAX: 1.5,
  FRICTION: 0.99,
  BOUNCE_DAMPING: 0.7,
  KICK_FORCE: 2.0,
  MIN_KICK_Y: -8,
  MAX_SPEED: 28,
  BALL_RADIUS: 22,
  FLOOR_PADDING: 100,
  WALL_DISTANCE: 170,
  FOOT_RETURN_SPEED: 0.2,
  FOOT_RADIUS: 50,
  GRAB_RADIUS: 180,
  MAX_LEG_REACH: 150,
  SCORE_COOLDOWN: 200, // Increased slightly to prevent double-counts
};

export const COLORS = {
  SKY_TOP: '#3b82f6',
  SKY_BOTTOM: '#93c5fd',
  PAVEMENT_LIGHT: '#94a3b8',
  PAVEMENT_DARK: '#475569',
  SIDEWALK: '#cbd5e1',
  INDICATOR: '#c026d3', // Purple-600
  INDICATOR_ACTIVE: '#d946ef', // Fuchsia-500
};

// --- SPIN WHEEL CONFIG ---
export const SPIN_COST = 500;
export const SPIN_COOLDOWN = 24 * 60 * 60 * 1000; // 24 Hours

export const WHEEL_SLICES = [
  { label: '500', value: 500, type: 'COINS', color: '#94a3b8', weight: 30 }, // Common Grey
  { label: '1000 XP', value: 1000, type: 'XP', color: '#3b82f6', weight: 25 }, // Common Blue (XP)
  { label: '2000', value: 2000, type: 'COINS', color: '#6366f1', weight: 20 }, // Uncommon Indigo
  { label: '3000 XP', value: 3000, type: 'XP', color: '#8b5cf6', weight: 15 }, // Uncommon Purple (XP)
  { label: '5000', value: 5000, type: 'COINS', color: '#ec4899', weight: 10 }, // Rare Pink
  { label: '5000 XP', value: 5000, type: 'XP', color: '#f43f5e', weight: 10 }, // Rare Rose (XP)
  { label: '25k', value: 25000, type: 'COINS', color: '#ef4444', weight: 5 }, // Mythic Red
  { label: 'MAX', value: 0, type: 'JACKPOT', color: '#facc15', weight: 2 }, // Legendary Gold (Jackpot Selector)
];

// Default Configurations
export const DEFAULT_PLAYER_CONFIG: PlayerSkinConfig = {
  id: 'player_default',
  name: 'Rookie',
  price: 0,
  colorSkin: '#eebb99',
  colorJersey: '#dc2626',
  colorShorts: '#0f172a',
  colorBoots: '#2563eb',
  colorHair: '#0f172a',
  hairStyle: 'normal',
  jerseyNumber: 1,
  baseLives: 1,
  baseStats: { speed: 0, touch: 0, reach: 0 }
};

export const DEFAULT_BALL_CONFIG: BallSkinConfig = {
  id: 'ball_default',
  name: 'Classic',
  price: 0,
  colorBase: '#f8fafc',
  colorAccent: '#1e293b',
  extraLives: 0,
};

export const DEFAULT_STADIUM_CONFIG: StadiumSkinConfig = {
  id: 'stadium_training',
  name: 'Normal Mode',
  price: 0,
  skyColorTop: '#38bdf8', // Sky 400
  skyColorBottom: '#bae6fd', // Sky 200
  pitchColorTop: '#4ade80', // Green 400
  pitchColorBottom: '#22c55e', // Green 500
  standColorPrimary: 'transparent',
  standColorSecondary: 'transparent',
  accentColor: '#fff',
  architecture: 'TRAINING',
  environment: 'GRASS',
  crowdDensity: 0
};

export const STORAGE_KEY_HIGHSCORE = 'kickup_king_highscore';
// Updated to v6 to force migration and ensure data persistence on update
export const STORAGE_KEY_USERDATA = 'kickup_king_userdata_v6';

export const XP_PER_LEVEL = 1000;

export interface PassReward {
  level: number;
  type: 'COINS' | 'ITEM' | 'FREE_UPGRADE';
  value: string | number; // ID for item, Amount for coins, 1 for upgrade
  description: string;
}

// Generate 100 Levels of Rewards
export const SEASON_PASS_REWARDS: PassReward[] = Array.from({ length: 100 }, (_, i) => {
  const level = i + 1;

  // Milestones
  if (level === 25) {
    return { level, type: 'ITEM', value: 'player_robot', description: 'Exclusive: Mecha Player' };
  }
  if (level === 50) {
    return { level, type: 'ITEM', value: 'ball_ghost', description: 'Exclusive: Ghost Ball' };
  }
  if (level === 100) {
    return { level, type: 'ITEM', value: 'player_golden_king', description: 'Exclusive: Golden King' };
  }

  // Pattern: 
  // Levels ending in 3 or 7 = Free Upgrade Ticket
  if (level % 10 === 3 || level % 10 === 7) {
    return { level, type: 'FREE_UPGRADE', value: 1, description: 'Free Stat Upgrade' };
  }

  // Levels ending in 0 (10, 20..) = Huge Coins
  if (level % 10 === 0) {
    return { level, type: 'COINS', value: 2000, description: '2000 Coins' };
  }
  // Levels ending in 5 (5, 15..) = Big Coins
  if (level % 5 === 0) {
    return { level, type: 'COINS', value: 1000, description: '1000 Coins' };
  }

  // Default
  return { level, type: 'COINS', value: 200, description: '200 Coins' };
});

// Generate Exactly 15 Daily Quests
export const generateDailyQuests = (): Quest[] => {
  const quests: Quest[] = [];
  const seed = Date.now();

  // 1. Earn Coins (4 quests)
  const coinTargets = [2000, 4000, 6000, 10000];
  coinTargets.forEach((target, i) => {
    quests.push({
      id: `daily_earn_${i}_${seed}`,
      description: `Earn ${target} Coins`,
      target: target,
      current: 0,
      xpReward: 150 + (i * 50),
      isClaimed: false,
      type: 'EARN_TOKENS'
    });
  });

  // 2. Play Games (4 quests)
  const playTargets = [10, 25, 50, 100];
  playTargets.forEach((target, i) => {
    quests.push({
      id: `daily_play_${i}_${seed}`,
      description: `Play ${target} Games`,
      target: target,
      current: 0,
      xpReward: 100 + (i * 20),
      isClaimed: false,
      type: 'PLAY_GAMES'
    });
  });

  // 3. High Score (4 quests)
  const scoreTargets = [100, 200, 300, 500];
  scoreTargets.forEach((target, i) => {
    quests.push({
      id: `daily_score_${i}_${seed}`,
      description: `Score ${target} in 1 Game`,
      target: target,
      current: 0,
      xpReward: 100 + (i * 40),
      isClaimed: false,
      type: 'SCORE_GAME'
    });
  });

  // 4. Total Score Accumulation (3 quests)
  const totalTargets = [5000, 25000, 50000];
  totalTargets.forEach((target, i) => {
    quests.push({
      id: `daily_total_${i}_${seed}`,
      description: `Accumulate ${target} Pts`,
      target: target,
      current: 0,
      xpReward: 100 + (i * 30),
      isClaimed: false,
      type: 'TOTAL_SCORE'
    });
  });

  return quests;
}

export const SHOP_ITEMS: ShopItem[] = [
  // --- BOOTS (SPECIAL THING) ---
  {
    id: 'boots_golden',
    type: 'BOOTS',
    name: 'Golden Boots',
    description: 'The ultimate striker symbol. 👞',
    price: 50000,
    hidden: true, // Exclusive to Jackpot for now
    config: {
      id: 'boots_golden',
      name: 'Golden Boots',
      price: 50000,
      colorPrimary: '#facc15', // Gold
      colorSecondary: '#854d0e', // Dark Gold
      trail: true
    }
  },
  {
    id: 'boots_fire',
    type: 'BOOTS',
    name: 'Magma Cleats',
    description: 'Leave a trail of heat.',
    price: 25000,
    config: {
      id: 'boots_fire',
      name: 'Magma Cleats',
      price: 25000,
      colorPrimary: '#ef4444',
      colorSecondary: '#7f1d1d',
      trail: false
    }
  },

  // --- FORMER SPIN EXCLUSIVE ITEMS (NOW PURCHASABLE) ---
  {
    id: 'ball_rainbow',
    type: 'BALL',
    name: 'Rainbow Ball',
    description: 'Colors shift magically. Legendary.',
    price: 25000,
    hidden: false,
    config: {
      ...DEFAULT_BALL_CONFIG,
      id: 'ball_rainbow',
      name: 'Rainbow Ball',
      colorBase: '#ffffff',
      colorAccent: '#000000',
      extraLives: 1
    }
  },
  {
    id: 'ball_rock',
    type: 'BALL',
    name: 'Rock Ball',
    description: 'Heavy as a rock. Legendary.',
    price: 25000,
    hidden: false,
    config: {
      ...DEFAULT_BALL_CONFIG,
      id: 'ball_rock',
      name: 'Rock Ball',
      colorBase: '#57534e',
      colorAccent: '#292524',
      extraLives: 1
    }
  },
  {
    id: 'ball_golden',
    type: 'BALL',
    name: 'Golden Ball',
    description: 'Pure luxury. 1 Extra Life.',
    price: 15000,
    config: {
      ...DEFAULT_BALL_CONFIG,
      id: 'ball_golden',
      name: 'Golden Ball',
      colorBase: '#facc15', // Yellow 400
      colorAccent: '#ca8a04', // Yellow 600
      extraLives: 1
    }
  },
  {
    id: 'ball_fire',
    type: 'BALL',
    name: 'Fire Ball',
    description: 'Hot to the touch.',
    price: 5000,
    config: {
      ...DEFAULT_BALL_CONFIG,
      id: 'ball_fire',
      name: 'Fire Ball',
      colorBase: '#ef4444', // Red 500
      colorAccent: '#f97316', // Orange 500
      extraLives: 0
    }
  },
  {
    id: 'player_alien',
    type: 'PLAYER',
    name: 'Alien',
    description: 'From another world. 4 Lives.',
    price: 50000,
    hidden: false,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_alien',
      name: 'Alien',
      colorSkin: '#84cc16', // Lime green
      colorJersey: '#000000',
      colorShorts: '#000000',
      colorBoots: '#84cc16',
      colorHair: '#000000',
      hairStyle: 'normal',
      baseLives: 4,
      baseStats: { speed: 2, touch: 1, reach: 1 }
    }
  },
  {
    id: 'player_orion',
    type: 'PLAYER',
    name: 'Orion',
    description: 'Galaxy Defender. 5 Lives.',
    price: 100000,
    hidden: false,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_orion',
      name: 'Orion',
      colorSkin: '#60a5fa', // Blueish skin
      colorJersey: '#1e1b4b', // Indigo 950
      colorShorts: '#000000',
      colorBoots: '#c084fc', // Purple
      colorHair: '#ffffff',
      hairStyle: 'normal',
      jerseyNumber: 11,
      baseLives: 5,
      baseStats: { speed: 3, touch: 3, reach: 2 }
    }
  },

  // --- STADIUMS ---
  {
    id: 'stadium_training',
    type: 'STADIUM',
    name: 'Normal Field',
    description: 'Classic green football field.',
    price: 0,
    config: {
      ...DEFAULT_STADIUM_CONFIG
    } as StadiumSkinConfig
  },
  {
    id: 'stadium_spring',
    type: 'STADIUM',
    name: 'Spring Meadow',
    description: 'Football field with blooming flowers.',
    price: 0,
    config: {
      id: 'stadium_spring',
      name: 'Spring Meadow',
      price: 0,
      skyColorTop: '#60a5fa',
      skyColorBottom: '#bfdbfe',
      pitchColorTop: '#86efac',
      pitchColorBottom: '#4ade80',
      standColorPrimary: 'transparent',
      standColorSecondary: 'transparent',
      accentColor: '#fff',
      architecture: 'TRAINING',
      environment: 'GRASS',
      crowdDensity: 0
    } as StadiumSkinConfig
  },
  {
    id: 'stadium_beach',
    type: 'STADIUM',
    name: 'Summer Beach',
    description: 'Play on the sand under the sun.',
    price: 0,
    config: {
      id: 'stadium_beach',
      name: 'Summer Beach',
      price: 0,
      skyColorTop: '#0ea5e9',
      skyColorBottom: '#7dd3fc',
      pitchColorTop: '#fde047',
      pitchColorBottom: '#facc15',
      standColorPrimary: 'transparent',
      standColorSecondary: 'transparent',
      accentColor: '#fef9c3',
      architecture: 'TRAINING',
      environment: 'SAND',
      crowdDensity: 0
    } as StadiumSkinConfig
  },
  {
    id: 'stadium_autumn',
    type: 'STADIUM',
    name: 'Autumn Wilds',
    description: 'Falling leaves and rustic colors.',
    price: 0,
    config: {
      id: 'stadium_autumn',
      name: 'Autumn Wilds',
      price: 0,
      skyColorTop: '#ea580c',
      skyColorBottom: '#fdba74',
      pitchColorTop: '#a16207',
      pitchColorBottom: '#ca8a04',
      standColorPrimary: 'transparent',
      standColorSecondary: 'transparent',
      accentColor: '#fed7aa',
      architecture: 'TRAINING',
      environment: 'AUTUMN',
      crowdDensity: 0
    } as StadiumSkinConfig
  },
  {
    id: 'stadium_winter',
    type: 'STADIUM',
    name: 'Winter Snow',
    description: 'Don\'t slip! Snow everywhere.',
    price: 0,
    config: {
      id: 'stadium_winter',
      name: 'Winter Snow',
      price: 0,
      skyColorTop: '#64748b',
      skyColorBottom: '#cbd5e1',
      pitchColorTop: '#e2e8f0',
      pitchColorBottom: '#f1f5f9',
      standColorPrimary: 'transparent',
      standColorSecondary: 'transparent',
      accentColor: '#94a3b8',
      architecture: 'TRAINING',
      environment: 'SNOW',
      crowdDensity: 0
    } as StadiumSkinConfig
  },
  {
    id: 'stadium_german',
    type: 'STADIUM',
    name: 'German Arena',
    description: 'The Yellow Wall. Intense atmosphere.',
    price: 1000,
    config: {
      id: 'stadium_german',
      name: 'German Arena',
      price: 1000,
      skyColorTop: '#0f172a',
      skyColorBottom: '#1e293b',
      pitchColorTop: '#14532d',
      pitchColorBottom: '#15803d',
      standColorPrimary: '#facc15',
      standColorSecondary: '#000000',
      accentColor: '#facc15',
      architecture: 'WALL',
      environment: 'GRASS',
      crowdDensity: 0.9
    } as StadiumSkinConfig
  },
  {
    id: 'stadium_barcelona',
    type: 'STADIUM',
    name: 'Camp Nou Style',
    description: 'Famous stadium. History in every bounce.',
    price: 3000,
    config: {
      id: 'stadium_barcelona',
      name: 'Camp Nou Style',
      price: 3000,
      skyColorTop: '#172554',
      skyColorBottom: '#1e3a8a',
      pitchColorTop: '#166534',
      pitchColorBottom: '#15803d',
      standColorPrimary: '#1e3a8a',
      standColorSecondary: '#7f1d1d',
      accentColor: '#fbbf24',
      architecture: 'BOWL',
      environment: 'GRASS',
      crowdDensity: 0.6
    } as StadiumSkinConfig
  },
  {
    id: 'stadium_madrid',
    type: 'STADIUM',
    name: 'Galactic Arena',
    description: 'Royal excellence. A massive stadium.',
    price: 5000,
    config: {
      id: 'stadium_madrid',
      name: 'Galactic Arena',
      price: 5000,
      skyColorTop: '#020617',
      skyColorBottom: '#111827',
      pitchColorTop: '#064e3b',
      pitchColorBottom: '#065f46',
      standColorPrimary: '#f8fafc',
      standColorSecondary: '#0ea5e9',
      accentColor: '#ffffff',
      architecture: 'CLASSIC',
      environment: 'GRASS',
      crowdDensity: 0.8
    } as StadiumSkinConfig
  },


  // --- PLAYERS (TIER 0: FREE) ---
  {
    id: 'player_default',
    type: 'PLAYER',
    name: 'Rookie',
    description: '1 Life. The start of a legend.',
    price: 0,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      hairStyle: 'normal',
      jerseyNumber: 1,
      baseLives: 1,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },

  // --- PASS EXCLUSIVE PLAYERS ---
  {
    id: 'player_robot',
    type: 'PLAYER',
    name: 'Mecha-X',
    description: 'Season Pass Exclusive (Lvl 25)',
    price: 999999, // Unbuyable
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_robot',
      colorSkin: '#94a3b8', // Metal
      colorJersey: '#475569',
      colorShorts: '#0f172a',
      colorBoots: '#38bdf8', // Neon
      colorHair: '#94a3b8',
      hairStyle: 'normal',
      jerseyNumber: 0,
      baseLives: 3,
      baseStats: { speed: 3, touch: 3, reach: 3 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_golden_king',
    type: 'PLAYER',
    name: 'Golden King',
    description: 'The Ultimate Flex.',
    price: 75000,
    hidden: false,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_golden_king',
      colorSkin: '#facc15', // Gold
      colorJersey: '#fef08a', // Light Gold
      colorShorts: '#ca8a04', // Dark Gold
      colorBoots: '#ffffff',
      colorHair: '#facc15',
      hairStyle: 'afro',
      jerseyNumber: 100,
      baseLives: 5,
      baseStats: { speed: 5, touch: 5, reach: 5 }
    } as PlayerSkinConfig
  },

  // --- PLAYERS (TIER 1: 2,000 Coins) ---
  {
    id: 'player_bellingham',
    type: 'PLAYER',
    name: 'Bellingham',
    description: '2 Lives. Hey Jude! Midfield maestro.',
    price: 2000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_bellingham',
      colorSkin: '#8d5524',
      colorJersey: '#ffffff',
      colorShorts: '#ffffff',
      colorBoots: '#fbbf24',
      colorHair: '#000000',
      hairStyle: 'normal',
      jerseyNumber: 5,
      baseLives: 2,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_james',
    type: 'PLAYER',
    name: 'James',
    description: '2 Lives. That 2014 Volley.',
    price: 2000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_james',
      colorSkin: '#e0ac69',
      colorJersey: '#facc15', // Colombia Yellow
      colorShorts: '#ffffff',
      colorBoots: '#ef4444',
      colorHair: '#000000',
      hairStyle: 'normal',
      jerseyNumber: 10,
      baseLives: 2,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_richarlison',
    type: 'PLAYER',
    name: 'Richarlison',
    description: '2 Lives. The Pigeon Dance.',
    price: 2000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_richarlison',
      colorSkin: '#d6ae8b',
      colorJersey: '#facc15', // Brazil Yellow
      colorShorts: '#1d4ed8', // Blue
      colorBoots: '#facc15',
      colorHair: '#e2e8f0', // Bleached
      hairStyle: 'normal',
      jerseyNumber: 9,
      baseLives: 2,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_pavard',
    type: 'PLAYER',
    name: 'Pavard',
    description: '2 Lives. Most satisfying volley ever.',
    price: 2000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_pavard',
      colorSkin: '#f5d0b0',
      colorJersey: '#1e3a8a', // France Blue
      colorShorts: '#ffffff',
      colorBoots: '#ffffff',
      colorHair: '#3f2a1d', // Brown
      hairStyle: 'curly',
      jerseyNumber: 2,
      baseLives: 2,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_vanpersie',
    type: 'PLAYER',
    name: 'Van Persie',
    description: '2 Lives. The Flying Dutchman.',
    price: 2000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_vanpersie',
      colorSkin: '#f5d0b0',
      colorJersey: '#dc2626', // Man U / Holland Red
      colorShorts: '#ffffff',
      colorBoots: '#000000',
      colorHair: '#3f2a1d',
      hairStyle: 'normal',
      jerseyNumber: 20,
      baseLives: 2,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_bale',
    type: 'PLAYER',
    name: 'Bale',
    description: '2 Lives. That Bicycle Kick.',
    price: 2000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_bale',
      colorSkin: '#f5d0b0',
      colorJersey: '#ffffff', // Madrid White
      colorShorts: '#ffffff',
      colorBoots: '#000000',
      colorHair: '#3f2a1d', // Bun
      hairStyle: 'normal',
      jerseyNumber: 11,
      baseLives: 2,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_robertocarlos',
    type: 'PLAYER',
    name: 'R. Carlos',
    description: '2 Lives. Impossible Free Kick.',
    price: 2000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_robertocarlos',
      colorSkin: '#c68642',
      colorJersey: '#facc15', // Brazil
      colorShorts: '#1d4ed8',
      colorBoots: '#ffffff',
      colorHair: '#000000',
      hairStyle: 'normal',
      jerseyNumber: 3,
      baseLives: 2,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_beckenbauer',
    type: 'PLAYER',
    name: 'Beckenbauer',
    description: '2 Lives. The Kaiser. RIP.',
    price: 2000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_beckenbauer',
      colorSkin: '#f5d0b0',
      colorJersey: '#ffffff',
      colorShorts: '#000000',
      colorBoots: '#000000',
      colorHair: '#3f2a1d',
      hairStyle: 'normal',
      jerseyNumber: 5,
      baseLives: 2,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_mihajlovic',
    type: 'PLAYER',
    name: 'Mihajlović',
    description: '2 Lives. Free kick master. RIP.',
    price: 2000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_mihajlovic',
      colorSkin: '#f5d0b0',
      colorJersey: '#3b82f6', // Lazio Blueish
      colorShorts: '#ffffff',
      colorBoots: '#000000',
      colorHair: '#3f2a1d',
      hairStyle: 'normal',
      jerseyNumber: 11,
      baseLives: 2,
      baseStats: { speed: 0, touch: 0, reach: 0 }
    } as PlayerSkinConfig
  },

  // --- PLAYERS (TIER 2: 5,000 Coins) ---
  {
    id: 'player_neymar',
    type: 'PLAYER',
    name: 'Neymar Jr',
    description: '3 Lives. Joga Bonito.',
    price: 5000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_neymar',
      colorSkin: '#d6ae8b',
      colorJersey: '#facc15',
      colorShorts: '#1d4ed8',
      colorBoots: '#facc15',
      colorHair: '#e2e8f0',
      hairStyle: 'normal',
      jerseyNumber: 10,
      baseLives: 3,
      baseStats: { speed: 1, touch: 1, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_yamal',
    type: 'PLAYER',
    name: 'Lamine Yamal',
    description: '3 Lives. The Young Star.',
    price: 5000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_yamal',
      colorSkin: '#8d5524',
      colorJersey: '#1e3a8a', // Barca Blue
      colorShorts: '#7f1d1d', // Barca Red
      colorBoots: '#fbbf24', // Gold
      colorHair: '#000000',
      hairStyle: 'curly',
      jerseyNumber: 27,
      baseLives: 3,
      baseStats: { speed: 2, touch: 1, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_lewandowski',
    type: 'PLAYER',
    name: 'Lewandowski',
    description: '3 Lives. Lethal Finisher.',
    price: 5000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_lewandowski',
      colorSkin: '#f5d0b0',
      colorJersey: '#1e3a8a', // Barca Blue
      colorShorts: '#7f1d1d', // Barca Red
      colorBoots: '#fbbf24', // Gold
      colorHair: '#3f2a1d',
      hairStyle: 'normal',
      jerseyNumber: 9,
      baseLives: 3,
      baseStats: { speed: 0, touch: 2, reach: 2 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_raphinha',
    type: 'PLAYER',
    name: 'Raphinha',
    description: '3 Lives. Brazilian Flair.',
    price: 5000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_raphinha',
      colorSkin: '#e0ac69',
      colorJersey: '#1e3a8a', // Barca Blue
      colorShorts: '#7f1d1d', // Barca Red
      colorBoots: '#38bdf8', // Light blue
      colorHair: '#e2e8f0', // Bleached
      hairStyle: 'normal',
      jerseyNumber: 11,
      baseLives: 3,
      baseStats: { speed: 2, touch: 1, reach: 0 }
    } as PlayerSkinConfig
  },
  {
    id: 'player_messi',
    type: 'PLAYER',
    name: 'L. Messi',
    description: '4 Lives. The GOAT.',
    price: 15000,
    config: {
      ...DEFAULT_PLAYER_CONFIG,
      id: 'player_messi',
      colorSkin: '#f5d0b0',
      colorJersey: '#38bdf8', // Argentina Light Blue
      colorShorts: '#000000',
      colorBoots: '#fbbf24', // Gold
      colorHair: '#3f2a1d', // Brown
      hairStyle: 'normal',
      jerseyNumber: 10,
      baseLives: 4,
      baseStats: { speed: 2, touch: 3, reach: 0 }
    } as PlayerSkinConfig
  },
];

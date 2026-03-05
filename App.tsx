
import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { GameState, ShopItem, UserData, PlayerSkinConfig, BallSkinConfig, PlayerStats, StadiumSkinConfig, Friend, AppNotification, SeasonPassProgress, Quest, BootSkinConfig } from './types';
import { generateCommentary } from './services/geminiService';
import { dbService, FriendRequest } from './services/databaseService'; 
import { STORAGE_KEY_HIGHSCORE, STORAGE_KEY_USERDATA, SHOP_ITEMS, DEFAULT_PLAYER_CONFIG, DEFAULT_BALL_CONFIG, DEFAULT_STADIUM_CONFIG, XP_PER_LEVEL, SEASON_PASS_REWARDS, generateDailyQuests, WHEEL_SLICES, SPIN_COST, SPIN_COOLDOWN } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [commentary, setCommentary] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

  // Economy & Profile State
  const [username, setUsername] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [tokens, setTokens] = useState(0);
  const [inventory, setInventory] = useState<string[]>(['player_default', 'ball_default', 'stadium_training']);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<Friend[]>([]); 
  const [globalLeaderboard, setGlobalLeaderboard] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [cloudError, setCloudError] = useState<string | null>(null);
  
  // Season Pass & Quests
  const [seasonPass, setSeasonPass] = useState<SeasonPassProgress>({ level: 1, currentXp: 0, claimedRewards: [] });
  const [quests, setQuests] = useState<Quest[]>([]); 
  const [freeUpgrades, setFreeUpgrades] = useState(0);
  const [lastQuestReset, setLastQuestReset] = useState(0);
  const [lastFreeSpinTime, setLastFreeSpinTime] = useState(0);

  const [equippedPlayerId, setEquippedPlayerId] = useState('player_default');
  const [equippedBallId, setEquippedBallId] = useState('ball_default');
  const [equippedStadiumId, setEquippedStadiumId] = useState('stadium_training');
  const [equippedBootsId, setEquippedBootsId] = useState<string | undefined>(undefined);
  
  // Shop State
  const [shopCategory, setShopCategory] = useState<'ALL' | 'PLAYER' | 'BALL' | 'STADIUM' | 'SEASON'>('ALL');
  
  // Upgrade State
  const [playerLevels, setPlayerLevels] = useState<Record<string, PlayerStats>>({});

  // Lives State
  const [currentLives, setCurrentLives] = useState(1);

  // Tutorial & Guidance State
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0); 
  const [showUpgradeHint, setShowUpgradeHint] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  
  // --- SAVE SYSTEM ---
  const saveUserData = useCallback((
    newTokens: number, 
    newInventory: string[], 
    newPlayerId: string, 
    newBallId: string, 
    newStadiumId: string, 
    newBootsId: string | undefined,
    newLevels: Record<string, PlayerStats>,
    newUsername: string,
    newUserId: string,
    newFriends: Friend[],
    isTutorialDone: boolean,
    newPass: SeasonPassProgress,
    newQuests: Quest[],
    newFreeUpgrades: number,
    newLastQuestReset: number,
    newLastFreeSpinTime: number
  ) => {
    const data: UserData = {
        tokens: newTokens,
        inventory: newInventory,
        equippedPlayerId: newPlayerId,
        equippedBallId: newBallId,
        equippedStadiumId: newStadiumId,
        equippedBootsId: newBootsId,
        playerLevels: newLevels,
        username: newUsername,
        userId: newUserId,
        friends: newFriends,
        tutorialCompleted: isTutorialDone,
        seasonPass: newPass,
        quests: newQuests,
        availableFreeUpgrades: newFreeUpgrades,
        lastQuestReset: newLastQuestReset,
        lastFreeSpinTime: newLastFreeSpinTime
    };
    localStorage.setItem(STORAGE_KEY_USERDATA, JSON.stringify(data));
  }, []);

  // --- LOAD SYSTEM ---
  useEffect(() => {
    const storedHS = localStorage.getItem(STORAGE_KEY_HIGHSCORE);
    const parsedHS = storedHS ? parseInt(storedHS, 10) : 0;
    setHighScore(parsedHS);

    // MIGRATION LOGIC: Check v6 -> v5 -> v4 -> v3
    let storedUser = localStorage.getItem(STORAGE_KEY_USERDATA); // v6
    if (!storedUser) storedUser = localStorage.getItem('kickup_king_userdata_v5');
    if (!storedUser) storedUser = localStorage.getItem('kickup_king_userdata_v4');
    if (!storedUser) storedUser = localStorage.getItem('kickup_king_userdata_v3');
    
    let loadedUsername = "";
    
    // Daily Quest Check Helper
    const checkDailyQuests = (currentQuests: Quest[], storedReset: number): [Quest[], number] => {
        const now = Date.now();
        const isDifferentDay = new Date(now).toDateString() !== new Date(storedReset || 0).toDateString();
        
        if (isDifferentDay || !currentQuests || currentQuests.length === 0) {
            return [generateDailyQuests(), now];
        }
        return [currentQuests, storedReset];
    };

    if (storedUser) {
        try {
            const data: UserData = JSON.parse(storedUser);
            setTokens(data.tokens || 0);
            setInventory(data.inventory || ['player_default', 'ball_default', 'stadium_training']);
            setEquippedPlayerId(data.equippedPlayerId || 'player_default');
            setEquippedBallId(data.equippedBallId || 'ball_default');
            setEquippedStadiumId(data.equippedStadiumId || 'stadium_training');
            setEquippedBootsId(data.equippedBootsId); // Might be undefined, which is fine
            setPlayerLevels(data.playerLevels || {});
            setTutorialCompleted(!!data.tutorialCompleted);
            setFreeUpgrades(data.availableFreeUpgrades || 0);
            setLastFreeSpinTime(data.lastFreeSpinTime || 0);
            
            // Pass & Quests
            if (data.seasonPass) setSeasonPass(data.seasonPass);
            
            const [finalQuests, finalReset] = checkDailyQuests(data.quests || [], data.lastQuestReset || 0);
            setQuests(finalQuests);
            setLastQuestReset(finalReset);

            if (data.friends && data.friends.length > 0) {
               setFriends(data.friends);
               const friendIds = data.friends.map(f => f.id);
               dbService.getFriendsLatestStats(friendIds).then(updatedFriends => {
                   if (updatedFriends.length > 0) setFriends(updatedFriends);
               });
            } else {
               setFriends([]);
            }

            loadedUsername = data.username || "";
            if (data.userId) {
                setUserId(data.userId);
                // Force sync on migration or load
                if (loadedUsername) {
                    dbService.registerUser(
                        loadedUsername, 
                        undefined, 
                        data.userId, 
                        parsedHS, 
                        data.tokens || 0,
                        data.inventory || [],
                        data.playerLevels || {},
                        data.friends || []
                    ).then(profile => {
                        // If cloud has better data, take it
                         let needsSave = false;
                        let newHighScore = parsedHS;
                        let newTokens = data.tokens || 0;
                        let newInv = data.inventory || [];
                        let newLevels = data.playerLevels || {};
                        let newFriendsList = data.friends || [];

                        if (profile.highScore > parsedHS) {
                            newHighScore = profile.highScore;
                            setHighScore(profile.highScore);
                            localStorage.setItem(STORAGE_KEY_HIGHSCORE, profile.highScore.toString());
                            needsSave = true;
                        }
                        if (profile.tokens > (data.tokens || 0)) {
                            newTokens = profile.tokens;
                            setTokens(profile.tokens);
                            needsSave = true;
                        }
                        if (profile.inventory && profile.inventory.length > newInv.length) {
                            newInv = profile.inventory;
                            setInventory(newInv);
                            needsSave = true;
                        }
                        if (profile.playerLevels) {
                            newLevels = { ...newLevels, ...profile.playerLevels };
                            setPlayerLevels(newLevels);
                            needsSave = true;
                        }
                        if (profile.friends && profile.friends.length > newFriendsList.length) {
                            newFriendsList = profile.friends;
                            setFriends(newFriendsList);
                            needsSave = true;
                        }
                        
                        // Always save to v6 format
                        saveUserData(newTokens, newInv, data.equippedPlayerId, data.equippedBallId, data.equippedStadiumId, data.equippedBootsId, newLevels, loadedUsername, data.userId, newFriendsList, !!data.tutorialCompleted, data.seasonPass || seasonPass, finalQuests, data.availableFreeUpgrades || 0, finalReset, data.lastFreeSpinTime || 0);
                    });
                }
            }
            setUsername(loadedUsername);

        } catch (e) {
            console.error("Failed to parse user data", e);
            const [q, t] = checkDailyQuests([], 0);
            setQuests(q);
            setLastQuestReset(t);
        }
    } else {
        const [q, t] = checkDailyQuests([], 0);
        setQuests(q);
        setLastQuestReset(t);
    }

    if (!loadedUsername) {
        setGameState('USERNAME_INPUT');
    } else {
        setGameState('MENU');
    }
  }, [saveUserData]); 

  // --- ONLINE PRESENCE (Simplified for brevity, assuming kept same as before but ensuring updateScore is used) ---
  useEffect(() => {
      const fetchData = async () => {
          dbService.getOnlineUsers(userId, username, highScore).then(setOnlinePlayers);
          dbService.getGlobalLeaderboard().then(setGlobalLeaderboard);
          if (userId) {
              const latestProfile = await dbService.ping(userId);
              if (latestProfile) {
                  // Sync logic (simplified)
                  if (latestProfile.tokens > tokens) setTokens(latestProfile.tokens);
                  // ... other syncs ...
              }
              const requests = await dbService.getIncomingRequests(userId);
              setFriendRequests(requests);
          }
      };
      fetchData();
      if (!userId) return;
      const interval = setInterval(() => {
          setCloudError(dbService.lastCloudError);
          if (gameState === 'FRIENDS' || gameState === 'MENU' || gameState === 'INBOX') fetchData();
      }, 5000); 
      return () => clearInterval(interval);
  }, [userId, gameState, highScore, tokens, username]);


  // ... (Keep Timer logic) ...
  useEffect(() => {
    let interval: any;
    if (gameState === 'PLAYING') {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);


  // Helper functions (configs, stats, pass logic)
  const currentPlayerConfig = (SHOP_ITEMS.find(i => i.id === equippedPlayerId)?.config as PlayerSkinConfig) || DEFAULT_PLAYER_CONFIG;
  const currentBallConfig = (SHOP_ITEMS.find(i => i.id === equippedBallId)?.config as BallSkinConfig) || DEFAULT_BALL_CONFIG;
  const currentStadiumConfig = (SHOP_ITEMS.find(i => i.id === equippedStadiumId)?.config as StadiumSkinConfig) || DEFAULT_STADIUM_CONFIG;
  const currentBootsConfig = equippedBootsId ? (SHOP_ITEMS.find(i => i.id === equippedBootsId)?.config as BootSkinConfig) : undefined;

  const currentUpgrades = playerLevels[equippedPlayerId] || { speed: 0, touch: 0, reach: 0 };
  const baseStats = currentPlayerConfig.baseStats || { speed: 0, touch: 0, reach: 0 };
  const currentPlayerStats: PlayerStats = {
    speed: (currentUpgrades.speed || 0) + (baseStats.speed || 0),
    touch: (currentUpgrades.touch || 0) + (baseStats.touch || 0),
    reach: (currentUpgrades.reach || 0) + (baseStats.reach || 0),
  };
  const totalLives = (currentPlayerConfig.baseLives || 1) + (currentBallConfig.extraLives || 0);

  const addPassXp = (amount: number) => {
      let newXp = seasonPass.currentXp + amount;
      let newLevel = seasonPass.level;
      while (newXp >= XP_PER_LEVEL && newLevel < 100) {
          newXp -= XP_PER_LEVEL;
          newLevel++;
      }
      if (newLevel === 100) newXp = XP_PER_LEVEL; 
      const newPass = { ...seasonPass, level: newLevel, currentXp: newXp };
      setSeasonPass(newPass);
      return newPass;
  };

  // --- ACTIONS ---

  const handleHardReset = () => {
      if (window.confirm("Are you sure you want to RESET your career? You will lose all items, coins, and progress.")) {
          localStorage.removeItem(STORAGE_KEY_USERDATA);
          localStorage.removeItem(STORAGE_KEY_HIGHSCORE);
          window.location.reload();
      }
  };

  const handleSpinRequest = useCallback((): { success: boolean, resultIndex: number, reward: any, isFree: boolean } => {
      const now = Date.now();
      const isFree = (now - lastFreeSpinTime) > SPIN_COOLDOWN;
      
      // Strict Daily Limit: If not free, you cannot spin.
      if (!isFree) {
          return { success: false, resultIndex: -1, reward: null, isFree: false };
      }

      // Determine result based on weights
      const totalWeight = WHEEL_SLICES.reduce((sum, slice) => sum + slice.weight, 0);
      let random = Math.random() * totalWeight;
      let resultIndex = 0;
      for (let i = 0; i < WHEEL_SLICES.length; i++) {
          if (random < WHEEL_SLICES[i].weight) {
              resultIndex = i;
              break;
          }
          random -= WHEEL_SLICES[i].weight;
      }

      // Update cooldown timestamp
      setLastFreeSpinTime(now); 

      return { success: true, resultIndex, reward: WHEEL_SLICES[resultIndex], isFree: true };
  }, [lastFreeSpinTime]);

  const handleSpinComplete = (reward: any, isFree: boolean) => {
      let newTokens = tokens;
      let newPass = seasonPass;

      if (reward.type === 'COINS') {
          setTokens(prev => prev + reward.value);
          newTokens += reward.value;
      } else if (reward.type === 'XP') {
          newPass = addPassXp(reward.value);
      }
      // If JACKPOT, UI handles selection, then calls handleJackpotClaim.
      // We still save the cooldown here.
      
      const now = Date.now();
      const finalFreeTime = isFree ? now : lastFreeSpinTime; // Should always be 'now' with strict rule
      
      saveUserData(
          newTokens, 
          inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId,
          playerLevels, username, userId, friends, tutorialCompleted, 
          newPass, quests, freeUpgrades, lastQuestReset, finalFreeTime
      );
  };

  const handleJackpotClaim = (item: ShopItem) => {
      // Add item to inventory and equip if it's the first one of its type?
      // Or just add.
      let newInventory = [...inventory];
      if (!newInventory.includes(item.id)) {
          newInventory.push(item.id);
      }
      
      let newBootsId = equippedBootsId;
      if (item.type === 'BOOTS') {
          newBootsId = item.id;
      }

      setInventory(newInventory);
      setEquippedBootsId(newBootsId);
      
      saveUserData(
          tokens, newInventory, equippedPlayerId, equippedBallId, equippedStadiumId, newBootsId,
          playerLevels, username, userId, friends, tutorialCompleted, 
          seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime
      );
  };

  const handleClaimQuest = (questId: string) => {
      const quest = quests.find(q => q.id === questId);
      if (!quest || quest.isClaimed || quest.current < quest.target) return;
      const newQuests = quests.map(q => q.id === questId ? { ...q, isClaimed: true } : q);
      setQuests(newQuests);
      const newPass = addPassXp(quest.xpReward);
      saveUserData(tokens, inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, tutorialCompleted, newPass, newQuests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
  };

  const handleClaimPassReward = (level: number) => {
      if (seasonPass.claimedRewards.includes(level) || seasonPass.level < level) return;
      const reward = SEASON_PASS_REWARDS.find(r => r.level === level);
      if (!reward) return;
      let newTokens = tokens;
      let newInventory = [...inventory];
      let newFreeUpgrades = freeUpgrades;
      if (reward.type === 'COINS') {
          newTokens += (reward.value as number);
      } else if (reward.type === 'FREE_UPGRADE') {
          newFreeUpgrades += (reward.value as number);
      } else {
          const itemId = reward.value as string;
          if (!newInventory.includes(itemId)) newInventory.push(itemId);
      }
      const newPass = { ...seasonPass, claimedRewards: [...seasonPass.claimedRewards, level] };
      setSeasonPass(newPass);
      setTokens(newTokens);
      setInventory(newInventory);
      setFreeUpgrades(newFreeUpgrades);
      saveUserData(newTokens, newInventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, tutorialCompleted, newPass, quests, newFreeUpgrades, lastQuestReset, lastFreeSpinTime);
  };

  const handleStart = () => {
    setScore(0);
    setTimeElapsed(0);
    setCurrentLives(totalLives);
    setCommentary("");
    if (!tutorialCompleted) {
        setGameState('TUTORIAL');
        setTutorialStep(1); 
    } else {
        setGameState('COUNTDOWN');
        setCountdownValue(3);
        let count = 3;
        const timer = setInterval(() => {
            count--;
            if (count > 0) setCountdownValue(count);
            else if (count === 0) setCountdownValue(0);
            else {
                clearInterval(timer);
                setCountdownValue(null);
                setGameState('PLAYING');
            }
        }, 700);
    }
  };

  const handleSkipTutorial = () => {
      setTutorialCompleted(true);
      setTutorialStep(0);
      saveUserData(tokens, inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, true, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
      handleStart();
  };

  const handleTutorialInteraction = useCallback(() => {
      if (gameState === 'TUTORIAL' && tutorialStep === 1) setTutorialStep(2); 
  }, [gameState, tutorialStep]);

  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
    const earnedTokens = 10;
    setTokens(prev => prev + earnedTokens);
    if (gameState === 'TUTORIAL' && newScore >= 2 && tutorialStep === 2) setTutorialStep(3);
    if (newScore > 0 && newScore % 10 === 0 && gameState === 'PLAYING') {
        generateCommentary(newScore, 'MILESTONE').then(text => {
            setCommentary(text);
            setTimeout(() => setCommentary(""), 3000);
        });
    }
  }, [gameState, tutorialStep]);

  const handleLivesUpdate = useCallback((lives: number) => setCurrentLives(lives), []);

  const handleGameOver = useCallback(async () => {
    if (gameState === 'TUTORIAL') {
        setTutorialCompleted(true);
        setShowUpgradeHint(true); 
    } else setShowUpgradeHint(false);

    setGameState('GAME_OVER');
    setCommentary(""); 
    
    let currentBest = highScore;
    let earnedXp = 50; 
    if (score > highScore) {
      currentBest = score;
      setHighScore(score);
      earnedXp = 500; 
      localStorage.setItem(STORAGE_KEY_HIGHSCORE, score.toString());
    }
    const newPass = addPassXp(earnedXp);

    const newQuests = quests.map(q => {
        if (q.type === 'PLAY_GAMES' && !q.isClaimed) return { ...q, current: Math.min(q.target, q.current + 1) };
        if (q.type === 'SCORE_GAME' && !q.isClaimed) return { ...q, current: Math.max(q.current, Math.min(q.target, score)) };
        if (q.type === 'TOTAL_SCORE' && !q.isClaimed) return { ...q, current: Math.min(q.target, q.current + score) };
        return q;
    });
    setQuests(newQuests);
    if (userId) dbService.updateScore(userId, score, tokens, currentBest, inventory, playerLevels, friends);
    saveUserData(tokens, inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, true, newPass, newQuests, freeUpgrades, lastQuestReset, lastFreeSpinTime);

    setIsAiLoading(true);
    const comment = await generateCommentary(score, 'GAME_OVER');
    setCommentary(comment);
    setIsAiLoading(false);
  }, [score, highScore, tokens, inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, saveUserData, gameState, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime]);

  const handleAfkPenalty = useCallback(() => {
    const sessionEarnings = score * 10;
    const basePenalty = 150;
    const totalPenalty = sessionEarnings + basePenalty;
    const newTokens = Math.max(0, tokens - totalPenalty);
    setTokens(newTokens);
    setGameState('MENU');
    setCommentary(`AFK Penalty! Lost ${sessionEarnings} session earnings + 150 fine!`);
    setTimeout(() => setCommentary(""), 4000);
    if (userId) dbService.updateScore(userId, score, newTokens, highScore, inventory, playerLevels, friends);
    saveUserData(newTokens, inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, tutorialCompleted, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
  }, [score, tokens, inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, saveUserData, tutorialCompleted, highScore, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime]);

  const handleBuyItem = (item: ShopItem) => {
    if (tokens >= item.price && !inventory.includes(item.id)) {
        const newTokens = tokens - item.price;
        const newInventory = [...inventory, item.id];
        setTokens(newTokens);
        setInventory(newInventory);
        saveUserData(newTokens, newInventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, tutorialCompleted, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
        if(userId) dbService.updateScore(userId, score, newTokens, highScore, newInventory, playerLevels, friends);
    }
  };

  const handleEquipItem = (item: ShopItem) => {
    if (item.type === 'PLAYER') {
        setEquippedPlayerId(item.id);
        saveUserData(tokens, inventory, item.id, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, tutorialCompleted, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
    } else if (item.type === 'BALL') {
        setEquippedBallId(item.id);
        saveUserData(tokens, inventory, equippedPlayerId, item.id, equippedStadiumId, equippedBootsId, playerLevels, username, userId, friends, tutorialCompleted, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
    } else if (item.type === 'STADIUM') {
        setEquippedStadiumId(item.id);
        saveUserData(tokens, inventory, equippedPlayerId, equippedBallId, item.id, equippedBootsId, playerLevels, username, userId, friends, tutorialCompleted, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
    }
  };

  const getUpgradeCost = (stat: 'speed' | 'touch' | 'reach') => {
      const currentLevel = (playerLevels[equippedPlayerId]?.[stat] || 0);
      return 100 * (currentLevel + 1);
  };

  const handleUpgradeStat = (stat: 'speed' | 'touch' | 'reach') => {
      const cost = getUpgradeCost(stat);
      let newTokens = tokens;
      let newFreeUpgrades = freeUpgrades;
      let success = false;
      if (freeUpgrades > 0) {
          newFreeUpgrades -= 1;
          success = true;
      } else if (tokens >= cost) {
          newTokens -= cost;
          success = true;
      }
      if (success) {
          const currentStats = playerLevels[equippedPlayerId] || { speed: 0, touch: 0, reach: 0 };
          const newStats = { ...currentStats, [stat]: (currentStats[stat] || 0) + 1 };
          const newPlayerLevels = { ...playerLevels, [equippedPlayerId]: newStats };
          setTokens(newTokens);
          setFreeUpgrades(newFreeUpgrades);
          setPlayerLevels(newPlayerLevels);
          if (showUpgradeHint) setShowUpgradeHint(false);
          saveUserData(newTokens, inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, newPlayerLevels, username, userId, friends, tutorialCompleted, seasonPass, quests, newFreeUpgrades, lastQuestReset, lastFreeSpinTime);
          if(userId) dbService.updateScore(userId, score, newTokens, highScore, inventory, newPlayerLevels, friends);
      }
  };

  const handleSetUsername = async (name: string, pin: string): Promise<boolean | string> => {
      try {
          const profile = await dbService.registerUser(name, pin, undefined, highScore, tokens, inventory, playerLevels, friends);
          setUsername(profile.username);
          setUserId(profile.userId);
          const finalHighScore = Math.max(profile.highScore, highScore);
          const finalTokens = Math.max(profile.tokens, tokens);
          const finalInventory = profile.inventory || inventory;
          const finalLevels = profile.playerLevels || playerLevels;
          const finalFriends = profile.friends || friends;
          if (finalHighScore > highScore) {
              setHighScore(finalHighScore);
              localStorage.setItem(STORAGE_KEY_HIGHSCORE, finalHighScore.toString());
          }
          setTokens(finalTokens);
          setInventory(finalInventory);
          setPlayerLevels(finalLevels);
          setFriends(finalFriends);
          saveUserData(finalTokens, finalInventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, finalLevels, profile.username, profile.userId, finalFriends, tutorialCompleted, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
          setGameState('MENU');
          return true;
      } catch (e: any) {
          if (e.message === "INVALID_PIN") return "Wrong Password!";
          return "Connection Error.";
      }
  };

  const handleSearchFriend = async (name: string): Promise<Friend | null> => {
      return await dbService.searchUser(name); 
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
      await dbService.respondToRequest(request.id, 'accepted');
      const stats = await dbService.getFriendsLatestStats([request.from_user_id]);
      if (stats.length > 0) {
           const newFriend = stats[0];
           if (!friends.some(f => f.id === newFriend.id)) {
               const newFriends = [...friends, newFriend];
               setFriends(newFriends);
               const newQuests = quests.map(q => {
                  if (q.type === 'ADD_FRIEND' && !q.isClaimed) return { ...q, current: Math.min(q.target, q.current + 1) };
                  return q;
               });
               setQuests(newQuests);
               saveUserData(tokens, inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, newFriends, tutorialCompleted, seasonPass, newQuests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
               if (userId) dbService.updateScore(userId, score, tokens, highScore, inventory, playerLevels, newFriends);
           }
      }
      setFriendRequests(prev => prev.filter(r => r.id !== request.id));
  };

  const handleRejectRequest = async (request: FriendRequest) => {
      await dbService.respondToRequest(request.id, 'rejected');
      setFriendRequests(prev => prev.filter(r => r.id !== request.id));
  };
  const handleSendFriendRequest = async (toFriend: Friend): Promise<boolean> => {
      if (toFriend.id === userId) return false; 
      if (friends.some(f => f.id === toFriend.id)) return false; 
      return await dbService.sendFriendRequest(userId, username, toFriend.id);
  };
  const handleRemoveFriend = (friendId: string) => {
      const newFriends = friends.filter(f => f.id !== friendId);
      setFriends(newFriends);
      saveUserData(tokens, inventory, equippedPlayerId, equippedBallId, equippedStadiumId, equippedBootsId, playerLevels, username, userId, newFriends, tutorialCompleted, seasonPass, quests, freeUpgrades, lastQuestReset, lastFreeSpinTime);
      if (userId) dbService.updateScore(userId, score, tokens, highScore, inventory, playerLevels, newFriends);
  };
  const handleClearNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden select-none">
      <GameCanvas 
        gameState={gameState} 
        onScoreUpdate={handleScoreUpdate}
        onLivesUpdate={handleLivesUpdate}
        onGameOver={handleGameOver}
        onAfkPenalty={handleAfkPenalty}
        setCanvasRef={setCanvasRef}
        playerConfig={currentPlayerConfig}
        ballConfig={currentBallConfig}
        stadiumConfig={currentStadiumConfig}
        bootsConfig={currentBootsConfig}
        playerStats={currentPlayerStats}
        initialLives={totalLives}
        tutorialStep={tutorialStep}
        onTutorialInteraction={handleTutorialInteraction}
      />
      
      <UIOverlay 
        gameState={gameState}
        score={score}
        highScore={highScore}
        tokens={tokens}
        timeElapsed={timeElapsed}
        commentary={commentary}
        inventory={inventory}
        equippedPlayerId={equippedPlayerId}
        equippedBallId={equippedBallId}
        equippedStadiumId={equippedStadiumId}
        lives={currentLives}
        playerStats={currentPlayerStats}
        shopCategory={shopCategory}
        username={username}
        userId={userId}
        friends={friends}
        onlinePlayers={onlinePlayers}
        globalLeaderboard={globalLeaderboard}
        friendRequests={friendRequests} 
        notifications={notifications}
        seasonPass={seasonPass}
        quests={quests}
        freeUpgrades={freeUpgrades}
        lastFreeSpinTime={lastFreeSpinTime}
        onStart={handleStart}
        onRestart={handleStart} 
        onGoHome={() => setGameState('MENU')}
        onOpenShop={() => {
            setShopCategory('ALL');
            setGameState('SHOP');
        }}
        onOpenUpgrade={() => {
            setGameState('UPGRADE');
            setShowUpgradeHint(false);
        }}
        onOpenFriends={() => setGameState('FRIENDS')}
        onOpenInbox={() => setGameState('INBOX')}
        onOpenPass={() => setGameState('PASS')}
        onOpenSpin={() => setGameState('SPIN')}
        onCloseShop={() => setGameState('MENU')}
        onSetShopCategory={setShopCategory}
        onBuyItem={handleBuyItem}
        onEquipItem={handleEquipItem}
        onUpgradeStat={handleUpgradeStat}
        getUpgradeCost={getUpgradeCost}
        isAiLoading={isAiLoading}
        onReplay={() => setGameState('REPLAY')}
        onSetUsername={handleSetUsername}
        onSearchFriend={handleSearchFriend}
        onSendFriendRequest={handleSendFriendRequest} 
        onAcceptRequest={handleAcceptRequest} 
        onRejectRequest={handleRejectRequest} 
        onRemoveFriend={handleRemoveFriend}
        onClearNotification={handleClearNotification}
        onClaimQuest={handleClaimQuest}
        onClaimPassReward={handleClaimPassReward}
        onSpinRequest={handleSpinRequest}
        onSpinComplete={handleSpinComplete}
        onJackpotClaim={handleJackpotClaim}
        tutorialStep={tutorialStep}
        onSkipTutorial={handleSkipTutorial}
        showUpgradeHint={showUpgradeHint}
        countdownValue={countdownValue}
        cloudError={cloudError}
        onHardReset={handleHardReset}
      />
    </div>
  );
};

export default App;

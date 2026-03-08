
import React, { useState, useEffect, useRef } from 'react';
import { GameState, ShopItem, PlayerSkinConfig, PlayerStats, StadiumSkinConfig, Friend, AppNotification, SeasonPassProgress, Quest } from '../types';
import { FriendRequest, dbService } from '../services/databaseService';
import { Play, RotateCcw, Trophy, ShoppingCart, Coins, ArrowLeft, Lock, Check, Heart, Zap, Crosshair, Maximize, Clock, Home, Users, Plus, UserCircle, Trash2, Search, UserPlus, Globe, Star, MousePointer2, TrendingUp, Bell, CheckCircle2, XCircle, KeyRound, Mail, Inbox, Gift, Crown, LayoutList, ArrowBigUp, ClipboardList, ChevronRight, AlertCircle, Cloud, AlertTriangle, Video, SkipForward, Disc, Aperture, Sparkles, Gem } from 'lucide-react';
import { SHOP_ITEMS, SEASON_PASS_REWARDS, XP_PER_LEVEL, WHEEL_SLICES, SPIN_COST, SPIN_COOLDOWN } from '../constants';
import ShopItemPreview from './ShopItemPreview';

interface UIOverlayProps {
    gameState: GameState;
    score: number;
    highScore: number;
    tokens: number;
    timeElapsed: number;
    commentary: string;
    inventory: string[];
    equippedPlayerId: string;
    equippedBallId: string;
    equippedStadiumId: string;
    lives: number;
    playerStats: PlayerStats;
    shopCategory: 'ALL' | 'PLAYER' | 'BALL' | 'STADIUM' | 'SEASON';
    username: string;
    userId?: string;
    friends: Friend[];
    onlinePlayers?: Friend[];
    globalLeaderboard?: Friend[];
    friendRequests?: FriendRequest[];
    notifications?: AppNotification[];
    seasonPass?: SeasonPassProgress;
    quests?: Quest[];
    freeUpgrades?: number;
    lastFreeSpinTime?: number;
    onStart: () => void;
    onRestart: () => void;
    onGoHome: () => void;
    onOpenShop: () => void;
    onOpenUpgrade: () => void;
    onOpenFriends: () => void;
    onOpenInbox: () => void;
    onOpenPass?: () => void;
    onOpenSpin?: () => void;
    onCloseShop: () => void;
    onSetShopCategory: (category: 'ALL' | 'PLAYER' | 'BALL' | 'STADIUM' | 'SEASON') => void;
    onBuyItem: (item: ShopItem) => void;
    onEquipItem: (item: ShopItem) => void;
    onUpgradeStat: (stat: 'speed' | 'touch' | 'reach') => void;
    getUpgradeCost: (stat: 'speed' | 'touch' | 'reach') => number;
    isAiLoading: boolean;
    onReplay: () => void;
    onSetUsername: (name: string, pin: string) => Promise<boolean | string>;
    onSearchFriend: (name: string) => Promise<Friend | null>;
    onSendFriendRequest: (friend: Friend) => Promise<boolean>;
    onAcceptRequest: (req: FriendRequest) => void;
    onRejectRequest: (req: FriendRequest) => void;
    onRemoveFriend: (id: string) => void;
    onClearNotification: (id: string) => void;
    onClaimQuest?: (id: string) => void;
    onClaimPassReward?: (level: number) => void;
    onSpinRequest?: () => { success: boolean, resultIndex: number, reward: any, isFree: boolean };
    onSpinComplete?: (reward: any, isFree: boolean) => void;
    onJackpotClaim?: (item: ShopItem) => void;
    tutorialStep?: number;
    onSkipTutorial?: () => void;
    showUpgradeHint?: boolean;
    countdownValue?: number | null;
    cloudError?: string | null;
    onHardReset?: () => void;
    onToggleFullscreen?: () => void;
    onRefreshData?: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
    gameState,
    score,
    highScore,
    tokens,
    timeElapsed,
    commentary,
    inventory,
    equippedPlayerId,
    equippedBallId,
    equippedStadiumId,
    lives,
    playerStats,
    shopCategory,
    username,
    userId,
    friends,
    onlinePlayers = [],
    globalLeaderboard = [],
    friendRequests = [],
    notifications = [],
    seasonPass,
    quests = [],
    freeUpgrades = 0,
    lastFreeSpinTime = 0,
    onStart,
    onRestart,
    onGoHome,
    onOpenShop,
    onOpenUpgrade,
    onOpenFriends,
    onOpenInbox,
    onOpenPass,
    onOpenSpin,
    onCloseShop,
    onSetShopCategory,
    onBuyItem,
    onEquipItem,
    onUpgradeStat,
    getUpgradeCost,
    isAiLoading,
    onReplay,
    onSetUsername,
    onSearchFriend,
    onSendFriendRequest,
    onAcceptRequest,
    onRejectRequest,
    onRemoveFriend,
    onClearNotification,
    onClaimQuest,
    onClaimPassReward,
    onSpinRequest,
    onSpinComplete,
    onJackpotClaim,
    tutorialStep = 0,
    onSkipTutorial,
    showUpgradeHint = false,
    countdownValue,
    cloudError,
    onHardReset,
    onToggleFullscreen,
    onRefreshData
}) => {
    const [inputName, setInputName] = useState("");
    const [inputPin, setInputPin] = useState("");
    const [friendNameInput, setFriendNameInput] = useState("");
    const [searchResult, setSearchResult] = useState<Friend | null>(null);
    const [socialTab, setSocialTab] = useState<'FRIENDS' | 'ONLINE' | 'GLOBAL'>('FRIENDS');
    const [passTab, setPassTab] = useState<'TASKS' | 'PASS'>('TASKS');
    const [tutorialTapCount, setTutorialTapCount] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [registrationError, setRegistrationError] = useState("");
    const [myRank, setMyRank] = useState<number | null>(null);

    // Spin Wheel State
    const [isSpinning, setIsSpinning] = useState(false);
    const [wheelRotation, setWheelRotation] = useState(0);
    const [spinReward, setSpinReward] = useState<any>(null);
    const [showSpinReward, setShowSpinReward] = useState(false);
    const [showJackpotSelector, setShowJackpotSelector] = useState(false);

    // Friend Request State
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);
    const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
    const [shareMessage, setShareMessage] = useState("");

    // Determine if I am in the list AND calculate rank from list if possible
    const myIndexInGlobal = userId ? globalLeaderboard.findIndex(f => f.id.toLowerCase() === userId.toLowerCase()) : -1;
    const amIInGlobalList = myIndexInGlobal !== -1;

    useEffect(() => {
        if (userId && gameState === 'FRIENDS' && socialTab === 'GLOBAL') {
            if (amIInGlobalList) {
                setMyRank(myIndexInGlobal + 1);
            } else {
                dbService.getUserRank(userId).then(rank => setMyRank(rank));
            }
        }
    }, [userId, gameState, socialTab, highScore, amIInGlobalList, myIndexInGlobal]);

    const handleTutorialTap = () => {
        const newCount = tutorialTapCount + 1;
        setTutorialTapCount(newCount);
        if (newCount >= 3 && onSkipTutorial) {
            onSkipTutorial();
        }
    };

    const handleSpinClick = () => {
        if (isSpinning || !onSpinRequest) return;

        const { success, resultIndex, reward, isFree } = onSpinRequest();

        if (success) {
            setIsSpinning(true);
            setShowSpinReward(false);
            setShowJackpotSelector(false);

            const sliceAngle = 360 / WHEEL_SLICES.length;
            const baseRotation = 360 * 5; // 5 full spins
            const targetCenterAngle = resultIndex * sliceAngle + (sliceAngle / 2);
            const rotationToTop = 360 - targetCenterAngle; // Bring it to top
            const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.6); // Randomness

            const finalRotation = wheelRotation + baseRotation + rotationToTop + randomOffset;
            setWheelRotation(finalRotation);

            setTimeout(() => {
                setIsSpinning(false);
                setSpinReward(reward);

                if (reward.type === 'JACKPOT') {
                    setShowJackpotSelector(true);
                } else {
                    setShowSpinReward(true);
                }

                if (onSpinComplete) onSpinComplete(reward, isFree);
            }, 4500);
        }
    };

    const getJackpotOptions = () => {
        const playerItem = SHOP_ITEMS.find(i => i.id === 'player_alien') || SHOP_ITEMS.find(i => i.type === 'PLAYER' && i.price >= 20000);
        const ballItem = SHOP_ITEMS.find(i => i.id === 'ball_rainbow') || SHOP_ITEMS.find(i => i.type === 'BALL' && i.price >= 15000);
        const stadiumItem = SHOP_ITEMS.find(i => i.id === 'stadium_madrid') || SHOP_ITEMS.find(i => i.type === 'STADIUM' && i.price >= 5000);
        const bootsItem = SHOP_ITEMS.find(i => i.id === 'boots_golden');

        return [playerItem, ballItem, stadiumItem, bootsItem].filter(Boolean) as ShopItem[];
    };

    const currentPlayerName = SHOP_ITEMS.find(i => i.id === equippedPlayerId)?.name || "Rookie";

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const leaderboard = [
        { name: "Me", highScore: highScore, isMe: true },
        ...friends.map(f => ({ name: f.name, highScore: f.highScore, isMe: false }))
    ].sort((a, b) => b.highScore - a.highScore);

    const totalUnread = friendRequests.length + notifications.length;

    const passLevel = seasonPass?.level || 1;
    const passXp = seasonPass?.currentXp || 0;
    const passProgressPercent = (passXp / XP_PER_LEVEL) * 100;
    const hasClaimableQuests = quests.some(q => q.current >= q.target && !q.isClaimed);

    // Spin Logic Helper
    const isFreeSpinAvailable = (Date.now() - (lastFreeSpinTime || 0)) > SPIN_COOLDOWN;
    const spinCooldownRemaining = Math.max(0, SPIN_COOLDOWN - (Date.now() - (lastFreeSpinTime || 0)));
    const formatCooldown = (ms: number) => {
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${h}h ${m}m`;
    };

    const renderUpgradeButton = (stat: 'speed' | 'touch' | 'reach') => {
        const cost = getUpgradeCost(stat);
        const canAfford = tokens >= cost;
        const hasFree = freeUpgrades > 0;

        return (
            <button
                onClick={() => onUpgradeStat(stat)}
                disabled={!hasFree && !canAfford}
                className={`flex flex-col items-center justify-center w-full py-2 rounded-xl font-bold transition-all active:scale-95 pointer-events-auto shadow-lg border-b-4 ${hasFree
                    ? 'bg-purple-600 hover:bg-purple-500 border-purple-800 text-white animate-pulse'
                    : canAfford
                        ? 'bg-yellow-500 hover:bg-yellow-400 border-yellow-700 text-black'
                        : 'bg-gray-700 border-gray-900 text-gray-400 cursor-not-allowed'
                    }`}
            >
                <span className="text-[10px] uppercase opacity-80 mb-1">{hasFree ? 'USE TICKET' : 'UPGRADE'}</span>
                <div className="flex items-center gap-1 font-arcade text-lg">
                    {hasFree ? (
                        <>FREE</>
                    ) : (
                        <><Coins size={14} /> {cost}</>
                    )}
                </div>
            </button>
        );
    };

    // Helper variables for filtering lists
    const currentFriendList = socialTab === 'FRIENDS' ? friends : socialTab === 'ONLINE' ? onlinePlayers : globalLeaderboard;
    const currentShopList = SHOP_ITEMS.filter(item => !item.hidden && (shopCategory === 'ALL' || item.type === shopCategory));

    return (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 overflow-hidden">

            {/* HUD */}
            {(gameState === 'PLAYING' || gameState === 'GAME_OVER') && (
                <div className="flex justify-between items-start w-full pointer-events-auto">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col">
                            <span className="text-white/90 text-sm font-black tracking-widest drop-shadow-md">SCORE</span>
                            <span className="text-white text-6xl font-arcade drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]">{score}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-white/90 drop-shadow-md mt-1">
                            <Clock size={16} />
                            <span className="font-arcade text-lg tracking-wider">{formatTime(timeElapsed)}</span>
                        </div>

                        <div className="flex gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                                <Heart
                                    key={i}
                                    size={24}
                                    className={`transition-all ${i < lives ? 'fill-red-500 text-red-600 drop-shadow-md' : 'fill-black/20 text-black/30'}`}
                                    style={{ display: i < Math.max(lives, 3) ? 'block' : 'none' }}
                                />
                            ))}
                        </div>

                        <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-yellow-500/30 w-fit mt-2">
                            <Coins size={20} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-yellow-100 font-arcade text-xl">{tokens}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-col items-end">
                            <span className="text-white/90 text-sm font-black tracking-widest flex items-center gap-1 drop-shadow-md">
                                <Trophy size={14} className="text-yellow-400" /> BEST
                            </span>
                            <span className="text-white text-3xl font-arcade drop-shadow-md">{highScore}</span>
                        </div>

                        {gameState === 'PLAYING' && (
                            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2 mt-1 border border-white/10 w-32 hidden md:block">
                                <div className="text-[10px] text-white/50 font-bold uppercase mb-1 tracking-wider">Leaderboard</div>
                                {leaderboard.slice(0, 3).map((entry, idx) => (
                                    <div key={idx} className={`flex justify-between text-xs mb-0.5 ${entry.isMe ? 'text-yellow-300 font-bold' : 'text-white/80'}`}>
                                        <span>{idx + 1}. {entry.name}</span>
                                        <span className="font-arcade">{entry.highScore}</span>
                                    </div>
                                ))}
                                {!leaderboard.slice(0, 3).find(e => e.isMe) && (
                                    <div className="flex justify-between text-xs mt-1 pt-1 border-t border-white/10 text-yellow-300 font-bold">
                                        <span>{leaderboard.findIndex(e => e.isMe) + 1}. Me</span>
                                        <span className="font-arcade">{highScore}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Center Screen Content */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">

                {/* COUNTDOWN */}
                {gameState === 'COUNTDOWN' && (
                    <div className="flex items-center justify-center animate-bounce-in">
                        <span className="text-[12rem] font-arcade text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)] bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent">
                            {countdownValue === 0 ? "GO!" : countdownValue}
                        </span>
                    </div>
                )}

                {/* REPLAY */}
                {gameState === 'REPLAY' && (
                    <div className="absolute top-8 right-8 flex flex-col items-end animate-pulse pointer-events-auto">
                        <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full font-bold uppercase tracking-wider shadow-lg mb-4">
                            <Video size={18} /> Replay
                        </div>
                        <button onClick={onRestart} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-black uppercase shadow-xl hover:scale-105 transition-transform">
                            <SkipForward size={20} /> Skip
                        </button>
                    </div>
                )}

                {/* TUTORIAL */}
                {gameState === 'TUTORIAL' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 pointer-events-auto" onClick={handleTutorialTap}>
                        <div className="bg-black/80 backdrop-blur-xl p-8 rounded-3xl border border-white/20 text-center max-w-sm shadow-2xl animate-bounce-in">
                            <h2 className="text-3xl font-arcade text-yellow-400 mb-4">HOW TO PLAY</h2>
                            {tutorialStep === 1 && (
                                <>
                                    <div className="flex justify-center gap-8 mb-6">
                                        <div className="animate-bounce">
                                            <MousePointer2 className="text-white rotate-[-30deg]" size={48} />
                                            <div className="text-white font-bold mt-2">LEFT</div>
                                        </div>
                                        <div className="animate-bounce delay-100">
                                            <MousePointer2 className="text-white rotate-[30deg]" size={48} />
                                            <div className="text-white font-bold mt-2">RIGHT</div>
                                        </div>
                                    </div>
                                    <p className="text-white text-lg font-bold mb-4">Tap Left or Right to kick!</p>
                                    <p className="text-white/60 text-sm">Tap anywhere to try...</p>
                                </>
                            )}
                            {tutorialStep === 2 && (
                                <>
                                    <Trophy className="text-yellow-400 mx-auto mb-4" size={48} />
                                    <p className="text-white text-lg font-bold mb-2">Score Points!</p>
                                    <p className="text-white/80">Keep the ball in the air.</p>
                                </>
                            )}
                            {tutorialStep === 3 && (
                                <>
                                    <CheckCircle2 className="text-green-400 mx-auto mb-4" size={48} />
                                    <p className="text-white text-lg font-bold mb-4">You got it!</p>
                                    <button onClick={onSkipTutorial} className="bg-yellow-400 hover:bg-yellow-300 text-black font-black py-3 px-8 rounded-xl uppercase tracking-wider">
                                        START GAME
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* USERNAME INPUT */}
                {gameState === 'USERNAME_INPUT' && (
                    <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl flex flex-col items-center shadow-2xl animate-bounce-in pointer-events-auto w-full max-w-md">
                        <h2 className="text-2xl font-arcade text-white mb-6">NEW CAREER</h2>

                        <div className="w-full mb-4">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1 block">Pilot Name</label>
                            <div className="relative">
                                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                                <input
                                    type="text"
                                    value={inputName}
                                    onChange={(e) => setInputName(e.target.value)}
                                    placeholder="Enter Name"
                                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:outline-none focus:border-yellow-400 transition-colors"
                                    maxLength={12}
                                />
                            </div>
                        </div>

                        <div className="w-full mb-6">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1 block">Secret PIN (Optional)</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                                <input
                                    type="password"
                                    value={inputPin}
                                    onChange={(e) => setInputPin(e.target.value)}
                                    placeholder="4-Digit PIN"
                                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:outline-none focus:border-yellow-400 transition-colors font-mono"
                                    maxLength={4}
                                />
                            </div>
                        </div>

                        {registrationError && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-xs font-bold px-3 py-2 rounded-lg mb-4 w-full flex items-center gap-2">
                                <AlertCircle size={14} /> {registrationError}
                            </div>
                        )}

                        <button
                            onClick={async () => {
                                if (!inputName.trim()) {
                                    setRegistrationError("Name required!");
                                    return;
                                }
                                const res = await onSetUsername(inputName, inputPin);
                                if (res !== true) setRegistrationError(res as string);
                            }}
                            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black py-4 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-wider"
                        >
                            START CAREER
                        </button>
                    </div>
                )}

                {/* GAME OVER */}
                {gameState === 'GAME_OVER' && (
                    <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl flex flex-col items-center shadow-2xl animate-bounce-in pointer-events-auto text-center max-w-sm w-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                        <h2 className="text-5xl font-arcade text-white mb-2 drop-shadow-[0_4px_0_#000]">GAME OVER</h2>
                        <div className="text-white/60 font-bold uppercase tracking-widest text-sm mb-6">
                            {commentary || "Great effort!"}
                        </div>
                        <div className="flex gap-8 mb-8 w-full justify-center">
                            <div className="flex flex-col items-center">
                                <span className="text-white/40 text-xs font-black uppercase tracking-wider">SCORE</span>
                                <span className="text-4xl font-arcade text-white">{score}</span>
                            </div>
                            <div className="w-px bg-white/10"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-yellow-500/60 text-xs font-black uppercase tracking-wider">BEST</span>
                                <span className="text-4xl font-arcade text-yellow-400">{highScore}</span>
                            </div>
                        </div>
                        <button onClick={onRestart} className="w-full bg-white text-black font-black py-4 rounded-xl mb-3 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
                            <RotateCcw size={20} /> Play Again
                        </button>
                        <button onClick={onGoHome} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase text-sm">
                            <Home size={18} /> Main Menu
                        </button>
                    </div>
                )}

                {/* MENU */}
                {gameState === 'MENU' && (
                    <>
                        {/* Top Bar Area - PROFILE & STATUS (TOP LEFT) */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto z-50">
                            {/* Profile Card */}
                            <div className="flex items-center gap-2 bg-blue-600/90 border-2 border-blue-400 p-1 pr-4 rounded-xl shadow-lg transform hover:scale-105 transition-transform cursor-pointer shadow-black/30 w-fit">
                                <div className="w-10 h-10 bg-blue-800 rounded-lg flex items-center justify-center border border-white/20 relative overflow-hidden">
                                    <UserCircle size={24} className="text-white relative z-10" />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-900 to-transparent"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-arcade text-sm leading-none drop-shadow-md">{username || "Guest"}</span>
                                    <span className="text-yellow-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Trophy size={10} /> Best: {highScore}
                                    </span>
                                </div>
                            </div>

                            {/* Status Row: Reset & Sync */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onHardReset}
                                    className="flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-red-400 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10 transition-colors"
                                    title="Delete Save Data"
                                >
                                    <Trash2 size={10} /> RESET CAREER
                                </button>

                                {cloudError ? (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-600/90 px-2 py-1 rounded-full backdrop-blur-sm border border-white/20 animate-pulse shadow-lg">
                                        <AlertTriangle size={10} /> CLOUD ERROR
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                        <Cloud size={10} /> SYNCED
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TOP RIGHT: SOCIAL & COINS (RESTORED TO TOP-RIGHT) */}
                        <div className="absolute top-4 right-4 pointer-events-auto flex items-center gap-2 bg-black/40 p-2 rounded-2xl backdrop-blur-sm border border-white/10 z-50">
                            <button onClick={onOpenFriends} className="relative bg-white/10 hover:bg-white/20 border border-white/10 p-2 rounded-xl shadow-lg transition-all active:scale-95 group">
                                <Users size={20} className="text-white group-hover:text-blue-400 transition-colors" />
                                {onlinePlayers.length > 0 && <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow animate-bounce">{onlinePlayers.length}</div>}
                            </button>
                            <button onClick={onOpenInbox} className="relative bg-white/10 hover:bg-white/20 border border-white/10 p-2 rounded-xl shadow-lg transition-all active:scale-95 group">
                                <Mail size={20} className="text-white group-hover:text-yellow-200 transition-colors" />
                                {totalUnread > 0 && <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow animate-pulse">{totalUnread}</div>}
                            </button>

                            {/* Fullscreen Button stays here in top-right box */}
                            {onToggleFullscreen && (
                                <button
                                    onClick={onToggleFullscreen}
                                    className="bg-white/10 hover:bg-white/20 border border-white/10 p-2 rounded-xl shadow-lg transition-all active:scale-95 group text-white"
                                    title="Toggle Fullscreen"
                                >
                                    <Maximize size={20} className="group-hover:text-blue-300 transition-colors" />
                                </button>
                            )}

                            <div className="w-px h-8 bg-white/20 mx-1"></div>
                            <div className="flex items-center gap-2 bg-black/60 border border-yellow-500/50 px-3 py-1.5 rounded-xl shadow-lg">
                                <Coins size={18} className="text-yellow-400 fill-yellow-400" />
                                <span className="text-white font-arcade text-lg">{tokens}</span>
                            </div>
                        </div>
                    </>
                )}

                {/* Title */}
                <div
                    className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto cursor-default z-40 select-none animate-[bounce_3s_ease-in-out_infinite]"
                >
                    <h1 className="text-4xl md:text-6xl font-arcade text-white text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-tighter">
                        <span className="text-yellow-400">Kick</span>Up <span className="text-blue-400">King</span>
                    </h1>
                </div>

                {/* Sidebars and Menu UI */}
                {gameState === 'MENU' && (
                    <>
                        {/* LEFT SIDEBAR ACTIONS */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto z-40 select-none touch-manipulation">
                            {/* SHOP */}
                            <button
                                onClick={onOpenShop}
                                className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 border-b-4 border-red-900 rounded-xl flex flex-col items-center justify-center shadow-lg active:border-b-2 active:translate-y-0.5 transition-all hover:scale-105"
                            >
                                <ShoppingCart size={24} className="text-white mb-0.5 drop-shadow-md" />
                                <span className="text-[9px] text-white font-black uppercase tracking-wide drop-shadow-md">Shop</span>
                            </button>

                            {/* TASKS */}
                            <button
                                onClick={onOpenPass}
                                className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 border-b-4 border-indigo-800 rounded-xl flex flex-col items-center justify-center shadow-lg active:border-b-2 active:translate-y-0.5 transition-all hover:scale-105"
                            >
                                {hasClaimableQuests && (
                                    <div className="absolute -top-2 -right-2 bg-red-500 w-4 h-4 rounded-full border-2 border-white animate-bounce shadow-md z-10"></div>
                                )}
                                <ClipboardList size={24} className="text-white mb-0.5 drop-shadow-md" />
                                <span className="text-[9px] text-white font-black uppercase tracking-wide drop-shadow-md">Tasks</span>
                            </button>

                            {/* STATS (Zap/Upgrade) */}
                            <button
                                onClick={onOpenUpgrade}
                                className={`relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 border-b-4 border-emerald-800 rounded-xl flex flex-col items-center justify-center shadow-lg active:border-b-2 active:translate-y-0.5 transition-all hover:scale-105 ${showUpgradeHint ? 'animate-pulse ring-4 ring-yellow-400' : ''}`}
                            >
                                {showUpgradeHint && (
                                    <div className="absolute -right-14 top-1/2 -translate-y-1/2 bg-yellow-400 text-black font-bold px-2 py-1 rounded text-xs whitespace-nowrap animate-bounce flex items-center z-20 shadow-lg">
                                        <ArrowLeft className="mr-1" size={14} /> UPGRADE
                                    </div>
                                )}
                                <Zap size={24} className="text-white mb-0.5 fill-white drop-shadow-md" />
                                <span className="text-[9px] text-white font-black uppercase tracking-wide drop-shadow-md">Stats</span>
                            </button>
                        </div>

                        {/* RIGHT SIDEBAR (SPIN WHEEL) */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto z-40 select-none touch-manipulation">
                            <button
                                onClick={onOpenSpin}
                                className="relative w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-purple-600 border-b-4 border-purple-900 rounded-xl flex flex-col items-center justify-center shadow-lg active:border-b-2 active:translate-y-0.5 transition-all hover:scale-105 group"
                            >
                                {isFreeSpinAvailable ? (
                                    <div className="absolute -top-2 -left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white animate-bounce z-10 shadow">FREE</div>
                                ) : (
                                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-10">
                                        <Clock size={20} className="text-white/80" />
                                    </div>
                                )}
                                <Sparkles size={28} className="text-white mb-0.5 drop-shadow-md group-hover:animate-spin-slow" />
                                <span className="text-[9px] text-white font-black uppercase tracking-wide drop-shadow-md">Spin</span>
                            </button>
                        </div>

                        {/* BOTTOM LEFT: PASS RECTANGLE */}
                        <div className="absolute bottom-6 left-6 pointer-events-auto z-40 select-none touch-manipulation sm:scale-100 scale-90 origin-bottom-left">
                            <button
                                onClick={onOpenPass}
                                className="group relative w-52 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 border-b-4 border-orange-800 rounded-xl flex items-center justify-between px-4 shadow-lg active:border-b-2 active:translate-y-0.5 transition-all hover:scale-105 overflow-hidden ring-1 ring-white/20"
                            >
                                <div className="absolute left-0 bottom-0 h-1.5 bg-black/30 w-full">
                                    <div className="bg-green-400 h-full transition-all duration-500" style={{ width: `${passProgressPercent}%` }}></div>
                                </div>
                                <div className="flex items-center gap-3 relative z-10">
                                    <Crown size={28} className="text-white drop-shadow-md" />
                                    <div className="flex flex-col items-start">
                                        <span className="text-xs text-white font-black uppercase tracking-wide drop-shadow-md leading-none mb-0.5">SEASON PASS</span>
                                        <span className="text-[10px] text-white/80 font-bold">Level {passLevel}</span>
                                    </div>
                                </div>
                                <div className="bg-black/20 p-1.5 rounded-lg relative z-10">
                                    <ChevronRight size={16} className="text-white" />
                                </div>
                            </button>
                        </div>

                        {/* PLAY BUTTON - Adjusted to bottom right */}
                        <div className="absolute bottom-12 right-4 flex items-center justify-center pointer-events-none z-40 select-none touch-manipulation">
                            <button
                                onClick={onStart}
                                className="pointer-events-auto bg-gradient-to-b from-yellow-400 to-orange-500 w-56 h-20 rounded-2xl border-b-8 border-orange-700 shadow-[0_0_20px_rgba(250,204,21,0.5)] flex items-center justify-center gap-4 active:border-b-2 active:translate-y-2 transition-all group relative overflow-hidden hover:scale-105 animate-pulse"
                            >
                                <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 pointer-events-none"></div>
                                <span className="text-4xl font-arcade text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.3)] tracking-widest z-10">PLAY</span>
                                <Play size={32} className="text-white fill-white drop-shadow-md z-10" />
                            </button>
                        </div>
                    </>
                )}

                {/* SPIN WHEEL OVERLAY */}
                {gameState === 'SPIN' && (
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center pointer-events-auto animate-fade-in p-4 overflow-hidden">
                        {/* Background FX */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,rgba(0,0,0,0)_70%)] animate-pulse"></div>
                        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                        <div className="relative w-full max-w-md flex flex-col items-center z-10">
                            <button
                                onClick={onCloseShop}
                                disabled={isSpinning}
                                className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white"
                            >
                                <XCircle size={32} />
                            </button>

                            <h2 className="text-5xl font-arcade text-white mb-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] tracking-wider text-center">
                                <span className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600">LUCKY</span> WHEEL
                            </h2>
                            <div className="text-white/60 font-bold uppercase tracking-widest text-sm mb-8 text-center flex items-center gap-2">
                                {isFreeSpinAvailable ? (
                                    <span className="text-green-400 animate-pulse flex items-center gap-1"><CheckCircle2 size={14} /> SPIN READY</span>
                                ) : (
                                    <span className="text-blue-300 flex items-center gap-1"><Clock size={14} /> REFRESHES IN: {formatCooldown(spinCooldownRemaining)}</span>
                                )}
                            </div>

                            {/* WHEEL CONTAINER */}
                            <div className="relative w-[22rem] h-[22rem] mb-12">
                                {/* Outer Glow */}
                                <div className="absolute inset-0 rounded-full blur-2xl bg-blue-500/20 animate-pulse"></div>

                                {/* POINTER (Ticker) */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-lg">
                                    <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-yellow-400"></div>
                                </div>

                                {/* WHEEL BORDER */}
                                <div className="absolute inset-0 rounded-full border-8 border-slate-800 shadow-2xl z-20 pointer-events-none ring-4 ring-white/10"></div>

                                {/* ACTUAL WHEEL */}
                                <div
                                    className="w-full h-full rounded-full relative overflow-hidden transition-transform will-change-transform"
                                    style={{
                                        transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0, 0.15, 1)' : 'none',
                                        transform: `rotate(${wheelRotation}deg)`,
                                        background: `conic-gradient(
                                    ${WHEEL_SLICES.map((slice, i) => {
                                            const angle = 360 / WHEEL_SLICES.length;
                                            return `${slice.color} ${i * angle}deg ${(i + 1) * angle}deg`;
                                        }).join(', ')}
                                )`,
                                        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    {/* SLICE CONTENT */}
                                    {WHEEL_SLICES.map((slice, i) => {
                                        const angle = 360 / WHEEL_SLICES.length;
                                        const rotation = i * angle + angle / 2;
                                        const isJackpot = slice.type === 'JACKPOT';
                                        const isXP = slice.type === 'XP';

                                        return (
                                            <div
                                                key={i}
                                                className="absolute top-0 left-1/2 w-1 h-[50%] origin-bottom flex flex-col items-center justify-start pt-6"
                                                style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                                            >
                                                <div className="transform -rotate-180 flex flex-col items-center gap-1">
                                                    {isJackpot ? (
                                                        <div className="relative animate-pulse">
                                                            <Star className="text-yellow-100 fill-yellow-200 drop-shadow-md" size={32} />
                                                            <div className="absolute inset-0 bg-yellow-400 blur-lg opacity-50"></div>
                                                        </div>
                                                    ) : isXP ? (
                                                        <Zap
                                                            className="text-white drop-shadow-md fill-white"
                                                            size={28}
                                                        />
                                                    ) : (
                                                        <Coins
                                                            className="text-white drop-shadow-md"
                                                            size={slice.value > 5000 ? 32 : slice.value > 1000 ? 28 : 24}
                                                            fill="rgba(255,255,255,0.2)"
                                                        />
                                                    )}
                                                    <span className={`font-black font-arcade text-lg drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] ${isJackpot ? 'text-yellow-100 text-xl' : 'text-white'}`}>
                                                        {slice.label}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* CENTER HUB */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full border-4 border-slate-600 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center z-10">
                                        <Sparkles className="text-yellow-400 fill-yellow-400 animate-spin-slow" size={32} />
                                    </div>
                                </div>
                            </div>

                            {/* SPIN BUTTON */}
                            <button
                                onClick={handleSpinClick}
                                disabled={isSpinning || !isFreeSpinAvailable}
                                className={`w-72 py-5 rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl transform transition-all active:scale-95 group relative overflow-hidden border-b-8 ${isSpinning
                                    ? 'bg-slate-700 border-slate-900 text-slate-500 cursor-not-allowed'
                                    : isFreeSpinAvailable
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 border-emerald-800 text-white animate-pulse'
                                        : 'bg-slate-700 border-slate-900 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>

                                {isSpinning ? 'SPINNING...' : isFreeSpinAvailable ? (
                                    <span className="flex items-center justify-center gap-3 relative z-10">
                                        <Sparkles size={24} /> SPIN FREE
                                    </span>
                                ) : (
                                    <span className="flex flex-col items-center justify-center leading-none py-1 relative z-10">
                                        <span className="text-xs font-bold opacity-60 mb-1">COOLDOWN ACTIVE</span>
                                        <span className="flex items-center gap-2 text-lg"><Clock size={18} /> {formatCooldown(spinCooldownRemaining)}</span>
                                    </span>
                                )}
                            </button>
                            {!isFreeSpinAvailable && !isSpinning && (
                                <div className="text-white/30 font-bold text-xs mt-4 uppercase tracking-wide">
                                    Limit: 1 Spin / 24 Hours
                                </div>
                            )}
                        </div>

                        {/* JACKPOT SELECTOR MODAL */}
                        {showJackpotSelector && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 animate-fade-in backdrop-blur-md">
                                <div className="w-full h-full absolute inset-0 bg-[radial-gradient(circle,rgba(250,204,21,0.1)_0%,transparent_80%)] animate-pulse pointer-events-none"></div>
                                <div className="bg-slate-900/90 border-2 border-yellow-500 p-8 rounded-3xl max-w-4xl w-full mx-4 flex flex-col items-center relative shadow-[0_0_50px_rgba(250,204,21,0.3)]">
                                    <h2 className="text-4xl font-arcade text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 mb-2 drop-shadow-lg text-center animate-pulse">JACKPOT!</h2>
                                    <p className="text-white/60 font-bold text-sm mb-8 uppercase tracking-widest text-center">Choose your Legendary Reward</p>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                        {getJackpotOptions().map((item) => {
                                            const isOwned = inventory.includes(item.id);
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        if (onJackpotClaim) onJackpotClaim(item);
                                                        setShowJackpotSelector(false);
                                                        setShowSpinReward(false);
                                                        setSpinReward(null);
                                                    }}
                                                    disabled={isOwned && item.type !== 'BOOTS'}
                                                    className={`group relative bg-white/5 border border-white/10 hover:bg-yellow-500/20 hover:border-yellow-500 p-4 rounded-xl flex flex-col items-center gap-3 transition-all transform hover:scale-105 ${isOwned && item.type !== 'BOOTS' ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
                                                >
                                                    <div className="absolute inset-0 bg-yellow-500/0 group-hover:bg-yellow-500/10 transition-colors rounded-xl"></div>
                                                    {item.type === 'BOOTS' && <div className="absolute top-2 right-2 text-xl">👞</div>}

                                                    <div className="w-full h-32 bg-black/40 rounded-lg overflow-hidden relative">
                                                        <ShopItemPreview type={item.type} config={item.config} />
                                                        {isOwned && item.type !== 'BOOTS' && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-green-400 text-sm uppercase tracking-widest">OWNED</div>
                                                        )}
                                                    </div>

                                                    <div className="text-center z-10">
                                                        <div className="text-white font-bold font-arcade text-sm leading-tight mb-1">{item.name}</div>
                                                        <div className="text-white/40 text-[10px] font-bold uppercase tracking-wide">
                                                            {item.type === 'BOOTS' ? 'Special Item' : 'Legendary ' + item.type}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* REWARD MODAL (Standard) */}
                        {showSpinReward && spinReward && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 animate-fade-in backdrop-blur-md">
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(250,204,21,0.2)_0%,transparent_70%)] animate-pulse"></div>
                                </div>

                                <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 p-10 rounded-3xl border-4 border-yellow-500/50 shadow-2xl flex flex-col items-center text-center max-w-sm animate-bounce-in transform scale-110">
                                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
                                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-lg ring-4 ring-yellow-300/30 relative z-10">
                                        <Gift size={48} className="text-white" />
                                    </div>

                                    <h3 className="text-4xl font-arcade text-white mb-2 text-shadow-lg">WOOHOO!</h3>
                                    <p className="text-white/60 font-bold text-sm mb-8 uppercase tracking-wider">You received</p>

                                    <div className="text-6xl font-arcade text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-8 drop-shadow-sm flex items-center justify-center gap-3">
                                        {spinReward.type === 'XP' ? (
                                            <Zap size={48} className="text-yellow-400 fill-yellow-400" />
                                        ) : (
                                            <Coins size={48} className="text-yellow-400 fill-yellow-400" />
                                        )}
                                        {spinReward.label.includes('k') || spinReward.value >= 1000 ? spinReward.label : spinReward.value}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setShowSpinReward(false);
                                            setSpinReward(null);
                                        }}
                                        className="w-full bg-white hover:bg-gray-100 text-slate-900 font-black py-4 rounded-xl uppercase tracking-widest shadow-xl hover:scale-105 transition-all text-lg"
                                    >
                                        COLLECT REWARD
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SHOP */}
                {gameState === 'SHOP' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 w-full h-full max-w-4xl rounded-3xl flex flex-col shadow-2xl animate-bounce-in pointer-events-auto p-6 overflow-hidden max-h-[90vh]">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h2 className="text-3xl font-arcade text-white tracking-wider flex items-center gap-3">
                                    <ShoppingCart className="text-yellow-400" /> SHOP
                                </h2>
                                <div className="flex items-center gap-4">
                                    <div className="bg-black/40 px-4 py-2 rounded-full border border-yellow-500/30 flex items-center gap-2">
                                        <Coins size={20} className="text-yellow-400 fill-yellow-400" />
                                        <span className="text-white font-arcade text-xl">{tokens}</span>
                                    </div>
                                    <button onClick={onCloseShop} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white">
                                        <XCircle size={28} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl shrink-0">
                                {(['ALL', 'PLAYER', 'BALL', 'STADIUM'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => onSetShopCategory(cat)}
                                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wide ${shopCategory === cat ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {cat === 'PLAYER' && <UserCircle size={16} />}
                                        {cat === 'BALL' && <Disc size={16} />}
                                        {cat === 'STADIUM' && <Maximize size={16} />}
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {currentShopList.length === 0 ? (
                                    <div className="col-span-full flex flex-col items-center justify-center h-64 text-white/40">
                                        <ShoppingCart size={48} className="mb-4 opacity-50" />
                                        <p className="font-bold">No items found in this category.</p>
                                    </div>
                                ) : (
                                    currentShopList.map((item) => {
                                        const isOwned = inventory.includes(item.id);
                                        const isEquipped = equippedPlayerId === item.id || equippedBallId === item.id || equippedStadiumId === item.id;
                                        const canAfford = tokens >= item.price;

                                        return (
                                            <div key={item.id} className={`relative group rounded-xl p-4 transition-all border ${isEquipped ? 'bg-yellow-500/10 border-yellow-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                                {isEquipped && (
                                                    <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10">
                                                        <Check size={10} /> EQUIPPED
                                                    </div>
                                                )}
                                                <div className="h-32 mb-4 rounded-lg overflow-hidden bg-black/20 relative">
                                                    <ShopItemPreview type={item.type} config={item.config} />
                                                </div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-arcade text-white text-lg leading-none mb-1">{item.name}</h3>
                                                        <p className="text-white/40 text-xs font-bold">{item.description}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4">
                                                    {isOwned ? (
                                                        <button
                                                            onClick={() => onEquipItem(item)}
                                                            disabled={isEquipped}
                                                            className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all ${isEquipped ? 'bg-white/10 text-white/40 cursor-default' : 'bg-white text-black hover:bg-gray-200 shadow-lg'}`}
                                                        >
                                                            {isEquipped ? 'Equipped' : 'Equip'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => onBuyItem(item)}
                                                            disabled={!canAfford}
                                                            className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${canAfford ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                                                        >
                                                            <Coins size={16} /> {item.price}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* UPGRADE */}
                {gameState === 'UPGRADE' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 w-full max-w-md rounded-3xl flex flex-col shadow-2xl animate-bounce-in pointer-events-auto p-6 overflow-hidden relative">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-3xl font-arcade text-white tracking-wider flex items-center gap-3">
                                    <Zap className="text-yellow-400" /> UPGRADE
                                </h2>
                                <button onClick={onCloseShop} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white">
                                    <XCircle size={28} />
                                </button>
                            </div>

                            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/10 flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/5 rounded-lg overflow-hidden">
                                    <ShopItemPreview type="PLAYER" config={SHOP_ITEMS.find(i => i.id === equippedPlayerId)?.config as PlayerSkinConfig} />
                                </div>
                                <div>
                                    <div className="text-white/40 text-xs font-bold uppercase tracking-widest">Current Pro</div>
                                    <div className="text-white font-arcade text-xl">{currentPlayerName}</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-bold uppercase text-sm tracking-wider flex items-center gap-2"><TrendingUp size={16} className="text-blue-400" /> Speed</span>
                                        <span className="text-white/60 font-mono text-xs">Lvl {playerStats.speed}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-3 bg-black/50 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className={`flex-1 rounded-full ${i < playerStats.speed ? 'bg-blue-500' : 'bg-white/10'}`}></div>
                                            ))}
                                        </div>
                                        {renderUpgradeButton('speed')}
                                    </div>
                                </div>

                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-bold uppercase text-sm tracking-wider flex items-center gap-2"><Crosshair size={16} className="text-green-400" /> Control</span>
                                        <span className="text-white/60 font-mono text-xs">Lvl {playerStats.touch}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-3 bg-black/50 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className={`flex-1 rounded-full ${i < playerStats.touch ? 'bg-green-500' : 'bg-white/10'}`}></div>
                                            ))}
                                        </div>
                                        {renderUpgradeButton('touch')}
                                    </div>
                                </div>

                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-bold uppercase text-sm tracking-wider flex items-center gap-2"><Maximize size={16} className="text-pink-400" /> Reach</span>
                                        <span className="text-white/60 font-mono text-xs">Lvl {playerStats.reach}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-3 bg-black/50 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className={`flex-1 rounded-full ${i < playerStats.reach ? 'bg-pink-500' : 'bg-white/10'}`}></div>
                                            ))}
                                        </div>
                                        {renderUpgradeButton('reach')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* INBOX */}
                {gameState === 'INBOX' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 w-full max-w-md rounded-3xl flex flex-col shadow-2xl animate-bounce-in pointer-events-auto p-6 overflow-hidden h-[80vh]">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                                <h2 className="text-3xl font-arcade text-white tracking-wider flex items-center gap-3">
                                    <Inbox className="text-blue-400" /> INBOX
                                </h2>
                                <button onClick={onCloseShop} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white">
                                    <ArrowLeft size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                                {friendRequests.length === 0 && notifications.length === 0 && (
                                    <div className="text-center text-white/40 font-bold mt-10 flex flex-col items-center">
                                        <Inbox size={48} className="mb-4 opacity-50" />
                                        No new messages
                                    </div>
                                )}

                                {friendRequests.map(req => (
                                    <div key={req.id} className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-white">
                                                <UserPlus size={20} />
                                            </div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Friend Request</div>
                                                <div className="text-blue-200 text-xs">from <span className="font-bold text-white">{req.from_username}</span></div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => onAcceptRequest(req)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold text-xs">ACCEPT</button>
                                            <button onClick={() => onRejectRequest(req)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-bold text-xs">DECLINE</button>
                                        </div>
                                    </div>
                                ))}

                                {notifications.map(notif => (
                                    <div key={notif.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-3 relative">
                                        <button onClick={() => onClearNotification(notif.id)} className="absolute top-2 right-2 text-white/20 hover:text-white">
                                            <XCircle size={16} />
                                        </button>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-sm mb-1">{notif.title}</div>
                                            <div className="text-white/60 text-xs">{notif.message}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* FRIENDS */}
                {gameState === 'FRIENDS' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 w-full h-full max-w-4xl rounded-3xl flex flex-col shadow-2xl animate-bounce-in pointer-events-auto p-6 overflow-hidden max-h-[90vh]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-arcade text-white tracking-wider flex items-center gap-3">
                                    <Globe className="text-blue-400" /> SOCIAL
                                </h2>
                                <div className="flex items-center gap-2">
                                    {onRefreshData && (
                                        <button
                                            onClick={onRefreshData}
                                            className="bg-blue-600 hover:bg-blue-500 p-2 rounded-full transition-colors text-white flex items-center gap-2 px-4 shadow-lg active:scale-95"
                                            title="Refresh Data"
                                        >
                                            <RotateCcw size={16} className="animate-spin-slow" />
                                            <span className="text-xs font-bold font-arcade uppercase tracking-tighter">Refresh</span>
                                        </button>
                                    )}
                                    <button onClick={onCloseShop} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white">
                                        <ArrowLeft size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl shrink-0">
                                {(['FRIENDS', 'ONLINE', 'GLOBAL'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setSocialTab(tab)}
                                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wide ${socialTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {tab === 'FRIENDS' && <Users size={16} />}
                                        {tab === 'ONLINE' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
                                        {tab === 'GLOBAL' && <Globe size={16} />}
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
                                {/* LEFT COLUMN: LIST */}
                                <div className="flex-1 bg-black/20 rounded-xl border border-white/5 overflow-hidden flex flex-col">
                                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                                        <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
                                            {socialTab === 'FRIENDS' ? `MY FRIENDS (${friends.length})` : socialTab === 'ONLINE' ? `ONLINE NOW (${onlinePlayers.length})` : 'TOP 50 GLOBAL'}
                                        </span>
                                        {socialTab === 'GLOBAL' && myRank && (
                                            <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">MY RANK: #{myRank}</span>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                        {currentFriendList.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-white/30 text-center p-4">
                                                <Users size={32} className="mb-2 opacity-50" />
                                                <p className="text-sm font-bold">No players found.</p>
                                                {socialTab === 'FRIENDS' && <p className="text-xs mt-1">Share your ID to add friends!</p>}
                                            </div>
                                        ) : (
                                            currentFriendList.map((friend, idx) => (
                                                <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-arcade text-white/30 w-6 text-center">{idx + 1}</div>
                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold border border-white/20">
                                                            {friend.name.substring(0, 1).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold text-sm">{friend.name}</span>
                                                            <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">ID: {friend.id.split('#')[1] || '0000'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="text-yellow-400 font-arcade text-lg">{friend.highScore}</div>
                                                            <div className="text-white/20 text-[9px] font-bold uppercase">High Score</div>
                                                        </div>
                                                        {socialTab !== 'FRIENDS' && friend.id !== userId && (
                                                            <button
                                                                onClick={() => {
                                                                    setIsSendingRequest(true);
                                                                    onSendFriendRequest(friend).then(ok => {
                                                                        setIsSendingRequest(false);
                                                                        if (ok) {
                                                                            setSentRequestIds(prev => [...prev, friend.id]);
                                                                        } else {
                                                                            setRequestErrors(prev => ({ ...prev, [friend.id]: "Failed" }));
                                                                            setTimeout(() => {
                                                                                setRequestErrors(prev => {
                                                                                    const next = { ...prev };
                                                                                    delete next[friend.id];
                                                                                    return next;
                                                                                });
                                                                            }, 2000);
                                                                        }
                                                                    });
                                                                }}
                                                                className="bg-white/10 hover:bg-blue-600 hover:text-white p-2 rounded-full text-white/40 transition-all"
                                                                title="Add Friend"
                                                                disabled={isSendingRequest || sentRequestIds.includes(friend.id)}
                                                            >
                                                                {sentRequestIds.includes(friend.id) ? <Check size={16} className="text-green-400" /> : <UserPlus size={16} />}
                                                            </button>
                                                        )}
                                                        {socialTab === 'FRIENDS' && (
                                                            <button
                                                                onClick={() => onRemoveFriend(friend.id)}
                                                                className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 p-2 rounded-full text-white/20 transition-all"
                                                                title="Remove Friend"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: ACTIONS (Only visible in FRIENDS tab) */}
                                {socialTab === 'FRIENDS' && (
                                    <div className="w-full md:w-72 flex flex-col gap-4">
                                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                            <div className="text-white font-bold mb-4 flex items-center gap-2">
                                                <UserPlus size={18} className="text-green-400" /> Add New Friend
                                            </div>

                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={friendNameInput}
                                                    onChange={(e) => setFriendNameInput(e.target.value)}
                                                    placeholder="Enter Username"
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                />
                                                <button
                                                    onClick={() => {
                                                        setIsSearching(true);
                                                        setSearchResult(null);
                                                        onSearchFriend(friendNameInput).then(res => {
                                                            setSearchResult(res);
                                                            setIsSearching(false);
                                                        });
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg"
                                                    disabled={isSearching}
                                                >
                                                    <Search size={18} />
                                                </button>
                                            </div>

                                            {searchResult && (
                                                <div className="bg-white/5 p-3 rounded-lg border border-white/10 mt-2 animate-fade-in">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-white font-bold">{searchResult.name}</span>
                                                        <span className="text-yellow-400 font-arcade text-sm">{searchResult.highScore}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            onSendFriendRequest(searchResult).then(ok => {
                                                                if (ok) {
                                                                    setSentRequestIds(prev => [...prev, searchResult.id]);
                                                                } else {
                                                                    setRequestErrors(prev => ({ ...prev, [searchResult.id]: "Failed" }));
                                                                }
                                                                setTimeout(() => {
                                                                    setSearchResult(null);
                                                                    setFriendNameInput("");
                                                                    setRequestErrors(prev => {
                                                                        const next = { ...prev };
                                                                        delete next[searchResult.id];
                                                                        return next;
                                                                    });
                                                                }, 2000);
                                                            });
                                                        }}
                                                        disabled={sentRequestIds.includes(searchResult.id)}
                                                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-xs py-2 rounded disabled:opacity-50"
                                                    >
                                                        {sentRequestIds.includes(searchResult.id) ? "REQUEST SENT" : "SEND REQUEST"}
                                                    </button>
                                                </div>
                                            )}
                                            {searchResult && requestErrors[searchResult.id] && <div className="text-red-400 text-xs font-bold mt-2 text-center">{requestErrors[searchResult.id]}</div>}
                                        </div>

                                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex-1">
                                            <div className="text-white font-bold mb-2 flex items-center gap-2">
                                                <Globe size={18} className="text-purple-400" /> Share Profile
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-lg text-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => {
                                                navigator.clipboard.writeText(`Add me on KickUp King! Username: ${username}`);
                                                setShareMessage("Copied to clipboard!");
                                                setTimeout(() => setShareMessage(""), 2000);
                                            }}>
                                                {shareMessage && <div className="text-green-400 text-xs font-bold mb-1">{shareMessage}</div>}
                                                <div className="text-white/40 text-xs uppercase font-bold mb-1">Your ID Code</div>
                                                <div className="text-white font-mono text-lg tracking-widest">{userId.split('#')[1] || '????'}</div>
                                                <div className="text-blue-400 text-[10px] font-bold mt-2 uppercase">Tap to Copy Invite</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* PASS MENU (With Tabs) */}
                {gameState === 'PASS' && seasonPass && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 w-full h-full max-w-4xl rounded-3xl flex flex-col shadow-2xl animate-bounce-in pointer-events-auto p-6 overflow-hidden max-h-[90vh]">
                            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                                        <Crown className="text-white" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-arcade text-white tracking-wider flex items-center gap-3">
                                            SEASON PASS
                                        </h2>
                                        <div className="text-white/50 text-xs font-bold uppercase tracking-widest">
                                            Level {seasonPass.level} <span className="mx-2">•</span> {seasonPass.currentXp} / {XP_PER_LEVEL} XP
                                        </div>
                                    </div>
                                </div>
                                <button onClick={onCloseShop} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white">
                                    <ArrowLeft size={24} />
                                </button>
                            </div>

                            {/* TABS */}
                            <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl shrink-0">
                                <button
                                    onClick={() => setPassTab('TASKS')}
                                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wide ${passTab === 'TASKS' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    <LayoutList size={16} /> Daily Quests
                                </button>
                                <button
                                    onClick={() => setPassTab('PASS')}
                                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wide ${passTab === 'PASS' ? 'bg-yellow-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Gift size={16} /> Reward Track
                                </button>
                            </div>

                            {/* CONTENT */}
                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                {passTab === 'TASKS' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="col-span-full mb-2 flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest">
                                            <Clock size={14} /> Resets automatically every 24h
                                        </div>
                                        {quests.map(quest => {
                                            const isComplete = quest.current >= quest.target;
                                            return (
                                                <div key={quest.id} className={`p-4 rounded-xl border relative overflow-hidden transition-all flex flex-col ${quest.isClaimed ? 'bg-black/20 border-white/5 opacity-40 order-last' : isComplete ? 'bg-green-500/20 border-green-500/50 shadow-lg shadow-green-900/20 order-first' : 'bg-white/5 border-white/10'}`}>
                                                    <div className="relative z-10 flex flex-col h-full justify-between gap-3">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-white font-bold text-sm leading-tight mr-2">{quest.description}</span>
                                                            <span className="bg-yellow-500/20 text-yellow-400 font-arcade text-xs px-2 py-1 rounded border border-yellow-500/30">+{quest.xpReward} XP</span>
                                                        </div>

                                                        <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-500 ${isComplete ? 'bg-green-400' : 'bg-blue-500'}`}
                                                                style={{ width: `${Math.min((quest.current / quest.target) * 100, 100)}%` }}
                                                            ></div>
                                                        </div>

                                                        <div className="flex justify-between items-end">
                                                            <span className="text-xs text-white/40 font-bold">{quest.current} / {quest.target}</span>
                                                            {isComplete && !quest.isClaimed && (
                                                                <button
                                                                    onClick={() => onClaimQuest && onClaimQuest(quest.id)}
                                                                    className="bg-green-500 hover:bg-green-400 text-white text-xs font-bold px-4 py-2 rounded shadow-lg animate-bounce"
                                                                >
                                                                    CLAIM REWARD
                                                                </button>
                                                            )}
                                                            {quest.isClaimed && <span className="text-green-400 text-xs font-bold flex items-center gap-1"><Check size={14} /> COMPLETED</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {passTab === 'PASS' && (
                                    <div className="flex flex-col gap-3">
                                        {SEASON_PASS_REWARDS.map((reward) => {
                                            const isUnlocked = seasonPass.level >= reward.level;
                                            const isClaimed = seasonPass.claimedRewards.includes(reward.level);
                                            const isItem = reward.type === 'ITEM';
                                            const isUpgrade = reward.type === 'FREE_UPGRADE';
                                            const isExclusive = isItem && ((reward.value as string).includes('ghost') || (reward.value as string).includes('gold') || (reward.value as string).includes('robot'));

                                            return (
                                                <div key={reward.level} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isClaimed ? 'bg-white/5 border-white/5' : isUnlocked ? 'bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-blue-500/50' : 'bg-black/20 border-white/5 opacity-60'}`}>
                                                    <div className={`w-12 h-12 flex items-center justify-center rounded-full font-arcade text-lg shadow-lg shrink-0 ${isUnlocked ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
                                                        {reward.level}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className={`font-bold text-lg ${isExclusive ? 'text-yellow-400' : isUpgrade ? 'text-purple-400' : 'text-white'}`}>
                                                            {reward.description}
                                                        </div>
                                                        <div className="text-xs text-white/40 uppercase font-bold tracking-wider">
                                                            {isItem ? 'Exclusive Item' : isUpgrade ? 'Consumable' : 'Currency'}
                                                        </div>
                                                    </div>
                                                    <div className="w-16 flex justify-center">
                                                        {reward.type === 'COINS' ? (
                                                            <Coins className={isUnlocked ? "text-yellow-400" : "text-gray-600"} size={28} />
                                                        ) : isUpgrade ? (
                                                            <div className="relative animate-pulse">
                                                                <ArrowBigUp className={isUnlocked ? "text-purple-400" : "text-gray-600"} size={32} fill="currentColor" />
                                                            </div>
                                                        ) : (
                                                            <div className="relative">
                                                                {isExclusive && <div className="absolute -top-2 -right-2 text-yellow-400 animate-pulse"><Star size={12} fill="currentColor" /></div>}
                                                                <Gift className={isUnlocked ? "text-purple-400" : "text-gray-600"} size={28} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="w-24 flex justify-end">
                                                        {isClaimed ? (
                                                            <span className="flex items-center gap-1 text-green-500 font-bold text-sm bg-green-500/10 px-3 py-1 rounded-full">
                                                                <Check size={14} /> OWNED
                                                            </span>
                                                        ) : isUnlocked ? (
                                                            <button
                                                                onClick={() => onClaimPassReward && onClaimPassReward(reward.level)}
                                                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg active:scale-95 transition-all text-sm animate-pulse"
                                                            >
                                                                CLAIM
                                                            </button>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-white/20 font-bold text-sm">
                                                                <Lock size={14} /> LOCKED
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* VERSION TRACKER */}
            <div className="absolute bottom-2 right-2 z-50 pointer-events-none opacity-50 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
                <span className="text-white font-mono text-[10px] font-bold tracking-widest drop-shadow-md">
                    V1.0
                </span>
            </div>
        </div >
    );
};

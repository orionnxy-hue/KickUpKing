
import React, { useRef, useEffect, useCallback } from 'react';
import { PHYSICS, COLORS } from '../constants';
import { BallState, Particle, GameState, PlayerState, Vector2, PlayerSkinConfig, BallSkinConfig, PlayerStats, StadiumSkinConfig, Decoration, ReplayFrame, BootSkinConfig } from '../types';

interface GameCanvasProps {
    gameState: GameState;
    onScoreUpdate: (newScore: number) => void;
    onLivesUpdate: (lives: number) => void;
    onGameOver: () => void;
    onAfkPenalty: () => void;
    setCanvasRef: (ref: HTMLCanvasElement | null) => void;
    playerConfig: PlayerSkinConfig;
    ballConfig: BallSkinConfig;
    stadiumConfig: StadiumSkinConfig;
    bootsConfig?: BootSkinConfig;
    playerStats: PlayerStats;
    initialLives: number;
    tutorialStep?: number;
    onTutorialInteraction?: () => void;
}

interface FloatingText {
    id: number;
    x: number;
    y: number;
    text: string;
    life: number;
    color: string;
    vy: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
    gameState,
    onScoreUpdate,
    onLivesUpdate,
    onGameOver,
    onAfkPenalty,
    setCanvasRef,
    playerConfig,
    ballConfig,
    stadiumConfig,
    bootsConfig,
    playerStats,
    initialLives,
    tutorialStep,
    onTutorialInteraction
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const requestRef = useRef<number>(0);
    const scoreRef = useRef<number>(0);
    const livesRef = useRef<number>(initialLives);
    const prevGameState = useRef<GameState>(gameState);

    const lastScoreTime = useRef<number>(0);
    const lastInputTime = useRef<number>(Date.now());
    const lastFrameTimeRef = useRef<number>(0);

    // Floating Texts (Coins)
    const floatingTextsRef = useRef<FloatingText[]>([]);

    // Background Pulse Effect
    const bgPulseRef = useRef<number>(0);

    // Replay System
    const replayHistoryRef = useRef<ReplayFrame[]>([]);
    const replayIndexRef = useRef<number>(0);

    // Stable Callbacks Refs
    const onScoreUpdateRef = useRef(onScoreUpdate);
    const onLivesUpdateRef = useRef(onLivesUpdate);
    const onGameOverRef = useRef(onGameOver);
    const onAfkPenaltyRef = useRef(onAfkPenalty);
    const onTutorialInteractionRef = useRef(onTutorialInteraction);

    useEffect(() => {
        onScoreUpdateRef.current = onScoreUpdate;
        onLivesUpdateRef.current = onLivesUpdate;
        onGameOverRef.current = onGameOver;
        onAfkPenaltyRef.current = onAfkPenalty;
        onTutorialInteractionRef.current = onTutorialInteraction;
    }, [onScoreUpdate, onLivesUpdate, onGameOver, onAfkPenalty, onTutorialInteraction]);

    // Physics modifiers
    const footReturnSpeed = PHYSICS.FOOT_RETURN_SPEED + (playerStats.speed * 0.03);
    const touchCorrectionAmount = Math.min(playerStats.touch * 0.05, 0.4);
    const touchDampingX = Math.max(1.0 - (playerStats.touch * 0.04), 0.6);
    const effectiveMaxReach = PHYSICS.MAX_LEG_REACH + (playerStats.reach * 35);

    // Mutable game state
    const ballRef = useRef<BallState>({
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        radius: PHYSICS.BALL_RADIUS,
        rotation: 0,
        angularVel: 0,
    });

    const playerRef = useRef<PlayerState>({
        x: 0,
        y: 0,
        leftFoot: { x: 0, y: 0 },
        rightFoot: { x: 0, y: 0 },
        leftTarget: null,
        rightTarget: null,
        leftFootVel: { x: 0, y: 0 },
        rightFootVel: { x: 0, y: 0 },
        isLeftActive: false,
        isRightActive: false,
        leftVelHistory: [],
        rightVelHistory: [],
        facing: 1,
    });

    const particlesRef = useRef<Particle[]>([]);
    const weatherParticlesRef = useRef<Particle[]>([]);
    const decorationsRef = useRef<Decoration[]>([]);

    // Reset function
    const resetGame = useCallback((width: number, height: number, fullReset: boolean = true) => {
        const centerX = width / 2;
        const floorY = height - PHYSICS.FLOOR_PADDING;

        ballRef.current = {
            pos: { x: centerX, y: height / 4 },
            vel: { x: 0, y: 0 },
            radius: PHYSICS.BALL_RADIUS,
            rotation: 0,
            angularVel: 0,
        };

        const footSeparation = 70;

        lastInputTime.current = Date.now();
        lastFrameTimeRef.current = 0;

        if (fullReset) {
            playerRef.current = {
                x: centerX,
                y: floorY,
                leftFoot: { x: centerX - footSeparation, y: floorY - 10 },
                rightFoot: { x: centerX + footSeparation, y: floorY - 10 },
                leftTarget: null,
                rightTarget: null,
                leftFootVel: { x: 0, y: 0 },
                rightFootVel: { x: 0, y: 0 },
                isLeftActive: false,
                isRightActive: false,
                leftVelHistory: [],
                rightVelHistory: [],
                facing: 1,
            };
            particlesRef.current = [];
            floatingTextsRef.current = [];
            replayHistoryRef.current = [];
            scoreRef.current = 0;
            lastScoreTime.current = 0;
            livesRef.current = initialLives;
            onLivesUpdateRef.current(initialLives);

            // --- Generate Decorations ---
            decorationsRef.current = [];
            if (stadiumConfig.id === 'stadium_spring') {
                for (let i = 0; i < 30; i++) {
                    decorationsRef.current.push({
                        x: Math.random() * width,
                        y: floorY + Math.random() * (height - floorY),
                        type: 'flower',
                        color: Math.random() > 0.5 ? '#f472b6' : '#facc15',
                        size: 3 + Math.random() * 3
                    });
                }
            } else if (stadiumConfig.id === 'stadium_beach') {
                for (let i = 0; i < 20; i++) {
                    decorationsRef.current.push({
                        x: Math.random() * width,
                        y: floorY + Math.random() * (height - floorY),
                        type: 'pebble',
                        color: '#fde047',
                        size: 2 + Math.random() * 2
                    });
                }
            } else if (stadiumConfig.id === 'stadium_autumn') {
                for (let i = 0; i < 40; i++) {
                    decorationsRef.current.push({
                        x: Math.random() * width,
                        y: floorY + Math.random() * (height - floorY),
                        type: 'grass_tuft',
                        color: '#854d0e',
                        size: 4 + Math.random() * 4
                    });
                }
            }

            // --- Init Weather ---
            weatherParticlesRef.current = [];
            const weatherCount = stadiumConfig.environment === 'SNOW' ? 100 : (stadiumConfig.environment === 'AUTUMN' ? 30 : 0);
            for (let i = 0; i < weatherCount; i++) {
                weatherParticlesRef.current.push({
                    id: Math.random(),
                    pos: { x: Math.random() * width, y: Math.random() * height },
                    vel: { x: (Math.random() - 0.5) * 1, y: 1 + Math.random() * 2 },
                    life: 1,
                    color: stadiumConfig.environment === 'SNOW' ? '#fff' : (Math.random() > 0.5 ? '#f97316' : '#eab308'),
                    size: stadiumConfig.environment === 'SNOW' ? Math.random() * 2 + 1 : Math.random() * 4 + 2,
                    type: stadiumConfig.environment === 'SNOW' ? 'snow' : 'leaf',
                    rotation: Math.random() * Math.PI
                });
            }
        }
    }, [initialLives, stadiumConfig]);

    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                if (gameState !== 'PLAYING' && gameState !== 'REPLAY' && gameState !== 'GAME_OVER' && gameState !== 'COUNTDOWN' && gameState !== 'TUTORIAL') {
                    resetGame(canvas.width, canvas.height, true);
                }
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [resetGame, gameState]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if ((gameState === 'PLAYING' || gameState === 'COUNTDOWN' || gameState === 'TUTORIAL') &&
            (prevGameState.current !== 'PLAYING' && prevGameState.current !== 'COUNTDOWN' && prevGameState.current !== 'TUTORIAL')) {
            resetGame(canvas.width, canvas.height, true);
        } else if (gameState === 'MENU' && prevGameState.current !== 'MENU') {
            resetGame(canvas.width, canvas.height, true);
        } else if (gameState === 'REPLAY') {
            replayIndexRef.current = 0;
        }
        prevGameState.current = gameState;
    }, [gameState, resetGame]);

    useEffect(() => {
        if (gameState === 'MENU' || gameState === 'UPGRADE') {
            livesRef.current = initialLives;
            onLivesUpdateRef.current(initialLives);
        }
    }, [initialLives, gameState]);


    // --- INPUT HANDLING ---

    const updateFootTarget = (side: 'left' | 'right', targetX: number, targetY: number) => {
        const p = playerRef.current;
        const hipX = side === 'left' ? p.x - 20 : p.x + 20;
        const hipY = p.y - 70;

        if (side === 'left') p.leftTarget = { x: targetX, y: targetY };
        else p.rightTarget = { x: targetX, y: targetY };

        const dx = targetX - hipX;
        const dy = targetY - hipY;
        const dist = Math.hypot(dx, dy);

        let finalX = targetX;
        let finalY = targetY;

        if (dist > effectiveMaxReach) {
            const angle = Math.atan2(dy, dx);
            finalX = hipX + Math.cos(angle) * effectiveMaxReach;
            finalY = hipY + Math.sin(angle) * effectiveMaxReach;
        }

        const prevPos = side === 'left' ? p.leftFoot : p.rightFoot;
        const vx = finalX - prevPos.x;
        const vy = finalY - prevPos.y;

        const history = side === 'left' ? p.leftVelHistory : p.rightVelHistory;
        history.push({ x: vx, y: vy });
        if (history.length > 5) history.shift();

        let avgVx = 0, avgVy = 0;
        history.forEach(v => { avgVx += v.x; avgVy += v.y; });
        avgVx /= history.length || 1;
        avgVy /= history.length || 1;

        if (side === 'left') {
            p.leftFoot = { x: finalX, y: finalY };
            p.leftFootVel = { x: avgVx, y: avgVy };
        } else {
            p.rightFoot = { x: finalX, y: finalY };
            p.rightFootVel = { x: avgVx, y: avgVy };
        }
    };

    const handleTouch = useCallback((e: TouchEvent) => {
        if (gameState === 'REPLAY') return;

        lastInputTime.current = Date.now();

        if (gameState !== 'PLAYING' && gameState !== 'TUTORIAL') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        e.preventDefault();

        if (gameState === 'TUTORIAL' && tutorialStep === 1 && onTutorialInteractionRef.current) {
            onTutorialInteractionRef.current();
        }

        const rect = canvas.getBoundingClientRect();
        const p = playerRef.current;
        const width = canvas.width;

        let leftActive = false;
        let rightActive = false;

        if (e.touches.length === 0) {
            p.leftTarget = null;
            p.rightTarget = null;
        }

        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            const x = t.clientX - rect.left;
            const y = t.clientY - rect.top;

            if (x < width / 2) {
                leftActive = true;
                updateFootTarget('left', x, y);
            } else {
                rightActive = true;
                updateFootTarget('right', x, y);
            }
        }

        if (!leftActive) p.leftTarget = null;
        if (!rightActive) p.rightTarget = null;

        p.isLeftActive = leftActive;
        p.isRightActive = rightActive;

        if (!leftActive) p.leftVelHistory = [];
        if (!rightActive) p.rightVelHistory = [];
    }, [gameState, effectiveMaxReach, tutorialStep]);

    const handleMouse = useCallback((e: MouseEvent) => {
        if (gameState === 'REPLAY') return;

        lastInputTime.current = Date.now();

        if (gameState !== 'PLAYING' && gameState !== 'TUTORIAL') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const p = playerRef.current;

        if (gameState === 'TUTORIAL' && tutorialStep === 1 && e.buttons === 1 && onTutorialInteractionRef.current) {
            onTutorialInteractionRef.current();
        }

        if (e.buttons !== 1) {
            p.isLeftActive = false;
            p.isRightActive = false;
            p.leftTarget = null;
            p.rightTarget = null;
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const width = canvas.width;

        if (x < width / 2) {
            p.isLeftActive = true;
            p.isRightActive = false;
            p.rightTarget = null;
            updateFootTarget('left', x, y);
        } else {
            p.isRightActive = true;
            p.isLeftActive = false;
            p.leftTarget = null;
            updateFootTarget('right', x, y);
        }
    }, [gameState, effectiveMaxReach, tutorialStep]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('touchstart', handleTouch, { passive: false });
        canvas.addEventListener('touchmove', handleTouch, { passive: false });
        canvas.addEventListener('touchend', handleTouch, { passive: false });
        canvas.addEventListener('touchcancel', handleTouch, { passive: false });
        canvas.addEventListener('mousedown', handleMouse);
        window.addEventListener('mousemove', handleMouse);
        window.addEventListener('mouseup', () => {
            if (playerRef.current) {
                playerRef.current.isLeftActive = false;
                playerRef.current.isRightActive = false;
                playerRef.current.leftTarget = null;
                playerRef.current.rightTarget = null;
            }
        });

        return () => {
            canvas.removeEventListener('touchstart', handleTouch);
            canvas.removeEventListener('touchmove', handleTouch);
            canvas.removeEventListener('touchend', handleTouch);
            canvas.removeEventListener('touchcancel', handleTouch);
            canvas.removeEventListener('mousedown', handleMouse);
            window.removeEventListener('mousemove', handleMouse);
            window.removeEventListener('mouseup', () => { });
        };
    }, [handleTouch, handleMouse]);


    // --- PHYSICS ENGINE ---

    const checkBallFootCollision = (ball: BallState, footPos: Vector2, footVel: Vector2) => {
        const dx = ball.pos.x - footPos.x;
        const dy = ball.pos.y - footPos.y;
        const dist = Math.hypot(dx, dy);

        const combinedRadius = ball.radius + PHYSICS.FOOT_RADIUS;

        if (dist < combinedRadius) {
            let nx = dx / dist;
            let ny = dy / dist;

            const rvx = ball.vel.x - footVel.x;
            const rvy = ball.vel.y - footVel.y;

            const velAlongNormal = rvx * nx + rvy * ny;

            if (velAlongNormal > 0) return;

            const overlap = combinedRadius - dist;
            ball.pos.x += nx * overlap;
            ball.pos.y += ny * overlap;

            if (touchCorrectionAmount > 0) {
                nx = nx * (1 - touchCorrectionAmount) + 0 * touchCorrectionAmount;
                ny = ny * (1 - touchCorrectionAmount) + (-1) * touchCorrectionAmount;
                const len = Math.hypot(nx, ny);
                nx /= len;
                ny /= len;
            }

            if (Math.abs(nx) > 0.8) {
                ball.vel.x *= 0.5;
            }

            const footSpeed = Math.hypot(footVel.x, footVel.y);
            let restitution = 0.6;

            if (footSpeed < 2.0) {
                restitution = 0.3;
            } else {
                restitution = 0.8;
            }

            const pushForce = (footVel.x * nx + footVel.y * ny);
            let j = -(1 + restitution) * velAlongNormal;

            ball.vel.x = nx * (Math.abs(j) + Math.abs(pushForce) * 0.8);
            ball.vel.y = ny * (Math.abs(j) + Math.abs(pushForce) * 0.8);
            ball.vel.x *= touchDampingX;

            if (footSpeed > 1.5 || ny < -0.2) {
                if (ball.vel.y > -5) {
                    ball.vel.y -= (6 + Math.random() * 2);
                }
            }

            if (ball.vel.y < -18) ball.vel.y = -18;
            ball.angularVel += -nx * 0.5;

            const speed = Math.hypot(ball.vel.x, ball.vel.y);
            if (speed > PHYSICS.MAX_SPEED) {
                const scale = PHYSICS.MAX_SPEED / speed;
                ball.vel.x *= scale;
                ball.vel.y *= scale;
            }

            const now = Date.now();
            if ((gameState === 'PLAYING' || gameState === 'TUTORIAL') && (now - lastScoreTime.current > PHYSICS.SCORE_COOLDOWN)) {
                // COIN GLITCH FIX: Ensure ball is actually kicked up significantly
                if (ball.vel.y < -2.0) {
                    scoreRef.current += 1;
                    lastScoreTime.current = now;
                    bgPulseRef.current = 1.0;
                    onScoreUpdateRef.current(scoreRef.current);

                    // --- MONEY EARNED VISUAL ---
                    const earned = 10;
                    floatingTextsRef.current.push({
                        id: Math.random(),
                        x: ball.pos.x,
                        y: ball.pos.y - 40,
                        text: `+${earned}`,
                        life: 1.0,
                        color: '#facc15', // Yellow 400
                        vy: -2
                    });

                    // --- PARTICLE BURST LOGIC ---
                    const currentScore = scoreRef.current;
                    let burstColors = [ballConfig.colorBase];
                    let burstCount = 5;

                    if (currentScore >= 300) {
                        burstColors = ['#000000', '#1f2937', '#b91c1c'];
                        burstCount = 25;
                    } else if (currentScore >= 200) {
                        burstColors = ['#9333ea', '#c084fc', '#e879f9'];
                        burstCount = 20;
                    } else if (currentScore >= 150) {
                        burstColors = ['#854d0e', '#ca8a04', '#facc15'];
                        burstCount = 20;
                    } else if (currentScore >= 100) {
                        burstColors = ['#3b82f6', '#60a5fa', '#e0f2fe', '#ffffff'];
                        burstCount = 20;
                    } else if (currentScore >= 50) {
                        burstColors = ['#ef4444', '#f97316', '#facc15'];
                        burstCount = 15;
                    } else if (currentScore >= 40) {
                        burstColors = ['#f97316', '#facc15'];
                        burstCount = 12;
                    } else if (currentScore >= 30) {
                        burstColors = ['#facc15', '#fde047'];
                        burstCount = 8;
                    } else if (currentScore >= 20) {
                        burstColors = ['#9ca3af', '#d1d5db'];
                        burstCount = 8;
                    } else if (currentScore >= 10) {
                        burstColors = ['#e5e7eb', '#f3f4f6'];
                        burstCount = 5;
                    }

                    for (let i = 0; i < burstCount; i++) {
                        particlesRef.current.push({
                            id: Math.random(),
                            pos: { x: ball.pos.x + (Math.random() - 0.5) * 20, y: ball.pos.y + (Math.random() - 0.5) * 20 },
                            vel: { x: nx * 5 + (Math.random() - 0.5) * 5, y: ny * 5 + (Math.random() - 0.5) * 5 },
                            life: 1.0,
                            color: burstColors[Math.floor(Math.random() * burstColors.length)],
                            size: Math.random() * 4 + 2,
                            type: 'sparkle'
                        });
                    }
                }
            }
        }
    };


    const update = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // --- DELTA TIME CALCULATION ---
        if (lastFrameTimeRef.current === 0) {
            lastFrameTimeRef.current = timestamp;
        }
        const deltaTimeMs = timestamp - lastFrameTimeRef.current;
        lastFrameTimeRef.current = timestamp;

        // Clamp dt
        const targetMs = 1000 / 60;
        const dt = Math.min(deltaTimeMs / targetMs, 4.0);


        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const ball = ballRef.current;
        const player = playerRef.current;
        const floorY = height - PHYSICS.FLOOR_PADDING;

        if (bgPulseRef.current > 0) {
            bgPulseRef.current = Math.max(0, bgPulseRef.current - 0.02 * dt);
        }

        // --- REPLAY LOGIC ---
        if (gameState === 'REPLAY') {
            if (replayHistoryRef.current.length > 0) {
                const idx = Math.floor(replayIndexRef.current);
                const safeIdx = Math.min(idx, replayHistoryRef.current.length - 1);
                const frame = replayHistoryRef.current[safeIdx];

                ball.pos = { ...frame.ballPos };
                ball.rotation = frame.ballRot;
                player.leftFoot = { ...frame.leftFoot };
                player.rightFoot = { ...frame.rightFoot };
                player.isLeftActive = frame.isLeftActive;
                player.isRightActive = frame.isRightActive;
                player.leftTarget = frame.leftTarget;
                player.rightTarget = frame.rightTarget;

                replayIndexRef.current += 0.4 * dt;

                if (replayIndexRef.current >= replayHistoryRef.current.length) {
                    replayIndexRef.current = 0;
                }
            }
        }


        // --- WEATHER UPDATE ---
        const weather = weatherParticlesRef.current;
        for (let i = 0; i < weather.length; i++) {
            const p = weather[i];
            p.pos.y += p.vel.y * dt;
            p.pos.x += Math.sin(Date.now() / 500 + p.id * 10) * 0.5 * dt;
            if (p.type === 'leaf') {
                p.rotation = (p.rotation || 0) + 0.05 * dt;
            }

            if (p.pos.y > height) {
                p.pos.y = -20;
                p.pos.x = Math.random() * width;
            }
        }


        if (gameState === 'PLAYING' || gameState === 'TUTORIAL') {
            if (Date.now() - lastInputTime.current > 5000) {
                onAfkPenaltyRef.current();
                return;
            }

            const isBallFrozen = gameState === 'TUTORIAL' && tutorialStep === 1;

            if (!isBallFrozen) {
                ball.vel.y += PHYSICS.GRAVITY_BASE * dt;
                ball.vel.x *= Math.pow(PHYSICS.FRICTION, dt);
                ball.vel.y *= Math.pow(PHYSICS.FRICTION, dt);

                ball.pos.x += ball.vel.x * dt;
                ball.pos.y += ball.vel.y * dt;
                ball.rotation += ball.angularVel * dt;
                ball.angularVel *= Math.pow(0.98, dt);
            } else {
                const time = Date.now() / 500;
                ball.pos.x = width / 2;
                ball.pos.y = height / 4 + Math.sin(time) * 10;
                ball.vel = { x: 0, y: 0 };
            }

            replayHistoryRef.current.push({
                ballPos: { ...ball.pos },
                ballRot: ball.rotation,
                leftFoot: { ...player.leftFoot },
                rightFoot: { ...player.rightFoot },
                isLeftActive: player.isLeftActive,
                isRightActive: player.isRightActive,
                leftTarget: player.leftTarget ? { ...player.leftTarget } : null,
                rightTarget: player.rightTarget ? { ...player.rightTarget } : null,
                particles: particlesRef.current.map(p => ({
                    ...p,
                    pos: { ...p.pos },
                    vel: { ...p.vel }
                }))
            });
            if (replayHistoryRef.current.length > 180) {
                replayHistoryRef.current.shift();
            }

            const currentScore = scoreRef.current;

            let emissionCount = 0;
            let emissionType: 'smoke' | 'fire' | 'void' = 'smoke';
            let colors: string[] = [];

            if (currentScore >= 300) {
                emissionCount = 3;
                emissionType = 'void';
                colors = ['#000000', '#111827', '#ef4444'];
            } else if (currentScore >= 200) {
                emissionCount = 2;
                emissionType = 'fire';
                colors = ['#9333ea', '#c084fc', '#e879f9'];
            } else if (currentScore >= 150) {
                emissionCount = 2;
                emissionType = 'fire';
                colors = ['#854d0e', '#ca8a04', '#facc15'];
            } else if (currentScore >= 100) {
                emissionCount = 2;
                emissionType = 'fire';
                colors = ['#3b82f6', '#60a5fa', '#e0f2fe', '#ffffff'];
            } else if (currentScore >= 50) {
                emissionCount = 2;
                emissionType = 'fire';
                colors = ['#ef4444', '#f97316', '#facc15'];
            } else if (currentScore >= 40) {
                emissionCount = 1;
                emissionType = 'fire';
                colors = ['#f97316', '#facc15'];
            } else if (currentScore >= 30) {
                emissionCount = Math.random() > 0.5 ? 1 : 0;
                emissionType = 'fire';
                colors = ['#facc15'];
            } else if (currentScore >= 20) {
                emissionCount = Math.random() > 0.3 ? 1 : 0;
                emissionType = 'smoke';
                colors = ['#9ca3af', '#6b7280'];
            } else if (currentScore >= 10) {
                emissionCount = Math.random() > 0.7 ? 1 : 0;
                emissionType = 'smoke';
                colors = ['#e5e7eb', '#d1d5db'];
            }

            for (let k = 0; k < emissionCount; k++) {
                const isSmoke = emissionType === 'smoke';
                particlesRef.current.push({
                    id: Math.random(),
                    pos: {
                        x: ball.pos.x + (Math.random() - 0.5) * (isSmoke ? 20 : ball.radius),
                        y: ball.pos.y + (Math.random() - 0.5) * (isSmoke ? 20 : ball.radius)
                    },
                    vel: {
                        x: -ball.vel.x * 0.1 + (Math.random() - 0.5) * (isSmoke ? 1 : 2),
                        y: isSmoke ? -Math.random() : -Math.random() * 5 - 1
                    },
                    life: isSmoke ? 1.5 : 0.8 + Math.random() * 0.4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: isSmoke ? Math.random() * 6 + 3 : Math.random() * 8 + 4,
                    type: 'sparkle'
                });
            }

            const leftWall = width / 2 - PHYSICS.WALL_DISTANCE;
            const rightWall = width / 2 + PHYSICS.WALL_DISTANCE;

            if (ball.pos.x - ball.radius < leftWall) {
                ball.pos.x = leftWall + ball.radius;
                ball.vel.x = Math.abs(ball.vel.x) * PHYSICS.BOUNCE_DAMPING;
            } else if (ball.pos.x + ball.radius > rightWall) {
                ball.pos.x = rightWall - ball.radius;
                ball.vel.x = -Math.abs(ball.vel.x) * PHYSICS.BOUNCE_DAMPING;
            }

            if (ball.pos.y + ball.radius > floorY + 15) {
                if (livesRef.current > 1) {
                    livesRef.current -= 1;
                    onLivesUpdateRef.current(livesRef.current);
                    resetGame(width, height, false);

                    for (let i = 0; i < 15; i++) {
                        particlesRef.current.push({
                            id: Math.random(),
                            pos: { x: ball.pos.x, y: floorY },
                            vel: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 1) * 8 },
                            life: 1.0,
                            color: '#ef4444',
                            size: Math.random() * 5 + 2,
                            type: 'sparkle'
                        });
                    }
                } else {
                    ball.pos.y = floorY + 15 - ball.radius;
                    ball.vel.y *= -0.3;
                    ball.vel.x = 0;
                    ball.angularVel = 0;
                    livesRef.current = 0;
                    onLivesUpdateRef.current(0);
                    onGameOverRef.current();
                }
            }

            const restY = floorY - 10;
            const footSeparation = 70;
            const restX_L = player.x - footSeparation;
            const restX_R = player.x + footSeparation;

            const returnLerp = 1 - Math.pow(1 - footReturnSpeed, dt);

            if (!player.isLeftActive) {
                player.leftFoot.x += (restX_L - player.leftFoot.x) * returnLerp;
                player.leftFoot.y += (restY - player.leftFoot.y) * returnLerp;
                player.leftFootVel = { x: 0, y: 0 };
                player.leftVelHistory = [];
            }
            if (!player.isRightActive) {
                player.rightFoot.x += (restX_R - player.rightFoot.x) * returnLerp;
                player.rightFoot.y += (restY - player.rightFoot.y) * returnLerp;
                player.rightFootVel = { x: 0, y: 0 };
                player.rightVelHistory = [];
            }

            checkBallFootCollision(ball, player.leftFoot, player.leftFootVel);
            checkBallFootCollision(ball, player.rightFoot, player.rightFootVel);

        } else if (gameState === 'COUNTDOWN') {
            const time = Date.now() / 500;
            ball.pos.x = width / 2;
            ball.pos.y = height / 4 + Math.sin(time) * 5;
            ball.vel = { x: 0, y: 0 };
            ball.rotation = 0;

            player.leftFoot.y = floorY - 10 + Math.sin(time) * 3;
            player.rightFoot.y = floorY - 10 + Math.cos(time) * 3;

        } else if (gameState === 'MENU' || gameState === 'SHOP' || gameState === 'UPGRADE') {
            const time = Date.now() / 1000;
            ball.pos.x = (width / 2) + 80;
            ball.pos.y = floorY - ball.radius;
            ball.rotation = 0;
            player.leftFoot.y = floorY - 10 + Math.sin(time * 2) * 5;
            player.rightFoot.y = floorY - 10 + Math.cos(time * 2) * 5;
        }


        // --- RENDER ---
        ctx.clearRect(0, 0, width, height);

        // 1. SKY & BASE ATMOSPHERE
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, stadiumConfig.skyColorTop);
        grad.addColorStop(0.6, stadiumConfig.skyColorBottom);
        grad.addColorStop(1, stadiumConfig.pitchColorTop);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        if (bgPulseRef.current > 0) {
            const pulse = bgPulseRef.current;
            const cx = width / 2;
            ctx.save();

            ctx.globalCompositeOperation = 'screen';

            const pulseGrad = ctx.createRadialGradient(cx, height / 2, 0, cx, height / 2, Math.max(width, height) * 0.8 * pulse);
            pulseGrad.addColorStop(0, `rgba(255, 255, 255, ${pulse * 0.5})`);
            pulseGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = pulseGrad;
            ctx.fillRect(0, 0, width, height);

            ctx.translate(cx, height / 2);
            ctx.rotate(Date.now() / 2000);
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.15})`;
            for (let i = 0; i < 12; i++) {
                ctx.rotate(Math.PI / 6);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-width, -Math.max(width, height) * 1.5);
                ctx.lineTo(width, -Math.max(width, height) * 1.5);
                ctx.fill();
            }

            ctx.restore();
        }

        const time = Date.now() / 1000;

        // Sun
        if (stadiumConfig.environment === 'SAND') {
            ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
            ctx.beginPath();
            ctx.arc(width * 0.8, 100, 60, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(width * 0.8, 100, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        if (stadiumConfig.architecture === 'TRAINING') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            for (let i = 0; i < 6; i++) {
                const x = ((time * 10 + i * 200) % (width + 400)) - 200;
                const y = 50 + Math.sin(i * 1.5) * 30;
                const size = 60 + Math.cos(i) * 20;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.arc(x + size * 0.7, y + size * 0.2, size * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 60; i++) {
                const sx = (i * 137.5) % width;
                const sy = (i * 293.2) % (height * 0.45);
                const size = (i % 3 === 0) ? 1.5 : 1;
                const twinkle = Math.abs(Math.sin(time * 2 + i));
                ctx.globalAlpha = 0.2 + twinkle * 0.6;
                ctx.beginPath();
                ctx.arc(sx, sy, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        }

        // 2. BACKGROUND ARCHITECTURE
        const centerX = width / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, floorY);
        ctx.clip();

        // ... (Keep existing stadium drawing logic as is)
        if (stadiumConfig.architecture === 'TRAINING') {
            const drawHills = (color1: string, color2: string, color3: string) => {
                ctx.fillStyle = color1;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(0, floorY);
                ctx.bezierCurveTo(width * 0.2, floorY - 80, width * 0.8, floorY - 20, width, floorY - 90);
                ctx.lineTo(width, floorY);
                ctx.fill();
                ctx.globalAlpha = 1.0;

                ctx.fillStyle = color2;
                ctx.beginPath();
                ctx.moveTo(0, floorY);
                ctx.bezierCurveTo(width * 0.3, floorY - 50, width * 0.6, floorY - 100, width, floorY - 40);
                ctx.lineTo(width, floorY);
                ctx.fill();

                ctx.fillStyle = color3;
                ctx.beginPath();
                ctx.moveTo(0, floorY);
                ctx.bezierCurveTo(width * 0.1, floorY - 30, width * 0.5, floorY - 60, width, floorY - 20);
                ctx.lineTo(width, floorY);
                ctx.fill();
            }

            if (stadiumConfig.environment === 'SNOW') {
                drawHills('#94a3b8', '#cbd5e1', '#e2e8f0');
                for (let i = 0; i < width; i += 60) {
                    const r = Math.sin(i * 32.1);
                    const scale = 0.7 + Math.abs(r) * 0.5;
                    const treeY = floorY - 5 * scale;
                    const x = i + r * 20;

                    ctx.fillStyle = '#475569';
                    ctx.fillRect(x - 2 * scale, treeY, 4 * scale, 15 * scale);

                    ctx.fillStyle = '#cbd5e1';
                    ctx.beginPath();
                    ctx.moveTo(x - 15 * scale, treeY);
                    ctx.lineTo(x, treeY - 40 * scale);
                    ctx.lineTo(x + 15 * scale, treeY);
                    ctx.fill();
                }

            } else if (stadiumConfig.environment === 'SAND') {
                ctx.fillStyle = '#0ea5e9';
                ctx.fillRect(0, floorY - 50, width, 50);
                drawHills('#fde047', '#facc15', '#eab308');

            } else if (stadiumConfig.environment === 'AUTUMN') {
                drawHills('#fdba74', '#fb923c', '#ea580c');
                for (let i = 0; i < width; i += 60) {
                    const r = Math.sin(i * 32.1);
                    const scale = 0.7 + Math.abs(r) * 0.5;
                    const x = i + r * 20;
                    const treeY = floorY - 5 * scale;

                    ctx.fillStyle = '#3f2c20';
                    ctx.fillRect(x - 2 * scale, treeY, 4 * scale, 15 * scale);

                    ctx.fillStyle = Math.random() > 0.5 ? '#c2410c' : '#a16207';
                    ctx.beginPath();
                    ctx.arc(x, treeY - 20 * scale, 15 * scale, 0, Math.PI * 2);
                    ctx.fill();
                }

            } else {
                drawHills('#86efac', '#22c55e', '#15803d');
                for (let i = 0; i < width; i += 60) {
                    const r = Math.sin(i * 32.1);
                    const scale = 0.7 + Math.abs(r) * 0.5;
                    const x = i + r * 20;
                    const treeY = floorY - 5 * scale;

                    ctx.fillStyle = '#3f2c20';
                    ctx.fillRect(x - 2 * scale, treeY, 4 * scale, 15 * scale);

                    ctx.fillStyle = '#166534';
                    ctx.beginPath();
                    ctx.arc(x, treeY - 20 * scale, 15 * scale, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

        } else if (stadiumConfig.architecture === 'WALL') {
            const standH = height * 0.75;
            const startY = floorY;
            const topY = floorY - standH;
            const concreteGrad = ctx.createLinearGradient(0, topY, 0, startY);
            concreteGrad.addColorStop(0, '#262626');
            concreteGrad.addColorStop(1, '#171717');
            ctx.fillStyle = concreteGrad;
            ctx.beginPath();
            ctx.moveTo(0, startY);
            ctx.lineTo(width, startY);
            ctx.lineTo(width * 0.9, topY);
            ctx.lineTo(width * 0.1, topY);
            ctx.fill();

            if (stadiumConfig.crowdDensity > 0) {
                ctx.fillStyle = stadiumConfig.standColorPrimary;
                for (let i = 0; i < 300; i++) {
                    const cx = width * 0.1 + Math.random() * (width * 0.8);
                    const cy = topY + Math.random() * (startY - topY);
                    ctx.beginPath();
                    ctx.arc(cx, cy, 2 + Math.random() * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(0, topY - 10);
            ctx.lineTo(width, topY - 10);
            ctx.stroke();

            const lightY = topY - 30;

            ctx.fillStyle = '#111';
            ctx.fillRect(0, lightY, width, 20);

            ctx.shadowColor = 'white';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#fff';
            for (let i = 0; i < width; i += 40) {
                ctx.beginPath();
                ctx.arc(i + 20, lightY + 10, 8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for (let i = 0; i < width; i += 100) {
                ctx.beginPath();
                ctx.moveTo(i + 20, lightY + 20);
                ctx.lineTo(i - 50, height);
                ctx.lineTo(i + 90, height);
                ctx.fill();
            }


        } else if (stadiumConfig.architecture === 'BOWL') {
            const tiers = 3;
            for (let t = 0; t < tiers; t++) {
                const y = floorY - 100 - (t * 110);
                const w = width + 300 + (t * 150);
                const tierGrad = ctx.createLinearGradient(0, y, 0, y + 100);
                tierGrad.addColorStop(0, '#1e293b');
                tierGrad.addColorStop(1, '#0f172a');
                ctx.fillStyle = tierGrad;
                ctx.beginPath();
                ctx.ellipse(centerX, y, w / 2, 120 + t * 20, 0, Math.PI, 0);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(centerX, y, w / 2 - 10, 110 + t * 20, 0, Math.PI, 0);
                ctx.stroke();

                if (stadiumConfig.crowdDensity > 0) {
                    ctx.fillStyle = t % 2 === 0 ? stadiumConfig.standColorPrimary : stadiumConfig.standColorSecondary;
                    for (let k = 0; k < 100; k++) {
                        const angle = Math.random() * Math.PI;
                        const r = (w / 2 - 20) * Math.random();
                        const px = centerX + Math.cos(angle) * r;
                        const py = y + Math.sin(angle) * (100 + t * 20) * 0.3;
                        if (py > y && py < y + 80) {
                            ctx.beginPath();
                            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }

            const rimY = floorY - 100 - (2 * 110);

            const drawBowlLight = (x: number, angle: number) => {
                ctx.save();
                ctx.translate(x, rimY);
                ctx.rotate(angle);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(-15, -40, 30, 40);

                ctx.shadowColor = 'white';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(0, -20, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath();
                ctx.moveTo(-10, -10);
                ctx.lineTo(-50, 400);
                ctx.lineTo(50, 400);
                ctx.lineTo(10, -10);
                ctx.fill();

                ctx.restore();
            }

            drawBowlLight(width * 0.2, 0.2);
            drawBowlLight(width * 0.8, -0.2);
            drawBowlLight(width * 0.1, 0.3);
            drawBowlLight(width * 0.9, -0.3);

        } else {
            const towerW = 80;
            ctx.fillStyle = '#475569';
            ctx.fillRect(0, floorY - 500, towerW, 500);
            ctx.fillRect(width - towerW, floorY - 500, towerW, 500);
            for (let l = 0; l < 5; l++) {
                const ly = floorY - 50 - (l * 80);
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(towerW, ly, width - towerW * 2, 15);
                ctx.fillStyle = '#0c4a6e';
                ctx.fillRect(towerW, ly - 65, width - towerW * 2, 65);
            }

            const towerTop = floorY - 500;
            const drawTowerLight = (x: number) => {
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x + towerW / 2, towerTop);
                ctx.lineTo(x + towerW / 2, towerTop - 60);
                ctx.moveTo(x, towerTop - 60);
                ctx.lineTo(x + towerW, towerTop - 60);
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.shadowColor = 'white';
                ctx.shadowBlur = 25;

                for (let rx = 0; rx < 3; rx++) {
                    for (let ry = 0; ry < 2; ry++) {
                        ctx.beginPath();
                        ctx.arc(x + 15 + rx * 25, towerTop - 80 + ry * 20, 8, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.shadowBlur = 0;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.moveTo(x, towerTop - 60);
                ctx.lineTo(centerX, height);
                ctx.lineTo(x + towerW, towerTop - 60);
                ctx.fill();
            }

            drawTowerLight(0);
            drawTowerLight(width - towerW);
        }

        ctx.restore();


        // 3. PITCH (Floor)
        const pitchH = height - floorY;

        const pitchGrad = ctx.createLinearGradient(0, floorY, 0, height);
        pitchGrad.addColorStop(0, stadiumConfig.pitchColorTop);
        pitchGrad.addColorStop(1, stadiumConfig.pitchColorBottom);
        ctx.fillStyle = pitchGrad;
        ctx.fillRect(0, floorY, width, pitchH);

        if (stadiumConfig.environment === 'SAND') {
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            for (let i = 0; i < height; i += 20) {
                const y = floorY + i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(width / 3, y + 10, width * 2 / 3, y - 10, width, y);
                ctx.lineTo(width, y + 5);
                ctx.lineTo(0, y + 5);
                ctx.fill();
            }
        } else if (stadiumConfig.environment !== 'SNOW') {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            const stripeCount = 12;
            for (let i = 0; i < stripeCount; i += 2) {
                const y1 = floorY + (i / stripeCount) * pitchH;
                const h = (1 / stripeCount) * pitchH;
                ctx.fillRect(0, y1, width, h);
            }
        }

        decorationsRef.current.forEach(d => {
            ctx.fillStyle = d.color;
            ctx.beginPath();
            if (d.type === 'flower') {
                ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (d.type === 'pebble') {
                ctx.ellipse(d.x, d.y, d.size * 2, d.size, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (d.type === 'grass_tuft') {
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - d.size, d.y - d.size * 2);
                ctx.lineTo(d.x + d.size, d.y - d.size * 2);
                ctx.fill();
            }
        });

        if (stadiumConfig.architecture !== 'TRAINING' || stadiumConfig.environment === 'GRASS') {
            ctx.save();
            ctx.translate(centerX, height + 20);
            ctx.scale(1, 0.3);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(0, 0, 300, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = 'white';
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, floorY + 2);
        ctx.lineTo(width, floorY + 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        const leftWallX = width / 2 - PHYSICS.WALL_DISTANCE;
        const rightWallX = width / 2 + PHYSICS.WALL_DISTANCE;

        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, 0, leftWallX, height);
        ctx.fillRect(rightWallX, 0, width - rightWallX, height);

        const drawSimpleWall = (x: number) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x - 2, 0, 4, height);
            const grad = ctx.createLinearGradient(x, 0, x, height);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x - 1, 0, 2, height);
        };

        drawSimpleWall(leftWallX);
        drawSimpleWall(rightWallX);

        if (gameState === 'MENU' || gameState === 'UPGRADE' || gameState === 'SHOP') {
            ctx.save();
            const goalW = 340;
            const goalH = 160;
            const goalX = centerX;
            const goalY = floorY - 30;

            const netGrad = ctx.createLinearGradient(0, goalY - goalH, 0, goalY);
            netGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
            netGrad.addColorStop(1, 'rgba(255,255,255,0.4)');
            ctx.strokeStyle = netGrad;
            ctx.lineWidth = 1;

            ctx.beginPath();
            for (let i = 0; i <= goalW; i += 15) {
                ctx.moveTo(goalX - goalW / 2 + i, goalY);
                ctx.lineTo(goalX - goalW / 2 + i + (Math.abs(goalW / 2 - i) * 0.1), goalY - goalH);
            }
            for (let i = 0; i <= goalH; i += 15) {
                ctx.moveTo(goalX - goalW / 2 - 5, goalY - i);
                ctx.lineTo(goalX + goalW / 2 + 5, goalY - i);
            }
            ctx.stroke();

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 10;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(goalX - goalW / 2, goalY);
            ctx.lineTo(goalX - goalW / 2, goalY - goalH);
            ctx.lineTo(goalX + goalW / 2, goalY - goalH);
            ctx.lineTo(goalX + goalW / 2, goalY);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(goalX - goalW / 2 + 5, goalY);
            ctx.lineTo(goalX - goalW / 2 + 5, goalY - goalH + 5);
            ctx.lineTo(goalX + goalW / 2 - 5, goalY - goalH + 5);
            ctx.lineTo(goalX + goalW / 2 - 5, goalY);
            ctx.stroke();

            ctx.restore();

            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath();
            ctx.ellipse(centerX, floorY + 5, 24, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        const shouldRenderBall = gameState === 'PLAYING' || gameState === 'GAME_OVER' || gameState === 'REPLAY' || gameState === 'COUNTDOWN' || gameState === 'TUTORIAL';

        if (shouldRenderBall && (gameState !== 'GAME_OVER' || ball.vel.y < 0 || ball.pos.y < floorY - 20)) {
            const dist = Math.max(0, floorY - ball.pos.y);
            const shadowScale = Math.max(0.2, 1 - dist / 400);
            const shadowAlpha = Math.max(0, 0.5 - dist / 400);

            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
            ctx.beginPath();
            ctx.ellipse(ball.pos.x, floorY + 5, ball.radius * shadowScale * 1.2, ball.radius * shadowScale * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(player.x, floorY + 5, 40, 10, 0, 0, Math.PI * 2);
        ctx.fill();


        const drawPlayer = () => {
            ctx.save();
            ctx.translate(player.x, floorY);
            const s = 1.6;
            ctx.scale(s, s);

            ctx.save();
            ctx.translate(0, -55);

            const bob = Math.sin(Date.now() / 300) * 3;

            const drawArm = (shoulderX: number, shoulderY: number, handX: number, handY: number) => {
                ctx.strokeStyle = playerConfig.colorJersey;
                ctx.lineWidth = 14;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(shoulderX, shoulderY);
                const dx = handX - shoulderX;
                const dy = handY - shoulderY;
                const angle = Math.atan2(dy, dx);
                const sleeveLen = 14;
                ctx.lineTo(shoulderX + Math.cos(angle) * sleeveLen, shoulderY + Math.sin(angle) * sleeveLen);
                ctx.stroke();

                ctx.strokeStyle = playerConfig.colorSkin;
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(shoulderX + Math.cos(angle) * (sleeveLen - 2), shoulderY + Math.sin(angle) * (sleeveLen - 2));
                ctx.lineTo(handX, handY);
                ctx.stroke();

                const handGrad = ctx.createRadialGradient(handX - 2, handY - 2, 2, handX, handY, 10);
                handGrad.addColorStop(0, '#fff');
                handGrad.addColorStop(1, playerConfig.colorSkin);
                ctx.fillStyle = handGrad;
                ctx.beginPath();
                ctx.arc(handX, handY, 8, 0, Math.PI * 2);
                ctx.fill();
            };

            const isMenuIdle = gameState === 'MENU' || gameState === 'UPGRADE' || gameState === 'SHOP';

            if (isMenuIdle) {
                drawArm(-18, -22, -35, 5 + bob);
                drawArm(18, -22, 28, -5 + bob);
                ctx.save();
                ctx.translate(36, -3 + bob);
                ctx.fillStyle = ballConfig.colorBase;
                ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = ballConfig.colorAccent;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 72 - 90) * Math.PI / 180;
                    ctx.lineTo(0 + 4 * Math.cos(angle), 0 + 4 * Math.sin(angle));
                }
                ctx.fill();
                ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
                ctx.restore();
            } else {
                drawArm(-18, -22, -35, 5 + bob);
                drawArm(18, -22, 35, 5 + bob);
            }

            const bodyW = 40;
            const bodyH = 50;

            const bodyGrad = ctx.createLinearGradient(-20, 0, 20, 0);
            bodyGrad.addColorStop(0, '#000000');
            bodyGrad.addColorStop(0.5, playerConfig.colorJersey);
            bodyGrad.addColorStop(1, '#000000');

            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, 20);
            ctx.fill();

            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.moveTo(-10, -25);
            ctx.lineTo(10, -25);
            ctx.lineTo(0, -15);
            ctx.fill();

            const isJerseyLight = playerConfig.colorJersey === '#ffffff' || playerConfig.colorJersey === '#f8fafc';
            ctx.fillStyle = isJerseyLight ? '#000000' : 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 20px "Russo One", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(playerConfig.jerseyNumber.toString(), 0, -3);

            ctx.fillStyle = playerConfig.colorShorts;
            ctx.beginPath();
            ctx.roundRect(-bodyW / 2, 10, bodyW, 15, 10);
            ctx.fill();

            ctx.translate(0, -45);

            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(0, 22, 12, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            const headGrad = ctx.createLinearGradient(-20, -20, 20, 20);
            headGrad.addColorStop(0, '#fff');
            headGrad.addColorStop(1, playerConfig.colorSkin);

            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.roundRect(-21, -25, 42, 48, 16);
            ctx.fill();

            ctx.fillStyle = playerConfig.colorSkin;
            ctx.beginPath();
            ctx.arc(-21, 0, 6, 0, Math.PI * 2);
            ctx.arc(21, 0, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = playerConfig.colorHair;
            ctx.beginPath();

            if (playerConfig.hairStyle === 'afro') {
                ctx.moveTo(-22, 2);
                ctx.quadraticCurveTo(-32, -10, -32, -25);
                ctx.quadraticCurveTo(-32, -45, 0, -45);
                ctx.quadraticCurveTo(32, -45, 32, -25);
                ctx.quadraticCurveTo(32, -10, 22, 2);
                ctx.lineTo(17, 2);
                ctx.lineTo(17, -8);
                ctx.quadraticCurveTo(0, -12, -17, -8);
                ctx.lineTo(-17, 2);
                ctx.lineTo(-22, 2);
            } else if (playerConfig.hairStyle === 'curly') {
                ctx.moveTo(-20, -15);
                ctx.lineTo(-20, -28);
                ctx.bezierCurveTo(-15, -38, -5, -38, 0, -35);
                ctx.bezierCurveTo(5, -38, 15, -38, 20, -28);
                ctx.lineTo(20, -15);
                ctx.lineTo(20, -5);
                ctx.lineTo(17, -5);
                ctx.lineTo(17, -15);
                ctx.quadraticCurveTo(0, -18, -17, -15);
                ctx.lineTo(-17, -5);
                ctx.lineTo(-20, -5);
            } else {
                ctx.moveTo(-21, -8);
                ctx.lineTo(-21, -22);
                ctx.quadraticCurveTo(0, -32, 21, -22);
                ctx.lineTo(21, -8);
                ctx.lineTo(17, -8);
                ctx.lineTo(17, -15);
                ctx.quadraticCurveTo(0, -18, -17, -15);
                ctx.lineTo(-17, -8);
                ctx.lineTo(-21, -8);
            }
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.rect(-14, -6, 10, 3);
            ctx.rect(4, -6, 10, 3);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-9, 2, 2.5, 0, Math.PI * 2);
            ctx.arc(9, 2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.moveTo(-2, 8);
            ctx.lineTo(2, 8);
            ctx.lineTo(0, 11);
            ctx.fill();

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 14, 5, 0.2, Math.PI - 0.2);
            ctx.stroke();

            ctx.restore();

            ctx.restore();
        };

        drawPlayer();

        const idleTime = Date.now() - lastInputTime.current;
        if (gameState === 'PLAYING' && idleTime > 2000) {
            const timeLeft = Math.ceil((5000 - idleTime) / 1000);

            ctx.save();
            ctx.translate(player.x, floorY - 240);

            const w = 220;
            const h = 90;
            const r = 15;

            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(-w / 2 + r, -h / 2);
            ctx.lineTo(w / 2 - r, -h / 2);
            ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
            ctx.lineTo(w / 2, h / 2 - r);
            ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
            ctx.lineTo(10, h / 2);
            ctx.lineTo(0, h / 2 + 15);
            ctx.lineTo(-10, h / 2);
            ctx.lineTo(-w / 2 + r, h / 2);
            ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
            ctx.lineTo(-w / 2, -h / 2 + r);
            ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 24px "Russo One", sans-serif';
            ctx.fillText(`MOVE! ${timeLeft}s`, 0, -25);

            ctx.fillStyle = '#1f2937';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText("Lose current loot", 0, 0);
            ctx.fillText("& 150 penalty!", 0, 20);

            ctx.restore();
        }

        const drawWorldShoe = (pos: Vector2, isLeft: boolean, isActive: boolean) => {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            const scale = isActive ? 1.7 : 1.5;
            ctx.scale(scale, scale);
            if (isLeft) ctx.scale(-1, 1);

            if (isActive) {
                ctx.shadowColor = COLORS.INDICATOR_ACTIVE;
                ctx.shadowBlur = 20;
            } else {
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 10;
            }

            // --- CUSTOM BOOTS CHECK ---
            const primaryColor = bootsConfig ? bootsConfig.colorPrimary : playerConfig.colorBoots;
            const secondaryColor = bootsConfig ? bootsConfig.colorSecondary : '#ccc';

            ctx.fillStyle = primaryColor;
            ctx.beginPath();
            ctx.moveTo(-14, 0);
            ctx.lineTo(16, 0);
            ctx.quadraticCurveTo(22, -5, 18, -12);
            ctx.lineTo(-8, -14);
            ctx.lineTo(-14, -8);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.roundRect(-14, 0, 34, 4, 2);
            ctx.fill();

            ctx.fillStyle = secondaryColor;
            ctx.fillRect(-10, 4, 3, 3);
            ctx.fillRect(12, 4, 3, 3);

            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.ellipse(5, -8, 8, 3, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // Boot Trail
            if (bootsConfig && bootsConfig.trail && isActive) {
                ctx.shadowColor = primaryColor;
                ctx.shadowBlur = 30;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        };

        drawWorldShoe(player.leftFoot, true, player.isLeftActive);
        drawWorldShoe(player.rightFoot, false, player.isRightActive);


        if (shouldRenderBall) {
            ctx.save();
            ctx.translate(ball.pos.x, ball.pos.y);
            ctx.rotate(ball.rotation);

            const currentScore = scoreRef.current;
            if (currentScore >= 100) {
                ctx.shadowColor = '#facc15';
                ctx.shadowBlur = 30;
            }

            ctx.fillStyle = ballConfig.colorBase;
            ctx.beginPath();
            ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
            ctx.fill();

            if (currentScore >= 100) {
                ctx.shadowBlur = 0;
            }

            ctx.fillStyle = ballConfig.colorAccent;
            const drawPentagon = (x: number, y: number, r: number) => {
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 72 - 90) * Math.PI / 180;
                    ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
                }
                ctx.fill();
            };
            drawPentagon(0, 0, ball.radius * 0.45);
            for (let i = 0; i < 5; i++) {
                ctx.save();
                ctx.rotate((i * 72) * Math.PI / 180);
                ctx.translate(0, ball.radius * 0.9);
                drawPentagon(0, 0, ball.radius * 0.35);
                ctx.restore();
            }

            ctx.beginPath();
            ctx.arc(-8, -8, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fill();

            ctx.restore();
        }

        for (let i = 0; i < weatherParticlesRef.current.length; i++) {
            const p = weatherParticlesRef.current[i];
            ctx.fillStyle = p.color;
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);
            if (p.rotation) ctx.rotate(p.rotation);

            if (p.type === 'snow') {
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'leaf') {
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // --- RENDER PARTICLES & FLOATING TEXTS ---
        if (gameState === 'PLAYING') {
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.pos.x += p.vel.x * dt;
                p.pos.y += p.vel.y * dt;
                p.life -= 0.05 * dt;
                p.vel.y += 0.5 * dt;

                if (p.life <= 0) {
                    particlesRef.current.splice(i, 1);
                }
            }

            for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
                const ft = floatingTextsRef.current[i];
                ft.y += ft.vy * dt;
                ft.life -= 0.02 * dt;
                if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
            }
        }

        let particlesToRender = particlesRef.current;
        if (gameState === 'REPLAY') {
            const idx = Math.floor(replayIndexRef.current);
            const safeIdx = Math.min(idx, replayHistoryRef.current.length - 1);
            const frame = replayHistoryRef.current[safeIdx];
            if (frame && frame.particles) {
                particlesToRender = frame.particles;
            } else {
                particlesToRender = [];
            }
        }

        for (const p of particlesToRender) {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Render Floating Texts (Coins)
        ctx.font = 'bold 24px "Russo One", sans-serif';
        ctx.textAlign = 'center';
        for (const ft of floatingTextsRef.current) {
            ctx.globalAlpha = Math.max(0, ft.life);
            ctx.fillStyle = 'black';
            ctx.fillText(ft.text, ft.x + 2, ft.y + 2); // Shadow
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.globalAlpha = 1.0;


        // --- REPLAY OVERLAY (VCR EFFECT) ---
        if (gameState === 'REPLAY') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            for (let i = 0; i < height; i += 4) {
                ctx.fillRect(0, i, width, 1);
            }

            ctx.font = '30px "Russo One", monospace';
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.textAlign = 'left';
            ctx.fillText("REC •", 40, 60);
            ctx.font = '20px "Russo One", monospace';
            ctx.fillText("SLOW MOTION", 40, 90);

            ctx.save();
            ctx.translate(width / 2, 50);

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            // ... (replay icon logic kept implicit as it was cut off in previous code but rest is fine)
            ctx.restore();
        }

        // Safety restore if needed
        if (gameState === 'REPLAY') {
            // ...
        }

        // Call updates
        requestRef.current = requestAnimationFrame(update);
    }, [gameState, stadiumConfig, playerConfig, ballConfig, bootsConfig, resetGame]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [update]);

    return <canvas ref={ref => { canvasRef.current = ref; setCanvasRef(ref); }} className="block w-full h-full touch-none" />;
};

export default GameCanvas;

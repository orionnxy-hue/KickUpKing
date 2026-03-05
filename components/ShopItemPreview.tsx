
import React, { useRef, useEffect } from 'react';
import { PlayerSkinConfig, BallSkinConfig, StadiumSkinConfig, BootSkinConfig } from '../types';

interface ShopItemPreviewProps {
  type: 'PLAYER' | 'BALL' | 'STADIUM' | 'BOOTS';
  config: PlayerSkinConfig | BallSkinConfig | StadiumSkinConfig | BootSkinConfig;
}

const ShopItemPreview: React.FC<ShopItemPreviewProps> = ({ type, config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.92;

    if (type === 'STADIUM') {
        const sConfig = config as StadiumSkinConfig;
        
        // Render Mini Background
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, sConfig.skyColorTop);
        grad.addColorStop(0.5, sConfig.skyColorBottom);
        grad.addColorStop(1, sConfig.pitchColorTop);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render Pitch
        ctx.fillStyle = sConfig.pitchColorBottom;
        ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

        // Environment Details
        if (sConfig.environment === 'SAND') {
             ctx.fillStyle = '#fde047'; // Sun
             ctx.beginPath();
             ctx.arc(canvas.width - 40, 40, 20, 0, Math.PI*2);
             ctx.fill();
        } else if (sConfig.environment === 'SNOW') {
             ctx.fillStyle = '#fff';
             ctx.beginPath();
             ctx.arc(30, 30, 3, 0, Math.PI*2);
             ctx.arc(60, 50, 4, 0, Math.PI*2);
             ctx.arc(90, 20, 2, 0, Math.PI*2);
             ctx.fill();
        } else if (sConfig.environment === 'AUTUMN') {
             ctx.fillStyle = '#ea580c';
             ctx.beginPath();
             ctx.arc(40, 40, 6, 0, Math.PI*2);
             ctx.fill();
             ctx.fillStyle = '#ca8a04';
             ctx.beginPath();
             ctx.arc(80, 60, 5, 0, Math.PI*2);
             ctx.fill();
        }

        // Render Stands Mockup
        ctx.save();
        ctx.translate(centerX, canvas.height * 0.5);
        if (sConfig.architecture === 'WALL') {
             // Steep wall style
             for(let i=0; i<5; i++) {
                 ctx.fillStyle = i % 2 === 0 ? sConfig.standColorPrimary : sConfig.standColorSecondary;
                 ctx.fillRect(-100 + (i*5), -50 + (i*10), 200 - (i*10), 20);
             }
        } else if (sConfig.architecture === 'TRAINING') {
             // Simple fence or Trees
             ctx.strokeStyle = '#fff';
             ctx.globalAlpha = 0.5;
             ctx.beginPath();
             ctx.moveTo(-150, 0);
             ctx.lineTo(150, 0);
             for(let i=0; i<10; i++) {
                ctx.moveTo(-140 + i*30, 0);
                ctx.lineTo(-140 + i*30, 40);
             }
             ctx.stroke();
             ctx.globalAlpha = 1;
        } else {
             // Bowl/Classic
             for(let i=0; i<3; i++) {
                 ctx.beginPath();
                 ctx.ellipse(0, i * 20, 140 - i*20, 40, 0, Math.PI, 0);
                 ctx.strokeStyle = i % 2 === 0 ? sConfig.standColorPrimary : sConfig.standColorSecondary;
                 ctx.lineWidth = 15;
                 ctx.stroke();
             }
        }
        ctx.restore();

    } else if (type === 'BOOTS') {
        const bConfig = config as BootSkinConfig;
        
        ctx.save();
        ctx.translate(centerX, centerY - 100);
        const s = 4.0;
        ctx.scale(s, s);

        const drawBoot = (x: number, y: number, isRight: boolean) => {
            ctx.save();
            ctx.translate(x, y);
            if (!isRight) ctx.scale(-1, 1);

            // Glow
            ctx.shadowColor = bConfig.colorPrimary;
            ctx.shadowBlur = 20;

            // Main Shoe
            ctx.fillStyle = bConfig.colorPrimary;
            ctx.beginPath();
            ctx.moveTo(-14, 0); 
            ctx.lineTo(16, 0); 
            ctx.quadraticCurveTo(22, -5, 18, -12);
            ctx.lineTo(-8, -14);
            ctx.lineTo(-14, -8);
            ctx.closePath();
            ctx.fill();

            // Sole
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.roundRect(-14, 0, 34, 4, 2);
            ctx.fill();
            
            // Studs
            ctx.fillStyle = '#ccc';
            ctx.fillRect(-10, 4, 3, 3);
            ctx.fillRect(12, 4, 3, 3);

            // Accent / Laces
            ctx.fillStyle = bConfig.colorSecondary;
            ctx.beginPath();
            ctx.moveTo(-8, -12);
            ctx.lineTo(10, -5);
            ctx.lineTo(8, -2);
            ctx.lineTo(-10, -8);
            ctx.fill();

            // Sparkle
            if (bConfig.trail) {
                ctx.fillStyle = '#fff';
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.arc(5, -10, 2, 0, Math.PI*2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            ctx.restore();
        };

        drawBoot(-20, 0, false);
        drawBoot(20, -10, true);

        ctx.restore();

    } else if (type === 'PLAYER') {
        const pConfig = config as PlayerSkinConfig;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        const s = 2.3; // Significantly increased scale
        ctx.scale(s, s);

        // -- SHADOW --
        ctx.save();
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();
        ctx.restore();

        // Start Body Context
        ctx.save();
        ctx.translate(0, -55); 

        // -- ARMS --
        const drawArm = (shoulderX: number, shoulderY: number, handX: number, handY: number) => {
             // Sleeve
             ctx.strokeStyle = pConfig.colorJersey;
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

             // Arm
             ctx.strokeStyle = pConfig.colorSkin;
             ctx.lineWidth = 10;
             ctx.beginPath();
             ctx.moveTo(shoulderX + Math.cos(angle) * (sleeveLen - 2), shoulderY + Math.sin(angle) * (sleeveLen - 2));
             ctx.lineTo(handX, handY);
             ctx.stroke();

             // Hand
             const handGrad = ctx.createRadialGradient(handX-2, handY-2, 2, handX, handY, 10);
             handGrad.addColorStop(0, '#fff');
             handGrad.addColorStop(1, pConfig.colorSkin);
             ctx.fillStyle = handGrad;
             ctx.beginPath();
             ctx.arc(handX, handY, 8, 0, Math.PI*2);
             ctx.fill();
        };

        // Static pose for shop
        drawArm(-18, -22, -35, 5);
        drawArm(18, -22, 35, 5);

        // -- BODY --
        const bodyW = 40;
        const bodyH = 50;

        const bodyGrad = ctx.createLinearGradient(-20, 0, 20, 0);
        bodyGrad.addColorStop(0, '#000000'); 
        bodyGrad.addColorStop(0.5, pConfig.colorJersey);
        bodyGrad.addColorStop(1, '#000000'); 

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(-bodyW/2, -bodyH/2, bodyW, bodyH, 20);
        ctx.fill();

        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(-10, -25);
        ctx.lineTo(10, -25);
        ctx.lineTo(0, -15);
        ctx.fill();

        // Draw Jersey Number
        const isJerseyLight = pConfig.colorJersey === '#ffffff' || pConfig.colorJersey === '#f8fafc';
        ctx.fillStyle = isJerseyLight ? '#000000' : 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 20px "Russo One", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pConfig.jerseyNumber.toString(), 0, -3);

        ctx.fillStyle = pConfig.colorShorts;
        ctx.beginPath();
        ctx.roundRect(-bodyW/2, 10, bodyW, 15, 10);
        ctx.fill();

        // -- HEAD --
        ctx.translate(0, -45);
        
        // Neck/Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(0, 22, 12, 4, 0, 0, Math.PI*2);
        ctx.fill();

        const headGrad = ctx.createLinearGradient(-20, -20, 20, 20);
        headGrad.addColorStop(0, '#fff'); 
        headGrad.addColorStop(1, pConfig.colorSkin);
        
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.roundRect(-21, -25, 42, 48, 16);
        ctx.fill();

        // Ears
        ctx.fillStyle = pConfig.colorSkin;
        ctx.beginPath();
        ctx.arc(-21, 0, 6, 0, Math.PI*2);
        ctx.arc(21, 0, 6, 0, Math.PI*2);
        ctx.fill();

        // Hair
        ctx.fillStyle = pConfig.colorHair;
        ctx.beginPath();
        
        if (pConfig.hairStyle === 'afro') {
             // Big Afro Style
             ctx.moveTo(-22, 2); 
             ctx.quadraticCurveTo(-32, -10, -32, -25); // Left bulge
             ctx.quadraticCurveTo(-32, -45, 0, -45);   // Top left
             ctx.quadraticCurveTo(32, -45, 32, -25);   // Top right
             ctx.quadraticCurveTo(32, -10, 22, 2);     // Right bulge
             
             // Hairline
             ctx.lineTo(17, 2);
             ctx.lineTo(17, -8);
             ctx.quadraticCurveTo(0, -12, -17, -8);
             ctx.lineTo(-17, 2);
             ctx.lineTo(-22, 2);
        } else if (pConfig.hairStyle === 'curly') {
             // High top curly
             ctx.moveTo(-20, -15);
             // Left side up
             ctx.lineTo(-20, -28);
             // Curls across top
             ctx.bezierCurveTo(-15, -38, -5, -38, 0, -35); // Left bump
             ctx.bezierCurveTo(5, -38, 15, -38, 20, -28); // Right bump
             // Right side down
             ctx.lineTo(20, -15);
             // Sideburns/Forehead
             ctx.lineTo(20, -5);
             ctx.lineTo(17, -5);
             ctx.lineTo(17, -15);
             // Forehead curve
             ctx.quadraticCurveTo(0, -18, -17, -15);
             ctx.lineTo(-17, -5);
             ctx.lineTo(-20, -5);
        } else {
             // Normal - Classic Short Cut
            ctx.moveTo(-21, -8);
            ctx.lineTo(-21, -22);
            // Slightly flatter curve for a more sporty/rookie look
            ctx.quadraticCurveTo(0, -32, 21, -22); 
            ctx.lineTo(21, -8);
            // Sideburns
            ctx.lineTo(17, -8);
            ctx.lineTo(17, -15);
            // Hairline
            ctx.quadraticCurveTo(0, -18, -17, -15);
            ctx.lineTo(-17, -8);
            ctx.lineTo(-21, -8);
        }
        ctx.fill();

        // Sunglasses/Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.rect(-14, -6, 10, 3);
        ctx.rect(4, -6, 10, 3);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-9, 2, 2.5, 0, Math.PI*2);
        ctx.arc(9, 2, 2.5, 0, Math.PI*2);
        ctx.fill();

        // Nose
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.moveTo(-2, 8);
        ctx.lineTo(2, 8);
        ctx.lineTo(0, 11);
        ctx.fill();

        // Smile
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 14, 5, 0.2, Math.PI-0.2);
        ctx.stroke();

        ctx.restore(); // End Body Context
        ctx.restore(); // End Player Context
    } else {
        const bConfig = config as BallSkinConfig;
        
        ctx.save();
        ctx.translate(centerX, canvas.height/2);
        const s = 2.5; // Scale up the ball
        ctx.scale(s, s);

        const radius = 35;
        
        // Shadow
        ctx.save();
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.arc(0, 140, radius, 0, Math.PI*2); // Distant shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();
        ctx.restore();

        // Ball
        ctx.fillStyle = bConfig.colorBase;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = bConfig.colorAccent;
        const drawPentagon = (x: number, y: number, r: number) => {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 72 - 90) * Math.PI / 180;
                ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
            }
            ctx.fill();
        };
        drawPentagon(0, 0, radius * 0.45);
        for(let i=0; i<5; i++) {
            ctx.save();
            ctx.rotate((i * 72) * Math.PI / 180);
            ctx.translate(0, radius * 0.9);
            drawPentagon(0, 0, radius * 0.35);
            ctx.restore();
        }
        
        // Shine
        ctx.beginPath();
        ctx.arc(-10, -10, 10, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fill();
        
        ctx.restore();
    }
  }, [config, type]);

  return <canvas ref={canvasRef} width={300} height={300} className="w-full h-full object-contain mx-auto" />;
};

export default ShopItemPreview;

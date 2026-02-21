
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { ChatUser } from '../types';
import {
  Swords, RotateCcw, Crown, Users, LogOut, Map as MapIcon,
  Zap, User, Clock, ToggleLeft, ToggleRight, Sparkle,
  Package, ShieldAlert, HeartPulse, Flame, Gauge, PlayCircle, Skull, Trash2,
  Settings2, UserMinus, PlusSquare, UserPlus, Trophy, ArrowLeft
} from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface MasaqilWarProps {
  channelConnected: boolean;
  onHome: () => void;
}

type WeaponType = 'SAW' | 'HAMMER' | 'BAT' | 'AXE' | 'SWORD' | 'SPEAR';
type ItemType = 'HEALTH' | 'POWER' | 'SPEED' | 'HAZARD';

interface SupplyItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  radius: number;
  pulse: number;
}

interface Player {
  id: string;
  username: string;
  avatar: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  angle: number;
  weaponType: WeaponType;
  isDead: boolean;
  kills: number;
  damageFlash: number;
  mass: number;
  clashCooldown: number;
  damageMultiplier: number;
  speedMultiplier: number;
  deathTick?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const WEAPON_MAP: Record<string, WeaponType> = {
  'سيف': 'SWORD', 'sword': 'SWORD',
  'منشار': 'SAW', 'saw': 'SAW',
  'مطرقة': 'HAMMER', 'hammer': 'HAMMER',
  'مضرب': 'BAT', 'bat': 'BAT',
  'فأس': 'AXE', 'axe': 'AXE',
  'رمح': 'SPEAR', 'spear': 'SPEAR'
};

const MAPS_CONFIG = {
  BATTLEFIELD: { id: 'BATTLEFIELD', name: 'الميدان النووي', bgColor: '#050507', accentColor: '#1a1a1f', borderColor: '#ff0044' },
  VOLCANO: { id: 'VOLCANO', name: 'فوهة الجحيم', bgColor: '#0f0202', accentColor: '#1f0505', borderColor: '#ff6600' },
  CYBER: { id: 'CYBER', name: 'مفاعل النيون', bgColor: '#010408', accentColor: '#05101a', borderColor: '#00f2ff' }
};

const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 2000;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;
const MAP_BOUNDARY_RADIUS = 1500;

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const MasaqilWar: React.FC<MasaqilWarProps> = ({ channelConnected, onHome }) => {
  const [gameState, setGameState] = useState<'SETUP' | 'LOBBY' | 'BATTLE' | 'WINNER'>('SETUP');
  const [mapStyle, setMapStyle] = useState<keyof typeof MAPS_CONFIG>('BATTLEFIELD');
  const [maxPlayers, setMaxPlayers] = useState(200);
  const [startingHp, setStartingHp] = useState(100);
  const [roundDuration, setRoundDuration] = useState(180);
  const [joinKeyword, setJoinKeyword] = useState('!حرب');
  const [weaponMode, setWeaponMode] = useState<'RANDOM' | 'MANUAL'>('RANDOM');

  const [enableSupplies, setEnableSupplies] = useState(true);
  const [supplyRate, setSupplyRate] = useState(5); // Faster spawns for tiny items
  const [enableHazards, setEnableHazards] = useState(true);

  const [queue, setQueue] = useState<(ChatUser & { chosenWeapon?: WeaponType })[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isZoneShrinking, setIsZoneShrinking] = useState(false);
  const isZoneShrinkingRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playersRef = useRef<Player[]>([]);
  const suppliesRef = useRef<SupplyItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const zoneRef = useRef({ radius: 1000, shrinkage: 0.1 });
  const frameIdRef = useRef<number>(0);
  const imagesCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const shakeRef = useRef(0);
  const lastSupplySpawnRef = useRef(0);
  const battleStartTimeRef = useRef(0);
  const trailsRef = useRef<Record<string, { x: number, y: number }[]>>({});
  const ZONE_DELAY_MS = 40000; // 40 Seconds Delay

  // Preload Queue Refs
  const [preloadCount, setPreloadCount] = useState(0);
  const preloadQueueRef = useRef<Set<string>>(new Set());

  const settingsRef = useRef({ enableSupplies, supplyRate, enableHazards, weaponMode });
  useEffect(() => {
    settingsRef.current = { enableSupplies, supplyRate, enableHazards, weaponMode };
  }, [enableSupplies, supplyRate, enableHazards, weaponMode]);



  // Enhanced Preloader
  const processPreloadQueue = async () => {
    const users = Array.from(preloadQueueRef.current);
    if (users.length === 0) return;

    const user = users[0];
    preloadQueueRef.current.delete(user);

    // If already cached, still tick but skip fetch
    if (imagesCacheRef.current[user]) {
      setPreloadCount(prev => prev + 1);
      setTimeout(processPreloadQueue, 50);
      return;
    }

    try {
      const realAvatar = await chatService.fetchKickAvatar(user as string);
      if (realAvatar) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = realAvatar as string;
        await new Promise((resolve) => {
          img.onload = () => { imagesCacheRef.current[user] = img; resolve(true); };
          img.onerror = () => resolve(false);
        });
      }
    } catch (e) { }

    setPreloadCount(prev => prev + 1);
    setTimeout(processPreloadQueue, 100);
  };

  useEffect(() => {
    if (preloadQueueRef.current.size > 0) processPreloadQueue();
  }, [queue.length]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage(async (msg) => {
      if (gameState === 'LOBBY') {
        const content = msg.content.trim().toLowerCase();
        if (content.startsWith(joinKeyword.toLowerCase())) {
          setQueue(prev => {
            // Precise duplicate check inside functional update
            if (prev.find(p => p.username === msg.user.username)) return prev;
            if (prev.length >= maxPlayers) return prev;

            let chosenWeapon: WeaponType | undefined = undefined;
            if (weaponMode === 'MANUAL') {
              const parts = content.split(' ');
              if (parts.length > 1) {
                const weaponName = parts[1];
                chosenWeapon = WEAPON_MAP[weaponName];
              }
            }

            // Sync actions
            preloadQueueRef.current.add(msg.user.username);

            return [...prev, { ...msg.user, chosenWeapon }];
          });

          // Trigger preload after state update begins
          setTimeout(processPreloadQueue, 0);
        }
      }
    });
    return cleanup;
  }, [channelConnected, gameState, joinKeyword, maxPlayers, weaponMode]);

  const preloadImage = (url: string, key: string) => {
    if (!url || imagesCacheRef.current[key]) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => { imagesCacheRef.current[key] = img; };
  };

  const createParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 18,
        life: 1.0,
        color,
        size: Math.random() * 6 + 2
      });
    }
  };

  const spawnSupply = (forcedType?: ItemType) => {
    const types: ItemType[] = ['HEALTH', 'POWER', 'SPEED'];
    if (settingsRef.current.enableHazards) types.push('HAZARD');

    const type = forcedType || types[Math.floor(Math.random() * types.length)];
    const currentRadius = zoneRef.current.radius * 0.8;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * currentRadius;

    suppliesRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: CENTER_X + Math.cos(angle) * dist,
      y: CENTER_Y + Math.sin(angle) * dist,
      radius: 12, // Slightly more substantial for the cartoon look
      pulse: 0
    });
  };

  const initBattle = () => {
    if (queue.length < 2) return;
    const total = queue.length;
    const playerHealthMultiplier = Math.max(1, 12 / Math.sqrt(total));
    const balancedHp = startingHp * playerHealthMultiplier;
    const maxRadius = 45; // Increased max size
    const minRadius = 15; // Increased min size
    const dynamicRadius = Math.max(minRadius, Math.min(maxRadius, 1000 / Math.sqrt(total + 10)));
    const weaponPool: WeaponType[] = ['SAW', 'HAMMER', 'BAT', 'AXE', 'SWORD', 'SPEAR'];

    playersRef.current = queue.map(user => {
      const weapon = user.chosenWeapon || weaponPool[Math.floor(Math.random() * weaponPool.length)];
      return {
        id: user.username,
        username: user.username,
        avatar: user.avatar || '',
        color: user.color || '#ff0000',
        x: Math.random() * 3000,
        y: Math.random() * 2000,
        vx: (Math.random() - 0.5) * 12, // Faster Movement
        vy: (Math.random() - 0.5) * 12, // Faster Movement
        hp: balancedHp,
        maxHp: balancedHp,
        radius: dynamicRadius,
        angle: Math.random() * Math.PI * 2,
        weaponType: weapon,
        isDead: false,
        kills: 0,
        damageFlash: 0,
        mass: 2.0 + (dynamicRadius / 20),
        clashCooldown: 0,
        damageMultiplier: 1.0,
        speedMultiplier: 1.0,
        deathTick: 0
      };
    });

    zoneRef.current = { radius: 1100, shrinkage: 0.4 };
    setIsZoneShrinking(false);
    isZoneShrinkingRef.current = false;
    suppliesRef.current = [];
    lastSupplySpawnRef.current = Date.now();
    battleStartTimeRef.current = Date.now();
    setGameState('BATTLE');
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    gameLoop();
  };

  const gameLoop = () => {
    updatePhysics();
    draw();
    const alive = playersRef.current.filter(p => !p.isDead);
    if (alive.length === 1 && playersRef.current.length > 1) {
      setWinner(alive[0]);
      setGameState('WINNER');
      return;
    } else if (alive.length === 0 && playersRef.current.length > 0) {
      setGameState('SETUP');
      return;
    }
    frameIdRef.current = requestAnimationFrame(gameLoop);
  };

  const updatePhysics = () => {
    const players = playersRef.current;
    const zone = zoneRef.current;

    // Zone Shrinking Logic (Accelerating)
    if (isZoneShrinkingRef.current && zone.radius > 200) {
      zone.radius -= zone.shrinkage;
      // Accelerate the shrinking speed over time
      zone.shrinkage += 0.001;
    }

    if (shakeRef.current > 0) shakeRef.current -= 0.6;

    if (settingsRef.current.enableSupplies && Date.now() - lastSupplySpawnRef.current > settingsRef.current.supplyRate * 1000) {
      spawnSupply();
      lastSupplySpawnRef.current = Date.now();
    }

    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.025;
      return p.life > 0;
    });

    const currentEffectiveWall = Math.min(MAP_BOUNDARY_RADIUS, zone.radius);

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.isDead) {
        // Animate death
        (p as any).deathTick = ((p as any).deathTick || 0) + 1;
        continue;
      }

      p.x += p.vx * p.speedMultiplier;
      p.y += p.vy * p.speedMultiplier;
      p.angle += (p.weaponType === 'SAW' ? 0.5 : 0.25) * p.speedMultiplier;
      if (p.damageFlash > 0) p.damageFlash--;
      if (p.clashCooldown > 0) p.clashCooldown--;

      // Trails logic - Optimized for first 5 seconds
      const isInitialWarmup = Date.now() - battleStartTimeRef.current < 5000;
      const maxTrailLength = isInitialWarmup ? 3 : 10;
      if (!trailsRef.current[p.id]) trailsRef.current[p.id] = [];
      trailsRef.current[p.id].push({ x: p.x, y: p.y });
      if (trailsRef.current[p.id].length > maxTrailLength) trailsRef.current[p.id].shift();

      suppliesRef.current = suppliesRef.current.filter(item => {
        const dist = Math.hypot(p.x - item.x, p.y - item.y);

        // Magnet Attraction Physics
        if (dist < 350) {
          item.x += (p.x - item.x) * 0.04;
          item.y += (p.y - item.y) * 0.04;
        }

        if (dist < p.radius + item.radius) {
          applyItemEffect(p, item.type);
          createParticles(item.x, item.y, '#ffd700', 15); // Sparks
          createParticles(item.x, item.y, '#00ffff', 10);
          return false;
        }
        return true;
      });

      // Circular Zone Physics (HARD WALL - "The Trap")
      const distFromCenter = Math.hypot(p.x - CENTER_X, p.y - CENTER_Y);
      const distLimit = zone.radius - p.radius;

      if (distFromCenter > distLimit) {
        // Hard Clamp: Force position to be exactly on the edge
        const angleToCenter = Math.atan2(p.y - CENTER_Y, p.x - CENTER_X);
        p.x = CENTER_X + Math.cos(angleToCenter) * distLimit;
        p.y = CENTER_Y + Math.sin(angleToCenter) * distLimit;

        // Bounce Velocity Inward
        const normalX = Math.cos(angleToCenter);
        const normalY = Math.sin(angleToCenter);
        const dot = p.vx * normalX + p.vy * normalY;

        p.vx -= 2 * dot * normalX;
        p.vy -= 2 * dot * normalY;

        // Apply Damping (friction with wall)
        p.vx *= 0.5;
        p.vy *= 0.5;

        // Apply Wall Damage (The Crush)
        triggerWallDamage(p, zone);
      }

      // Rectangular Map Boundaries (Canvas Edges) - Final Fail-safe
      if (p.x + p.radius > CANVAS_WIDTH) { p.x = CANVAS_WIDTH - p.radius; p.vx *= -0.9; }
      else if (p.x - p.radius < 0) { p.x = p.radius; p.vx *= -0.9; }

      if (p.y + p.radius > CANVAS_HEIGHT) { p.y = CANVAS_HEIGHT - p.radius; p.vy *= -0.9; }
      else if (p.y - p.radius < 0) { p.y = p.radius; p.vy *= -0.9; }

      for (let j = i + 1; j < players.length; j++) {
        const p2 = players[j];
        if (p2.isDead) continue;

        const dx = p2.x - p.x;
        const dy = p2.y - p.y;
        const distSq = dx * dx + dy * dy;
        const radSum = p.radius + p2.radius;
        const radSumSq = radSum * radSum;

        if (distSq < radSumSq) {
          const dist = Math.sqrt(distSq);
          const angle = Math.atan2(dy, dx);
          const overlap = radSum - dist;
          const totalMass = p.mass + p2.mass;
          p.x -= Math.cos(angle) * overlap * (p2.mass / totalMass);
          p.y -= Math.sin(angle) * overlap * (p2.mass / totalMass);
          p2.x += Math.cos(angle) * overlap * (p.mass / totalMass);
          p2.y += Math.sin(angle) * overlap * (p.mass / totalMass);
          const nx = dx / dist;
          const ny = dy / dist;
          const pVal = (2 * (p.vx * nx + p.vy * ny - p2.vx * nx - p2.vy * ny)) / (p.mass + p2.mass);
          p.vx = p.vx - pVal * p2.mass * nx;
          p.vy = p.vy - pVal * p2.mass * ny;
          p2.vx = p2.vx + pVal * p.mass * nx;
          p2.vy = p2.vy + pVal * p.mass * ny;
        }

        // Precise Weapon Collision Range
        const getRangeMult = (type: WeaponType) => {
          if (type === 'SPEAR' || type === 'SWORD') return 5.5;
          if (type === 'BAT' || type === 'SAW') return 4.2;
          return 3.5; // Axe/Hammer
        };

        const reach = p.radius * getRangeMult(p.weaponType);
        const reachSq = reach * reach;

        if (distSq < reachSq) {
          const angle = Math.atan2(dy, dx);
          const isInitialWarmup = Date.now() - battleStartTimeRef.current < 5000;
          const particleCountMult = isInitialWarmup ? 0.3 : 1.0;

          if (Math.random() < 0.25 && p.clashCooldown === 0) {
            p.vx -= Math.cos(angle) * 15; p.vy -= Math.sin(angle) * 15;
            p2.vx += Math.cos(angle) * 15; p2.vy += Math.sin(angle) * 15;
            createParticles((p.x + p2.x) / 2, (p.y + p2.y) / 2, '#fff', Math.floor(15 * particleCountMult));
            shakeRef.current = 12;
            p.clashCooldown = 15; p2.clashCooldown = 15;
          }

          if (Math.random() < 0.15) {
            const baseDmgScaling = Math.min(1.0, Math.sqrt(players.length) / 5);
            const d1 = getWeaponDmg(p.weaponType) * p.damageMultiplier * baseDmgScaling;
            const d2 = getWeaponDmg(p2.weaponType) * p2.damageMultiplier * baseDmgScaling;

            p2.hp -= d1; p2.damageFlash = 12;
            p2.vx += Math.cos(angle) * (d1 * 0.5); p2.vy += Math.sin(angle) * (d1 * 0.5);
            createParticles(p2.x, p2.y, p.color, Math.floor(15 * particleCountMult));
            createParticles(p2.x, p2.y, '#fff', Math.floor(5 * particleCountMult));

            p.hp -= d2; p.damageFlash = 12;
            p.vx -= Math.cos(angle) * (d2 * 0.5); p.vy -= Math.sin(angle) * (d2 * 0.5);
            createParticles(p.x, p.y, p2.color, Math.floor(15 * particleCountMult));
            createParticles(p.x, p.y, '#fff', Math.floor(5 * particleCountMult));

            shakeRef.current = 15;
            if (p2.hp <= 0 && !p2.isDead) { p2.isDead = true; p.kills++; p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.2)); }
            if (p.hp <= 0 && !p.isDead) { p.isDead = true; p2.kills++; p2.hp = Math.min(p2.maxHp, p2.hp + (p2.maxHp * 0.2)); }
          }
        }
      }
    }
  };

  const applyItemEffect = (p: Player, type: ItemType) => {
    switch (type) {
      case 'HEALTH': p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.5)); break;
      case 'POWER': p.damageMultiplier = 2.0; setTimeout(() => p.damageMultiplier = 1.0, 10000); break;
      case 'SPEED': p.speedMultiplier = 1.8; setTimeout(() => p.speedMultiplier = 1.0, 8000); break;
      case 'HAZARD': p.hp -= (p.maxHp * 0.3); p.speedMultiplier = 0.5; setTimeout(() => p.speedMultiplier = 1.0, 5000); break;
    }
  };

  const getWeaponDmg = (type: WeaponType) => {
    switch (type) {
      case 'HAMMER': return 40; case 'AXE': return 32; case 'SAW': return 12;
      case 'SWORD': return 28; case 'SPEAR': return 22; case 'BAT': return 18;
      default: return 20;
    }
  };

  const triggerWallDamage = (p: Player, zone: any) => {
    // Damage if outside zone
    p.hp -= 2.0; // Higher damage for zone
    shakeRef.current = Math.max(shakeRef.current, 2);
    createParticles(p.x, p.y, '#ff0000', 2); // Blood/Damage particles

    if (p.hp <= 0) p.isDead = true;
  };

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const configData = MAPS_CONFIG[mapStyle];
    ctx.save();
    if (shakeRef.current > 0) { ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Clear canvas

    // Draw Rectangular Map Background
    ctx.save();

    // Fill Map
    ctx.fillStyle = configData.bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid
    const time = Date.now() * 0.001;
    ctx.strokeStyle = '#ffffff04'; ctx.lineWidth = 1;
    ctx.beginPath();
    const gridSpacing = 120 + Math.sin(time) * 10;
    for (let i = 0; i <= CANVAS_WIDTH; i += gridSpacing) { ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); }
    for (let i = 0; i <= CANVAS_HEIGHT; i += gridSpacing) { ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); }
    ctx.stroke();

    // Map Border (The Zone Wall) - Always Visible
    if (true) {
      ctx.save();

      // Darken Outside Area
      ctx.beginPath();
      ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.arc(CENTER_X, CENTER_Y, zoneRef.current.radius, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fill();

      // The Red Wall
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, zoneRef.current.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 15;
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ff4444';
      ctx.stroke();

      // Warning Stripes on Wall
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, zoneRef.current.radius - 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([40, 40]);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();

    // Draw Trails (Neon Ribbons)
    playersRef.current.forEach(p => {
      if (p.isDead) return;
      const t = trailsRef.current[p.id];
      if (!t || t.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.radius * 0.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.3;
      ctx.shadowBlur = 10; ctx.shadowColor = p.color;
      ctx.moveTo(t[0].x, t[0].y);
      for (let i = 1; i < t.length; i++) ctx.lineTo(t[i].x, t[i].y);
      ctx.stroke();
      ctx.restore();
    });

    suppliesRef.current.forEach(item => {
      item.pulse += 0.05;
      const s = 1 + Math.sin(item.pulse) * 0.2;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(s, s);

      const config = {
        HEALTH: { color: '#2ecc71', icon: '✚', aura: 'rgba(46, 204, 113, 0.3)' },
        POWER: { color: '#e74c3c', icon: '⚡', aura: 'rgba(231, 76, 60, 0.3)' },
        SPEED: { color: '#3498db', icon: '💨', aura: 'rgba(52, 152, 219, 0.3)' },
        HAZARD: { color: '#f1c40f', icon: '⚠️', aura: 'rgba(241, 196, 15, 0.3)' }
      }[item.type];

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(0, 15, item.radius * 1.2, 5, 0, 0, Math.PI * 2); ctx.fill();

      // Aura
      ctx.shadowBlur = 20; ctx.shadowColor = config.color;
      ctx.fillStyle = config.aura;
      ctx.beginPath(); ctx.arc(0, 0, item.radius * 2, 0, Math.PI * 2); ctx.fill();

      // Cartoon Capsule Shape
      ctx.lineWidth = 4; ctx.strokeStyle = '#000'; // Thicker cartoon outlines

      // Glow/Aura beneath
      ctx.shadowBlur = 15; ctx.shadowColor = config.color;

      // Body (Glowy Glass)
      const bodyGrad = ctx.createLinearGradient(0, -item.radius, 0, item.radius);
      bodyGrad.addColorStop(0.2, config.color);
      bodyGrad.addColorStop(0.5, '#fff');
      bodyGrad.addColorStop(0.8, config.color);

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      // Thick rounded capsule
      ctx.roundRect(-item.radius, -item.radius * 1.2, item.radius * 2, item.radius * 2.4, item.radius);
      ctx.fill();
      ctx.stroke();

      // Top Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(-item.radius * 0.3, -item.radius * 0.4, item.radius * 0.15, item.radius * 0.5, 0.3, 0, Math.PI * 2); ctx.fill();

      // Icon
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.font = `bold ${item.radius * 1.4}px Tajawal`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(config.icon, 0, 0);

      ctx.restore();
    });

    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      ctx.shadowBlur = 10; ctx.shadowColor = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;

    const all = playersRef.current.slice().sort((a, b) => a.y - b.y);
    all.forEach(p => {
      // Draw Dead Avatar Effect
      if (p.isDead) {
        if (((p as any).deathTick || 0) < 60) {
          drawDeathVisual(ctx, p);
        }
        return;
      }

      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.angle);

      // Breathing weapon scale
      const weaponPulse = 1.0 + Math.sin(Date.now() * 0.01) * 0.1;
      ctx.scale(weaponPulse, weaponPulse);

      drawWeaponVisual(ctx, p.weaponType, p.radius, p.color, p.damageMultiplier > 1);
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.damageFlash > 0 ? '#fff' : '#0a0a0a'; ctx.fill();
      ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(5, p.radius / 3.5); ctx.stroke();
      ctx.clip();
      const img = imagesCacheRef.current[p.username];
      if (img) ctx.drawImage(img, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
      else {
        ctx.fillStyle = '#fff'; ctx.font = `black ${p.radius}px Tajawal`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.username.charAt(0).toUpperCase(), p.x, p.y);
      }
      ctx.restore();

      // Modern Floating Health Bar & Username
      const bob = Math.sin(Date.now() * 0.005 + p.x) * 3;
      const hpW = Math.max(40, p.radius * 4.5);
      const hpX = p.x - hpW / 2;
      const hpY = p.y - p.radius - 12 + bob;

      // HP Bar Background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(hpX, hpY, hpW, 6, 3);
      ctx.fill();

      // HP Bar Progress
      const hpPercent = Math.max(0, p.hp / p.maxHp);
      const grad = ctx.createLinearGradient(hpX, 0, hpX + hpW, 0);
      grad.addColorStop(0, '#ff4b2b');
      grad.addColorStop(1, '#ff416c');
      if (hpPercent > 0.5) {
        grad.addColorStop(0, '#a8ff78');
        grad.addColorStop(1, '#78ffd6');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(hpX, hpY, hpW * hpPercent, 6, 3);
      ctx.fill();

      // Username Text with Shadow
      ctx.shadowBlur = 4; ctx.shadowColor = '#000';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(10, p.radius * 0.9)}px Tajawal`;
      ctx.textAlign = 'center';
      ctx.fillText(p.username, p.x, hpY - 8);
      ctx.shadowBlur = 0;
    });
    ctx.restore();
  };

  const drawDeathVisual = (ctx: CanvasRenderingContext2D, p: Player) => {
    const img = imagesCacheRef.current[p.username];
    const life = 1.0 - (((p as any).deathTick || 0) / 60);
    if (life <= 0) return;

    const scale = 1.0 + (1.0 - life) * 1.5;
    const alpha = life;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);

    // Draw Avatar
    if (img) {
      ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, -p.radius, -p.radius, p.radius * 2, p.radius * 2);
    } else {
      ctx.fillStyle = p.color;
      ctx.font = '30px Tajawal';
      ctx.fillText("☠️", 0, 0);
    }

    ctx.restore();

    // Draw Floating Skull
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y - (1.0 - life) * 100);
    ctx.font = `bold ${p.radius}px Tajawal`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText("☠️", 0, 0);
    ctx.restore();
  };

  const drawWeaponVisual = (ctx: CanvasRenderingContext2D, type: WeaponType, radius: number, color: string, isPowered: boolean) => {
    ctx.save();

    const glowColor = isPowered ? '#ffeb3b' : color;
    ctx.shadowBlur = isPowered ? 30 : 10;
    ctx.shadowColor = glowColor;

    switch (type) {
      case 'SAW':
        // Detailed Circular Saw
        ctx.translate(radius * 1.5, 0);
        // Spin animation effect implied by rotation in parent
        ctx.beginPath();
        ctx.fillStyle = '#bdc3c7';
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        const teeth = 8;
        for (let i = 0; i < teeth * 2; i++) {
          const angle = (Math.PI * 2 * i) / (teeth * 2);
          const r = i % 2 === 0 ? radius * 2.2 : radius * 1.5;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        const sawGrad = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 2.2);
        sawGrad.addColorStop(0, '#7f8c8d');
        sawGrad.addColorStop(1, '#ecf0f1');
        ctx.fillStyle = sawGrad;
        ctx.fill();
        ctx.stroke();
        // Inner bolt
        ctx.beginPath(); ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2); ctx.fillStyle = '#2c3e50'; ctx.fill();
        break;

      case 'HAMMER':
        // Heavy Warhammer
        ctx.translate(radius * 2, 0);
        // Handle
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-radius * 0.3, -radius * 0.3, radius * 2, radius * 0.6);
        // Head
        const headGrad = ctx.createLinearGradient(radius, -radius * 1.5, radius, radius * 1.5);
        headGrad.addColorStop(0, '#2c3e50');
        headGrad.addColorStop(0.5, '#95a5a6');
        headGrad.addColorStop(1, '#2c3e50');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.moveTo(radius * 1.5, -radius * 1.5);
        ctx.lineTo(radius * 2.5, -radius * 1.5); // Right top
        ctx.lineTo(radius * 2.8, 0); // Point
        ctx.lineTo(radius * 2.5, radius * 1.5); // Right bottom
        ctx.lineTo(radius * 1.5, radius * 1.5); // Left bottom
        ctx.lineTo(radius * 1.2, 0); // Point left
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        break;

      case 'AXE':
        // Double Battle Axe
        ctx.translate(radius * 2, 0);
        // Handle
        ctx.fillStyle = '#795548';
        ctx.fillRect(-radius, -radius * 0.2, radius * 2.5, radius * 0.4);
        // Blades
        const axeGrad = ctx.createLinearGradient(0, -radius * 2, 0, radius * 2);
        axeGrad.addColorStop(0, '#bdc3c7');
        axeGrad.addColorStop(0.5, '#34495e');
        axeGrad.addColorStop(1, '#bdc3c7');
        ctx.fillStyle = axeGrad;
        ctx.beginPath();
        // Right Blade
        ctx.moveTo(radius, -radius * 0.2);
        ctx.quadraticCurveTo(radius * 3, -radius * 2.5, radius * 3, -radius * 0.5);
        ctx.lineTo(radius * 3, radius * 0.5);
        ctx.quadraticCurveTo(radius * 3, radius * 2.5, radius, radius * 0.2);
        // Left Blade
        ctx.moveTo(radius * 0.5, -radius * 0.2);
        ctx.quadraticCurveTo(-radius * 0.5, -radius * 1.5, -radius * 0.5, -radius * 0.3);
        ctx.lineTo(-radius * 0.5, radius * 0.3);
        ctx.quadraticCurveTo(-radius * 0.5, radius * 1.5, radius * 0.5, radius * 0.2);
        ctx.fill();
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2; ctx.stroke();
        break;

      case 'SPEAR':
        // Trident/Spear
        ctx.translate(radius * 2, 0);
        // Shaft
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(-radius * 1, -radius * 0.15, radius * 4, radius * 0.3);
        // Tip
        ctx.beginPath();
        ctx.moveTo(radius * 3, -radius * 0.15);
        ctx.lineTo(radius * 5.5, 0);
        ctx.lineTo(radius * 3, radius * 0.15);
        ctx.lineTo(radius * 2.5, 0);
        ctx.closePath();
        ctx.fillStyle = isPowered ? '#ffeb3b' : '#ecf0f1';
        ctx.fill();
        ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 2; ctx.stroke();
        // Crossguard
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(radius * 2.8, -radius * 0.6, radius * 0.4, radius * 1.2);
        break;

      case 'BAT':
        // Spiked Bat
        ctx.translate(radius * 2, 0);
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.2);
        ctx.lineTo(radius * 4, -radius * 0.5);
        ctx.lineTo(radius * 4, radius * 0.5);
        ctx.lineTo(0, radius * 0.2);
        ctx.closePath();
        ctx.fillStyle = '#8d6e63';
        ctx.fill();
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2; ctx.stroke();
        // Spikes
        ctx.fillStyle = '#bdc3c7';
        for (let j = 1; j < 5; j++) {
          ctx.beginPath();
          const bx = radius * j * 0.8;
          ctx.moveTo(bx, -radius * 0.4); ctx.lineTo(bx + 5, -radius * 0.9); ctx.lineTo(bx + 10, -radius * 0.45);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(bx + 10, radius * 0.4); ctx.lineTo(bx + 15, radius * 0.9); ctx.lineTo(bx + 20, radius * 0.45);
          ctx.fill();
        }
        break;

      case 'SWORD':
        // Broadsword
        ctx.translate(radius * 2, 0);
        // Hilt
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-radius * 0.5, -radius * 0.2, radius * 1.5, radius * 0.4);
        // Guard
        ctx.fillStyle = '#f1c40f'; // Gold guard
        ctx.fillRect(radius, -radius, radius * 0.4, radius * 2);
        // Blade
        const swordGrad = ctx.createLinearGradient(0, 0, radius * 4, 0);
        swordGrad.addColorStop(0, '#95a5a6');
        swordGrad.addColorStop(0.5, '#ecf0f1');
        swordGrad.addColorStop(1, '#95a5a6');
        ctx.fillStyle = swordGrad;
        ctx.beginPath();
        ctx.moveTo(radius * 1.4, -radius * 0.6);
        ctx.lineTo(radius * 6, 0); // Point
        ctx.lineTo(radius * 1.4, radius * 0.6);
        ctx.closePath();
        ctx.fill();
        // Center ridge
        ctx.beginPath(); ctx.moveTo(radius * 1.4, 0); ctx.lineTo(radius * 5.8, 0);
        ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 1; ctx.stroke();
        break;
    }
    ctx.restore();
  };

  const reset = () => {
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    setGameState('SETUP'); setQueue([]); setWinner(null);
  };

  const rematch = () => {
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    setWinner(null);
    initBattle();
  };

  const addFakePlayer = () => {
    if (queue.length >= maxPlayers) return;
    const fakeNames = ["Lion", "Tiger", "Eagle", "Falcon", "Wolf", "Bear", "Shark", "Panther", "Ghost", "Viper"];
    const randomName = "Bot-" + fakeNames[Math.floor(Math.random() * fakeNames.length)] + "-" + Math.floor(Math.random() * 999);

    // Random Weapon
    const weaponPool: WeaponType[] = ['SAW', 'HAMMER', 'BAT', 'AXE', 'SWORD', 'SPEAR'];
    const chosenWeapon = weaponPool[Math.floor(Math.random() * weaponPool.length)];

    const fakeUser = {
      id: "bot-" + Math.random().toString(36).substr(2, 9),
      username: randomName,
      avatar: "",
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      is_mod: false,
      is_sub: false
    };

    setQueue(prev => [...prev, { ...fakeUser, chosenWeapon }]);
  };

  const addBots = () => {
    const botCount = 50;
    const weaponPool: WeaponType[] = ['SAW', 'HAMMER', 'BAT', 'AXE', 'SWORD', 'SPEAR'];
    const fakeNames = ["Lion", "Tiger", "Eagle", "Falcon", "Wolf", "Bear", "Shark", "Panther", "Ghost", "Viper"];

    const newBots: (ChatUser & { chosenWeapon?: WeaponType })[] = Array.from({ length: botCount }).map(() => {
      const randomName = "Bot-" + fakeNames[Math.floor(Math.random() * fakeNames.length)] + "-" + Math.floor(Math.random() * 9999);
      const chosenWeapon = weaponPool[Math.floor(Math.random() * weaponPool.length)];

      return {
        id: "bot-" + Math.random().toString(36).substr(2, 9),
        username: randomName,
        avatar: "", // No avatar for bots to save bandwidth/complexity
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        is_mod: false,
        is_sub: false,
        chosenWeapon
      };
    });

    setQueue(prev => {
      const combined = [...prev, ...newBots];
      return combined.slice(0, maxPlayers);
    });
  };

  const kickPlayer = (username: string) => {
    playersRef.current = playersRef.current.map(p => {
      if (p.username === username && !p.isDead) {
        createParticles(p.x, p.y, '#ff0000', 30);
        shakeRef.current = 20;
        return { ...p, hp: 0, isDead: true };
      }
      return p;
    });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-transparent relative overflow-hidden font-sans">
      <SidebarPortal>
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/5 p-4 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest mb-2">
              <Settings2 size={14} /> التحكم المتقدم
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={reset} className="bg-white/5 hover:bg-white/10 text-white font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border border-white/5 text-[10px]">
                <RotateCcw size={14} className="text-gray-400" /> مسح الكل
              </button>
              <button onClick={onHome} className="bg-red-600/10 hover:bg-red-600/20 text-red-500 font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border border-red-500/20 text-[10px]">
                <LogOut size={14} /> خروج
              </button>
            </div>
            {gameState === 'LOBBY' && (
              <button onClick={addFakePlayer} className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all border border-blue-500/20 text-[10px] mt-2">
                <UserPlus size={14} /> إضافة بوت (Fake Player)
              </button>
            )}
            {gameState === 'BATTLE' && (
              <button onClick={rematch} className="w-full bg-white text-black font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all text-xs border-2 border-white mt-2">
                <RotateCcw size={16} /> إعادة الجولة
              </button>
            )}
          </div>

          {/* Premium Control Center */}
          <div className="bg-black/40 p-4 rounded-3xl border border-white/5 space-y-5 shadow-inner">
            {/* Zone Control - Top Priority */}
            {gameState === 'BATTLE' && (
              <div className="pb-4 mb-4 border-b border-white/10">
                <button
                  onClick={() => {
                    const newVal = !isZoneShrinking;
                    setIsZoneShrinking(newVal);
                    isZoneShrinkingRef.current = newVal;
                  }}
                  className={`w-full py-4 rounded-2xl font-extrabold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] border border-white/20 shadow-lg
                     ${isZoneShrinking ? 'bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.6)]' : 'bg-red-600/10 text-red-500 hover:bg-red-600/20'}`}
                >
                  <ShieldAlert size={16} /> {isZoneShrinking ? 'إيـقـاف الـزون (PAUSE ZONE)' : 'بـدء حـصـار الـزون (START ZONE)'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Package size={14} className="text-yellow-500" /> نزول الإمدادات</span>
              <button
                onClick={() => setEnableSupplies(!enableSupplies)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${enableSupplies ? 'bg-green-600' : 'bg-zinc-700'}`}
              >
                <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${enableSupplies ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-4 pt-1 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-500">خريطة المعركة</span>
                  <span className="text-[10px] text-blue-400 font-black">{MAPS_CONFIG[mapStyle].name}</span>
                </div>
                <button
                  onClick={() => {
                    const maps = Object.keys(MAPS_CONFIG) as (keyof typeof MAPS_CONFIG)[];
                    const idx = maps.indexOf(mapStyle);
                    setMapStyle(maps[(idx + 1) % maps.length]);
                  }}
                  className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-all"
                >
                  <MapIcon size={14} className="text-blue-500" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold text-gray-500">وضع الأسلحة</span>
                  <span className="text-[10px] text-purple-400 font-black">{weaponMode === 'MANUAL' ? 'يدوي' : 'عشوائي'}</span>
                </div>
                <button
                  onClick={() => setWeaponMode(weaponMode === 'MANUAL' ? 'RANDOM' : 'MANUAL')}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${weaponMode === 'MANUAL' ? 'bg-purple-600' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${weaponMode === 'MANUAL' ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 justify-end">الفخاخ <ShieldAlert size={10} className="text-orange-500" /></span>
                  <span className="text-[10px] text-orange-400 font-black">{enableHazards ? 'مفعلة' : 'معطلة'}</span>
                </div>
                <button
                  onClick={() => setEnableHazards(!enableHazards)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${enableHazards ? 'bg-orange-600' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${enableHazards ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase"><span>سرعة نزول اللوت</span> <span className="text-yellow-500">{supplyRate}s</span></div>
                <input type="range" min="5" max="60" step="5" value={supplyRate} onChange={e => setSupplyRate(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none accent-yellow-500 cursor-pointer" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
              <button onClick={() => spawnSupply('HEALTH')} className="flex flex-col items-center justify-center gap-1 p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-2xl text-[9px] text-green-500 font-black transition-all hover:scale-105 active:scale-95 shadow-md"><HeartPulse size={16} /> إسعاف </button>
              <button onClick={() => spawnSupply('POWER')} className="flex flex-col items-center justify-center gap-1 p-3 bg-red-500/10 hover:bg-red-600/20 border border-red-500/30 rounded-2xl text-[9px] text-red-500 font-black transition-all hover:scale-105 active:scale-95 shadow-md"><Zap size={16} /> طاقة </button>
              <button onClick={() => spawnSupply('SPEED')} className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-2xl text-[9px] text-blue-500 font-black transition-all hover:scale-105 active:scale-95 shadow-md"><Gauge size={16} /> سرعة </button>
              <button onClick={() => spawnSupply('HAZARD')} className="flex flex-col items-center justify-center gap-1 p-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-2xl text-[9px] text-yellow-500 font-black transition-all hover:scale-105 active:scale-95 shadow-md"><Skull size={16} /> فخ </button>
            </div>

            {gameState === 'BATTLE' && (
              <div className="space-y-2 w-full">
                <button
                  onClick={() => {
                    playersRef.current.forEach(p => {
                      if (!p.isDead) {
                        p.damageMultiplier = 3.0;
                        p.speedMultiplier = 2.0;
                        createParticles(p.x, p.y, '#ffd700', 20);
                      }
                    });
                    shakeRef.current = 30;
                  }}
                  className="w-full py-4 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 rounded-2xl text-orange-500 font-extrabold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <Flame size={16} /> تفعيل وضع الجنون (Chaos Mode)
                </button>
              </div>
            )}
          </div>

          {(gameState === 'BATTLE' || gameState === 'LOBBY') && (
            <div className="bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[280px]">
              <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Users size={12} className="text-blue-500" /> المحاربون في الميدان</span>
                <span className="text-red-500 font-mono text-[10px] font-bold">{gameState === 'BATTLE' ? playersRef.current.filter(p => !p.isDead).length : queue.length} حي</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                {(gameState === 'LOBBY' ? queue : playersRef.current).map((p, i) => {
                  const isDead = (p as Player).isDead;
                  return (
                    <div key={i} className={`flex justify-between items-center p-2 rounded-2xl text-[10px] font-bold transition-all border ${isDead ? 'opacity-20 grayscale bg-red-900/10 border-transparent' : 'bg-white/5 border-white/5 hover:border-white/10 group'}`}>
                      <div className="flex items-center gap-2">
                        <ProAvatar
                          url={imagesCacheRef.current[p.username] ? imagesCacheRef.current[p.username].src : (p.avatar || '')}
                          username={p.username}
                          size="w-6 h-6"
                        />
                        <span className="text-gray-300 truncate max-w-[90px]">{p.username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {gameState === 'BATTLE' ? (
                          <>
                            <span className="text-red-500 font-black">{(p as Player).kills}☠️</span>
                            {!isDead && (
                              <button
                                onClick={() => kickPlayer(p.username)}
                                className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                title="طرد من الميدان"
                              >
                                <UserMinus size={12} />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[8px] text-gray-600 font-black">{(p as any).chosenWeapon || 'RANDOM'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative z-10 overflow-y-auto">
        {gameState === 'SETUP' && (
          <div className="w-full max-w-5xl bg-[#0a0a0c]/95 backdrop-blur-3xl border border-white/10 rounded-[4rem] p-10 shadow-2xl animate-in zoom-in duration-500">
            <div className="text-center mb-10">
              <Swords size={90} className="text-red-600 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-float" />
              <h1 className="text-7xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">ملحمة المصاقيل 2.0</h1>
              <p className="text-gray-500 font-black tracking-[0.6em] text-[11px] uppercase italic opacity-60">Professional Battle Engine & Real-time Admin</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapIcon size={14} className="text-red-500" /> اختيار البيئة</label>
                {Object.values(MAPS_CONFIG).map(m => (
                  <button key={m.id} onClick={() => setMapStyle(m.id as any)} className={`w-full p-6 rounded-[2.5rem] border-2 transition-all text-right flex items-center justify-between group overflow-hidden ${mapStyle === m.id ? 'border-red-600 bg-red-600/10 shadow-[0_0_20px_rgba(255,0,0,0.2)]' : 'border-white/5 bg-black/40 hover:border-white/10'}`}>
                    <div><div className={`text-xl font-black ${mapStyle === m.id ? 'text-white' : 'text-gray-500'}`}>{m.name}</div><div className="text-[10px] text-gray-600 font-bold uppercase">Arena Mode</div></div>
                    {mapStyle === m.id && <Zap size={22} className="text-red-600 animate-pulse" />}
                  </button>
                ))}
              </div>

              <div className="space-y-6 bg-black/40 p-8 rounded-[3.5rem] border border-white/5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-gray-400 mb-3 uppercase"><span>مدة الجولة</span> <span className="text-blue-500 font-mono">{roundDuration}s</span></div>
                    <input type="range" min="30" max="600" step="30" value={roundDuration} onChange={e => setRoundDuration(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none accent-blue-600 cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-gray-400 mb-3 uppercase"><span>الصحة الأساسية</span> <span className="text-green-500 font-mono">{startingHp} HP</span></div>
                    <input type="range" min="50" max="500" step="50" value={startingHp} onChange={e => setStartingHp(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none accent-green-600 cursor-pointer" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">نظام الأسلحة</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setWeaponMode('MANUAL')} className={`py-4 rounded-3xl text-xs font-black transition-all border-2 ${weaponMode === 'MANUAL' ? 'bg-red-600 text-white border-red-500 shadow-lg' : 'bg-white/5 border-transparent text-gray-500'}`}>مخصص من الشات</button>
                    <button onClick={() => setWeaponMode('RANDOM')} className={`py-4 rounded-3xl text-xs font-black transition-all border-2 ${weaponMode === 'RANDOM' ? 'bg-red-600 text-white border-red-500 shadow-lg' : 'bg-white/5 border-transparent text-gray-500'}`}>عشوائي للجميع</button>
                  </div>
                </div>

                <div className="relative">
                  <input type="text" value={joinKeyword} onChange={e => setJoinKeyword(e.target.value)} className="w-full bg-black border-2 border-white/5 rounded-3xl p-5 text-white font-black text-2xl text-center focus:border-red-600 transition-all outline-none shadow-2xl" placeholder="كلمة الدخول" />
                  <div className="absolute -top-3 left-6 bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase italic">Command</div>
                </div>

                <button onClick={() => setGameState('LOBBY')} className="w-full bg-red-600 text-white font-black py-6 rounded-[2.5rem] text-3xl shadow-[0_20px_50px_rgba(220,38,38,0.4)] hover:scale-[1.03] active:scale-95 transition-all italic border-t-2 border-white/20">فـتـح بـاب الـقـتـال</button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'LOBBY' && (
          <div className="text-center animate-in fade-in duration-1000 w-full max-w-6xl py-10 px-4">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-red-600/30 blur-[120px] rounded-full animate-pulse"></div>
              <Users size={140} className="text-white relative drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
              <div className="absolute -bottom-4 -right-4 bg-red-600 text-white font-black px-8 py-3 rounded-[2rem] border-[8px] border-[#050507] text-4xl shadow-2xl">{queue.length}</div>
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter mb-8 uppercase leading-none drop-shadow-[0_10px_40px_rgba(0,0,0,1)]">في انتظار المقاتلين...</h1>

            <div className="flex flex-col items-center bg-white/5 border border-white/10 backdrop-blur-3xl px-10 md:px-20 py-10 rounded-[4rem] shadow-2xl relative overflow-hidden mb-12">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>

              <div className="flex flex-col gap-6 items-center">
                <p className="text-3xl md:text-4xl text-gray-400 font-bold uppercase tracking-widest">اكتب في الشات للانضمام:</p>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-black/80 px-12 py-5 rounded-[2.5rem] border-2 border-red-600 shadow-[0_0_50px_rgba(255,0,0,0.4)] animate-glow">
                    <span className="text-5xl md:text-7xl font-black text-red-500 italic tracking-tighter font-mono">{joinKeyword}</span>
                  </div>
                  {weaponMode === 'MANUAL' && (
                    <div className="text-3xl md:text-5xl font-black text-gray-500 italic"> + [اسم السلاح]</div>
                  )}
                </div>
              </div>

              {weaponMode === 'MANUAL' && (
                <div className="mt-10 pt-8 border-t border-white/5 w-full">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-[0.5em] mb-6">قائمة الأسلحة المتاحة</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {Object.keys(WEAPON_MAP).filter(k => k !== k.toUpperCase()).map(w => (
                      <span key={w} className="bg-red-600/10 px-6 py-2 rounded-2xl border border-red-600/30 text-red-500 font-black text-sm uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all cursor-default">{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={addBots} className="px-8 py-6 rounded-[2.5rem] bg-blue-600/20 text-blue-500 font-black hover:bg-blue-600/40 hover:text-white transition-all text-xl border border-blue-500/20 flex flex-col items-center justify-center leading-none gap-2">
                <span>+50</span>
                <span className="text-sm">BOTS</span>
              </button>
              <button onClick={reset} className="px-12 py-6 bg-white/5 text-gray-500 font-black text-2xl rounded-[2.5rem] hover:bg-white/10 border border-white/10 transition-all italic">تراجع</button>
              <button onClick={initBattle} disabled={queue.length < 2} className="px-20 py-7 bg-red-600 text-white font-black text-4xl md:text-5xl rounded-[3rem] shadow-[0_25px_60px_rgba(220,38,38,0.5)] hover:scale-105 active:scale-95 disabled:opacity-10 transition-all italic border-t-2 border-white/20 flex items-center gap-6"><PlayCircle size={48} /> بـدء الـمـعـركة</button>
            </div>
          </div>
        )}

        {(gameState === 'BATTLE' || gameState === 'WINNER') && (
          <div className="relative w-full h-full max-w-[1250px] max-h-[850px] aspect-[3/2] rounded-[4.5rem] overflow-hidden border-[20px] border-[#16161a] shadow-2xl bg-black animate-in zoom-in duration-500">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain" />

            {gameState === 'WINNER' && winner && (
              <div className="absolute inset-0 bg-[#050507]/98 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in zoom-in duration-1000 p-10 overflow-hidden">
                {/* Dynamic God Rays Background */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] bg-[conic-gradient(from_0deg,transparent,rgba(255,215,0,0.15)_20deg,transparent_40deg)] animate-[spin_30s_linear_infinite]" />
                </div>

                {/* Celebration Aura */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.1),transparent_70%)] animate-pulse" />

                {/* Floating Trophy Icon */}
                <div className="relative mb-12 animate-bounce">
                  <Trophy size={160} className="text-[#FFD700] drop-shadow-[0_0_60px_rgba(255,215,0,0.6)]" fill="currentColor" />
                  <Crown size={80} className="text-white absolute -top-12 left-1/2 -translate-x-1/2 drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" fill="currentColor" />
                </div>

                <div className="relative z-10 text-center flex flex-col items-center">
                  <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-[0.4em] mb-12 bg-gradient-to-r from-yellow-300 via-white to-yellow-300 bg-clip-text text-transparent drop-shadow-lg">
                    Ultimate Champion
                  </h2>

                  <div className="relative mb-16 group">
                    {/* Outer Glows */}
                    <div className="absolute inset-0 bg-yellow-400/20 blur-[130px] rounded-full scale-150 animate-pulse"></div>

                    {/* The Winner Card */}
                    <div className="relative w-80 h-80 md:w-[28rem] md:h-[28rem] rounded-[6rem] overflow-hidden shadow-[0_0_120px_rgba(255,215,0,0.4)] bg-zinc-900 ring-8 ring-black/50">
                      <ProAvatar
                        url={imagesCacheRef.current[winner.username] ? imagesCacheRef.current[winner.username].src : (winner.avatar || '')}
                        username={winner.username}
                        size="w-full h-full"
                      />
                    </div>

                    {/* Inner Badge */}
                    <div className="absolute bottom-0 w-full py-6 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center">
                      <div className="bg-[#FFD700] text-black font-black py-2 px-10 skew-x-[-12deg] text-3xl uppercase tracking-[0.2em] italic mb-2 shadow-xl">Survivor</div>
                    </div>
                  </div>

                  {/* Kills Badge - Pop out effect */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-red-600 px-14 py-6 rounded-[2.5rem] text-white font-black text-4xl italic shadow-[0_20px_50px_rgba(220,38,38,0.7)] border-4 border-white flex items-center gap-4 animate-in zoom-in duration-500 delay-500">
                    <Skull size={40} className="animate-pulse" /> {winner.kills} قتيل
                  </div>
                </div>

                <h3 className="text-8xl md:text-[11rem] font-black italic text-white tracking-tighter mb-16 uppercase drop-shadow-[0_30px_60px_rgba(0,0,0,1)] bg-clip-text text-transparent bg-gradient-to-b from-white via-yellow-100 to-gray-400 leading-none animate-shimmer">
                  {winner.username}
                </h3>

                {/* Professional Action Buttons */}
                <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                  <button
                    onClick={reset}
                    className="group px-16 py-8 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white font-black text-3xl rounded-[3rem] border-2 border-white/5 transition-all italic flex items-center gap-4 shadow-2xl"
                  >
                    <ArrowLeft size={30} className="group-hover:-translate-x-3 transition-transform" /> جولة جديدة
                  </button>
                  <button
                    onClick={rematch}
                    className="px-32 py-9 bg-gradient-to-br from-red-500 to-red-700 text-white font-black text-5xl rounded-[3.5rem] shadow-[0_30px_70px_rgba(220,38,38,0.5)] hover:scale-110 active:scale-95 transition-all italic border-t-2 border-white/30 flex items-center gap-6 group"
                  >
                    <RotateCcw size={48} className="group-hover:rotate-180 transition-transform duration-700" /> إعادة التحدي
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Custom Premium Animations
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .animate-shimmer {
    background-size: 200% auto;
    animation: shimmer 6s linear infinite;
  }
`;
if (typeof document !== 'undefined') document.head.appendChild(style);

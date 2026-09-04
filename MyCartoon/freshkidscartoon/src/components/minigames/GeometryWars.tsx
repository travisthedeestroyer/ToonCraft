import React, { useEffect, useRef } from 'react';

const COLORS = {
  bg: '#00010a',
  player: '#00eeff',
  playerGlow: '#00aacc',
  bullet: '#ffe060',
  bulletGlow: '#ff9900',
  wanderer: '#ff00cc',
  seeker: '#ff2222',
  spinner: '#00ff88',
  damage: '#ff0033',
};

export const GeometryWars: React.FC<{ onScore: (p: number) => void }> = ({ onScore }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScoreRef = useRef(onScore);

  useEffect(() => {
    onScoreRef.current = onScore;
  }, [onScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // --- Game State ---
    const keys: { [key: string]: boolean } = {};
    let mouseX = width / 2;
    let mouseY = height / 2;
    let isMouseDown = false;
    let isTouch = false;

    let score = 0;
    let multiplier = 1;
    let multiplierTimer = 0;

    let screenShake = 0;
    let chromatic = 0;
    let gridPulse = 0;

    // --- Classes ---

    class Ripple {
      x: number; y: number; r: number; maxR: number; color: string; life: number;
      constructor(x: number, y: number, color: string) {
        this.x = x; this.y = y; this.r = 5;
        this.maxR = 70 + Math.random() * 40;
        this.color = color; this.life = 1;
      }
      update() { this.r += 4; this.life = 1 - this.r / this.maxR; }
      draw() {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life * 0.55;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 14;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    class Player {
      x = width / 2;
      y = height / 2;
      vx = 0;
      vy = 0;
      size = 12;
      speed = 0.5;
      friction = 0.85;
      lastShot = 0;
      fireRate = 100;

      update() {
        let ax = 0, ay = 0;
        if (keys['w'] || keys['arrowup']) ay -= this.speed;
        if (keys['s'] || keys['arrowdown']) ay += this.speed;
        if (keys['a'] || keys['arrowleft']) ax -= this.speed;
        if (keys['d'] || keys['arrowright']) ax += this.speed;

        if (isTouch && keys['touch']) {
          const dx = mouseX - this.x, dy = mouseY - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) { ax = (dx / dist) * this.speed; ay = (dy / dist) * this.speed; }
        }

        this.vx = (this.vx + ax) * this.friction;
        this.vy = (this.vy + ay) * this.friction;
        this.x = Math.max(this.size, Math.min(width - this.size, this.x + this.vx));
        this.y = Math.max(this.size, Math.min(height - this.size, this.y + this.vy));

        const now = Date.now();
        if ((isMouseDown || isTouch) && now - this.lastShot > this.fireRate) {
          let targetX = mouseX, targetY = mouseY;
          if (isTouch && enemies.length > 0) {
            let nearest = enemies[0], minDist = Infinity;
            for (const e of enemies) {
              const d = Math.hypot(e.x - this.x, e.y - this.y);
              if (d < minDist) { minDist = d; nearest = e; }
            }
            targetX = nearest.x; targetY = nearest.y;
          }
          const dx = targetX - this.x, dy = targetY - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            const angle = Math.atan2(dy, dx);
            bullets.push(new Bullet(this.x, this.y, angle));
            this.vx -= Math.cos(angle) * 2;
            this.vy -= Math.sin(angle) * 2;
            this.lastShot = now;
          }
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(mouseY - this.y, mouseX - this.x));

        // Engine glow
        const eng = ctx.createRadialGradient(-8, 0, 0, -8, 0, 16);
        eng.addColorStop(0, 'rgba(0,238,255,0.35)');
        eng.addColorStop(1, 'transparent');
        ctx.fillStyle = eng;
        ctx.beginPath(); ctx.arc(-8, 0, 16, 0, Math.PI * 2); ctx.fill();

        ctx.shadowBlur = 20;
        ctx.shadowColor = COLORS.player;
        ctx.strokeStyle = COLORS.player;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.stroke();

        // Cockpit dot
        ctx.fillStyle = COLORS.player;
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(5, 0, 2.5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
      }
    }

    class Bullet {
      x: number; y: number;
      vx: number; vy: number;
      speed = 15;
      life = 100;
      trail: { x: number; y: number }[] = [];

      constructor(x: number, y: number, angle: number) {
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
      }

      update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.shift();
        this.x += this.vx; this.y += this.vy;
        this.life--;
      }

      draw() {
        for (let i = 0; i < this.trail.length; i++) {
          const t = i / this.trail.length;
          ctx.globalAlpha = t * 0.55;
          ctx.fillStyle = COLORS.bulletGlow;
          ctx.beginPath();
          ctx.arc(this.trail[i].x, this.trail[i].y, 2 * t, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 14;
        ctx.shadowColor = COLORS.bullet;
        ctx.fillStyle = COLORS.bullet;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    class Enemy {
      x: number; y: number;
      size: number; color: string;
      type: 'wanderer' | 'seeker' | 'spinner';
      hp: number; hpMax: number;
      angle = 0; speed: number;
      vx = 0; vy = 0;
      rotSpeed: number;

      constructor(x: number, y: number, type: 'wanderer' | 'seeker' | 'spinner') {
        this.x = x; this.y = y; this.type = type;
        if (type === 'wanderer') {
          this.size = 13; this.color = COLORS.wanderer; this.hp = 1; this.hpMax = 1;
          this.speed = 2; this.rotSpeed = 0.05;
          const a = Math.random() * Math.PI * 2;
          this.vx = Math.cos(a) * this.speed; this.vy = Math.sin(a) * this.speed;
        } else if (type === 'seeker') {
          this.size = 10; this.color = COLORS.seeker; this.hp = 1; this.hpMax = 1;
          this.speed = 3.5; this.rotSpeed = 0.1;
        } else {
          this.size = 15; this.color = COLORS.spinner; this.hp = 3; this.hpMax = 3;
          this.speed = 1.5; this.rotSpeed = 0.18;
        }
      }

      update(player: Player) {
        if (this.type === 'wanderer') {
          this.x += this.vx; this.y += this.vy;
          if (this.x < 0 || this.x > width) this.vx *= -1;
          if (this.y < 0 || this.y > height) this.vy *= -1;
        } else {
          const dx = player.x - this.x, dy = player.y - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
          if (this.type === 'seeker') this.angle = Math.atan2(dy, dx);
        }
        if (this.type !== 'seeker') this.angle += this.rotSpeed;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 18;
        ctx.shadowColor = this.color;

        const s = this.size;
        ctx.beginPath();
        if (this.type === 'wanderer') {
          // Double diamond
          ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath();
          const si = s * 0.5;
          ctx.moveTo(0, -si); ctx.lineTo(si, 0); ctx.lineTo(0, si); ctx.lineTo(-si, 0); ctx.closePath();
        } else if (this.type === 'seeker') {
          ctx.moveTo(s, 0); ctx.lineTo(-s, s * 0.8); ctx.lineTo(-s * 0.4, 0); ctx.lineTo(-s, -s * 0.8); ctx.closePath();
        } else {
          // Diamond with cross
          ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath();
          ctx.moveTo(-s * 0.5, -s * 0.5); ctx.lineTo(s * 0.5, s * 0.5);
          ctx.moveTo(s * 0.5, -s * 0.5); ctx.lineTo(-s * 0.5, s * 0.5);
        }
        ctx.stroke();

        // HP pips for spinner
        if (this.type === 'spinner' && this.hp < this.hpMax) {
          ctx.shadowBlur = 0;
          for (let i = 0; i < this.hpMax; i++) {
            ctx.fillStyle = i < this.hp ? this.color : 'rgba(0,255,136,0.15)';
            ctx.beginPath();
            ctx.arc((i - (this.hpMax - 1) / 2) * 10, s + 8, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }
    }

    class Particle {
      x: number; y: number; vx: number; vy: number;
      life = 1; decay: number; color: string; size: number;

      constructor(x: number, y: number, color: string) {
        this.x = x; this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 1;
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
        this.color = color;
        this.decay = Math.random() * 0.02 + 0.018;
        this.size = Math.random() * 2.5 + 1;
      }

      update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.94; this.vy *= 0.94;
        this.life -= this.decay;
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.shadowBlur = 8; ctx.shadowColor = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }

    class FloatingText {
      x: number; y: number; text: string; color: string; life = 1;

      constructor(x: number, y: number, text: string, color: string) {
        this.x = x; this.y = y; this.text = text; this.color = color;
      }

      update() { this.y -= 1.2; this.life -= 0.02; }

      draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }

    const player = new Player();
    let bullets: Bullet[] = [];
    let enemies: Enemy[] = [];
    let particles: Particle[] = [];
    let floatingTexts: FloatingText[] = [];
    let ripples: Ripple[] = [];

    // --- Input ---
    const handleKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left; mouseY = e.clientY - rect.top;
    };
    const handleMouseDown = () => { isMouseDown = true; };
    const handleMouseUp = () => { isMouseDown = false; };
    const handleTouchStart = (e: TouchEvent) => {
      isTouch = true; keys['touch'] = true;
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left; mouseY = e.touches[0].clientY - rect.top;
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left; mouseY = e.touches[0].clientY - rect.top;
    };
    const handleTouchEnd = () => { keys['touch'] = false; isTouch = false; };
    const handleResize = () => { width = canvas.width = canvas.offsetWidth; height = canvas.height = canvas.offsetHeight; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', handleResize);

    // --- Game Logic ---
    const explosion = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
      ripples.push(new Ripple(x, y, color));
      gridPulse = Math.min(gridPulse + 0.5, 2);
    };

    const spawnEnemy = () => {
      if (enemies.length > 30) return;
      let x: number, y: number;
      if (Math.random() < 0.5) { x = Math.random() < 0.5 ? -30 : width + 30; y = Math.random() * height; }
      else { x = Math.random() * width; y = Math.random() < 0.5 ? -30 : height + 30; }
      const r = Math.random();
      const type: 'wanderer' | 'seeker' | 'spinner' = r > 0.8 ? 'spinner' : r > 0.4 ? 'seeker' : 'wanderer';
      enemies.push(new Enemy(x, y, type));
    };

    let spawnTimer = 0;

    const update = () => {
      player.update();

      if (multiplierTimer > 0) { multiplierTimer--; if (multiplierTimer <= 0) multiplier = 1; }

      spawnTimer++;
      if (spawnTimer > 60 - Math.min(score / 100, 40)) { spawnEnemy(); spawnTimer = 0; }

      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        const b = bullets[i];
        if (b.life <= 0 || b.x < 0 || b.x > width || b.y < 0 || b.y > height) bullets.splice(i, 1);
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update(player);

        // Player collision
        if (Math.hypot(player.x - e.x, player.y - e.y) < player.size + e.size) {
          explosion(player.x, player.y, COLORS.damage, 35);
          screenShake = 15; chromatic = 14;
          multiplier = 1; multiplierTimer = 0;
          onScoreRef.current(-20);
          floatingTexts.push(new FloatingText(player.x, player.y - 20, '-20', COLORS.damage));
          enemies.splice(i, 1);
          continue;
        }

        // Bullet collision
        let killed = false;
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.size + 5) {
            e.hp--;
            explosion(b.x, b.y, '#ffffff', 5);
            bullets.splice(j, 1);
            if (e.hp <= 0) {
              explosion(e.x, e.y, e.color, 22);
              const pts = (e.type === 'spinner' ? 15 : e.type === 'seeker' ? 10 : 5) * multiplier;
              score += pts;
              onScoreRef.current(pts);
              floatingTexts.push(new FloatingText(e.x, e.y, `+${pts}`, e.color));
              multiplier = Math.min(multiplier + 1, 10);
              multiplierTimer = 300;
              enemies.splice(i, 1);
              killed = true;
            }
            break;
          }
        }
        if (killed) continue;
      }

      for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(); if (particles[i].life <= 0) particles.splice(i, 1); }
      for (let i = floatingTexts.length - 1; i >= 0; i--) { floatingTexts[i].update(); if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1); }
      for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].update(); if (ripples[i].life <= 0) ripples.splice(i, 1); }

      if (screenShake > 0) screenShake *= 0.88;
      if (chromatic > 0) chromatic *= 0.85;
    };

    // --- Rendering ---
    const drawGrid = () => {
      const gSize = 50;
      const pulse = gridPulse;
      ctx.strokeStyle = `rgba(10,22,40,${0.35 + pulse * 0.4})`;
      ctx.lineWidth = 1;
      const ox = (player.x / width) * 15;
      const oy = (player.y / height) * 15;
      ctx.beginPath();
      for (let x = -gSize; x < width + gSize; x += gSize) { ctx.moveTo(x - ox, 0); ctx.lineTo(x - ox, height); }
      for (let y = -gSize; y < height + gSize; y += gSize) { ctx.moveTo(0, y - oy); ctx.lineTo(width, y - oy); }
      ctx.stroke();

      if (pulse > 0.3) {
        ctx.fillStyle = `rgba(0,238,255,${pulse * 0.06})`;
        for (let x = -gSize; x < width + gSize; x += gSize) {
          for (let y = -gSize; y < height + gSize; y += gSize) {
            ctx.beginPath(); ctx.arc(x - ox, y - oy, 2, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      gridPulse *= 0.93;
    };

    const draw = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0,1,10,0.28)';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      if (screenShake > 0.5) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      drawGrid();
      ctx.globalCompositeOperation = 'lighter';

      ripples.forEach(r => r.draw());
      particles.forEach(p => p.draw());
      bullets.forEach(b => b.draw());
      enemies.forEach(e => e.draw());
      player.draw();

      ctx.globalCompositeOperation = 'source-over';
      floatingTexts.forEach(ft => ft.draw());

      // Chromatic aberration on damage
      if (chromatic > 1) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = chromatic * 0.03;
        ctx.fillStyle = COLORS.damage;
        ctx.fillRect(chromatic, 0, width, height);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-chromatic, 0, width, height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // Edge vignette
      const vg = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.max(width, height) * 0.75);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, 'rgba(0,0,5,0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, width, height);

      // Multiplier UI
      if (multiplier > 1) {
        ctx.fillStyle = `rgba(255,215,0,${multiplierTimer / 300})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffd700';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${multiplier}x MULTIPLIER`, 20, 40);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-auto bg-slate-950 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute bottom-4 left-0 right-0 text-center text-cyan-500/50 text-xs sm:text-sm pointer-events-none font-bold tracking-widest uppercase bg-black/30 px-4 py-1 rounded-full w-max mx-auto">
        WASD to move · Mouse to aim/shoot
      </div>
    </div>
  );
};

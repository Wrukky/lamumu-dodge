// ---------- CONFIG & STATE ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W = window.innerWidth, H = window.innerHeight;
canvas.width = W; canvas.height = H;

let playerImg = null;
let playerName = null;

// Character selection with music start
document.querySelectorAll('#characterSelect img').forEach(img => {
  img.addEventListener('click', () => {
    state.playerImage = img.dataset.name;

    // Play music inside the click handler so browser allows it
    const music = document.getElementById("bgMusic");
    music.volume = 0.5;
    music.play().catch(err => console.log("Music blocked:", err));

    startGame();
    document.getElementById('startScreen').style.display = 'none';
  });
});

const state = {
  player: { x: W/2, y: H - 120, size: 150, speed: 5, lives: 6, shield: false },
  bullets: [],
  bombs: [],
  stars: [],
  shields: [], // falling shield pickups
  score: 0,
  running: false,
  gradientT: 0,
  intervals: [],
};

// ---------- HELPERS ----------
function rand(min,max){ return Math.random()*(max-min)+min }
function clearIntervals(){ state.intervals.forEach(id => clearInterval(id)); state.intervals = [] }
function resizeCanvas(){
  W = window.innerWidth; H = window.innerHeight; canvas.width=W; canvas.height=H;
  if(!state.running) state.player.x = W/2, state.player.y = H - 120;
}
window.addEventListener('resize', resizeCanvas);

// ---------- CHARACTER SELECTION ----------
document.querySelectorAll('#characterSelect img').forEach(img=>{
  img.addEventListener('click', ()=> {
    const src = img.src;
    playerImg = new Image();
    playerImg.src = src;
    playerName = img.dataset.name || src;
    playerImg.onload = startGame;
    // small UX feedback
    document.getElementById('startScreen').style.display = 'none';
  });
});

// ---------- CONTROLS ----------
const keys = {};
document.addEventListener('keydown', e=> {
  keys[e.key] = true;
  if(e.key === ' ') shoot();
  if(e.key === 'Shift') boost = true;
});
document.addEventListener('keyup', e=> { keys[e.key] = false; if(e.key === 'Shift') boost=false; });

let leftTouch=false, rightTouch=false, boost=false;
document.getElementById('leftBtn').addEventListener('touchstart', e=>{ leftTouch=true; e.preventDefault() });
document.getElementById('leftBtn').addEventListener('touchend', e=>{ leftTouch=false; e.preventDefault() });
document.getElementById('rightBtn').addEventListener('touchstart', e=>{ rightTouch=true; e.preventDefault() });
document.getElementById('rightBtn').addEventListener('touchend', e=>{ rightTouch=false; e.preventDefault() });
document.getElementById('shootBtn').addEventListener('touchstart', e=>{ shoot(); e.preventDefault() });
document.getElementById('boostTouchBtn').addEventListener('touchstart', e=>{ boost=true; e.preventDefault() });
document.getElementById('boostTouchBtn').addEventListener('touchend', e=>{ boost=false; e.preventDefault() });

// HUD buttons (shield button is informational only — shield comes from pickups)
document.getElementById('boostBtn').addEventListener('click', ()=> { boost=true; setTimeout(()=>boost=false, 800) });

// Restart button
document.getElementById('restartBtn').addEventListener('click', ()=> {
  document.getElementById('gameOver').style.display = 'none';
  document.getElementById('startScreen').style.display = 'flex';
  resetState();
});

// ---------- GAME ACTIONS ----------
function shoot(){
  if(!state.running) return;
  state.bullets.push({ x: state.player.x, y: state.player.y - state.player.size/2, r:6, speed: 10 });
}

function spawnLoop(){
  // bombs, stars, and shield pickups spawn periodically
  state.intervals.push(setInterval(()=> {
    if(!state.running) return;
    state.bombs.push({ x: rand(30, W-30), y: -30, r: 20, speed: rand(3.1, 5.2) });
  }, 300));
  state.intervals.push(setInterval(()=> {
    if(!state.running) return;
    state.stars.push({ x: rand(30, W-30), y: -30, r: 20, speed: rand(2.6, 4.0) });
  }, 700));
  state.intervals.push(setInterval(()=> {
    if(!state.running) return;
    // shield pickup is rarer
    if(Math.random() < 0.35) state.shields.push({ x: rand(90, W-90), y: -30, r: 55, speed: rand(2.6, 3.0) });
  }, 1000));
}

// ---------- GAME LOOP ----------
function startGame(){
  // reset state
  state.player.x = W/2; state.player.y = H - 120; state.player.lives = 6; state.player.shield = false;
  state.bullets = []; state.bombs = []; state.stars = []; state.shields = []; state.score=0;
  state.running = true;
  clearIntervals();
  spawnLoop();
  updateHUD();
  requestAnimationFrame(tick);


    // Start music
    const music = document.getElementById("bgMusic");
    music.volume = 0.5; // volume between 0.0 - 1.0
    music.play().catch(() => {
        console.log("Music playback will start after user interaction.");
    });

    // reset state
  state.player.x = W / 2;
  state.player.y = H - 120;
  state.player.lives = 6;
  state.player.shield = false;
  state.bullets = [];
  state.bombs = [];
  state.stars = [];
  state.shields = [];
  state.score = 0;
  state.running = true;


}



function resetState(){
  state.running = false;
  clearIntervals();
  playerImg = null;
  playerName = null;
  // reset HUD text
  document.getElementById('score').innerText = 'Stars: 0';
  document.getElementById('lives').innerText = 'Lives: 6';
}

function tick(ts){
  if(!state.running) return;
  // moving gradient
  state.gradientT += 0.008;
  drawBackground();

  // update player movement (keyboard + touch)
  const speed = boost ? state.player.speed*1.8 : state.player.speed;
  if(keys['ArrowLeft'] || keys['a'] || leftTouch) state.player.x -= speed;
  if(keys['ArrowRight'] || keys['d'] || rightTouch) state.player.x += speed;
  if(keys['ArrowUp'] || keys['w']) state.player.y -= speed;
  if(keys['ArrowDown'] || keys['s']) state.player.y += speed;
  // clamp
  state.player.x = Math.max(state.player.size/2, Math.min(W - state.player.size/2, state.player.x));
  state.player.y = Math.max(state.player.size/2, Math.min(H - state.player.size/2, state.player.y));

  // draw player with pulsing + shadow
  drawPlayer(ts);

  // bullets
  for(let i = state.bullets.length-1; i>=0; --i){
    const b = state.bullets[i];
    b.y -= b.speed;
    circle(b.x,b.y,b.r, 'rgba(255,230,100,0.95)');
    if(b.y < -20) state.bullets.splice(i,1);
  }

  // load the bomb image
const bombImg = new Image();
bombImg.src = 'bomb.png'; // make sure bomb.png is in the same folder as your HTML

// bombs (danger)
for (let i = state.bombs.length - 1; i >= 0; --i) {
    const bm = state.bombs[i];
    bm.y += bm.speed;

    // draw bomb image instead of a red circle
    ctx.drawImage(
        bombImg,
        bm.x - bm.r,
        bm.y - bm.r,
        bm.r * 3,
        bm.r * 3
    );

    // if off screen, remove
    if (bm.y - bm.r > H) state.bombs.splice(i, 1);

    // bullet collisions -> destroy
    for(let j = state.bullets.length-1; j>=0; --j){
      const bl = state.bullets[j];
      if(dist(bm.x,bm.y,bl.x,bl.y) < bm.r + bl.r){
        state.bullets.splice(j,1); state.bombs.splice(i,1);
        state.score += 0; // bombs don't give points (stars do)
        updateHUD();
        break;
      }
    }
    // collision with player
    if(dist(bm.x,bm.y,state.player.x,state.player.y) < bm.r + state.player.size*0.45){
      state.bombs.splice(i,1);
      if(!state.player.shield){
        state.player.lives--;
        updateHUD();
        if(state.player.lives <= 0) return gameOver();
      } else {
        // shield blocks it; keep shield active until timeout (or you can make it drop)
      }
    }
    if(bm.y > H + 40) state.bombs.splice(i,1);
  }

  // stars (points)
  for(let i = state.stars.length-1; i>=0; --i){
    const s = state.stars[i];
    s.y += s.speed;
    // draw star as small rotated square/star-ish
    drawStar(s.x, s.y, s.r, 'gold');
    if(dist(s.x,s.y,state.player.x,state.player.y) < s.r + state.player.size*0.45){
      state.stars.splice(i,1);
      state.score++;
      updateHUD();
    }
    if(s.y > H + 40) state.stars.splice(i,1);
  }

 // Load shield image once
const shieldImg = new Image();
shieldImg.src = "shield-removebg-preview.png";

// shields pickups (falling)
for (let i = state.shields.length - 1; i >= 0; --i) {
    const sh = state.shields[i];
    sh.y += sh.speed;

    // Draw shield image instead of circle
    ctx.drawImage(shieldImg, sh.x - sh.r, sh.y - sh.r, sh.r * 2, sh.r * 2);

    // Collision with player
    if (dist(sh.x, sh.y, state.player.x, state.player.y) < sh.r + state.player.size * 0.45) {
        state.shields.splice(i, 1);
        activateShield();
    }

    // Remove if off-screen
    if (sh.y > H + 40) {
        state.shields.splice(i, 1);
    }
}

  // draw HUD text on canvas? We'll update HTML HUD separately
  requestAnimationFrame(tick);
}

// ---------- DRAW HELPERS ----------
function drawBackground(){
  const t = state.gradientT;
  const h1 = (t*60)%360, h2 = (t*60+140)%360;
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0, `hsl(${h1} 65% 40%)`);
  g.addColorStop(1, `hsl(${h2} 65% 25%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);
}

function drawPlayer(ts){
  // pulsing scale
  const pulse = 1 + 0.06*Math.sin(ts/180);
  const size = state.player.size * pulse;
  // shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  if(playerImg){
    ctx.drawImage(playerImg, state.player.x - size/2, state.player.y - size/2, size, size);
  } else {
    circle(state.player.x, state.player.y, size/2, '#66f0ff');
  }
  ctx.restore();

  // shield visual (ring)
  if(state.player.shield){
    ctx.save();
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, size*0.5, 0, Math.PI*2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(241, 226, 13, 0.87)';
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(179, 179, 8, 0.6)';
    ctx.stroke();
    ctx.restore();
  }
}

function circle(x,y,r,fill){
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle = fill; ctx.fill();
}
function dist(x1,y1,x2,y2){ return Math.hypot(x2-x1,y2-y1) }

function drawStar(x,y,r,fill){
  // simple 5-point star by drawing a rotated polygon
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate((Date.now()%360)/360 * Math.PI*2 * 0.03);
  ctx.beginPath();
  for(let i=0;i<5;i++){
    ctx.lineTo(Math.cos((18+72*i)/180*Math.PI)*r, -Math.sin((18+72*i)/180*Math.PI)*r);
    ctx.lineTo(Math.cos((54+72*i)/180*Math.PI)*r*0.5, -Math.sin((54+72*i)/180*Math.PI)*r*0.5);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

// ---------- POWERUPS & HUD ----------
function activateShield(){
  state.player.shield = true;
  document.getElementById('status').innerText = 'Shield ON';
  setTimeout(()=> {
    state.player.shield = false;
    document.getElementById('status').innerText = '';
  }, 5000);
}

function updateHUD(){
  document.getElementById('score').innerText = `Stars: ${state.score}`;
  document.getElementById('lives').innerText = `Lives: ${state.player.lives}`;
}

// ---------- GAME OVER ----------
function gameOver(){
  state.running = false;
  clearIntervals();
  document.getElementById('gameOver').style.display = 'flex';
  document.getElementById('finalScore').innerText = `You collected ${state.score} stars.`;
  

    // Stop music
    const music = document.getElementById("bgMusic");
    music.pause();
    music.currentTime = 0;
}

// ---------- INIT ----------
function init(){
  // a tiny startup bounce: show start screen
  resizeCanvas();
  // make shield button visually reactive (it's not used to grant shield)
  const shieldBtn = document.getElementById('shieldBtn');
  shieldBtn.innerText = '🛡';
  shieldBtn.title = 'Pick up shield falling from above to gain protection';
  // allow clicking HUD boost to trigger small boost
  document.getElementById('boostBtn').addEventListener('mousedown', ()=>{ boost=true; setTimeout(()=>boost=false,600) });

  // make sure startScreen remains if images fail to load — add fallback
  document.querySelectorAll('#characterSelect img').forEach(img=>{
    img.onerror = ()=> { img.style.opacity = 0.5; img.title = 'Missing image (replace file)'; }
  });

  // prevent scrolling on mobile when touching controls
  window.addEventListener('touchmove', function(e){
    if(e.target.closest('#mobileControls')) e.preventDefault();
  }, { passive:false });
}


init();

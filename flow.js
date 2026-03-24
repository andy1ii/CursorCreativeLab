// --- FLOW MODE VARIABLES ---
let flowMaskPixels = [];
let particles = [];
let flowLogoScale = 1;
let flowZOff = 0;
let flowColors;
let flowPg; 

// Base background color and individual line colors
let flowBgColor = '#080C22'; 
let flowColor1 = '#0033aa';
let flowColor2 = '#0077ff'; 
let flowColor3 = '#00ddff';
let flowColor4 = '#ff6600';

let flowCurveScale = 0.0015;
let flowSpeedMult = 1.0;

function setupFlow() {
  if (!flowPg) {
    flowPg = createGraphics(width, height);
    flowPg.pixelDensity(1); 
  }

  updateFlowColors();
  processFlowMask();
  initParticles();
}

function updateFlowColors() {
  flowColors = [color(flowColor1), color(flowColor2), color(flowColor3), color(flowColor4)];
}

function windowResizedFlow() {
  if (flowPg) flowPg.resizeCanvas(width, height);
  processFlowMask();
  initParticles();
  needsClear = true; 
}

function processFlowMask() {
  let baseScale = min(width / logoImg.width, height / logoImg.height) * 0.55;
  let minScale = 280 / max(logoImg.width, 1);
  flowLogoScale = max(baseScale, minScale);

  let hrW = floor(logoImg.width * flowLogoScale);
  let hrH = floor(logoImg.height * flowLogoScale);
  let hrX = floor((width - hrW) / 2);
  let hrY = floor((height - hrH) / 2);

  let totalPixels = width * height;
  flowMaskPixels = new Uint8Array(totalPixels);

  if (isWholePageMode) {
    for (let i = 0; i < totalPixels; i++) {
        flowMaskPixels[i] = 1;
    }
  } else {
    flowPg.clear();
    flowPg.background(0);
    flowPg.image(logoImg, hrX, hrY, hrW, hrH);
    flowPg.loadPixels();

    for (let i = 0; i < totalPixels; i++) {
        flowMaskPixels[i] = flowPg.pixels[i * 4] > 128 ? 1 : 0;
    }
  }
}

function initParticles() {
  particles = [];
  let numParticles = isWholePageMode ? 12000 : 6000; 
  for (let i = 0; i < numParticles; i++) {
    particles.push(spawnParticle(true)); 
  }
}

function spawnParticle(randomizeLife = false) {
  let x, y, tries = 0;
  
  if (isWholePageMode) {
    x = random(width);
    y = random(height);
  } else {
    do {
        x = random(width);
        y = random(height);
        tries++;
    } while (flowMaskPixels[floor(x) + floor(y) * width] === 0 && tries < 100);
  }

  let isThick = random(1) > 0.9;
  let maxL = isWholePageMode ? random(400, 1200) : random(300, 800); 
  let mSpeed = (isThick ? random(1.0, 2.0) : random(2.0, 4.0)) * flowSpeedMult;

  let scl = flowCurveScale / flowLogoScale; 
  let angle = noise(x * scl, y * scl, flowZOff) * TWO_PI * 2.5;
  let startVel = p5.Vector.fromAngle(angle).mult(mSpeed);

  return {
    pos: createVector(x, y),
    prev: createVector(x, y),
    vel: startVel, 
    c: random(flowColors),
    w: isThick ? random(1.5, 3.0) : random(0.2, 1.0), 
    maxSpeed: mSpeed,
    life: randomizeLife ? random(0, maxL) : maxL, 
    maxLife: maxL
  };
}

function drawFlow() {
  if (needsClear) {
    background(flowBgColor); 
    initParticles(); 
    needsClear = false;
  }

  // Handle the fading trail effect by grabbing the user's background color 
  // and applying an alpha/opacity of 15 to it.
  push();
  noStroke();
  let bgC = color(flowBgColor);
  fill(red(bgC), green(bgC), blue(bgC), 15); 
  rectMode(CORNER);
  rect(0, 0, width, height);
  pop();

  flowZOff += 0.002; 
  let scl = flowCurveScale / flowLogoScale; 

  for (let p of particles) {
    let angle = noise(p.pos.x * scl, p.pos.y * scl, flowZOff) * TWO_PI * 2.5;
    
    let dir = p5.Vector.fromAngle(angle);
    p.vel.lerp(dir, 0.08); 
    p.vel.limit(p.maxSpeed);

    p.prev.x = p.pos.x;
    p.prev.y = p.pos.y;

    p.pos.add(p.vel);
    p.life--;

    let safeX = constrain(floor(p.pos.x), 0, width - 1);
    let safeY = constrain(floor(p.pos.y), 0, height - 1);
    let isOutsideMask = flowMaskPixels[safeX + safeY * width] === 0;

    if (p.life <= 0 || isOutsideMask) {
      Object.assign(p, spawnParticle(false));
    } else {
      stroke(p.c);
      strokeWeight(p.w);
      line(p.prev.x, p.prev.y, p.pos.x, p.pos.y);
    }
  }
}
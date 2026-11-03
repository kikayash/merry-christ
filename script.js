"use strict";

/* ============================================================
   CONFIG — edit the text here, no need to touch anything else
   ============================================================ */
const CONFIG = {
  friendName: "Jeje",
  fromName: "Kkn",
  musicFile: "always.mp3",
  photo: "",
  message: [
    "Thank you for being such a bright little light in my year: for the laughs, the random chats, and all the moments that made my days better.",
    "I hope this Christmas wraps you in warmth, good food, and everything that makes you smile.",
    "HUWAAAAA, SEMOGA LANCARR DI TAIWAN. hope we grow into better people in the year ahead. xoxo"
  ],
  secret: "Psst… you found the secret star!",
  ornamentsNeeded: 5,
  gameGoal: 8,
  gameSeconds: 30
};

/* ============================================================
   Helpers
   ============================================================ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const GIFT_COLORS = [["#8f78ff", "#ffd36b"], ["#6aa4ff", "#fff4e0"], ["#ff8fb1", "#fff4e0"], ["#ffd36b", "#8f78ff"], ["#b9a6ff", "#ff8fb1"]];

// Fill in the friend's name everywhere
document.title = "A Christmas Surprise for " + CONFIG.friendName;
$$("[data-name]").forEach(el => (el.textContent = CONFIG.friendName));
$$("[data-santa]").forEach(el => (el.textContent = "Ho ho ho! Merry Christmas, " + CONFIG.friendName + "!"));

// Twinkling stars
(function makeStars() {
  const box = $("#stars");
  const n = reduced ? 24 : 48;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    const size = rand(1.5, 3.2);
    s.style.cssText = `left:${rand(0, 100)}%;top:${rand(0, 62)}%;width:${size}px;height:${size}px;animation-delay:${rand(0, 4)}s;animation-duration:${rand(2.5, 5)}s`;
    box.appendChild(s);
  }
})();

// Little sparkle burst at screen coordinates
function burst(x, y, n = 14) {
  const colors = ["#ffd36b", "#ff9ab8", "#a9c4ff", "#c4b5ff", "#fff4e0"];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "spark";
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.background = colors[i % colors.length];
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = rand(30, 90);
    const anim = s.animate(
      [
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 }
      ],
      { duration: rand(550, 950), easing: "cubic-bezier(.2,.7,.3,1)" }
    );
    anim.onfinish = () => s.remove();
  }
}

/* ============================================================
   Sound: music-box melody (or your own file) + small effects
   ============================================================ */
const Sound = (() => {
  let ctx = null, master, musicGain, sfxGain;
  let timer = null, step = 0, nextTime = 0, on = true, started = false, audioEl = null;

  // Am – F – C – G, gentle arpeggios
  const CHORDS = [
    [220, 261.63, 329.63, 440],
    [174.61, 220, 261.63, 349.23],
    [261.63, 329.63, 392, 523.25],
    [196, 246.94, 293.66, 392]
  ];
  const PATTERN = [0, 2, 1, 3, 2, 3, 1, 2];
  const STEP = 60 / 70 / 2;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = on ? 1 : 0;
    master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.2; musicGain.connect(master);
    sfxGain = ctx.createGain();   sfxGain.gain.value = 0.55;   sfxGain.connect(master);
    // soft echo for the cozy feel
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.34;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    musicGain.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master);
    return ctx;
  }
  function resumeCtx() { if (ctx && ctx.state === "suspended") ctx.resume(); }

  function bell(freq, t, vol, dur) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    const g = ctx.createGain(), g2 = ctx.createGain();
    o.type = "sine"; o2.type = "triangle";
    o.frequency.value = freq; o2.frequency.value = freq * 2;
    g2.gain.value = 0.22;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(musicGain);
    o.start(t); o2.start(t);
    o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function playStep(n, t) {
    const chord = CHORDS[Math.floor(n / 8) % CHORDS.length];
    const i = n % 8;
    bell(chord[PATTERN[i]], t, 0.42, 1.6);
    if (i === 0) bell(chord[0] / 2, t, 0.5, 2.4);
    if ((i === 3 || i === 6) && Math.random() < 0.35) bell(chord[(Math.random() * 4) | 0] * 2, t + 0.05, 0.16, 1.4);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.35) { playStep(step, nextTime); nextTime += STEP; step++; }
  }
  function startSynth() {
    if (!ctx || timer) return;
    step = 0; nextTime = ctx.currentTime + 0.15;
    schedule();
    timer = setInterval(schedule, 120);
  }

  // Must be called from a tap/click (browsers block autoplay)
  function start() {
    ensure(); resumeCtx();
    if (started) return;
    started = true;
    if (CONFIG.musicFile) {
      audioEl = new Audio(CONFIG.musicFile);
      audioEl.loop = true; audioEl.volume = 0.55;
      audioEl.addEventListener("error", () => { audioEl = null; startSynth(); }, { once: true });
      if (on) audioEl.play().catch(() => {});
    } else {
      startSynth();
    }
  }
  function toggle() {
    on = !on;
    if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
    if (audioEl) { on ? audioEl.play().catch(() => {}) : audioEl.pause(); }
    return on;
  }

  function tone(freq, t, dur, type, vol, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const FX = {
    pop:   t => tone(520, t, 0.12, "sine", 0.5, 900),
    soft:  t => tone(330, t, 0.2, "sine", 0.3, 240),
    catch: t => tone(700, t, 0.1, "triangle", 0.35, 1100),
    piyo:  t => { tone(1300, t, 0.1, "sine", 0.35, 1900); tone(1750, t + 0.13, 0.13, "sine", 0.35, 1350); },
    chime: t => [784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.09, 0.55, "triangle", 0.3)),
    win:   t => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.1, 0.6, "triangle", 0.3))
  };
  function sfx(name) {
    if (!on || !ensure()) return;
    resumeCtx();
    if (FX[name]) FX[name](ctx.currentTime + 0.01);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (ctx) ctx.suspend(); if (audioEl) audioEl.pause(); }
    else if (on) { if (ctx) ctx.resume(); if (audioEl) audioEl.play().catch(() => {}); }
  });

  return { start, toggle, sfx };
})();

const soundBtn = $("#soundBtn");
soundBtn.addEventListener("click", () => {
  const on = Sound.toggle();
  soundBtn.classList.toggle("off", !on);
  soundBtn.setAttribute("aria-pressed", String(on));
  soundBtn.setAttribute("aria-label", on ? "Turn music off" : "Turn music on");
});

/* ============================================================
   Falling snow that reacts to your finger / cursor (wind)
   ============================================================ */
const Snow = (() => {
  const cv = $("#snow"), c = cv.getContext("2d");
  const root = document.documentElement;
  let w = 0, h = 0, flakes = [], wind = 0, windT = 0, lastX = null, lean = 0, last = performance.now();

  const make = init => ({
    x: rand(0, w), y: init ? rand(0, h) : rand(-30, -5),
    r: rand(1.2, 3.6), v: rand(16, 42), ph: rand(0, 6.28), sp: rand(0.6, 1.6), a: rand(0.45, 0.95)
  });
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = reduced ? 35 : clamp(Math.round((w * h) / 8500), 45, 150);
    while (flakes.length < n) flakes.push(make(true));
    flakes.length = n;
  }
  function gust(v) { windT = clamp(windT + v, -220, 220); }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    windT -= windT * Math.min(1, dt * 1.1);
    wind += (windT - wind) * Math.min(1, dt * 3.5);
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#e6eeff";
    for (const f of flakes) {
      f.ph += dt * f.sp;
      f.y += (f.v + f.r * 6) * dt;
      f.x += (Math.sin(f.ph) * 14 + wind * (f.r / 3)) * dt;
      if (f.y > h + 10) Object.assign(f, make(false));
      if (f.x < -10) f.x = w + 10;
      if (f.x > w + 10) f.x = -10;
      c.globalAlpha = f.a;
      c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
    // the tree leans with the wind
    const l = clamp(wind / 45, -4.5, 4.5);
    if (Math.abs(l - lean) > 0.04) { lean = l; root.style.setProperty("--lean", l.toFixed(2) + "deg"); }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointerdown", e => { lastX = e.clientX; }, { passive: true });
  window.addEventListener("pointermove", e => {
    if (lastX !== null) gust(clamp((e.clientX - lastX) * 0.9, -30, 30));
    lastX = e.clientX;
  }, { passive: true });
  ["pointerup", "pointercancel"].forEach(t => window.addEventListener(t, () => { lastX = null; }, { passive: true }));

  resize();
  requestAnimationFrame(frame);
  return { gust };
})();

/* ============================================================
   Screens, toast, guide (Piyo's speech bubble)
   ============================================================ */
function show(id) {
  $$(".screen").forEach(s => {
    const on = s.id === id;
    s.classList.toggle("active", on);
    s.setAttribute("aria-hidden", String(!on));
    s.inert = !on;
  });
}

const Toast = (() => {
  const el = $("#toast");
  let t;
  function hide() { el.classList.remove("show"); }
  el.addEventListener("click", hide);
  return { show(text, ms = 5500) { el.textContent = text; el.classList.add("show"); clearTimeout(t); t = setTimeout(hide, ms); } };
})();

const Guide = {
  el: $("#bubble"), txt: $("#bubbleText"),
  say(msg) {
    this.txt.textContent = msg;
    this.el.classList.remove("pop"); void this.el.offsetWidth; this.el.classList.add("pop");
  }
};

// Piyo di klik:
const CHICK_LINES = [
  "Piyo!",
  "Hehe, that tickles!",
  "Psst… I heard the star on top has a secret. Try tapping it!",
  "You're doing great, " + CONFIG.friendName + "!",
  "Piyo piyo~ Santa is watching!",
  "Did someone say snacks? Piyo?"
];
let chickCount = 0;
document.addEventListener("click", e => {
  const el = e.target.closest("[data-chick]");
  if (!el) return;
  el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop");
  Sound.sfx("piyo");
  if ($("#decorate").classList.contains("active")) Guide.say(CHICK_LINES[chickCount++ % CHICK_LINES.length]);
});
document.addEventListener("keydown", e => {   // keyboard support for the non-button chick
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('[data-chick][role="button"]')) { e.preventDefault(); e.target.click(); }
});

/* ============================================================
   Santa flies across the screen and drops gifts
   ============================================================ */
const Santa = (() => {
  const el = $("#santa");
  let dropTimer = null;

  function drop() {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width * 0.22, y = r.top + r.height * 0.7;
    if (x < 10 || x > window.innerWidth - 36) return;
    const [c, rb] = GIFT_COLORS[(Math.random() * GIFT_COLORS.length) | 0];
    const g = document.createElement("div");
    g.className = "gift drop";
    g.style.cssText = `--g:26px;--c:${c};--r:${rb};left:${x}px;top:${y}px`;
    g.innerHTML = "<i></i>";
    document.body.appendChild(g);
    const dist = Math.max(80, window.innerHeight * 0.9 - y), rot = rand(-120, 120);
    const a = g.animate(
      [
        { transform: "translateY(0) rotate(0deg)", opacity: 1 },
        { transform: `translateY(${dist}px) rotate(${rot}deg)`, opacity: 1, offset: 0.85 },
        { transform: `translateY(${dist}px) rotate(${rot}deg)`, opacity: 0 }
      ],
      { duration: 1800, easing: "cubic-bezier(.5,0,.9,.6)" }
    );
    a.onfinish = () => g.remove();
  }

  function fly(onDone) {
    el.classList.remove("fly"); void el.offsetWidth; el.classList.add("fly");
    Sound.sfx("chime");
    dropTimer = setInterval(drop, 1000);
    const end = e => {
      if (e.target !== el) return;
      el.removeEventListener("animationend", end);
      el.classList.remove("fly");
      clearInterval(dropTimer);
      if (onDone) onDone();
    };
    el.addEventListener("animationend", end);
  }
  function reset() { clearInterval(dropTimer); el.classList.remove("fly"); }
  return { fly, reset };
})();

/* ============================================================
   Decorate the tree
   ============================================================ */
const ORN = {
  ballPurple: `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="17" y="2" width="6" height="5" rx="1.5" fill="#e7c76a"/><circle cx="20" cy="23" r="15" fill="#9b7bff"/><path d="M9 23a11 11 0 0 1 11-11" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M10 28c4 5 14 6 20 0" stroke="#4a3a9a" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  ballBlue:   `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="17" y="2" width="6" height="5" rx="1.5" fill="#e7c76a"/><circle cx="20" cy="23" r="15" fill="#7fb2ff"/><path d="M9 23a11 11 0 0 1 11-11" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M10 28c4 5 14 6 20 0" stroke="#2b5fb0" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  star:       `<svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="20,3 25,15 38,16 28,25 31,38 20,31 9,38 12,25 2,16 15,15" fill="#ffd36b" stroke="#ffb445" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  bow:        `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 20L5 9Q2 20 5 31Z" fill="#ff9ab8"/><path d="M20 20L35 9Q38 20 35 31Z" fill="#ff9ab8"/><path d="M17 24L12 38M23 24L28 38" stroke="#ff6f9c" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="20" r="5" fill="#ff6f9c"/></svg>`,
  light:      `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="16" y="2" width="8" height="8" rx="2" fill="#8a7fb8"/><ellipse cx="20" cy="23" rx="9" ry="13" fill="#ffe27a"/><ellipse cx="17" cy="18" rx="2.5" ry="4.5" fill="#fff" opacity=".65"/></svg>`,
  chick:      `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#chick"/></svg>`
};
const ORN_LABEL = { ballPurple: "purple ball", ballBlue: "blue ball", star: "star", bow: "bow", light: "fairy light", chick: "tiny chick" };

const Decor = (() => {
  const wrap = $("#treeWrap"), layer = $("#ornLayer"), tray = $("#tray"), dots = $$("#dots span");
  const scene = $("#decorate"), lightBtn = $("#lightBtn"), playBtn = $("#playBtn");
  const trayBody = $("#trayBody"), waitMsg = $("#waitMsg"), star = $("#treeStar");
  let placed = 0, lit = false, starTaps = 0, hintTimer = null, spots = [];

  // Tree geometry (SVG units: 300 x 400)
  const halfW = y => Math.max(6, (y - 60) * 0.37 - 10);
  const treeClamp = (x, y) => { y = clamp(y, 92, 304); const hw = halfW(y); return { x: clamp(x, 150 - hw, 150 + hw), y }; };
  function randomSpot() {
    for (let i = 0; i < 12; i++) {
      const y = rand(96, 300), x = 150 + rand(-halfW(y), halfW(y));
      if (spots.every(s => Math.hypot(s.x - x, s.y - y) > 26)) return { x, y };
    }
    return { x: 150 + rand(-30, 30), y: rand(110, 290) };
  }

  // Build the twinkle lights on the tree (hidden until lit)
  (function buildBulbs() {
    const g = $("#bulbs");
    const rows = [{ y: 100, n: 3, h: 16 }, { y: 148, n: 4, h: 22 }, { y: 200, n: 5, h: 46 }, { y: 252, n: 6, h: 50 }, { y: 298, n: 7, h: 76 }];
    const cols = ["#ffd36b", "#ff9ab8", "#8fd0ff", "#c4b5ff"];
    let k = 0;
    rows.forEach(r => {
      for (let i = 0; i < r.n; i++) {
        const t = r.n === 1 ? 0.5 : i / (r.n - 1);
        const x = 150 + r.h * (2 * t - 1), y = r.y + Math.sin(t * Math.PI) * 9, col = cols[k % cols.length];
        const b = document.createElementNS("http://www.w3.org/2000/svg", "g");
        b.setAttribute("class", "bulb");
        b.setAttribute("style", `--d:${((k * 0.37) % 1.8).toFixed(2)}s`);
        b.innerHTML = `<circle cx="${x}" cy="${y}" r="9" fill="${col}" opacity=".28"/><circle cx="${x}" cy="${y}" r="3.6" fill="${col}"/>`;
        g.appendChild(b); k++;
      }
    });
  })();

  // Build the ornament tray
  Object.keys(ORN).forEach(type => {
    const b = document.createElement("button");
    b.className = "tray-item"; b.type = "button"; b.dataset.type = type;
    b.setAttribute("aria-label", "Add a " + ORN_LABEL[type] + " to the tree");
    b.innerHTML = ORN[type];
    tray.appendChild(b);
  });

  function place(type, x, y) {
    const el = document.createElement("div");
    el.className = "orn orn-" + type;
    el.style.left = (x / 300) * 100 + "%";
    el.style.top = (y / 400) * 100 + "%";
    el.innerHTML = ORN[type];
    layer.appendChild(el);
    spots.push({ x, y });
    placed++;
    dots.forEach((d, i) => d.classList.toggle("on", i < placed));
    Sound.sfx("pop");
    const r = wrap.getBoundingClientRect();
    burst(r.left + (x / 300) * r.width, r.top + (y / 400) * r.height, 8);

    const need = CONFIG.ornamentsNeeded;
    if (placed === 1) Guide.say("Ooh, pretty! Keep going!");
    else if (placed === Math.ceil(need / 2)) Guide.say("Looking so good, " + CONFIG.friendName + "!");
    if (placed === need) { Guide.say("Gorgeous! Ready to light it up?"); lightBtn.hidden = false; Sound.sfx("chime"); }
  }
  function addRandom(type) { if (lit) return; const p = randomSpot(); place(type, p.x, p.y); }
  function drop(type, cx, cy) {
    const r = wrap.getBoundingClientRect();
    if (cx < r.left - 30 || cx > r.right + 30 || cy < r.top - 20 || cy > r.bottom + 20) {
      Guide.say("Hang it on the tree, silly! Piyo~"); Sound.sfx("soft"); return;
    }
    const p = treeClamp(((cx - r.left) / r.width) * 300, ((cy - r.top) / r.height) * 400);
    place(type, p.x, p.y);
  }

  // Drag from the tray, or just tap to auto-place
  tray.addEventListener("pointerdown", e => {
    const item = e.target.closest(".tray-item");
    if (!item || lit) return;
    e.preventDefault();
    const type = item.dataset.type, sx = e.clientX, sy = e.clientY;
    let moved = false;
    const ghost = document.createElement("div");
    ghost.className = "ghost"; ghost.innerHTML = ORN[type];
    try { item.setPointerCapture(e.pointerId); } catch (_) {}

    const move = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) { moved = true; document.body.appendChild(ghost); }
      if (moved) { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; }
    };
    const cleanup = () => {
      item.removeEventListener("pointermove", move);
      item.removeEventListener("pointerup", up);
      item.removeEventListener("pointercancel", cancel);
      ghost.remove();
    };
    const up = ev => { cleanup(); moved ? drop(type, ev.clientX, ev.clientY) : addRandom(type); };
    const cancel = () => cleanup();
    item.addEventListener("pointermove", move);
    item.addEventListener("pointerup", up);
    item.addEventListener("pointercancel", cancel);
  });
  // Keyboard activation (Enter/Space gives click with detail 0)
  tray.addEventListener("click", e => {
    if (e.detail !== 0) return;
    const item = e.target.closest(".tray-item");
    if (item) addRandom(item.dataset.type);
  });

  // Tap the tree: it wiggles and the snow swirls
  wrap.addEventListener("click", () => {
    wrap.classList.remove("wiggle"); void wrap.offsetWidth; wrap.classList.add("wiggle");
    Snow.gust(rand(-90, 90));
    Sound.sfx("soft");
    setTimeout(() => wrap.classList.remove("wiggle"), 900);
  });

  // Secret: tap the star 5 times
  star.addEventListener("click", e => {
    e.stopPropagation();
    star.classList.remove("tap"); void star.getBoundingClientRect(); star.classList.add("tap");
    const r = star.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 8);
    Sound.sfx("chime");
    if (++starTaps >= 5) { starTaps = 0; burst(r.left + r.width / 2, r.top + r.height / 2, 26); Toast.show(CONFIG.secret, 6500); }
  });

  function lightUp() {
    lit = true;
    scene.classList.add("lit");
    lightBtn.hidden = true; trayBody.hidden = true; waitMsg.hidden = false;
    Sound.sfx("chime");
    const r = wrap.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height * 0.4, 26);
    Guide.say("Ta-daa! Look how it glows…");
    setTimeout(() => Santa.fly(() => {
      waitMsg.hidden = true; playBtn.hidden = false;
      Guide.say("Santa dropped some gifts! Wanna help me catch them?");
    }), 1600);
  }
  lightBtn.addEventListener("click", lightUp);

  function reset() {
    Santa.reset();
    layer.innerHTML = ""; spots = []; placed = 0; lit = false; starTaps = 0;
    scene.classList.remove("lit");
    dots.forEach(d => d.classList.remove("on"));
    lightBtn.hidden = true; playBtn.hidden = true; waitMsg.hidden = true; trayBody.hidden = false;
    Guide.say("Hi " + CONFIG.friendName + "! I'm Piyo. Help me decorate the tree. Drag the ornaments onto it, or just tap them!");
  }
  function enter() {
    reset();
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { if (!placed && !lit) Guide.say("Tap or drag an ornament onto the tree. I believe in you!"); }, 14000);
  }
  return { enter };
})();

/* ============================================================
   Mini game: catch the falling gifts
   ============================================================ */
const Game = (() => {
  const field = $("#field"), chickEl = $("#gameChick");
  const scoreEl = $("#score"), timeEl = $("#time"), goalEl = $("#goal");
  const ov = $("#overlay"), ovTitle = $("#ovTitle"), ovText = $("#ovText"), ovBtn = $("#ovBtn"), ovSkip = $("#ovSkip");
  let running = false, raf = 0, last = 0, fw = 0, fh = 0, cw = 0, ch = 0, gs = 40;
  let px = 0, target = 0, score = 0, left = 0, spawn = 0, fails = 0, gifts = [];
  const keys = { l: false, r: false };

  function measure() {
    fw = field.clientWidth; fh = field.clientHeight;
    cw = chickEl.offsetWidth; ch = chickEl.offsetHeight;
    gs = clamp(Math.round(fw * 0.11), 32, 50);
    field.style.setProperty("--g", gs + "px");
    px = clamp(px, cw / 2, fw - cw / 2);
    placeChick(0);
  }
  function placeChick(tilt) { chickEl.style.transform = `translate3d(${px - cw / 2}px,0,0) rotate(${tilt}deg)`; }
  function updateHud() { scoreEl.textContent = score; timeEl.textContent = Math.max(0, Math.ceil(left)); goalEl.textContent = CONFIG.gameGoal; }
  function clearGifts() { gifts.forEach(g => g.el.remove()); gifts = []; }

  function setOverlay({ title, text, btn, onBtn, skip }) {
    ovTitle.textContent = title; ovText.textContent = text; ovBtn.textContent = btn;
    ovBtn.onclick = onBtn;
    ovSkip.hidden = !skip;
    ovSkip.onclick = () => { show("final"); Final.enter(); };
    ov.hidden = false;
  }

  function spawnGift() {
    const [c, r] = GIFT_COLORS[(Math.random() * GIFT_COLORS.length) | 0];
    const el = document.createElement("div");
    el.className = "gift";
    el.style.setProperty("--c", c); el.style.setProperty("--r", r);
    el.innerHTML = "<i></i>";
    field.appendChild(el);
    gifts.push({ el, x: rand(2, Math.max(3, fw - gs - 2)), y: -gs, v: fh * rand(0.3, 0.45), rot: rand(-20, 20), vr: rand(-40, 40) });
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    left -= dt; spawn -= dt;
    if (spawn <= 0) { spawnGift(); spawn = rand(0.55, 0.95); }

    // move Piyo (finger/mouse target + keyboard)
    const kspeed = fw * 1.1;
    if (keys.l) target -= kspeed * dt;
    if (keys.r) target += kspeed * dt;
    target = clamp(target, cw / 2, fw - cw / 2);
    const prev = px;
    px += (target - px) * Math.min(1, dt * 16);
    placeChick(clamp((px - prev) * 2.2, -14, 14));

    const speedUp = 1 + (1 - left / CONFIG.gameSeconds) * 0.45;
    const catchY = fh - ch - 8 + ch * 0.2;
    const cx0 = px - cw * 0.42, cx1 = px + cw * 0.42;
    for (let i = gifts.length - 1; i >= 0; i--) {
      const g = gifts[i];
      g.y += g.v * speedUp * dt; g.rot += g.vr * dt;
      if (g.y + gs >= catchY && g.y < fh - ch * 0.3 && g.x + gs * 0.8 > cx0 && g.x + gs * 0.2 < cx1) {
        score++; g.el.remove(); gifts.splice(i, 1);
        Sound.sfx("catch");
        chickEl.firstElementChild.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.15,.88)" }, { transform: "scale(1)" }], { duration: 200 }
        );
        const pill = scoreEl.parentElement; pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump");
      } else if (g.y > fh) {
        g.el.remove(); gifts.splice(i, 1);
      } else {
        g.el.style.transform = `translate(${g.x}px,${g.y}px) rotate(${g.rot}deg)`;
      }
    }
    updateHud();
    if (left <= 0) { end(); return; }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    measure(); clearGifts();
    score = 0; left = CONFIG.gameSeconds; spawn = 0.4;
    px = target = fw / 2; placeChick(0);
    updateHud();
    ov.hidden = true;
    running = true; last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function end() {
    running = false; cancelAnimationFrame(raf); clearGifts();
    left = 0; updateHud();
    if (score >= CONFIG.gameGoal) {
      Sound.sfx("win");
      const r = chickEl.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top, 24);
      setOverlay({
        title: "You did it! 🎁",
        text: `You caught ${score} gifts. Piyo is so happy! There's a message waiting for you.`,
        btn: "Read my message",
        onBtn: () => { show("final"); Final.enter(); }
      });
    } else {
      fails++;
      Sound.sfx("soft");
      setOverlay({
        title: "So close!",
        text: `You caught ${score} of ${CONFIG.gameGoal}. Want another go?`,
        btn: "Try again", onBtn: start, skip: fails >= 2
      });
    }
  }

  function open() {
    show("game");
    running = false; cancelAnimationFrame(raf); clearGifts();
    measure(); score = 0; left = CONFIG.gameSeconds; updateHud();
    setOverlay({
      title: "Catch the gifts!",
      text: `Slide Piyo left and right to catch ${CONFIG.gameGoal} gifts in ${CONFIG.gameSeconds} seconds.`,
      btn: "Start", onBtn: start
    });
  }

  // Controls
  const setTarget = e => { const r = field.getBoundingClientRect(); target = clamp(e.clientX - r.left, cw / 2, fw - cw / 2); };
  field.addEventListener("pointermove", e => { if (running) setTarget(e); });
  field.addEventListener("pointerdown", e => { if (running) setTarget(e); });
  window.addEventListener("keydown", e => {
    if (!running) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { keys.l = true; e.preventDefault(); }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { keys.r = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.l = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.r = false;
  });
  window.addEventListener("resize", () => { if ($("#game").classList.contains("active")) measure(); });

  return { open };
})();

/* ============================================================
   Final message
   ============================================================ */
const Final = (() => {
  const letter = $("#letter"), sign = $("#sign"), photo = $("#photo"), img = $("#photoImg");
  CONFIG.message.forEach(line => { const p = document.createElement("p"); p.textContent = line; letter.appendChild(p); });
  sign.textContent = "With love,\n" + CONFIG.fromName;
  if (CONFIG.photo) {
    img.onerror = () => { photo.hidden = true; };
    img.src = CONFIG.photo;
    photo.hidden = false;
  }
  function enter() {
    Sound.sfx("chime");
    setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.3, 22), 350);
  }
  return { enter };
})();

/* ============================================================
   Wiring it all together
   ============================================================ */
$("#startBtn").addEventListener("click", () => {
  Sound.start();            // must happen on a tap so the browser allows audio
  Sound.sfx("chime");
  show("decorate");
  Decor.enter();
});
$("#playBtn").addEventListener("click", () => Game.open());
$("#retryGameBtn").addEventListener("click", () => Game.open());
$("#againBtn").addEventListener("click", () => { show("decorate"); Decor.enter(); });

show("intro");

// Builds the SCREENSHOT harness page: the shipped game plus scene-composition
// hooks (freeze, place platforms/defenders/props, hi-res canvas) used by
// shoot.js to stage App Store screenshots. The shipped file is never modified.
//
// usage: node tools/harness/screenshot-gen.js [src-index.html] [out.html]
//   src default: ./www/index.html   out default: /tmp/shot.html
const fs = require("fs");
const src = process.argv[2] || "./www/index.html";
const out = process.argv[3] || "/tmp/shot.html";
let h = fs.readFileSync(src, "utf8");

h = h.replace("const dpr = Math.min(window.devicePixelRatio || 1, 2);",
              "const dpr = Math.min(window.devicePixelRatio || 1, 3);");
h = h.replace("while (acc >= STEP && n < 5) { update(); acc -= STEP; n++; }",
              "while (acc >= STEP && n < 5) { if (!window.__frozen) update(); acc -= STEP; n++; }");

const hookTo = `window.__lax3 = {
  __freeze: () => { window.__frozen = true; },
  __unfreeze: () => { window.__frozen = false; },
  __setT: (v) => { t = v; },
  __setScore: (v) => { score = v; },
  __setPhase: (v) => { phase = v; },
  __ammo5: () => { ammo = MAX_AMMO; },
  __phase: () => phase,
  __clearAll: () => {
    defenders.length = 0; coins.length = 0; blimps.length = 0; balloons.length = 0;
    banners.length = 0; tickers.length = 0; birds.length = 0; pickups.length = 0;
    shots.length = 0; parts.length = 0; floats.length = 0; platforms.length = 0; clouds.length = 0;
  },
  __plat: (sx, sy, type) => { platforms.push(newPlatform(sx, cameraY + sy, type || "normal")); return platforms.length - 1; },
  __portal: (i) => { platforms[i].portal = true; platforms[i].item = null; },
  __item: (i, it) => { platforms[i].item = it; platforms[i].portal = false; },
  __flash: (i) => { platforms[i].flash = 8; },
  __defender: (sx, sy, tt) => { defenders.push({ x: sx, y: cameraY + sy, t: tt === undefined ? 1.2 : tt, dead: false }); },
  __blimp: (msg, sx, sy, vx) => { blimps.push({ x: sx, wy: sy + cameraY * 0.7, p: 0.7, vx: vx === undefined ? 0.4 : vx, msg }); },
  __banner: (msg, sx, sy, kind, vx) => { const pp = kind === "boat" ? 0.5 : 0.82; banners.push({ msg, kind: kind || "plane", p: pp, wy: sy + cameraY * pp, x: sx, vx: vx === undefined ? -1 : vx }); },
  __ticker: (msg, sx, sy, up) => { tickers.push({ x: sx, wy: sy + cameraY * 0.75, p: 0.75, vx: 0, msg, up: up === undefined ? 1 : up }); },
  __cloud: (sx, sy, s, pp) => { pp = pp === undefined ? 0.5 : pp; clouds.push({ x: sx, wy: sy + cameraY * pp, s: s || 1, p: pp, vx: 0 }); },
  __coin: (sx, sy) => { coins.push({ x: sx, y: cameraY + sy, taken: false }); },
  __shot: (sx, sy, vx, vy) => { shots.push({ x: sx, y: cameraY + sy, vx: vx || 0, vy: vy === undefined ? -8 : vy, life: 90, target: null, hit: false }); },
  __burst: (sx, sy, n, color, speed, grav) => { burst(sx, cameraY + sy, n, color, speed, grav); },
  __stepParts: (n) => { for (let k = 0; k < n; k++) for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += q.g; q.life--; } },
  __puff: (sx, sy, n, color, spread, rmin, rmax) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = (0.35 + Math.random() * 0.65) * spread; parts.push({ x: sx + Math.cos(a) * v * 2.0, y: cameraY + sy + Math.sin(a) * v * 1.6 - 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 30 + Math.random() * 8, max: 40, c: color, r: rmin + Math.random() * (rmax - rmin), g: 0.05 }); } },
  __player: (sx, sy, facing) => { player.x = sx; player.y = cameraY + sy; player.vy = 0; player.vx = 0; if (facing) player.facing = facing; },
  __hires: (s) => { s = s || 4; canvas.width = W * s; canvas.height = H * s; ctx.setTransform(s, 0, 0, s, 0, 0); },`;
h = h.replace("window.__lax3 = {", hookTo);

fs.writeFileSync(out, h);
const m = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];
try { new Function(m.map(x => x[1]).join("\n;\n")); } catch (e) { console.error("PARSE ERROR:", e.message); process.exit(7); }
console.log("OK " + out + " (screenshot harness from " + src + ")");

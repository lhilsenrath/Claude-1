// Stages and captures App Store screenshots from the harness page built by
// screenshot-gen.js. Scenes are composed with the game frozen, then rendered
// at 4x canvas resolution.
//
// usage: node tools/harness/shoot.js <scene> [alt] [out.png]
//   scenes: lax | pe | nan
//   env: SHOT_HTML (default /tmp/shot.html), VW/VH viewport (default 428x926
//        @3x = 1284x2778, the App Store 6.7" portrait size)
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { ({ chromium } = require("/opt/node22/lib/node_modules/playwright/index.js")); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SCENES = {
  lax: async (p) => {
    await p.evaluate(() => {
      const L = window.__lax3;
      L.jumpTo(7000);
      L.__clearAll();
      L.__setScore(7000);
      L.__cloud(60, 176, 1.05, 0.5);
      L.__cloud(300, 524, 1.0, 0.58);
      L.__cloud(182, 566, 1.2, 0.45);
      const port = L.__plat(150, 238, "normal");
      L.__portal(port);
      L.__plat(150, 452, "net");
      L.__plat(40, 372, "moving");
      L.__plat(262, 432, "wood");
      L.__player(186, 360, 1);
      L.__defender(302, 150, 1.1);
      L.__blimp("BAR DOWN!", 178, 94, -0.4);
      L.__ammo5();
      L.__coin(104, 300);
      L.__setT(46);
      L.__freeze();
    });
  },
  pe: async (p) => {
    await p.evaluate(() => {
      const L = window.__lax3;
      L.jumpTo(25000);
      L.__setPhase(3);
      L.__clearAll();
      L.__setScore(25000);
      // single gold platform under the investor, who STANDS holding his cash (no throw)
      L.__plat(112, 500, "normal");
      L.__player(150, 474, 1);
      L.__defender(116, 150, 0.9);
      L.__defender(298, 232, 1.05);
      const jet = L.__plat(242, 348, "normal");
      L.__item(jet, "eagle");
      const cash = L.__plat(86, 300, "wood");
      L.__item(cash, "ball");
      L.__coin(330, 296);
      L.__coin(164, 378);
      L.__ticker("DRY POWDER AT RECORD HIGHS", 20, 196, 1);
      L.__ticker("THE DECK IS 180 SLIDES", 104, 552, 0);
      L.__ammo5();
      L.__setT(30);
      L.__freeze();
    });
  },
  nan: async (p, alt) => {
    await p.evaluate((alt) => {
      const L = window.__lax3;
      L.jumpTo(alt);
      L.__setPhase(6);
      L.__clearAll();
      L.__setScore(alt);
      L.giveShield();
      const base = L.__plat(118, 452, "normal");
      L.__flash(base);
      L.__player(152, 422, 1);
      L.__burst(152, 456, 4, "rgba(255,255,255,0.8)", 1.4, 0.05);
      L.__stepParts(4);
      const port = L.__plat(74, 322, "normal");
      L.__portal(port);
      const sh = L.__plat(292, 356, "wood");
      L.__item(sh, "ball");
      L.__defender(300, 196, 0.9);
      L.__banner("ACK LIFE", 250, 118, "plane", -1);
      L.__ammo5();
      L.__coin(168, 250);
      L.__setT(28);
      L.__freeze();
    }, alt);
  },
};

(async () => {
  const scene = process.argv[2] || "lax";
  const alt = parseInt(process.argv[3] || "70000", 10);
  const out = process.argv[4] || ("/tmp/shot_" + scene + ".png");
  const page = process.env.SHOT_HTML || "/tmp/shot.html";
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: +(process.env.VW || 428), height: +(process.env.VH || 926) }, deviceScaleFactor: 3 });
  const p = await c.newPage();
  const errs = []; p.on("pageerror", e => errs.push("pageerror: " + e.message));
  await p.goto("file://" + page); await sleep(300);
  for (let i = 0; i < 5; i++) { const stt = await p.evaluate(() => __lax3.getState()); if (stt === "playing") break; await p.mouse.click(215, 466); await sleep(150); }
  if (scene === "nan") await SCENES.nan(p, alt); else await SCENES[scene](p);
  await p.evaluate(() => __lax3.__hires(4));
  await sleep(180);
  const ph = await p.evaluate(() => __lax3.__phase());
  await p.screenshot({ path: out });
  await b.close();
  console.log("scene", scene, "| phase", ph, "| alt", alt, "| errors", errs.length ? errs.join(" || ") : "NONE", "->", out);
})().catch(e => { console.error("ERR", e.message); process.exit(2); });

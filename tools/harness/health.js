// Full 6-phase health check. Run against an INSTRUMENTED build (see instrument.js).
// usage: node tools/harness/health.js /tmp/ship_check.html "label" ship
// pass = all 6 phases reached, frameErr "", draw < 16.67ms, freeze-proof SURVIVED,
//        errors NONE, exit code 0.
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { ({ chromium } = require("/opt/node22/lib/node_modules/playwright/index.js")); }
const url = process.argv[2], label = process.argv[3] || "health", isShip = process.argv[4] === "ship";
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + url);
  await p.waitForTimeout(300);
  for (let i = 0; i < 4; i++) { const st = await p.evaluate(() => __lax3.getState()); if (st === "playing") break; await p.mouse.click(207, 500); await p.waitForTimeout(150); }

  const phase = () => p.evaluate(() => __lax3.getPhase());
  const frameErr = () => isShip ? p.evaluate(() => __lax3.__frameErr()) : Promise.resolve("n/a");
  const drawms = () => isShip ? p.evaluate(() => __lax3.__drawms(120)) : Promise.resolve(-1);
  const alive = () => p.evaluate(() => (typeof __lax3.__alive === "function") ? __lax3.__alive() : performance.now());
  async function pollPhase(want, ms = 2500) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await phase() === want) return true; await sleep(80); } return (await phase()) === want; }

  const rows = [];
  async function check(name) { const ph = await phase(); const fe = await frameErr(); const dm = await drawms(); rows.push({ name, ph, fe, dm }); }

  // PHASE 1 — lax climb
  await p.evaluate(() => { __lax3.giveShield(); __lax3.giveAmmo(); });
  await sleep(400); await check("1 lax climb");

  // -> PE boss (phase 2) at BOSS_AT=15000
  await p.evaluate(() => __lax3.jumpTo(15500)); const okPE = await pollPhase(2);
  await sleep(300); await check("2 PE boss" + (okPE ? "" : " [PHASE?]"));
  // defeat -> PE climb (phase 3)
  await p.evaluate(() => __lax3.forceWin()); const okP3 = await pollPhase(3);
  await p.evaluate(() => { __lax3.giveShield(); __lax3.giveAmmo(); }); await sleep(300); await check("3 PE climb" + (okP3 ? "" : " [PHASE?]"));

  // -> box boss (phase 5) at NAN_BOSS_AT=50000
  await p.evaluate(() => __lax3.jumpTo(50500)); const okBox = await pollPhase(5);
  await sleep(300); await check("5 box boss" + (okBox ? "" : " [PHASE?]"));
  // defeat -> Nantucket (phase 6)
  await p.evaluate(() => __lax3.forceWin()); const okNan = await pollPhase(6);
  await p.evaluate(() => { __lax3.giveShield(); __lax3.giveAmmo(); }); await sleep(300); await check("6 Nantucket" + (okNan ? "" : " [PHASE?]"));

  // -> goose farm (phase 4) at FARM_AT=100000
  await p.evaluate(() => __lax3.jumpTo(100500)); const okFarm = await pollPhase(4);
  await sleep(300); await check("4 goose farm" + (okFarm ? "" : " [PHASE?]"));

  // FREEZE-PROOF stress (ship only): make one draw throw, confirm the loop survives
  let freezeResult = "n/a";
  if (isShip) {
    const beforeT = await alive();
    await p.evaluate(() => { const cx = document.querySelector("canvas").getContext("2d"); const o = cx.fillRect; let done = false; cx.fillRect = function () { if (!done) { done = true; cx.fillRect = o; throw new Error("injected-frame-error"); } return o.apply(this, arguments); }; });
    await sleep(600);
    const afterT = await alive();
    freezeResult = (afterT !== beforeT) ? "SURVIVED (loop kept running after a thrown frame)" : "FROZE!";
  }

  await b.close();
  console.log("\n==== " + label + " ====");
  for (const r of rows) console.log("  phase " + String(r.ph).padEnd(2) + " | " + r.name.padEnd(20) + " | frameErr: " + JSON.stringify(r.fe) + (r.dm >= 0 ? (" | draw " + r.dm.toFixed(2) + "ms (" + (1000 / r.dm).toFixed(0) + "fps headroom)") : ""));
  if (isShip) console.log("  freeze-proof: " + freezeResult);
  console.log("  console/page errors: " + (errs.length ? ("\n   - " + errs.join("\n   - ")) : "NONE"));
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR:", e); process.exit(2); });

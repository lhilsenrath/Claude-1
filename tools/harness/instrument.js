// Injects health-check instrumentation into a built copy of the game.
// The shipped game already has the freeze-proof loop (try/catch around
// update/draw that records _frameErr and always reschedules RAF); this
// only EXPOSES those internals, plus a draw timer, on window.__lax3.
// The shipped file itself is never modified.
//
// usage: node tools/harness/instrument.js [src-index.html] [out.html]
//   src default: ./www/index.html   out default: /tmp/ship_check.html
const fs = require("fs");
const src = process.argv[2] || "./www/index.html";
const out = process.argv[3] || "/tmp/ship_check.html";

let h = fs.readFileSync(src, "utf8");
const marker = "window.__lax3 = {";
if (!h.includes(marker)) { console.error("FAIL: __lax3 hook marker not found in " + src); process.exit(3); }

h = h.replace(marker, marker + `
  __frameErr: () => _frameErr,
  __alive: () => lastT,
  __drawms: (n) => { n = n || 120; const t0 = performance.now(); for (let i = 0; i < n; i++) draw(); return (performance.now() - t0) / n; },`);

fs.writeFileSync(out, h);

// parse-validate every script block so a bad injection can't masquerade as a game bug
const blocks = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];
try { new Function(blocks.map(m => m[1]).join("\n;\n")); }
catch (e) { console.error("PARSE ERROR after injection:", e.message); process.exit(7); }
console.log("OK " + out + " (instrumented from " + src + ")");

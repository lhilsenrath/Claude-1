# Lax Jump test harness

Tooling only — nothing here ships. The game (`www/index.html`) is never
modified; both builders inject hooks into a **copy**.

## 6-phase health check (run after every commit)

```bash
node tools/harness/instrument.js www/index.html /tmp/ship_check.html
node tools/harness/health.js /tmp/ship_check.html "my-label" ship
```

Pass criteria (all must hold):

| Check | Expectation |
|---|---|
| Phase traversal | reaches phases 1 → 2 → 3 → 5 → 6 → 4 (lax climb, PE boss @15k, PE climb, box boss @50k, Nantucket, goose farm @100k) — no `[PHASE?]` markers |
| Frame errors | `frameErr: ""` on every row |
| Frame budget | `draw` average < 16.67 ms (60 fps) on every row |
| Freeze-proof | `SURVIVED` — an injected draw exception must not stop the loop |
| Errors | `console/page errors: NONE`; exit code 0 |

## App Store screenshots

```bash
node tools/harness/screenshot-gen.js www/index.html /tmp/shot.html
node tools/harness/shoot.js lax 7000  /tmp/shot_lax.png
node tools/harness/shoot.js pe  25000 /tmp/shot_pe.png
node tools/harness/shoot.js nan 70000 /tmp/shot_nan.png
```

Output is 1284×2778 (App Store 6.7" portrait). Override with `VW`/`VH`
(viewport, ×3 device scale factor), e.g. `VW=430 VH=932` → 1290×2796 (6.9").

## Notes

- Playwright: scripts require `playwright` and fall back to the preinstalled
  `/opt/node22/lib/node_modules/playwright`; Chromium comes from
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` in Claude Code cloud containers.
  Do not run `playwright install`.
- After every game commit also run `npx cap sync ios` and confirm
  `ios/App/App/public/index.html` is byte-identical to `www/index.html`.
- Hardening that must stay intact (verify when touching the loop or audio):
  freeze-proof RAF loop (`while (acc >= STEP && n < 5)` clamp + try/catch +
  unconditional reschedule), audio guards (`actx` try/catch), and
  `ITSAppUsesNonExemptEncryption=false` in `ios/App/App/Info.plist`.

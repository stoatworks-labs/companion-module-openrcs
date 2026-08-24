# Notes

Working notes for this repo: status, decisions, and the traps that have actually bitten.
Migrated out of Claude Code's memory on 2026-08-24, so they are written in the first
person and dated by when each thing was learned — that date is usually the useful part.

Cross-cutting notes that are not specific to this repo live in
[fleet-notes](https://github.com/stoatworks-labs/fleet-notes).

*companion-module-openrcs — Companion module for Analog Way LiveCore/Midra; PUBLIC v1.0.1, but v1.0.1 is DEAD on init (array variable defs) — fix is UNCOMMITTED*

Created 2026-08-08. `~/Projects/companion-module-openrcs`, PUBLIC on GitHub
(stoatworks-labs), MIT. The Companion companion to [openrcs](https://github.com/stoatworks-labs/openrcs/blob/main/docs/NOTES.md) (`openrcs`) — same
reverse-engineered Analog Way protocol (TCP 10500), driven from a control
surface instead of a browser. Node 22, `@companion-module/base` ~2.0.4, no build.

**Key design:** the wire protocol lives in `src/protocol.js` — PURE, imports
nothing from Companion, so `node test/smoke.mjs` runs with no deps (15 checks,
byte-for-byte both platforms). `encodeSet/encodeGet` (mnemonic LAST, value glued,
Midra CRLF / LiveCore LF), `parseLine` (mnemonic FIRST reply), `takePlan`
(bank-aware: reads GCsta, GCtku up / GCtkd down, parks T-bar first). `src/api.js`
uses `TCPHelper`, buffers lines across reads (device replies CRLF even on
LiveCore — split on LF, strip trailing CR), caches GCsta/GCava for take direction
+ feedbacks. Actions: take/cut/tbar/step_back (group-indexed), recall_master
(PSmet+PSlot), recall_screen (PMscf/PMmet/PMlot), freeze_input (INfrz), output_black
(OUbla), raw. Feedbacks: on-air/transitioning/available. 19 vars, 16 presets.

**Verified:** loaded against the real `@companion-module/base` — take_group(1)
with GCsta=AT_UP emitted `0,65535GCtba / 0,1000GCtdn / 0,1GCtkd` (correct DOWN
direction + encoding); recall_master(5) → `4PSmet / 1PSlot`; feedbacks resolve.
NOT yet tested from Companion against real hardware (say so). Groups indexed [16];
ungrouped screen = own group, so "screen N" = group N-1.

`.github` copied from the fleet (release.yml packages via companion-module-build;
added test.yml running the smoke test — CI green; dependabot/FUNDING/issue
templates adapted srt-router→openrcs). `about-field.js` + ATTRIBUTIONS vendored
from stoatworks-backend. Linked from the openrcs README ("Drive it from a control
surface"). See [companion modules](https://github.com/stoatworks-labs/fleet-notes/blob/main/notes/project_companion_modules.md) for the module-conventions master.

**RELEASED v1.0.0 (2026-08-09)** — <https://github.com/stoatworks-labs/companion-module-openrcs/releases/tag/v1.0.0>,
assets `companion-module-openrcs-pkg.tgz` + `openrcs-1.0.0.tgz`, release workflow green.
The first tag FAILED: `src/main.js` still called `runEntrypoint`, which base 2.x
does not export — see [companion module traps](https://github.com/stoatworks-labs/fleet-notes/blob/main/notes/reference_companion_module_traps.md). Fixed by exporting the
class as default + `export { UpgradeScripts }`, deleted and re-pushed the tag.
Now on the website: its own `companion-openrcs` project page, and related work on
the new `/openrcs` product page. See [stoatworks website](https://github.com/stoatworks-labs/stoatworks-website/blob/main/docs/NOTES.md) (`stoatworks-website`).

**2026-08-21 — v1.0.1 as released is BROKEN, and the fix is UNCOMMITTED.** `src/variables.js`
passed the 1.x ARRAY to `setVariableDefinitions`, which throws in base 2.x; `rebuild()` calls it
BEFORE `UpdatePresets`, so every install of v1.0.1 dies in `init()` with no actions, no
variables and no presets. `src/presets.js` separately used the 1-arg `setPresetDefinitions`
with `category` + `type: 'button'`, and escaped `\\n` in the button text. All three fixed in
the working tree of `~/projects/companion/companion-module-openrcs`: presets are now 2 sections
(`transport` -> take/cut groups, `master_memories` -> master) over a flat 16-preset object,
variables an object keyed by id. `test/smoke.mjs` gained the mynah-style module-surface block
(26 checks total, negative-tested); `npm run package` green. NOT committed, NOT tagged, NOT
released — needs a v1.0.2. Also: `node_modules` had drifted to base 2.0.4 against a lockfile
pinning 2.1.2; `npm ci` before trusting anything read out of it.

****companion kestrel**-adjacent: companion-module-kestrel has the SAME three bugs**
and is PUBLIC at v1.0.0, plus a hardcoded `$(kestrel:...)` variable prefix. Untouched so far.

See [companion module traps](https://github.com/stoatworks-labs/fleet-notes/blob/main/notes/reference_companion_module_traps.md) and [companion mynah](https://github.com/stoatworks-labs/companion-module-mynah/blob/main/docs/NOTES.md) (`companion-module-mynah`).

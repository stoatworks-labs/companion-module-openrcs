# AGENTS.md — bringing an LLM up to speed on this Companion module

Orientation for an AI assistant (or a new human) picking this project up cold. There is no
`CLAUDE.md` here; this is the entry point.

---

## 1. What this is

A **Bitfocus Companion connection module** for **Analog Way LiveCore and Midra** video
processors — the Companion companion to [openrcs](https://github.com/stoatworks-labs/openrcs).
It drives the switcher over its native ASCII control protocol on TCP 10500: take/cut screens
and groups, T-bar, memory recall, freeze, output black, with on-air tally feedback.

Not affiliated with or endorsed by Analog Way. Product names are used nominatively, to state
compatibility.

JavaScript, Node 22 runtime, `@companion-module/base` 2.x. No build step.

## 2. The wire protocol lives in one file

`src/protocol.js` is pure and dependency-free — it imports nothing from Companion, so it can
be unit-tested with `node test/smoke.mjs` and reused anywhere. Everything about the framing is
there:

```
set:    idx0,idx1,…,<value><MNEMONIC><term>     "1,5000GCtba"
get:    idx0,idx1,…,<MNEMONIC><term>            "0,VEvar"
reply:  <MNEMONIC>idx0,idx1,…,<value>           "GCtba1,5000"
```

The framing is **asymmetric** — the mnemonic is last on a command, first on a reply, and a
reply's last comma-separated field is the value, not an index. **Midra terminates commands
with CRLF, LiveCore with LF; the device replies in CRLF on both.** This is the single easiest
thing to regress; the smoke test pins the exact bytes for both platforms. Keep it.

## 3. The take is bank-aware

LiveCore screens have fixed preset banks (PA/PB); a take transitions between them, and which
one is on air is the device's business, read from `GCsta[group]`. So the module keeps a small
state cache (`self.state.gcsta`) fed by the device's pushes, and `protocol.js::takePlan`
computes the correct direction (`GCtku` up vs `GCtkd` down) and parks the T-bar at the live
end first so the transition has travel. Sending a bare take verb without this is how you get a
group stuck mid-transition. Groups are indexed `[16]`; an ungrouped screen is its own group.

## 4. Layout

```
src/protocol.js   the wire format + take model (pure, tested)
src/api.js        one TCPHelper link, line buffering, state cache, send/take/cut
src/actions.js    take/cut/tbar/step-back, memory recall, freeze, black, raw
src/feedbacks.js  on-air / transitioning / available, from the GCsta cache
src/variables.js  connection, model, per-group on-air bank
src/presets.js    take/cut 1–4 with tally, master memories 1–8
src/main.js       InstanceBase: config fields, lifecycle, rebuild
test/smoke.mjs    protocol.js byte-for-byte, no dependencies
```

## 5. Hard rules

- **Do not commit `node_modules`.** `.gitignore` covers it; the lockfile is committed for
  reproducible builds.
- **`src/about-field.js` and `ATTRIBUTIONS.md` are vendored** from `stoatworks-backend` and
  synced by scripts there — edit the master, not the copy.
- **Be precise about validation.** The protocol byte shapes are confirmed against real
  hardware in the openrcs project (a NeXtage 16 and a Pulse2); this module's _actions_ have
  been exercised against the openrcs simulated device and the protocol tests, but not yet
  end-to-end from Companion against real hardware. Do not overstate.
- **Use vendor names nominatively only** — to state compatibility, never as branding.

## 6. Verifying

```bash
npm test           # protocol codec, no hardware, no install needed for the codec itself
npm run format     # prettier
```

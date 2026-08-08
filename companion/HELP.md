## openRCS — Analog Way LiveCore & Midra control

Controls an Analog Way **LiveCore** (Ascender, NeXtage, SmartMatriX Ultra) or
**Midra** (Pulse2, Eikos2, Saphyr, SmartMatriX2, QuickVu) video processor over
its native TCP control protocol on port **10500**. Not affiliated with or
endorsed by Analog Way; product names describe compatibility only.

This is the Companion companion to the [openrcs](https://github.com/stoatworks-labs/openrcs)
control surface — the same reverse-engineered protocol, driven from a control
surface instead of a browser.

### Configuration

- **Processor IP** — the switcher's address on the network.
- **Platform** — LiveCore or Midra. This sets the command terminator (LiveCore
  uses LF, Midra CRLF) and the identity query, so pick the one that matches the
  hardware.

The control protocol is **unauthenticated**: anyone who can reach port 10500 can
drive the switcher. Keep it on a trusted network. The device also accepts very
few concurrent control sessions — if openrcs-server or the vendor's own client
already holds the connection, this module may not be able to connect.

### Actions

- **Take / Cut — screen/group** — transition (or cut) a screen or group. The
  direction is bank-aware: the module tracks each group's on-air bank and takes
  to the other one. "Screen/group" is 1-based; an ungrouped screen is its own
  group.
- **T-bar** — drive a group's transition bar manually (0–65535).
- **Step back** — return a group to its previous look.
- **Recall master / screen memory** — recall a memory and take it (or just load
  it to preview).
- **Freeze input**, **Output black** — per-input freeze and per-output black.
- **Raw command** — send a protocol line directly (mnemonic last, e.g.
  `1,5000GCtba`). Supports Companion variables.

### Feedbacks

- **On air (bank B / up)** — the group's up bank is live.
- **Transitioning** — a take is in progress.
- **Available** — the group holds an active screen.

### Presets

Ready-made take/cut buttons for screens/groups 1–4 (with on-air tally) and
recall buttons for master memories 1–8.

# companion-module-openrcs

> **AI-assisted project.** This module was created with [Claude](https://claude.com/claude-code)
> (Anthropic), directed and reviewed by a human author. The control protocol was
> reverse-engineered rather than taken from a published specification, and has
> been validated against real hardware in the [openrcs](https://github.com/stoatworks-labs/openrcs)
> project — but device behaviour varies with model and firmware, so check against
> your own processor before a show.

A [Bitfocus Companion](https://bitfocus.io/companion) module for **Analog Way
LiveCore and Midra** video processors.

It drives the switcher over its native ASCII control protocol on TCP 10500 —
take and cut screens and groups, run the T-bar, recall master and screen
memories, freeze inputs, black outputs — with on-air tally feedback. It is the
control-surface companion to the [openrcs](https://github.com/stoatworks-labs/openrcs)
browser control panel, built on the same protocol.

Not affiliated with or endorsed by Analog Way. Product names are used only to
describe compatibility.

<!-- downloads:start -->

## Download

**[v1.0.1](https://github.com/stoatworks-labs/companion-module-openrcs/releases/tag/v1.0.1)**

This release contains:

- [`companion-module-openrcs-pkg.tgz`](https://github.com/stoatworks-labs/companion-module-openrcs/releases/latest/download/companion-module-openrcs-pkg.tgz) — npm package, 8 KB
- [`openrcs-1.0.1.tgz`](https://github.com/stoatworks-labs/companion-module-openrcs/releases/download/v1.0.1/openrcs-1.0.1.tgz) — npm package, 8 KB

All builds, checksums and release notes: [github.com/stoatworks-labs/companion-module-openrcs/releases](https://github.com/stoatworks-labs/companion-module-openrcs/releases).

<!-- downloads:end -->

## Supported hardware

- **LiveCore** — Ascender 16/32/48, NeXtage 8/16, SmartMatriX Ultra
- **Midra** — Pulse2, Eikos2, Saphyr, SmartMatriX2, QuickMatriX, QuickVu

## Install

Once merged into the Companion module database it appears in Companion as
**openRCS**. To run this copy directly, point Companion's _Developer modules
path_ at the checkout.

## Configure

Set the **Processor IP** and pick the **Platform** (LiveCore or Midra — this
selects the command terminator and identity query). The control protocol is
unauthenticated and accepts very few concurrent sessions; see
[companion/HELP.md](companion/HELP.md).

## Actions, feedbacks, presets

Take/cut/T-bar/step-back for screens and groups (bank-aware), master and screen
memory recall, input freeze, output black, and a raw-command escape hatch;
on-air / transitioning / available feedbacks; ready-made take and memory
presets. Full list in [companion/HELP.md](companion/HELP.md).

## Develop

```bash
npm install
npm test            # protocol codec (byte-for-byte, no hardware)
npm run format
```

The wire protocol is isolated in [`src/protocol.js`](src/protocol.js), pure and
dependency-free, and pinned by the smoke test. See [AGENTS.md](AGENTS.md).

<!-- attributions:start -->

This project is built on other people's work — see [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
<!-- attributions:end -->

## Licence

MIT.

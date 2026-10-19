# companion-module-openrcs

> **AI-assisted project.** This module was created with [Claude](https://claude.com/claude-code)
> (Anthropic), directed and reviewed by a human author. The control protocol was
> reverse-engineered rather than taken from a published spec, and it's been
> validated against real hardware in the [openrcs](https://github.com/stoatworks-labs/openrcs)
> project. Device behaviour varies with model and firmware, though, so try it
> against your own processor before a show.

A [Bitfocus Companion](https://bitfocus.io/companion) module for Analog Way
LiveCore and Midra video processors.

It talks to the switcher in its own ASCII control protocol on TCP 10500 and lets
you take and cut screens and groups, run the T-bar, recall master and screen
memories, freeze inputs and black outputs, with on-air tally coming back. It's
the control-surface sibling of the [openrcs](https://github.com/stoatworks-labs/openrcs)
browser control panel, and speaks the same protocol.

Not affiliated with or endorsed by Analog Way. Product names are used only to
describe compatibility.

<!-- downloads:start -->

## Download

**[v1.2.1](https://github.com/stoatworks-labs/companion-module-openrcs/releases/tag/v1.2.1)**

This release contains:

- [`companion-module-openrcs-pkg.tgz`](https://github.com/stoatworks-labs/companion-module-openrcs/releases/latest/download/companion-module-openrcs-pkg.tgz) — npm package, 10 KB
- [`openrcs-1.2.1.tgz`](https://github.com/stoatworks-labs/companion-module-openrcs/releases/download/v1.2.1/openrcs-1.2.1.tgz) — npm package, 10 KB

All builds, checksums and release notes: [github.com/stoatworks-labs/companion-module-openrcs/releases](https://github.com/stoatworks-labs/companion-module-openrcs/releases).

<!-- downloads:end -->

## Supported hardware

- **LiveCore:** Ascender 16/32/48, NeXtage 8/16, SmartMatriX Ultra
- **Midra:** Pulse2, Eikos2, Saphyr, SmartMatriX2, QuickMatriX, QuickVu

## Install

Once it's merged into the Companion module database it'll show up in Companion
as **openRCS**. To run this copy directly, point Companion's _Developer modules
path_ at the checkout.

## Configure

Set the **Processor IP** and pick the **Platform** (LiveCore or Midra, which
decides the command terminator and the identity query). The control protocol has
no authentication at all and only takes a handful of sessions at once; see
[companion/HELP.md](companion/HELP.md).

## Actions, feedbacks, presets

Take/cut/T-bar/step-back for screens and groups (bank-aware), master and screen
memory recall, multiviewer layout recall, input freeze, output black, and a
raw-command escape hatch. Feedbacks for on air, transitioning and available, and
ready-made presets for takes, memories and multiviewer layouts. The full list is
in [companion/HELP.md](companion/HELP.md).

## Develop

```bash
npm install
npm test            # protocol codec (byte-for-byte, no hardware)
npm run format
```

The wire protocol lives on its own in [`src/protocol.js`](src/protocol.js), pure
and with no dependencies, and the smoke test pins it down. See [AGENTS.md](AGENTS.md).

<!-- attributions:start -->

This project is built on other people's work — see [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
<!-- attributions:end -->

## Licence

MIT.

import { InstanceStatus, TCPHelper } from "@companion-module/base";
import {
  PLATFORMS,
  encodeSet,
  encodeGet,
  parseLine,
  takeSweep,
  liveCtx,
  midraCutSteps,
  midraTbar,
} from "./protocol.js";

const PORT = 10500;
const GROUPS = 16; // GCsta/GCtba etc. are indexed [16]
const MIDRA_SCREENS = 2; // a Midra's GCtak/GCtba are per screen, [2]

// One TCP link to the processor, with a small state cache. The device pushes
// unsolicited frames and splits replies across reads, so lines are buffered and
// every value frame updates the cache — the take direction needs GCsta, and the
// feedbacks read on-air state from it.
export const socket = {
  tcp: null,
  buffer: "",
  closing: false,
  tbarTimers: {}, // group -> interval, so a new take cancels a running sweep

  connect(self) {
    this.closing = false;
    this.close(true);
    const term = PLATFORMS[self.config.platform]?.term ?? "\n";
    self.term = term;
    self.state = { gcsta: {}, gcava: {}, gctba: {}, model: null };

    self.updateStatus(InstanceStatus.Connecting);
    const tcp = new TCPHelper(self.config.host, PORT);
    this.tcp = tcp;

    tcp.on("status_change", (status, message) =>
      self.updateStatus(status, message),
    );
    tcp.on("error", (err) => {
      self.updateStatus(InstanceStatus.ConnectionFailure, err.message);
    });
    tcp.on("connect", () => {
      self.log("info", `Connected to processor at ${self.config.host}:${PORT}`);
      self.updateStatus(InstanceStatus.Ok);
      // Identity, then prime the state the take logic depends on: the group
      // banks on LiveCore, the per-screen T-bar on a Midra (which has no
      // GCsta or GCava — asking would only draw a NAK per group).
      if (this.isMidra(self)) {
        this.raw(self, "?");
        for (let s = 0; s < MIDRA_SCREENS; s++)
          this.send(self, encodeGet("GCtba", [s]));
      } else {
        this.raw(self, "!");
        for (let g = 0; g < GROUPS; g++) {
          this.send(self, encodeGet("GCsta", [g]));
          this.send(self, encodeGet("GCava", [g]));
        }
      }
    });
    tcp.on("data", (chunk) => this.onData(self, chunk));
  },

  onData(self, chunk) {
    this.buffer += chunk.toString("latin1");
    let nl;
    // The device replies in CRLF even on LiveCore; split on LF and drop a
    // trailing CR so both framings parse.
    while ((nl = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, nl).replace(/\r$/, "");
      this.buffer = this.buffer.slice(nl + 1);
      if (line) this.onLine(self, line);
    }
  },

  onLine(self, line) {
    const f = parseLine(line);
    if (!f) return;
    if (f.error != null) {
      self.log("debug", `device NAK E${f.error} for a command`);
      return;
    }
    const { mnemonic, idx, value } = f;
    if (mnemonic === "GCsta" && idx.length === 1)
      self.state.gcsta[idx[0]] = value;
    else if (mnemonic === "GCava" && idx.length === 1)
      self.state.gcava[idx[0]] = value;
    else if (mnemonic === "GCtba" && idx.length === 1)
      self.state.gctba[idx[0]] = value;
    else if (mnemonic === "PDEV" || mnemonic === "DEV")
      self.state.model = value;
    self.onStateChanged?.();
  },

  // ---- outbound ----
  send(self, text) {
    if (this.tcp && this.tcp.isConnected) this.tcp.send(text);
  },
  set(self, mnemonic, idx, value) {
    this.send(self, encodeSet(mnemonic, idx, value, self.term));
  },
  get(self, mnemonic, idx) {
    this.send(self, encodeGet(mnemonic, idx, self.term));
  },
  // A raw line (the identity specials ?/!/*, or a power-user command).
  raw(self, line) {
    this.send(self, line.endsWith("\n") ? line : line + (self.term ?? "\n"));
  },

  isMidra(self) {
    return self.config?.platform === "midra";
  },

  // Bank-aware take of a group: sweep the T-bar from the live end to the other
  // over ttime ms. The device's auto-take verbs (GCtku/GCtkd) stall on real
  // hardware, so GCtba is driven directly; a cut jumps straight to the target.
  //
  // A Midra is different (see protocol.js): the "group" is the screen, the
  // take is the device's own GCtak with the unit's preset-update mode off —
  // the layers' programmed transitions run, so the time is the device's, not
  // ours — and a cut is the T-bar run through the middle to the far end.
  take(self, group, ttime) {
    if (this.isMidra(self)) {
      this.stopSweep(group);
      this.set(self, "CTpmu", [], 0);
      this.set(self, "GCtak", [group], 0);
      this.set(self, "GCtak", [group], 1);
      return;
    }
    const { from, to } = takeSweep(self.state.gcsta[group] ?? 0);
    this.stopSweep(group);
    if (!ttime || ttime <= 0 || from === to) {
      this.set(self, "GCtba", [group], to);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / ttime);
      this.set(self, "GCtba", [group], Math.round(from + (to - from) * t));
      if (t >= 1) this.stopSweep(group);
    };
    this.tbarTimers[group] = setInterval(tick, 45); // ~22 fps, last tick lands on `to`
    tick();
  },
  cut(self, group) {
    this.stopSweep(group);
    if (this.isMidra(self)) {
      const [mid, to] = midraCutSteps(self.state.gctba[group]);
      this.set(self, "CTpmu", [], 0);
      this.set(self, "GCtba", [group], mid);
      this.tbarTimers[group] = setTimeout(() => {
        delete this.tbarTimers[group];
        this.set(self, "GCtba", [group], to);
      }, 50);
      return;
    }
    const { to } = takeSweep(self.state.gcsta[group] ?? 0);
    this.set(self, "GCtba", [group], to);
  },
  // The action's scale is LiveCore's 0..65535; a Midra's bar runs 0..10000.
  tbar(self, group, value) {
    this.stopSweep(group);
    this.set(
      self,
      "GCtba",
      [group],
      this.isMidra(self) ? midraTbar(value) : value,
    );
  },
  // LiveCore steps a group back; a Midra steps a screen back.
  stepBack(self, group) {
    this.set(self, this.isMidra(self) ? "GCsba" : "GCstb", [group], 1);
  },
  liveBank(self, group) {
    return liveCtx(self.state.gcsta[group] ?? 0);
  },
  stopSweep(group) {
    if (this.tbarTimers[group]) {
      clearInterval(this.tbarTimers[group]);
      delete this.tbarTimers[group];
    }
  },

  close(silent) {
    this.closing = true;
    this.buffer = "";
    for (const g of Object.keys(this.tbarTimers)) this.stopSweep(g);
    if (this.tcp) {
      try {
        this.tcp.destroy();
      } catch {
        // destroying a socket that never connected throws; nothing to do.
      }
      this.tcp = null;
    }
    if (!silent) this.closing = false;
  },
};

export { GROUPS };

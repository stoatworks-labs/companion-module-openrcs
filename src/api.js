import { InstanceStatus, TCPHelper } from "@companion-module/base";
import {
  PLATFORMS,
  encodeSet,
  encodeGet,
  parseLine,
  takePlan,
  liveCtx,
} from "./protocol.js";

const PORT = 10500;
const GROUPS = 16; // GCsta/GCtku etc. are indexed [16]

// One TCP link to the processor, with a small state cache. The device pushes
// unsolicited frames and splits replies across reads, so lines are buffered and
// every value frame updates the cache — the take direction needs GCsta, and the
// feedbacks read on-air state from it.
export const socket = {
  tcp: null,
  buffer: "",
  closing: false,

  connect(self) {
    this.closing = false;
    this.close(true);
    const term = PLATFORMS[self.config.platform]?.term ?? "\n";
    self.term = term;
    self.state = { gcsta: {}, gcava: {}, model: null };

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
      // Identity, then prime the group state the take logic depends on.
      this.raw(self, self.config.platform === "midra" ? "?" : "!");
      for (let g = 0; g < GROUPS; g++) {
        this.send(self, encodeGet("GCsta", [g]));
        this.send(self, encodeGet("GCava", [g]));
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

  // Bank-aware take/cut of a group, using the cached GCsta.
  take(self, group, ttime) {
    const st = self.state.gcsta[group] ?? 0;
    for (const c of takePlan(group, st, ttime))
      this.set(self, c.mnemonic, c.idx, c.value);
  },
  cut(self, group) {
    this.take(self, group, 0);
    setTimeout(() => this.set(self, "GCtfr", [group], 1), 60);
  },
  tbar(self, group, value) {
    this.set(self, "GCtba", [group], value);
  },
  liveBank(self, group) {
    return liveCtx(self.state.gcsta[group] ?? 0);
  },

  close(silent) {
    this.closing = true;
    this.buffer = "";
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

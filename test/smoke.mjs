// Exercises the wire protocol (src/protocol.js) against the exact byte shapes
// the device uses — the same asymmetric framing pinned in the openrcs crate's
// conformance tests. Pure and dependency-free, so it runs without installing
// @companion-module/base.
import assert from "node:assert/strict";
import {
  encodeSet,
  encodeGet,
  parseLine,
  takeSweep,
  GCTBA_MAX,
  PLATFORMS,
} from "../src/protocol.js";

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`  ok ${name}`);
};

// --- framing: the mnemonic is last on a command, the value glued to it -------
ok("set with index, Midra CRLF", () => {
  assert.equal(
    encodeSet("GCtba", [1], 5000, PLATFORMS.midra.term),
    "1,5000GCtba\r\n",
  );
});
ok("set with index, LiveCore LF", () => {
  assert.equal(
    encodeSet("INpcr", [5], 200, PLATFORMS.livecore.term),
    "5,200INpcr\n",
  );
});
ok("set with no index (scalar)", () => {
  assert.equal(encodeSet("OSupd", [], 1, "\n"), "1OSupd\n");
});
ok("set with multiple indices", () => {
  assert.equal(encodeSet("PRalp", [0, 0, 3], 128, "\n"), "0,0,3,128PRalp\n");
});
ok("get with index", () => {
  assert.equal(encodeGet("VEvar", [0], "\n"), "0,VEvar\n");
});
ok("get with no index", () => {
  assert.equal(encodeGet("DEV", [], "\n"), "DEV\n");
});

// --- reply parsing: mnemonic first, value last -------------------------------
ok("parse value reply", () => {
  assert.deepEqual(parseLine("GCtba1,5000"), {
    mnemonic: "GCtba",
    idx: [1],
    value: 5000,
  });
});
ok("parse reply with several indices", () => {
  assert.deepEqual(parseLine("PRalp0,0,3,128"), {
    mnemonic: "PRalp",
    idx: [0, 0, 3],
    value: 128,
  });
});
ok("parse device push", () => {
  assert.deepEqual(parseLine("ITcct0,1"), {
    mnemonic: "ITcct",
    idx: [0],
    value: 1,
  });
});
ok("parse the special identity answers", () => {
  assert.deepEqual(parseLine("PDEV97"), {
    mnemonic: "PDEV",
    idx: [],
    value: 97,
  });
});
ok("parse an error NAK", () => {
  assert.deepEqual(parseLine("E10"), { error: 10 });
  assert.deepEqual(parseLine("E12"), { error: 12 });
});
ok("a set round-trips to a parseable echo", () => {
  // encodeSet(GCtba,[1],5000) -> device echoes GCtba1,5000
  const p = parseLine("GCtba1,5000");
  assert.equal(p.mnemonic, "GCtba");
  assert.deepEqual(p.idx, [1]);
  assert.equal(p.value, 5000);
});

// --- take model: T-bar sweep, bank-aware direction ---------------------------
// The device's auto-take verbs stall on real hardware; a take sweeps GCtba from
// the live end to the other.
ok("take from DOWN sweeps T-bar 0 -> 65535 (bring UP live)", () => {
  assert.deepEqual(takeSweep(0 /* AT_DOWN */), { from: 0, to: GCTBA_MAX });
});
ok("take from UP sweeps T-bar 65535 -> 0 (bring DOWN live)", () => {
  assert.deepEqual(takeSweep(1 /* AT_UP */), { from: GCTBA_MAX, to: 0 });
});
ok("mid-transition FROM_UP is treated as up-live (sweeps down)", () => {
  assert.deepEqual(takeSweep(3 /* FROM_UP */), { from: GCTBA_MAX, to: 0 });
});

console.log(`\n${n} checks passed.`);

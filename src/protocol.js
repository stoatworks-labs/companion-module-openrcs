// The openrcs wire protocol, on its own and dependency-free so it can be tested
// without Companion. Both Analog Way families speak a terse ASCII protocol over
// TCP 10500: a command puts the 5-character mnemonic LAST, a reply puts it
// FIRST, and a reply's final comma-separated field is the value.
//
//   set:    idx0,idx1,…,<value><MNEMONIC><term>     e.g. "1,5000GCtba"
//   get:    idx0,idx1,…,<MNEMONIC><term>            e.g. "0,VEvar"
//   reply:  <MNEMONIC>idx0,idx1,…,<value>           e.g. "GCtba1,5000"
//
// Midra terminates outbound commands with CRLF, LiveCore with LF; the device
// replies in CRLF on both. Bad commands are NAKed with "E<code>".

export const PLATFORMS = {
  livecore: {
    term: "\n",
    label: "LiveCore (Ascender, NeXtage, SmartMatriX Ultra)",
  },
  midra: {
    term: "\r\n",
    label: "Midra (Pulse2, Eikos2, Saphyr, SmartMatriX2, QuickVu)",
  },
};

/** Encode a set. Indices are comma-joined and the value is glued to the value
 *  side, so [1] with value 5000 on "GCtba" is "1,5000GCtba" — the comma sits
 *  between the last index and the value, never between the value and mnemonic. */
export function encodeSet(mnemonic, idx, value, term = "\n") {
  const head = idx.length ? idx.join(",") + "," : "";
  return head + value + mnemonic + term;
}

/** Encode a get/request: the same index head, then the mnemonic, no value. */
export function encodeGet(mnemonic, idx, term = "\n") {
  const head = idx.length ? idx.join(",") + "," : "";
  return head + mnemonic + term;
}

/**
 * Parse one reply line (already stripped of its terminator).
 * Returns { error: code } for an "E<code>" NAK, { mnemonic, idx, value } for a
 * value frame, or null for anything unrecognised. The mnemonic is the leading
 * run of letters (or one of the specials ? ! *); the trailing comma-separated
 * numbers are the indices, and the last of them is the value.
 */
export function parseLine(line) {
  const s = String(line).trim();
  if (!s) return null;
  const err = /^E(\d+)$/.exec(s);
  if (err) return { error: Number(err[1]) };
  const m = /^([A-Za-z?!*]+)(.*)$/.exec(s);
  if (!m) return null;
  const mnemonic = m[1];
  const rest = m[2];
  if (rest === "") return { mnemonic, idx: [], value: null };
  const nums = rest.split(",").map((n) => Number(n));
  if (nums.some((n) => Number.isNaN(n)))
    return { mnemonic, idx: [], value: null, raw: rest };
  const value = nums[nums.length - 1];
  const idx = nums.slice(0, -1);
  return { mnemonic, idx, value };
}

// ---- memory recall (LiveCore) ----
// A recall is a few selector writes and then one verb, each a [mnemonic, idx,
// value] set. PMprf/PSprf (PRESET_FROM) is the bank a load lands in — 1 the bank
// that is not on air — and the unit keeps one value for every client: the
// vendor's own client sets it, and openrcs's Memories view writes 0 when its
// Program bank is chosen. A load that leaves it to chance can therefore land on
// air, so a load always writes 1. A load-and-take (PMlot/PSlot) does not, as
// openrcs's own recall does not.

/** The sets that recall master memory `slot` (0-based). */
export function recallMasterSteps(slot, take) {
  return [
    ["PSmet", [], slot],
    ...(take ? [] : [["PSprf", [], 1]]),
    [take ? "PSlot" : "PSloa", [], 1],
  ];
}

/** The sets that recall screen memory `slot` onto `screen` (both 0-based). */
export function recallScreenSteps(screen, slot, take) {
  return [
    ["PMscf", [], screen],
    ["PMmet", [], slot],
    ...(take ? [] : [["PMprf", [], 1]]),
    [take ? "PMlot" : "PMloa", [], 1],
  ];
}

/** The set that loads multiviewer layout memory `memory` onto monitoring output
 *  `monitor` (both 0-based). Memory first: MMloa is [memory, monitor], the
 *  reverse of MMsav's [monitor, memory]. The unit applies a loaded layout itself. */
export function loadMultiviewerSteps(memory, monitor) {
  return [["MMloa", [memory, monitor], 1]];
}

// ---- take model (LiveCore banks) ----
// GCsta[g] is the group's transition state: 0 AT_DOWN, 1 AT_UP, 2 FROM_DOWN,
// 3 FROM_UP. The live bank is UP for 1/3, DOWN otherwise.
export const GRP_AT_DOWN = 0,
  GRP_AT_UP = 1,
  GRP_FROM_DOWN = 2,
  GRP_FROM_UP = 3;
export const GCTBA_MAX = 65535;

export function liveCtx(gcsta) {
  return gcsta === GRP_AT_UP || gcsta === GRP_FROM_UP ? 1 : 0;
}

// ---- take model (Midra) ----
// A Midra has no GCsta and no banks: one preview per screen, and GCtak[screen]
// puts it on air with each layer's own programmed transition. Measured on a
// Pulse2 (2026-09-16): the verb is inert while the unit's preset-update mode
// (CTpmu) is on — it latches at 1 and moves nothing — so CTpmu is written 0
// first, and GCtak is pulsed 0 then 1 because a 1 written over a latched 1 is
// nothing. Its T-bar is GCtba[screen] 0..10000, and either end-to-end run puts
// the preview on air; the bar has to be seen to travel, so a cut is two writes
// — the middle, then the far end — a single write of the far end is ignored.
export const MIDRA_TBAR_MAX = 10000;

/** The two GCtba writes that cut a Midra screen, from wherever its bar sits. */
export function midraCutSteps(at) {
  const to = (at ?? 0) >= MIDRA_TBAR_MAX / 2 ? 0 : MIDRA_TBAR_MAX;
  return [MIDRA_TBAR_MAX / 2, to];
}

/** A T-bar position given on the LiveCore 0..65535 scale, on the Midra's. */
export function midraTbar(value) {
  return Math.round(
    Math.min(Math.max(Number(value) || 0, 0), GCTBA_MAX) *
      (MIDRA_TBAR_MAX / GCTBA_MAX),
  );
}

/**
 * The T-bar sweep for a take, given the group's current GCsta: from the live
 * end to the other. On real LiveCore hardware the device's own auto-take verbs
 * (GCtku/GCtkd) do NOT animate — the group sticks in EFFECT_FROM_* with the bar
 * frozen — so a take animates GCtba between these ends instead, and a cut jumps
 * straight to `to`. Returns { from, to } in GCtba units (0..65535).
 */
export function takeSweep(gcsta) {
  const live = liveCtx(gcsta);
  return { from: live === 1 ? GCTBA_MAX : 0, to: live === 1 ? 0 : GCTBA_MAX };
}

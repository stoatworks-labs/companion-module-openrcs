// Two things are checked. First the wire protocol (src/protocol.js), against
// the exact byte shapes the device uses — the same asymmetric framing pinned in
// the openrcs crate's conformance tests. Second the module surface loaded
// against the real `@companion-module/base`, because the traps that have bitten
// this fleet before — array variable definitions, 1.x preset shapes, a
// hardcoded variable prefix — either fail silently at runtime or kill init()
// outright, and are invisible to a protocol-only test.
import assert from "node:assert/strict";
import fs from "node:fs";
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

// ---------------------------------------------------------------------------
// The module surface, against the real @companion-module/base
// ---------------------------------------------------------------------------

const { default: ModuleInstance, UpgradeScripts } =
  await import("../src/main.js");

/** A stand-in for Companion that records what the module registered. */
function harness() {
  const recorded = {};
  const self = Object.create(ModuleInstance.prototype);
  self.state = { gcsta: {}, gcava: {}, model: null };
  // `label` is a getter on InstanceBase, so it has to be defined rather than
  // assigned — which is also the point of the test below: presets must build
  // their variable references from it.
  Object.defineProperty(self, "label", {
    value: "livecore-1",
    configurable: true,
  });
  self.config = { host: "", platform: "livecore" };
  self.setActionDefinitions = (v) => (recorded.actions = v);
  self.setFeedbackDefinitions = (v) => (recorded.feedbacks = v);
  self.setVariableDefinitions = (v) => {
    // Mirrors the real implementation, which THROWS on an array — failing
    // init() and leaving a dead connection with no actions and no visible
    // cause. rebuild() defines variables before presets, so this also takes
    // the preset library down with it.
    if (Array.isArray(v))
      throw new Error("Variable definitions should be an object, not an array");
    recorded.variableDefs = v;
  };
  self.setVariableValues = (v) =>
    (recorded.variableValues = { ...(recorded.variableValues ?? {}), ...v });
  self.setPresetDefinitions = (structure, presets) => {
    assert.ok(
      Array.isArray(structure),
      "preset structure must be the FIRST argument and an array",
    );
    assert.ok(
      presets && !Array.isArray(presets),
      "preset definitions must be the second argument, an object",
    );
    recorded.presetStructure = structure;
    recorded.presets = presets;
  };
  self.updateStatus = () => {};
  self.log = () => {};
  self.checkAllFeedbacks = () => (recorded.checkedAll = true);
  self.checkFeedbacks = () => {
    throw new Error(
      "bare checkFeedbacks() checks nothing — use checkAllFeedbacks()",
    );
  };
  self.rebuild.call(self);
  return { self, recorded };
}

const { self, recorded } = harness();

ok("registers the actions a surface needs", () => {
  for (const id of [
    "take_group",
    "cut_group",
    "tbar",
    "step_back",
    "recall_master",
    "recall_screen",
    "raw",
  ]) {
    assert.ok(recorded.actions[id], `missing action ${id}`);
  }
});

ok("feedbacks are boolean and carry a defaultStyle", () => {
  assert.ok(recorded.feedbacks.group_on_air_up);
  for (const [id, def] of Object.entries(recorded.feedbacks)) {
    assert.equal(def.type, "boolean", `${id} should be a boolean feedback`);
    assert.ok(def.defaultStyle, `${id} needs a defaultStyle`);
  }
});

ok("variable definitions are an object keyed by id, not an array", () => {
  assert.ok(recorded.variableDefs && !Array.isArray(recorded.variableDefs));
  for (const [id, d] of Object.entries(recorded.variableDefs)) {
    assert.ok(typeof id === "string" && id.length > 0);
    assert.ok(d.name, `${id} needs a name`);
    assert.ok(
      !("variableId" in d),
      `${id} keeps the 1.x variableId field, which belongs in the key`,
    );
  }
});

ok("every variable set has a definition, and vice versa", () => {
  const defined = new Set(Object.keys(recorded.variableDefs));
  for (const id of Object.keys(recorded.variableValues)) {
    assert.ok(
      defined.has(id),
      `${id} is set but never defined, so it renders as raw text`,
    );
  }
  for (const id of defined) {
    assert.ok(
      id in recorded.variableValues,
      `${id} is defined but never given a value`,
    );
  }
});

ok("every preset referenced in the structure exists", () => {
  const referenced = [];
  for (const section of recorded.presetStructure) {
    assert.ok(section.id && section.name, "sections need an id and a name");
    for (const entry of section.definitions) {
      if (typeof entry === "string") referenced.push(entry);
      else {
        assert.equal(entry.type, "simple", "groups must declare their type");
        assert.ok(entry.id && entry.name, "groups need an id and a name");
        referenced.push(...entry.presets);
      }
    }
  }
  for (const id of referenced)
    assert.ok(
      recorded.presets[id],
      `structure references a missing preset: ${id}`,
    );
  assert.equal(
    referenced.length,
    Object.keys(recorded.presets).length,
    "every preset should be reachable",
  );
  assert.equal(
    new Set(referenced).size,
    referenced.length,
    "a preset is referenced twice",
  );
});

ok("no preset carries a 1.x category field", () => {
  for (const [id, p] of Object.entries(recorded.presets)) {
    assert.ok(
      !("category" in p),
      `${id} uses the 1.x category field, which loads but never appears`,
    );
    assert.equal(
      p.type,
      "simple",
      `${id} should be type 'simple', not 'button'`,
    );
  }
});

ok(
  "preset variable references use the connection label, not the module id",
  () => {
    for (const [id, p] of Object.entries(recorded.presets)) {
      const text = p.style?.text ?? "";
      if (!text.includes("$(")) continue;
      assert.ok(
        text.includes(`$(${self.label}:`),
        `${id} hardcodes a variable prefix: ${text}`,
      );
    }
  },
);

ok("every preset action names a real action, with options it accepts", () => {
  for (const [id, p] of Object.entries(recorded.presets)) {
    for (const step of p.steps) {
      for (const a of step.down) {
        const def = recorded.actions[a.actionId];
        assert.ok(def, `${id} references unknown action ${a.actionId}`);
        const fields = new Set(def.options.map((o) => o.id));
        for (const key of Object.keys(a.options ?? {}))
          assert.ok(
            fields.has(key),
            `${id} passes option "${key}", which ${a.actionId} does not define`,
          );
      }
    }
  }
});

ok("every preset feedback names a real feedback", () => {
  for (const [id, p] of Object.entries(recorded.presets)) {
    for (const f of p.feedbacks) {
      assert.ok(
        recorded.feedbacks[f.feedbackId],
        `${id} references unknown feedback ${f.feedbackId}`,
      );
    }
  }
});

ok("variables are populated, and report honestly when disconnected", () => {
  assert.equal(recorded.variableValues.connection, "Disconnected");
  assert.equal(recorded.variableValues.platform, "livecore");
});

ok("the module exports UpgradeScripts, and no runEntrypoint call", () => {
  assert.ok(
    Array.isArray(UpgradeScripts),
    "base 2.x needs UpgradeScripts re-exported",
  );
  const source = fs.readFileSync(
    new URL("../src/main.js", import.meta.url),
    "utf8",
  );
  assert.ok(
    !/runEntrypoint\s*\(/.test(source),
    "runEntrypoint does not exist in base 2.x and breaks packaging",
  );
});

// --- the parseVariablesInString trap ----------------------------------------
// `parseVariablesInString` and `parseVariablesInField` were removed from
// @companion-module/base 2.x. Neither is on the callback context, on
// InstanceBase, or anywhere in the package. Companion expands a `useVariables` option itself before invoking the
// callback, so the option arrives already resolved: the call is redundant as
// well as fatal, throwing "... is not a function" the moment
// that one action or feedback fires. Nothing else catches it — the module
// loads, init() succeeds, every definition registers, and every path that does
// not make the call keeps working, so the suite passes with the bug live. This
// fixture no longer stubs either function, so a reintroduced call now throws
// here too; the grep is the backstop for a path the fixture never exercises. It
// matches the call form only, so prose naming the functions stays legal.
const { readdirSync: pvReadDir, readFileSync: pvReadFile } =
  await import("node:fs");
const pvOffenders = () => {
  const dir = new URL("../src/", import.meta.url).pathname;
  const bad = [];
  for (const f of pvReadDir(dir)) {
    if (!/\.(js|ts)$/.test(f)) continue;
    if (/parseVariablesIn(String|Field)\s*\(/.test(pvReadFile(dir + f, "utf8")))
      bad.push(f);
  }
  return bad;
};

ok("no parseVariablesInString/Field call survives in src/", () => {
  assert.deepEqual(
    pvOffenders(),
    [],
    "read the already-resolved event.options value instead",
  );
});

// Companion keys an installed module on id + version and discards a reinstall
// whose pair it already has. If companion/manifest.json lags package.json, every
// release after the manifest's version is silently refused by any Companion that
// already has the module — the update appears to work and changes nothing.
ok("companion/manifest.json version matches package.json", () => {
  const read = (p) =>
    JSON.parse(pvReadFile(new URL(p, import.meta.url).pathname, "utf8"));
  assert.equal(
    read("../companion/manifest.json").version,
    read("../package.json").version,
    "bump both, or the release never reaches an existing install",
  );
});

console.log(`\n${n} checks passed.`);

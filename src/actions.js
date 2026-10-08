import { socket } from "./api.js";
import {
  recallMasterSteps,
  recallScreenSteps,
  loadMultiviewerSteps,
} from "./protocol.js";

const sendSteps = (self, steps) => {
  for (const [m, idx, v] of steps) socket.set(self, m, idx, v);
};

// One-based in the UI, zero-based on the wire: a "screen/group" of 1 is group
// index 0. An ungrouped screen is its own group, so screen N maps to group N-1
// unless screens have been grouped on the device.
const groupField = {
  type: "number",
  id: "group",
  label: "Screen / group",
  default: 1,
  min: 1,
  max: 16,
};
const timeField = {
  type: "number",
  id: "time",
  label: "Transition (ms)",
  default: 1000,
  min: 0,
  max: 3000,
};
const masterSlot = {
  type: "number",
  id: "slot",
  label: "Memory (1–144)",
  default: 1,
  min: 1,
  max: 144,
};

export default function UpdateActions(self) {
  self.setActionDefinitions({
    take_group: {
      name: "Take — screen/group",
      options: [groupField, timeField],
      callback: async (e) =>
        socket.take(self, Number(e.options.group) - 1, Number(e.options.time)),
    },
    cut_group: {
      name: "Cut — screen/group",
      options: [groupField],
      callback: async (e) => socket.cut(self, Number(e.options.group) - 1),
    },
    tbar: {
      name: "T-bar — screen/group",
      options: [
        groupField,
        {
          type: "number",
          id: "value",
          label: "Position (0–65535; scaled to a Midra's 0–10000)",
          default: 0,
          min: 0,
          max: 65535,
        },
      ],
      callback: async (e) =>
        socket.tbar(self, Number(e.options.group) - 1, Number(e.options.value)),
    },
    step_back: {
      name: "Step back — screen/group",
      options: [groupField],
      callback: async (e) => socket.stepBack(self, Number(e.options.group) - 1),
    },
    recall_master: {
      name: "Recall master memory",
      options: [
        masterSlot,
        {
          type: "checkbox",
          id: "take",
          label: "Take (else load to preview)",
          default: true,
        },
      ],
      callback: async (e) =>
        sendSteps(
          self,
          recallMasterSteps(Number(e.options.slot) - 1, e.options.take),
        ),
    },
    recall_screen: {
      name: "Recall screen memory",
      options: [
        {
          type: "number",
          id: "screen",
          label: "Screen (1–8)",
          default: 1,
          min: 1,
          max: 8,
        },
        masterSlot,
        {
          type: "checkbox",
          id: "take",
          label: "Take (else load to preview)",
          default: true,
        },
      ],
      callback: async (e) =>
        sendSteps(
          self,
          recallScreenSteps(
            Number(e.options.screen) - 1,
            Number(e.options.slot) - 1,
            e.options.take,
          ),
        ),
    },
    load_multiviewer: {
      name: "Load multiviewer layout (LiveCore)",
      options: [
        {
          type: "number",
          id: "memory",
          label: "Layout memory (1–8)",
          default: 1,
          min: 1,
          max: 8,
        },
        {
          type: "number",
          id: "monitor",
          label: "Monitoring output (1–2)",
          default: 1,
          min: 1,
          max: 2,
        },
      ],
      callback: async (e) =>
        sendSteps(
          self,
          loadMultiviewerSteps(
            Number(e.options.memory) - 1,
            Number(e.options.monitor) - 1,
          ),
        ),
    },
    freeze_input: {
      name: "Freeze / unfreeze input",
      options: [
        {
          type: "number",
          id: "input",
          label: "Input (1–24)",
          default: 1,
          min: 1,
          max: 24,
        },
        { type: "checkbox", id: "on", label: "Freeze", default: true },
      ],
      callback: async (e) =>
        socket.set(
          self,
          "INfrz",
          [Number(e.options.input) - 1],
          e.options.on ? 1 : 0,
        ),
    },
    output_black: {
      name: "Output black on/off",
      options: [
        {
          type: "number",
          id: "output",
          label: "Output (1–8)",
          default: 1,
          min: 1,
          max: 8,
        },
        { type: "checkbox", id: "on", label: "Black", default: true },
      ],
      callback: async (e) =>
        socket.set(
          self,
          "OUbla",
          [Number(e.options.output) - 1],
          e.options.on ? 1 : 0,
        ),
    },
    raw: {
      name: "Raw command",
      options: [
        {
          type: "textinput",
          id: "line",
          label: 'Command line (mnemonic last, e.g. "1,5000GCtba")',
          default: "",
          useVariables: true,
        },
      ],
      // The option arrives already expanded: Companion resolves a
      // `useVariables` field before invoking the callback.
      // `parseVariablesInString` does not exist in base 2.x — on the context or
      // on InstanceBase — and calling it throws when the action fires, while
      // the module still loads cleanly.
      callback: (e) => {
        const line = String(e.options.line ?? "");
        if (line.trim()) socket.raw(self, line.trim());
      },
    },
  });
}

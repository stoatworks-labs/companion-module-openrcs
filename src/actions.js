import { socket } from "./api.js";

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
          label: "Position (0–65535)",
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
      callback: async (e) =>
        socket.set(self, "GCstb", [Number(e.options.group) - 1], 1),
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
      callback: async (e) => {
        const slot = Number(e.options.slot) - 1;
        socket.set(self, "PSmet", [], slot);
        socket.set(self, e.options.take ? "PSlot" : "PSloa", [], 1);
      },
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
      callback: async (e) => {
        socket.set(self, "PMscf", [], Number(e.options.screen) - 1);
        socket.set(self, "PMmet", [], Number(e.options.slot) - 1);
        socket.set(self, e.options.take ? "PMlot" : "PMloa", [], 1);
      },
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
      callback: async (e) => {
        const line = await self.parseVariablesInString(e.options.line);
        if (line.trim()) socket.raw(self, line.trim());
      },
    },
  });
}

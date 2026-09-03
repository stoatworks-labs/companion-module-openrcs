import { socket } from "./api.js";

// Variable definitions are an OBJECT keyed by id in base 2.x, not the 1.x array
// of `{ variableId, name }`. The real implementation THROWS on an array, which
// fails init() and leaves a dead connection with no actions and no visible
// cause — and, because rebuild() defines variables before presets, it also
// takes the preset library down with it.
export default function UpdateVariableDefinitions(self) {
  const defs = {
    connection: { name: "Connection status" },
    model: { name: "Device model id" },
    platform: { name: "Platform" },
  };
  for (let g = 1; g <= 16; g++)
    defs[`group_${g}_bank`] = { name: `Screen/group ${g} on-air bank` };
  self.setVariableDefinitions(defs);
}

export function refreshVariables(self) {
  const values = {
    connection:
      self.state && socket.tcp && socket.tcp.isConnected
        ? "Connected"
        : "Disconnected",
    model: self.state?.model ?? "—",
    platform: self.config?.platform ?? "",
  };
  for (let g = 1; g <= 16; g++) {
    const bank = socket.liveBank(self, g - 1);
    values[`group_${g}_bank`] =
      (self.state?.gcava?.[g - 1] ?? 0) === 1 ? (bank === 1 ? "B" : "A") : "—";
  }
  self.setVariableValues(values);
}

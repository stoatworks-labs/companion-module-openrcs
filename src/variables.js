import { socket } from "./api.js";

export default function UpdateVariableDefinitions(self) {
  const defs = [
    { variableId: "connection", name: "Connection status" },
    { variableId: "model", name: "Device model id" },
    { variableId: "platform", name: "Platform" },
  ];
  for (let g = 1; g <= 16; g++)
    defs.push({
      variableId: `group_${g}_bank`,
      name: `Screen/group ${g} on-air bank`,
    });
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

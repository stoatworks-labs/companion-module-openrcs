import { combineRgb } from "@companion-module/base";
import { socket } from "./api.js";
import { GRP_AT_UP } from "./protocol.js";

const RED = combineRgb(229, 72, 77);
const AMBER = combineRgb(240, 160, 32);
const WHITE = combineRgb(255, 255, 255);
const BLACK = combineRgb(0, 0, 0);

export default function UpdateFeedbacks(self) {
  self.setFeedbackDefinitions({
    group_on_air_up: {
      type: "boolean",
      name: "Screen/group is on air (bank B / up)",
      defaultStyle: { bgcolor: RED, color: WHITE },
      options: [
        {
          type: "number",
          id: "group",
          label: "Screen / group",
          default: 1,
          min: 1,
          max: 16,
        },
      ],
      callback: (fb) =>
        socket.liveBank(self, Number(fb.options.group) - 1) === 1,
    },
    group_transitioning: {
      type: "boolean",
      name: "Screen/group is transitioning",
      defaultStyle: { bgcolor: AMBER, color: BLACK },
      options: [
        {
          type: "number",
          id: "group",
          label: "Screen / group",
          default: 1,
          min: 1,
          max: 16,
        },
      ],
      callback: (fb) => {
        const st = self.state?.gcsta?.[Number(fb.options.group) - 1];
        return st === 2 || st === 3;
      },
    },
    group_available: {
      type: "boolean",
      name: "Screen/group is available",
      defaultStyle: { color: WHITE },
      options: [
        {
          type: "number",
          id: "group",
          label: "Screen / group",
          default: 1,
          min: 1,
          max: 16,
        },
      ],
      callback: (fb) =>
        (self.state?.gcava?.[Number(fb.options.group) - 1] ?? 0) === 1,
    },
  });
  void GRP_AT_UP;
}

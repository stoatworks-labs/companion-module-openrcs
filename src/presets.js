import { combineRgb } from "@companion-module/base";

const WHITE = combineRgb(255, 255, 255);
const BLACK = combineRgb(0, 0, 0);
const DARK = combineRgb(20, 24, 30);
const RED = combineRgb(229, 72, 77);

export default function UpdatePresets(self) {
  const presets = {};

  // Take / cut for screens/groups 1–4, with an on-air tally.
  for (let g = 1; g <= 4; g++) {
    presets[`take_${g}`] = {
      type: "button",
      category: "Take",
      name: `Take screen/group ${g}`,
      style: { text: `TAKE\\n${g}`, size: "18", color: WHITE, bgcolor: DARK },
      steps: [
        {
          down: [{ actionId: "take_group", options: { group: g, time: 1000 } }],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: "group_on_air_up",
          options: { group: g },
          style: { bgcolor: RED, color: WHITE },
        },
      ],
    };
    presets[`cut_${g}`] = {
      type: "button",
      category: "Take",
      name: `Cut screen/group ${g}`,
      style: { text: `CUT\\n${g}`, size: "18", color: WHITE, bgcolor: DARK },
      steps: [
        { down: [{ actionId: "cut_group", options: { group: g } }], up: [] },
      ],
      feedbacks: [],
    };
  }

  // Recall master memories 1–8, take on press.
  for (let m = 1; m <= 8; m++) {
    presets[`master_${m}`] = {
      type: "button",
      category: "Master memories",
      name: `Recall master memory ${m}`,
      style: {
        text: `MEM\\n${m}`,
        size: "18",
        color: BLACK,
        bgcolor: combineRgb(63, 185, 80),
      },
      steps: [
        {
          down: [
            { actionId: "recall_master", options: { slot: m, take: true } },
          ],
          up: [],
        },
      ],
      feedbacks: [],
    };
  }

  self.setPresetDefinitions(presets);
}

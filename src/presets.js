import { combineRgb } from "@companion-module/base";

/**
 * The preset library.
 *
 * Note `setPresetDefinitions` takes TWO arguments in base 2.x — a structure of
 * sections and groups, then a flat object of definitions keyed by id. Grouping
 * comes from that structure. A 1.x-style `category` field on a definition still
 * loads, and the presets simply never appear, which reads as a rendering bug
 * rather than a mistake. `type` is `'simple'` in 2.x, not `'button'`.
 */

const WHITE = combineRgb(255, 255, 255);
const BLACK = combineRgb(0, 0, 0);
const DARK = combineRgb(20, 24, 30);
const RED = combineRgb(229, 72, 77);
const GREEN = combineRgb(63, 185, 80);

/** How many of each to generate. Enough to fill a page, not the whole bank. */
const GROUPS = 4;
const MASTER_MEMORIES = 8;

const button = (
  name,
  text,
  bgcolor,
  actions,
  feedbacks = [],
  color = WHITE,
) => ({
  type: "simple",
  name,
  style: { text, size: "18", color, bgcolor },
  steps: [{ down: actions, up: [] }],
  feedbacks,
});

export default function UpdatePresets(self) {
  const presets = {};
  const sections = [];

  // --- Transport ----------------------------------------------------------

  // Take / cut for screens/groups 1–4, with an on-air tally.
  const takeIds = [];
  const cutIds = [];
  for (let g = 1; g <= GROUPS; g++) {
    const takeId = `take_${g}`;
    presets[takeId] = button(
      `Take screen/group ${g}`,
      `TAKE\n${g}`,
      DARK,
      [{ actionId: "take_group", options: { group: g, time: 1000 } }],
      [
        {
          feedbackId: "group_on_air_up",
          options: { group: g },
          style: { bgcolor: RED, color: WHITE },
        },
      ],
    );
    takeIds.push(takeId);

    const cutId = `cut_${g}`;
    presets[cutId] = button(`Cut screen/group ${g}`, `CUT\n${g}`, DARK, [
      { actionId: "cut_group", options: { group: g } },
    ]);
    cutIds.push(cutId);
  }

  sections.push({
    id: "transport",
    name: "Take",
    description:
      "Transition preview to program. These reach air — nothing else here does. A take sweeps the T-bar over the transition time; a cut jumps straight across.",
    definitions: [
      { id: "take", type: "simple", name: "Take", presets: takeIds },
      { id: "cut", type: "simple", name: "Cut", presets: cutIds },
    ],
  });

  // --- Master memories ----------------------------------------------------

  // Recall master memories 1–8, take on press.
  const masterIds = [];
  for (let m = 1; m <= MASTER_MEMORIES; m++) {
    const id = `master_${m}`;
    presets[id] = button(
      `Recall master memory ${m}`,
      `MEM\n${m}`,
      GREEN,
      [{ actionId: "recall_master", options: { slot: m, take: true } }],
      [],
      BLACK,
    );
    masterIds.push(id);
  }

  sections.push({
    id: "master_memories",
    name: "Master memories",
    description:
      "Recall a whole-desk memory and take it. Drop the take in the action's options to load to preview instead.",
    definitions: [
      { id: "master", type: "simple", name: "Master", presets: masterIds },
    ],
  });

  self.setPresetDefinitions(sections, presets);
}

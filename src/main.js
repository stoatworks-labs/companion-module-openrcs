import {
  InstanceBase,
  Regex,
  runEntrypoint,
  InstanceStatus,
} from "@companion-module/base";
import { UpgradeScripts } from "./upgrades.js";
import UpdateActions from "./actions.js";
import UpdateFeedbacks from "./feedbacks.js";
import UpdateVariableDefinitions, { refreshVariables } from "./variables.js";
import UpdatePresets from "./presets.js";
import { socket } from "./api.js";
import { PLATFORMS } from "./protocol.js";
import { aboutField } from "./about-field.js";

class ModuleInstance extends InstanceBase {
  constructor(internal) {
    super(internal);
    this.state = { gcsta: {}, gcava: {}, model: null };
  }

  async init(config) {
    this.config = config;
    this.onStateChanged = () => {
      refreshVariables(this);
      this.checkAllFeedbacks();
    };
    this.rebuild();
    this.updateStatus(InstanceStatus.Connecting);
    socket.connect(this);
  }

  async destroy() {
    socket.close();
  }

  async configUpdated(config) {
    this.config = config;
    socket.close();
    this.rebuild();
    socket.connect(this);
  }

  rebuild() {
    UpdateActions(this);
    UpdateFeedbacks(this);
    UpdateVariableDefinitions(this);
    UpdatePresets(this);
    refreshVariables(this);
  }

  getConfigFields() {
    return [
      {
        type: "static-text",
        id: "info",
        width: 12,
        label: "Connection",
        value:
          "Point this at an Analog Way LiveCore or Midra processor. The control protocol is <b>unauthenticated</b> on TCP 10500 — anyone who can reach the port can drive the switcher, so keep it on a trusted network. The device also accepts very few concurrent control sessions; if openrcs-server or the vendor client already holds one, this module may not connect.",
      },
      {
        type: "textinput",
        id: "host",
        label: "Processor IP",
        width: 8,
        default: "",
        regex: Regex.IP,
      },
      {
        type: "dropdown",
        id: "platform",
        label: "Platform",
        width: 4,
        default: "livecore",
        choices: Object.entries(PLATFORMS).map(([id, p]) => ({
          id,
          label: p.label,
        })),
      },
      aboutField(),
    ];
  }
}

runEntrypoint(ModuleInstance, UpgradeScripts);

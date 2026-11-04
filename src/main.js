import { InstanceBase, InstanceStatus } from "@companion-module/base";
import { UpgradeScripts } from "./upgrades.js";
import UpdateActions from "./actions.js";
import UpdateFeedbacks from "./feedbacks.js";
import UpdateVariableDefinitions, { refreshVariables } from "./variables.js";
import UpdatePresets from "./presets.js";
import { socket } from "./api.js";
import { PLATFORMS } from "./protocol.js";
import { aboutField } from "./about-field.js";

export default class ModuleInstance extends InstanceBase {
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
      // A plain text field rather than Regex.IP, which base 2.2.2 deprecated.
      // The TCP connection takes a hostname or an IPv6 address as readily as
      // an IPv4 one.
      {
        type: "textinput",
        id: "host",
        label: "Processor IP",
        tooltip: "IP address (IPv4 or IPv6) or hostname of the processor",
        width: 8,
        minLength: 1,
        default: "",
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

export { UpgradeScripts };

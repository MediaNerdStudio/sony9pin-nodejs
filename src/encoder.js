// Minimal Sony 9-pin (RS-422) encoder for Node.js
// Packet: [CMD1, CMD2, ...DATA, CHECKSUM]
// CHECKSUM = (sum of all previous bytes) & 0xFF

export const Cmd1 = {
  SYSTEM_CONTROL: 0x00,
  SYSTEM_CONTROL_RETURN: 0x10,
  TRANSPORT_CONTROL: 0x20,
  PRESET_SELECT_CONTROL: 0x40,
  SENSE_REQUEST: 0x60,
  SENSE_RETURN: 0x70,
};

export const SystemCtrl = {
  LOCAL_DISABLE: 0x0C,
  DEVICE_TYPE: 0x11,
  LOCAL_ENABLE: 0x1D,
};

export const TransportCtrl = {
  STOP: 0x00,
  PLAY: 0x01,
  RECORD: 0x02,
  STANDBY_OFF: 0x04,
  STANDBY_ON: 0x05,
  EJECT: 0x0F,
  FAST_FWD: 0x10,
  JOG_FWD: 0x11,
  VAR_FWD: 0x12,
  SHUTTLE_FWD: 0x13,
  FRAME_STEP_FWD: 0x14,
  FAST_REVERSE: 0x20,
  REWIND: 0x20,
  JOG_REV: 0x21,
  VAR_REV: 0x22,
  SHUTTLE_REV: 0x23,
  FRAME_STEP_REV: 0x24,
  PREROLL: 0x30,
  CUE_UP_WITH_DATA: 0x31,
  SYNC_PLAY: 0x34,
  PROG_SPEED_PLAY_PLUS: 0x38,
  PROG_SPEED_PLAY_MINUS: 0x39,
  PREVIEW: 0x40,
  REVIEW: 0x41,
};

export const PresetSelectCtrl = {
  IN_ENTRY: 0x10,
  OUT_ENTRY: 0x11,
  IN_DATA_PRESET: 0x14,
  OUT_DATA_PRESET: 0x15,
  PREROLL_PRESET: 0x31,
  AUTO_MODE_OFF: 0x40,
  AUTO_MODE_ON: 0x41,
  INPUT_CHECK: 0x37,
};

export const SenseRequest = {
  TC_GEN_SENSE: 0x0A,
  CURRENT_TIME_SENSE: 0x0C,
  IN_DATA_SENSE: 0x10,
  OUT_DATA_SENSE: 0x11,
  STATUS_SENSE: 0x20,
};

// Current Time Sense flags (data1)
export const CurrentTimeSenseFlag = {
  LTC_TC: 0x01,
  VITC_TC: 0x02,
  AUTO: 0x03, // best available per Sony: auto-selects LTC/VITC; returns corrected LTC if neither good
  TIMER_1: 0x04,
  TIMER_2: 0x08,
  LTC_UB: 0x10,
  VITC_UB: 0x20,
};

export function checksum(bytes) {
  let sum = 0;
  for (const b of bytes) sum = (sum + (b & 0xFF)) & 0xFF;
  return sum & 0xFF;
}

export function buildPacket(cmd1, cmd2, data = []) {
  const header = ((cmd1 & 0xF0) | (data.length & 0x0F)) & 0xFF;
  const body = [header, cmd2 & 0xFF, ...data.map(v => v & 0xFF)];
  const cs = checksum(body);
  return Buffer.from([...body, cs]);
}

export function encode(cmd1, cmd2, data = []) { return buildPacket(cmd1, cmd2, data); }

function bcd(n) {
  const v = Math.max(0, Math.min(99, n | 0));
  const tens = Math.floor(v / 10);
  const ones = v % 10;
  return ((tens & 0x0F) << 4) | (ones & 0x0F);
}

// Convenience encoders
export const Encoder = {
  // System control
  localDisable: () => buildPacket(Cmd1.SYSTEM_CONTROL, SystemCtrl.LOCAL_DISABLE),
  deviceType: () => buildPacket(Cmd1.SYSTEM_CONTROL, SystemCtrl.DEVICE_TYPE),
  localEnable: () => buildPacket(Cmd1.SYSTEM_CONTROL, SystemCtrl.LOCAL_ENABLE),

  // Transport
  stop: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.STOP),
  play: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.PLAY),
  record: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.RECORD),
  standbyOff: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.STANDBY_OFF),
  standbyOn: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.STANDBY_ON),
  eject: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.EJECT),
  fastForward: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.FAST_FWD),
  rewind: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.REWIND),
  preroll: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.PREROLL),
  preview: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.PREVIEW),
  review: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.REVIEW),
  syncPlay: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.SYNC_PLAY),
  // Cue Up With Data expects time in BCD and in the order: FF, SS, MM, HH
  cueUpWithData: (hh, mm, ss, ff) => buildPacket(
    Cmd1.TRANSPORT_CONTROL,
    TransportCtrl.CUE_UP_WITH_DATA,
    [bcd(ff), bcd(ss), bcd(mm), bcd(hh)]
  ),
  frameStepForward: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.FRAME_STEP_FWD),
  frameStepReverse: () => buildPacket(Cmd1.TRANSPORT_CONTROL, TransportCtrl.FRAME_STEP_REV),
  // Jog/Var/Shuttle helpers accept signed speed (-0x7F..+0x7F); magnitude is 1 byte
  jog: (delta) => {
    const v = Math.max(-0x7F, Math.min(0x7F, delta|0));
    const cmd2 = v >= 0 ? TransportCtrl.JOG_FWD : TransportCtrl.JOG_REV;
    return buildPacket(Cmd1.TRANSPORT_CONTROL, cmd2, [Math.abs(v) & 0x7F]);
  },
  varSpeed: (speed) => {
    const v = Math.max(-0x7F, Math.min(0x7F, speed|0));
    const cmd2 = v >= 0 ? TransportCtrl.VAR_FWD : TransportCtrl.VAR_REV;
    return buildPacket(Cmd1.TRANSPORT_CONTROL, cmd2, [Math.abs(v) & 0x7F]);
  },
  shuttle: (speed) => {
    const v = Math.max(-0x7F, Math.min(0x7F, speed|0));
    const cmd2 = v >= 0 ? TransportCtrl.SHUTTLE_FWD : TransportCtrl.SHUTTLE_REV;
    return buildPacket(Cmd1.TRANSPORT_CONTROL, cmd2, [Math.abs(v) & 0x7F]);
  },

  // Sense
  statusSense: (start = 0, size = 10) => {
    const v = ((start & 0x0F) << 4) | (size & 0x0F);
    return buildPacket(Cmd1.SENSE_REQUEST, SenseRequest.STATUS_SENSE, [v]);
  },
  currentTimeSense: (flag /* use CurrentTimeSenseFlag */ = 0x01) => buildPacket(Cmd1.SENSE_REQUEST, SenseRequest.CURRENT_TIME_SENSE, [flag & 0xFF]),
  tcGenSense: () => buildPacket(Cmd1.SENSE_REQUEST, SenseRequest.TC_GEN_SENSE),
  inDataSense: () => buildPacket(Cmd1.SENSE_REQUEST, SenseRequest.IN_DATA_SENSE),
  outDataSense: () => buildPacket(Cmd1.SENSE_REQUEST, SenseRequest.OUT_DATA_SENSE),

  // Preset / Select
  inEntry: () => buildPacket(Cmd1.PRESET_SELECT_CONTROL, PresetSelectCtrl.IN_ENTRY),
  outEntry: () => buildPacket(Cmd1.PRESET_SELECT_CONTROL, PresetSelectCtrl.OUT_ENTRY),
  inDataPreset: (hh, mm, ss, ff) => buildPacket(Cmd1.PRESET_SELECT_CONTROL, PresetSelectCtrl.IN_DATA_PRESET, [hh, mm, ss, ff]),
  outDataPreset: (hh, mm, ss, ff) => buildPacket(Cmd1.PRESET_SELECT_CONTROL, PresetSelectCtrl.OUT_DATA_PRESET, [hh, mm, ss, ff]),
  prerollPreset: (hh, mm, ss, ff) => buildPacket(Cmd1.PRESET_SELECT_CONTROL, PresetSelectCtrl.PREROLL_PRESET, [hh, mm, ss, ff]),
  autoModeOn: () => buildPacket(Cmd1.PRESET_SELECT_CONTROL, PresetSelectCtrl.AUTO_MODE_ON),
  autoModeOff: () => buildPacket(Cmd1.PRESET_SELECT_CONTROL, PresetSelectCtrl.AUTO_MODE_OFF),
  inputCheck: () => buildPacket(Cmd1.PRESET_SELECT_CONTROL, PresetSelectCtrl.INPUT_CHECK),

  // Generic
  encode,
};

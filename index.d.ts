export interface VTR422Options {
  portPath?: string;
  baudRate?: number;
  dataBits?: number;
  parity?: 'none' | 'even' | 'odd';
  stopBits?: number;
  autoOpen?: boolean;
  debug?: boolean;
}

export interface Timecode {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
  dropFrame: boolean;
  colorFrame: boolean;
}

export type NakReason = 'UNKNOWN_CMD' | 'CHECKSUM_ERROR' | 'PARITY_ERROR' | 'BUFFER_OVERRUN' | 'FRAMING_ERROR' | 'TIMEOUT';

export interface AckEvent { type: 'ack' }
export interface NakEvent { type: 'nak'; reasons: NakReason[] }
export interface DeviceTypeEvent { type: 'device_type'; deviceType: number }
export interface StatusEvent { type: 'status'; flags: string[] }
export interface TimecodeEvent { type: 'timecode'; timecode: Timecode }
export interface RawEvent { type: 'raw'; text: string }

export class VTR422 {
  constructor(options?: VTR422Options);
  isOpen(): boolean;
  open(): Promise<void>;
  close(): Promise<void>;

  // Transport
  play(): Promise<void>;
  stop(): Promise<void>;
  record(): Promise<void>;
  standbyOn(): Promise<void>;
  standbyOff(): Promise<void>;
  eject(): Promise<void>;
  fastForward(): Promise<void>;
  rewind(): Promise<void>;
  syncPlay(): Promise<void>;
  preroll(): Promise<void>;
  preview(): Promise<void>;
  review(): Promise<void>;
  cueUpWithData(hh: number, mm: number, ss: number, ff: number): Promise<void>;

  // Sense
  statusSense(start?: number, size?: number): Promise<void>;
  currentTimeSense(flag?: number): Promise<void>;
  deviceType(): Promise<void>;

  // Generic
  sendCommand(cmd1: number, cmd2: number, data?: number[]): Promise<void>;

  // EventEmitter (subset)
  on(event: 'ack', listener: (e: AckEvent) => void): this;
  on(event: 'nak', listener: (e: NakEvent) => void): this;
  on(event: 'device_type', listener: (e: DeviceTypeEvent) => void): this;
  on(event: 'status', listener: (e: StatusEvent) => void): this;
  on(event: 'timecode', listener: (e: TimecodeEvent) => void): this;
  on(event: 'raw', listener: (e: RawEvent) => void): this;
}

export const Cmd1: {
  SYSTEM_CONTROL: number;
  SYSTEM_CONTROL_RETURN: number;
  TRANSPORT_CONTROL: number;
  PRESET_SELECT_CONTROL: number;
  SENSE_REQUEST: number;
  SENSE_RETURN: number;
};

export const SystemCtrl: {
  LOCAL_DISABLE: number;
  DEVICE_TYPE: number;
  LOCAL_ENABLE: number;
};

export const TransportCtrl: {
  STOP: number;
  PLAY: number;
  RECORD: number;
  STANDBY_OFF: number;
  STANDBY_ON: number;
  EJECT: number;
  FAST_FWD: number;
  JOG_FWD: number;
  VAR_FWD: number;
  SHUTTLE_FWD: number;
  FRAME_STEP_FWD: number;
  REWIND: number;
  JOG_REV: number;
  VAR_REV: number;
  SHUTTLE_REV: number;
  FRAME_STEP_REV: number;
  PREROLL: number;
  CUE_UP_WITH_DATA: number;
  SYNC_PLAY: number;
  PROG_SPEED_PLAY_PLUS: number;
  PROG_SPEED_PLAY_MINUS: number;
  PREVIEW: number;
  REVIEW: number;
};

export const PresetSelectCtrl: {
  IN_ENTRY: number;
  OUT_ENTRY: number;
  IN_DATA_PRESET: number;
  OUT_DATA_PRESET: number;
  PREROLL_PRESET: number;
  AUTO_MODE_OFF: number;
  AUTO_MODE_ON: number;
  INPUT_CHECK: number;
};

export const SenseRequest: {
  TC_GEN_SENSE: number;
  CURRENT_TIME_SENSE: number;
  IN_DATA_SENSE: number;
  OUT_DATA_SENSE: number;
  STATUS_SENSE: number;
};

export const CurrentTimeSenseFlag: {
  LTC_TC: number;
  VITC_TC: number;
  AUTO: number;
  TIMER_1: number;
  TIMER_2: number;
  LTC_UB: number;
  VITC_UB: number;
};

export const Encoder: {
  // system
  localDisable(): Buffer;
  deviceType(): Buffer;
  localEnable(): Buffer;
  // transport
  stop(): Buffer;
  play(): Buffer;
  record(): Buffer;
  standbyOff(): Buffer;
  standbyOn(): Buffer;
  eject(): Buffer;
  fastForward(): Buffer;
  rewind(): Buffer;
  preroll(): Buffer;
  preview(): Buffer;
  review(): Buffer;
  syncPlay(): Buffer;
  cueUpWithData(hh: number, mm: number, ss: number, ff: number): Buffer;
  frameStepForward(): Buffer;
  frameStepReverse(): Buffer;
  jog(delta: number): Buffer;
  varSpeed(speed: number): Buffer;
  shuttle(speed: number): Buffer;
  // sense
  statusSense(start?: number, size?: number): Buffer;
  currentTimeSense(flag?: number): Buffer;
  tcGenSense(): Buffer;
  inDataSense(): Buffer;
  outDataSense(): Buffer;
  // preset/select
  inEntry(): Buffer;
  outEntry(): Buffer;
  inDataPreset(h: number, m: number, s: number, f: number): Buffer;
  outDataPreset(h: number, m: number, s: number, f: number): Buffer;
  prerollPreset(h: number, m: number, s: number, f: number): Buffer;
  autoModeOn(): Buffer;
  autoModeOff(): Buffer;
  inputCheck(): Buffer;
  // generic
  encode(cmd1: number, cmd2: number, data?: number[]): Buffer;
};

export class BlackmagicAMP {
  constructor(vtr: VTR422);
  send(cmd1: number, cmd2: number, data?: number[]): Promise<void>;
  raw(cmd1: number, cmd2: number, data?: number[]): Promise<void>;
  timecodeAuto(): Promise<void>;
  pollTimecode(opts?: { intervalMs?: number; durationMs?: number }): Promise<void>;
  dmcSetFwd(): Promise<void>;
  dmcSetRev(): Promise<void>;
}

export class Odetics {
  constructor(vtr: VTR422);
  send(cmd1: number, cmd2: number, data?: number[]): Promise<void>;
  raw(cmd1: number, cmd2: number, data?: number[]): Promise<void>;
  timecodeAuto(): Promise<void>;
  pollTimecode(opts?: { intervalMs?: number; durationMs?: number }): Promise<void>;
  previewInReset(): Promise<void>;
  previewOutReset(): Promise<void>;
  listFirstId(): Promise<void>;
  listNextId(): Promise<void>;
  longestContiguousAvailableStorage(): Promise<void>;
  deviceIdRequest(): Promise<void>;
  eraseSegment(): Promise<void>;
  listClipTc(): Promise<void>;
  listClipTcEVS(): Promise<void>;
  idStatusRequest(): Promise<void>;
  setDeviceId(...bytes: number[]): Promise<void>;
  recordCueUpWithData(cmd1Variant?: number, ...data: number[]): Promise<void>;
  previewInPreset(cmd1Variant?: number, ...data: number[]): Promise<void>;
  previewOutPreset(cmd1Variant?: number, ...data: number[]): Promise<void>;
  eraseId(cmd1Variant?: number, ...idBytes: number[]): Promise<void>;
  getEvent(): Promise<void>;
  setTargetMachine(...bytes: number[]): Promise<void>;
  setIdForData(...idBytes: number[]): Promise<void>;
  setData(...dataBytes: number[]): Promise<void>;
  getData(...idBytes: number[]): Promise<void>;
  makeClip(cmd1Variant?: number, ...bytes: number[]): Promise<void>;
  setIDEVSStatus(...bytes: number[]): Promise<void>;
  listClipProtectTC(...idBytes: number[]): Promise<void>;
  getKeyword(...idBytes: number[]): Promise<void>;
  setKeyword1(...idBytes: number[]): Promise<void>;
  setKeyword2(...bytes: number[]): Promise<void>;
  idLsmToLouth(...bytes: number[]): Promise<void>;
  idLouthToLsm(...bytes: number[]): Promise<void>;
  netMoveClipIdVDCP(...bytes: number[]): Promise<void>;
  netMoveClipIdLsm1(...bytes: number[]): Promise<void>;
  netMoveClipIdLsm2(...bytes: number[]): Promise<void>;
  netCopyClipIdVDCP1(...bytes: number[]): Promise<void>;
  netCopyClipIdVDCP2(...bytes: number[]): Promise<void>;
  netCopyClipIdLsm1(...bytes: number[]): Promise<void>;
  netCopyClipIdLsm2(...bytes: number[]): Promise<void>;
  getFirstMachine(): Promise<void>;
  getNextMachine(): Promise<void>;
  setOptions(...bytes: number[]): Promise<void>;
  getOptions(...bytes: number[]): Promise<void>;
  setInOut(cmd1Variant?: number, ...bytes: number[]): Promise<void>;
  live(...bytes: number[]): Promise<void>;
}

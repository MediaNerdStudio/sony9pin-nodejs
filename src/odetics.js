// Odetics protocol helper over Sony 9-pin framing (superset extensions)
// This class mirrors BlackmagicAMP approach: provide a 1:1 raw sender and
// thin helpers for well-known operations once command IDs are confirmed.
// Until command IDs are populated from docs, use .send/.raw to issue packets.

export class Odetics {
  constructor(vtr) {
    this.vtr = vtr;
  }

  // 1:1 sender
  send(cmd1, cmd2, data = []) { return this.vtr.sendCommand(cmd1, cmd2, data); }
  raw(cmd1, cmd2, data = []) { return this.send(cmd1, cmd2, data); }

  // Utilities
  timecodeAuto() { return this.vtr.currentTimeSense(0x03); }
  async pollTimecode({ intervalMs = 250, durationMs = 3000 } = {}) {
    const endAt = Date.now() + durationMs;
    while (Date.now() < endAt) {
      await this.timecodeAuto();
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  // ---- helpers (internal) ----
  #bcd(n) {
    const v = Math.max(0, Math.min(99, n | 0));
    const tens = Math.floor(v / 10);
    const ones = v % 10;
    return ((tens & 0x0F) << 4) | (ones & 0x0F);
  }
  #packTc({ hh, mm, ss, ff }) { return [this.#bcd(ff), this.#bcd(ss), this.#bcd(mm), this.#bcd(hh)]; }
  #lsmIdToBytes(id) {
    // EVS LSM ID is 8 ASCII bytes with last byte as a blank (space)
    // Examples: '114A/00 ' or '013C/00 '
    let s = String(id ?? '').toUpperCase().trim()
    // Ensure trailing space and exact length of 8
    if (!s.endsWith(' ')) s += ' '
    if (s.length < 8) s = s.padEnd(8, ' ')
    else if (s.length > 8) s = s.slice(0, 8)
    const out = []
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xFF)
    return out
  }

  // ---- Odetics helpers (from Commands.csv) ----
  // A0 01 Auto Skip (TSS manual notes as Odetics AUTO SKIP)
  autoSkip(deltaClips) { return this.send(0xA0, 0x01, [(deltaClips | 0) & 0xFF]); }
  // A0 06 PreviewInReset
  previewInReset() { return this.send(0xA0, 0x06); }
  // A0 07 PreviewOutReset
  previewOutReset() { return this.send(0xA0, 0x07); }
  // A0 14 ListFirstID (reply 80 14 = no clip, 88 14 = first ID)
  listFirstId() { return this.send(0xA0, 0x14); }
  // A0 15 ListNextID (odetics flavor)
  listNextId() { return this.send(0xA0, 0x15); }
  // A0 1C LongestContiguousAvailableStorage
  longestContiguousAvailableStorage() { return this.send(0xA0, 0x1C); }
  // A0 21 DeviceIDRequest
  deviceIdRequest() { return this.send(0xA0, 0x21); }

  // A8 11 EraseSegment (often NAK on devices that do not implement)
  eraseSegment() { return this.send(0xA8, 0x11); }
  // A8 16 ListClipTc (returns first frame TC and duration)
  listClipTc() { return this.send(0xA8, 0x16); }
  // A8 17 ListClipTc (EVS) – returns TC + machine number
  listClipTcEVS() { return this.send(0xA8, 0x17); }
  // A8 18 IDStatusRequest
  idStatusRequest() { return this.send(0xA8, 0x18); }
  // A8 20 SetDeviceID (expects payload bytes for device id)
  setDeviceId(...bytes) { return this.send(0xA8, 0x20, bytes); }

  // AX 02 RecordCueUpWithData (variant nibble). Provide explicit form
  // cmd1Variant: 0xA0..0xAF, payload as needed by device
  recordCueUpWithData(cmd1Variant = 0xA0, ...data) { return this.send(cmd1Variant & 0xFF, 0x02, data); }
  // AX 04 PreviewInPreset
  previewInPreset(cmd1Variant = 0xA0, ...data) { return this.send(cmd1Variant & 0xFF, 0x04, data); }
  // AX 05 PreviewOutPreset
  previewOutPreset(cmd1Variant = 0xA0, ...data) { return this.send(cmd1Variant & 0xFF, 0x05, data); }
  // AX 10 EraseID
  eraseId(cmd1Variant = 0xA0, ...idBytes) { return this.send(cmd1Variant & 0xFF, 0x10, idBytes); }

  // ---- CueUpWithData variants (EVS specifics) ----
  // 24.31 Cue by timecode only
  cueByTimecode(tc /* {hh,mm,ss,ff} */) { return this.send(0x24, 0x31, this.#packTc(tc)); }
  // 28.31 Load and cue by LSM ID (string like '114A/00')
  loadAndCueById(lsmId /* string */) { return this.send(0x28, 0x31, this.#lsmIdToBytes(lsmId)); }
  // 2C.31 Load by LSM ID and cue by timecode
  loadByIdAndCueByTimecode(lsmId /* string */, tc /* {hh,mm,ss,ff} */) {
    return this.send(0x2C, 0x31, [...this.#lsmIdToBytes(lsmId), ...this.#packTc(tc)]);
  }

  // B0 00 GetEvent (90 00 => no event, 9X 00 => event)
  getEvent() { return this.send(0xB0, 0x00); }
  // B1 01 SetTargetMachine (expects payload)
  setTargetMachine(...bytes) { return this.send(0xB1, 0x01, bytes); }
  // B8 02 SetIdForData (store clip ID for BC 02)
  setIdForData(...idBytes) { return this.send(0xB8, 0x02, idBytes); }
  // BC 02 SetData (associate data with previously stored ID)
  setData(...dataBytes) { return this.send(0xBC, 0x02, dataBytes); }
  // B8 03 GetData (reply 9C 03 ...)
  getData(...idBytes) { return this.send(0xB8, 0x03, idBytes); }

  // BX 04 MakeClip – requires variant nibble
  makeClip(cmd1Variant = 0xB0, ...bytes) { return this.send(cmd1Variant & 0xFF, 0x04, bytes); }
  // BA 05 SetIDEVSStatus
  setIDEVSStatus(...bytes) { return this.send(0xBA, 0x05, bytes); }
  // B8 06 ListClipProtectTC
  listClipProtectTC(...idBytes) { return this.send(0xB8, 0x06, idBytes); }
  // B9 07 GetKeyword
  getKeyword(...idBytes) { return this.send(0xB9, 0x07, idBytes); }
  // B8 08 SetKeyword 1 (set clip ID used by BD 08)
  setKeyword1(...idBytes) { return this.send(0xB8, 0x08, idBytes); }
  // BD 08 SetKeyword 2 (set keyword on clip ID)
  setKeyword2(...bytes) { return this.send(0xBD, 0x08, bytes); }

  // B9 09 04 ID LSM => ID Louth (data first byte 0x04 + payload as device expects)
  idLsmToLouth(...bytes) { return this.send(0xB9, 0x09, [0x04, ...bytes]); }
  // B9 09 05 ID Louth => ID LSM
  idLouthToLsm(...bytes) { return this.send(0xB9, 0x09, [0x05, ...bytes]); }

  // B9 0A NetMoveClipIdVDCP
  netMoveClipIdVDCP(...bytes) { return this.send(0xB9, 0x0A, bytes); }
  // B9 0B 53 NetMoveClipIdLsm 1 (source)
  netMoveClipIdLsm1(...bytes) { return this.send(0xB9, 0x0B, [0x53, ...bytes]); }
  // B9 0B 54 NetMoveClipIdLsm 2 (target)
  netMoveClipIdLsm2(...bytes) { return this.send(0xB9, 0x0B, [0x54, ...bytes]); }
  // B8 0C NetCopyClipIdVDCP 1 (source)
  netCopyClipIdVDCP1(...bytes) { return this.send(0xB8, 0x0C, bytes); }
  // B9 0C NetCopyClipIdVDCP 2 (target)
  netCopyClipIdVDCP2(...bytes) { return this.send(0xB9, 0x0C, bytes); }
  // B9 0D 53 NetCopyClipIdLsm 1 (source)
  netCopyClipIdLsm1(...bytes) { return this.send(0xB9, 0x0D, [0x53, ...bytes]); }
  // B9 0D 54 NetCopyClipIdLsm 2 (target)
  netCopyClipIdLsm2(...bytes) { return this.send(0xB9, 0x0D, [0x54, ...bytes]); }

  // B0 0E GetFirstMachine
  getFirstMachine() { return this.send(0xB0, 0x0E); }
  // B0 0F GetNextMachine
  getNextMachine() { return this.send(0xB0, 0x0F); }
  // B4 10 SetOptions
  setOptions(...bytes) { return this.send(0xB4, 0x10, bytes); }
  // B0 11 GetOptions
  getOptions(...bytes) { return this.send(0xB0, 0x11, bytes); }
  // BX 12 SetInOut (update short in/out). Variant nibble.
  setInOut(cmd1Variant = 0xB0, ...bytes) { return this.send(cmd1Variant & 0xFF, 0x12, bytes); }
  // B8 13 Live (go live on given camera)
  live(...bytes) { return this.send(0xB8, 0x13, bytes); }

  // ---- Additional from TSS manual ----
  // CX 01 Jump Forward X Frames (variant nibble Cx)
  jumpForwardFrames(frames /* 0..255 */, cmd1Variant = 0xC0) {
    return this.send(cmd1Variant & 0xFF, 0x01, [frames & 0xFF]);
  }
  // CX 02 Jump Back X Frames (variant nibble Cx)
  jumpBackFrames(frames /* 0..255 */, cmd1Variant = 0xC0) {
    return this.send(cmd1Variant & 0xFF, 0x02, [frames & 0xFF]);
  }
  // CX 03 Get Loaded ID (variant nibble Cx)
  getLoadedId(cmd1Variant = 0xC0, ...bytes) { return this.send(cmd1Variant & 0xFF, 0x03, bytes); }

  // EVS: BX 09 YY general information selector
  info(cmd1Variant = 0xB0, selector = 0x01, ...data) { return this.send(cmd1Variant & 0xFF, 0x09, [selector & 0xFF, ...data]); }
  // EVS: B1.09.01 ActiveIDRequest
  activeIdRequest() { return this.send(0xB1, 0x09, [0x01]); }
}

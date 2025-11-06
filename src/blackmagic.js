// Blackmagic Advanced Media Protocol helpers over RS-422 (Sony 9-pin framing)
// This module provides a thin wrapper so you can issue Blackmagic-specific
// commands by specifying cmd1/cmd2/data as documented in the HyperDeck manual.
// We deliberately avoid hardcoding opcodes here to prevent mismatches across
// models/firmware. Use README section for references.

export class BlackmagicAMP {
  constructor(vtr) {
    this.vtr = vtr;
  }

  // Send any raw command (1:1) using Sony 9-pin framing
  send(cmd1, cmd2, data = []) { return this.vtr.sendCommand(cmd1, cmd2, data); }

  // Aliases for clarity
  raw(cmd1, cmd2, data = []) { return this.send(cmd1, cmd2, data); }

  // Example convenience: request auto timecode via existing API
  timecodeAuto() { return this.vtr.currentTimeSense(0x03); }

  // Example polling utility for timecode using AUTO source
  async pollTimecode({ intervalMs = 250, durationMs = 3000 } = {}) {
    const endAt = Date.now() + durationMs;
    while (Date.now() < endAt) {
      await this.timecodeAuto();
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  // ---- Helpers for Blackmagic Advanced Media Protocol (per provided table) ----

  // 0xA1 0x01 AutoSkip: 8-bit signed number of clips to skip from current clip
  autoSkip(deltaClips) {
    const v = (deltaClips | 0) & 0xFF;
    return this.send(0xA1, 0x01, [v]);
  }

  // 0xAX 0x15 ListNextID: when x=0 single clip request; when x=1 include count in data
  listNextIdSingle() { return this.send(0xA0, 0x15); }
  listNextId(count /* 1..255 */) { return this.send(0xA1, 0x15, [Math.max(1, Math.min(255, count|0)) & 0xFF]); }

  // 0x20 0x29 ClearPlaylist
  clearPlaylist() { return this.send(0x20, 0x29); }

  // 0x41 0x42 SetPlaybackLoop: Bit0=loop enable, Bit1=timeline(1) vs single clip(0)
  setPlaybackLoop({ enable = false, timeline = false } = {}) {
    const v = (enable ? 1 : 0) | ((timeline ? 1 : 0) << 1);
    return this.send(0x41, 0x42, [v & 0xFF]);
  }

  // 0x41 0x44 SetStopMode: 0=Off,1=Freeze last,2=Freeze next,3=Black
  setStopMode(mode /* 0..3 */) { return this.send(0x41, 0x44, [Math.max(0, Math.min(3, mode|0)) & 0xFF]); }

  // 0x4F 0x16 AppendPreset
  // Data: 2 bytes name length N (big-endian), N bytes name, 4 bytes IN (FF SS MM HH BCD), 4 bytes OUT (FF SS MM HH BCD)
  appendPreset(name, inTc, outTc) {
    const enc = new TextEncoder();
    const nameBytes = enc.encode(String(name || ''));
    const N = Math.min(65535, nameBytes.length);
    const data = [ (N >> 8) & 0xFF, N & 0xFF, ...nameBytes, ...this.#packTc(inTc), ...this.#packTc(outTc) ];
    return this.send(0x4F, 0x16, data);
  }

  // Blackmagic Extensions
  // 0x08 0x02 BmdSeekToTimelinePosition: 16-bit little endian fractional position [0..65535]
  seekToTimelinePosition(pos /* number in 0..1 or 0..65535 */) {
    let v = 0;
    if (pos <= 1 && pos >= 0) v = Math.round((pos || 0) * 65535);
    else v = Math.max(0, Math.min(65535, pos|0));
    const lo = v & 0xFF, hi = (v >> 8) & 0xFF; // little-endian
    return this.send(0x08, 0x02, [lo, hi]);
  }

  // 0x81 0x03 BMDSeekRelativeClip: one-byte signed integer (# clips to skip)
  seekRelativeClip(deltaClips) { return this.send(0x81, 0x03, [(deltaClips | 0) & 0xFF]); }

  // ---- internals ----
  #bcd(n) {
    const v = Math.max(0, Math.min(99, n | 0));
    const tens = Math.floor(v / 10);
    const ones = v % 10;
    return ((tens & 0x0F) << 4) | (ones & 0x0F);
  }
  // Accepts object {hh,mm,ss,ff} or (hh,mm,ss,ff) tuple array
  #packTc(tc) {
    let hh, mm, ss, ff;
    if (Array.isArray(tc)) [hh, mm, ss, ff] = tc;
    else if (tc && typeof tc === 'object') ({ hh, mm, ss, ff } = tc);
    else { hh = mm = ss = ff = 0; }
    return [ this.#bcd(ff), this.#bcd(ss), this.#bcd(mm), this.#bcd(hh) ];
  }
}

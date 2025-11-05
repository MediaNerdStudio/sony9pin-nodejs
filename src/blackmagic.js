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
}

// Sony 9-pin (RS-422) decoder: turns raw packets into human-readable info

function checksum(bytes) {
  let sum = 0;
  for (const b of bytes) sum = (sum + (b & 0xFF)) & 0xFF;
  return sum & 0xFF;
}

function bcdToDec(b) {
  return ((b >> 4) & 0x0F) * 10 + (b & 0x0F);
}

function parseTimecodeBytes(d) {
  if (!d || d.length < 4) return null;
  const ff = d[0];
  const ss = d[1];
  const mm = d[2];
  const hh = d[3];
  const dropFrame = (ff & 0x40) !== 0; // bit6
  const colorFrame = (ff & 0x10) !== 0; // bit4
  const tc = {
    hours: bcdToDec(hh),
    minutes: bcdToDec(mm),
    seconds: bcdToDec(ss),
    frames: bcdToDec(ff & 0x3F),
    dropFrame,
    colorFrame,
  };
  const str = `${String(tc.hours).padStart(2, '0')}:${String(tc.minutes).padStart(2, '0')}:${String(tc.seconds).padStart(2, '0')}:${String(tc.frames).padStart(2, '0')}`;
  return { tc, str };
}

function decodeNakBits(mask) {
  const bits = [];
  if (mask & 0x01) bits.push('UNKNOWN_CMD');
  if (mask & 0x04) bits.push('CHECKSUM_ERROR');
  if (mask & 0x10) bits.push('PARITY_ERROR');
  if (mask & 0x20) bits.push('BUFFER_OVERRUN');
  if (mask & 0x40) bits.push('FRAMING_ERROR');
  if (mask & 0x80) bits.push('TIMEOUT');
  return bits;
}

function decodeStatusData(data) {
  const out = [];
  const b0 = data[0] ?? 0; // cassette/ref/local
  const b1 = data[1] ?? 0; // transport
  const b2 = data[2] ?? 0; // servo/shuttle/jog/var/direction/still/cue
  const b3 = data[3] ?? 0; // auto/freeze/in/out/ee
  const b4 = data[4] ?? 0; // select ee/full ee/edit/review/auto edit

  if (b0 & 0x20) out.push('CASSETTE_OUT');
  if (b0 & 0x10) out.push('SERVO_REF_MISSING');
  if (b0 & 0x01) out.push('LOCAL');

  if (b1 & 0x80) out.push('STANDBY');
  if (b1 & 0x20) out.push('STOP');
  if (b1 & 0x10) out.push('EJECT');
  if (b1 & 0x08) out.push('REWIND');
  if (b1 & 0x04) out.push('FORWARD');
  if (b1 & 0x02) out.push('RECORD');
  if (b1 & 0x01) out.push('PLAY');

  if (b2 & 0x80) out.push('SERVO_LOCK');
  if (b2 & 0x20) out.push('SHUTTLE');
  if (b2 & 0x10) out.push('JOG');
  if (b2 & 0x08) out.push('VAR');
  if (b2 & 0x04) out.push('REVERSE');
  if (b2 & 0x02) out.push('STILL');
  if (b2 & 0x01) out.push('CUE_UP');

  if (b3 & 0x80) out.push('AUTO_MODE');
  if (b3 & 0x40) out.push('FREEZE_ON');
  if (b3 & 0x08) out.push('AUDIO_OUT_SET');
  if (b3 & 0x04) out.push('AUDIO_IN_SET');
  if (b3 & 0x02) out.push('OUT_SET');
  if (b3 & 0x01) out.push('IN_SET');

  if (b4 & 0x80) out.push('SELECT_EE');
  if (b4 & 0x40) out.push('FULL_EE');
  if (b4 & 0x10) out.push('EDIT_SET');
  if (b4 & 0x08) out.push('REVIEW_SET');
  if (b4 & 0x04) out.push('AUTO_EDIT_SET');

  return out;
}

export class Sony9PinDecoder {
  constructor() {
    this.buf = [];
  }

  feed(bytes) {
    this.buf.push(...bytes);
    const decoded = [];
    // Try to find packets with valid checksum
    while (this.buf.length >= 3) {
      let found = false;
      for (let L = 3; L <= Math.min(15, this.buf.length); L++) {
        const slice = this.buf.slice(0, L);
        const sum = checksum(slice.slice(0, L - 1));
        if (sum === slice[L - 1]) {
          decoded.push(this._interpret(slice));
          this.buf.splice(0, L);
          found = true;
          break;
        }
      }
      if (!found) {
        // drop one byte if no valid packet yet
        this.buf.shift();
      }
    }
    return decoded;
  }

  _interpret(p) {
    const cmd1 = p[0];
    const cmd2 = p[1];
    const data = p.slice(2, p.length - 1);

    // ACK
    if (cmd1 === 0x10 && cmd2 === 0x01) {
      return { type: 'ack', cmd1, cmd2, data, text: 'ACK' };
    }
    // NAK
    if (cmd1 === 0x10 && cmd2 === 0x12) {
      const mask = data[0] || 0;
      const reasons = decodeNakBits(mask);
      return { type: 'nak', cmd1, cmd2, data, text: `NAK ${mask.toString(16).padStart(2, '0')} [${reasons.join(', ')}]`, reasons };
    }
    // Device type
    if (cmd1 === 0x12 && cmd2 === 0x11 && data.length >= 2) {
      const deviceType = (data[0] << 8) | data[1];
      return { type: 'device_type', cmd1, cmd2, data, deviceType, text: `DEVICE TYPE 0x${deviceType.toString(16)}` };
    }
    // Status data
    if ((cmd1 & 0xF0) === 0x70 && cmd2 === 0x20) {
      const flags = decodeStatusData(data);
      return { type: 'status', cmd1, cmd2, data, flags, text: `STATUS: ${flags.join(' ')}` };
    }
    // Timecode related returns (IN/OUT/GEN/HOLD etc.)
    const timecodeCmd2Set = new Set([0x10, 0x11, 0x04, 0x06, 0x08, 0x14, 0x16, 0x31]);
    if ((cmd1 & 0xF0) === 0x70 && timecodeCmd2Set.has(cmd2) && data.length >= 4) {
      const parsed = parseTimecodeBytes(data.slice(0, 4));
      if (parsed) {
        return { type: 'timecode', cmd1, cmd2, data, timecode: parsed.tc, text: `TIMECODE ${parsed.str}` };
      }
    }

    return { type: 'raw', cmd1, cmd2, data, text: `RAW ${[cmd1, cmd2, ...data].map(b => b.toString(16).padStart(2,'0')).join(' ')}` };
  }
}

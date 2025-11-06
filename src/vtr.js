import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';
import { Encoder } from './encoder.js';
import { Sony9PinDecoder } from './decoder.js';

export class VTR422 extends EventEmitter {
  constructor({ portPath = 'COM1', baudRate = 38400, dataBits = 8, parity = 'odd', stopBits = 1, autoOpen = false, debug = false } = {}) {
    super();
    this.portPath = portPath;
    this.options = { baudRate, dataBits, parity, stopBits, autoOpen };
    this.port = new SerialPort({ path: portPath, ...this.options });
    this._rx = [];
    this.decoder = new Sony9PinDecoder();
    this.lastStatusFlags = [];
    this.lastTimecode = null;
    this.lastDeviceType = null;
    this.debug = debug;

    this.port.on('open', () => this._log(`Port opened: ${portPath} ${baudRate}bps 8${parity.toUpperCase()}${stopBits}`));
    this.port.on('error', (err) => this._log(`Serial error: ${err.message}`));
    this.port.on('close', () => this._log('Port closed'));

    this.port.on('data', (buf) => {
      const arr = [...buf];
      if (this.debug) this._log(`RX ${arr.length} bytes: ${arr.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      this._rx.push(...arr);
      this._tryParse();
      const decoded = this.decoder.feed(arr);
      for (const msg of decoded) {
        if (this.debug) this._log(msg.text);
        if (msg.type === 'status') this.lastStatusFlags = msg.flags || [];
        if (msg.type === 'timecode') this.lastTimecode = msg.timecode || null;
        if (msg.type === 'device_type') this.lastDeviceType = msg.deviceType || null;
        this.emit(msg.type, msg);
      }
    });
  }

  isOpen() { return this.port && this.port.isOpen; }

  open() { return new Promise((resolve, reject) => {
    if (this.isOpen()) return resolve();
    if (this.port.opening) {
      this.port.once('open', resolve);
      this.port.once('error', reject);
      return;
    }
    this.port.open((err) => err ? reject(err) : resolve());
  });}
  
  close() { return new Promise((resolve, reject) => {
    if (!this.port) return resolve();
    this.port.close((err) => err ? reject(err) : resolve());
  });}

  send(buf) {
    return new Promise((resolve, reject) => {
      if (!this.isOpen()) return reject(new Error('Serial port not open'));
      if (this.debug) this._log(`TX ${buf.length} bytes: ${[...buf].map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      this.port.write(buf, (err) => {
        if (err) return reject(err);
        this.port.drain((drainErr) => drainErr ? reject(drainErr) : resolve());
      });
    });
  }

  async sendAndWaitAck(buf, timeoutMs = 800) {
    const wait = this._waitForAckOrNak(timeoutMs);
    await this.send(buf);
    return await wait;
  }

  _waitForAckOrNak(timeoutMs = 800) {
    return new Promise((resolve, reject) => {
      let to;
      const onAck = (m) => { cleanup(); resolve({ ack: true, msg: m }); };
      const onNak = (m) => { cleanup(); resolve({ nak: true, msg: m }); };
      const onErr = (e) => { cleanup(); reject(e); };
      const cleanup = () => {
        clearTimeout(to);
        this.off('ack', onAck);
        this.off('nak', onNak);
        this.port.off('error', onErr);
      };
      this.on('ack', onAck);
      this.on('nak', onNak);
      this.port.on('error', onErr);
      to = setTimeout(() => { cleanup(); resolve({ timeout: true }); }, timeoutMs);
    });
  }

  // High-level API methods
  play() { return this.send(Encoder.play()); }
  stop() { return this.send(Encoder.stop()); }
  record() { return this.send(Encoder.record()); }
  standbyOn() { return this.send(Encoder.standbyOn()); }
  standbyOff() { return this.send(Encoder.standbyOff()); }
  eject() { return this.send(Encoder.eject()); }
  fastForward() { return this.send(Encoder.fastForward()); }
  rewind() { return this.send(Encoder.rewind()); }
  syncPlay() { return this.send(Encoder.syncPlay()); }
  preroll() { return this.send(Encoder.preroll()); }
  preview() { return this.send(Encoder.preview()); }
  review() { return this.send(Encoder.review()); }

  cueUpWithData(hh, mm, ss, ff) { return this.send(Encoder.cueUpWithData(hh, mm, ss, ff)); }
  statusSense(start = 0, size = 9) { return this.send(Encoder.statusSense(start, size)); }
  currentTimeSense(flag = 0x01) { return this.send(Encoder.currentTimeSense(flag)); }
  deviceType() { return this.send(Encoder.deviceType()); }

  // Generic 1:1 wrapper entry
  sendCommand(cmd1, cmd2, data = []) { return this.send(Encoder.encode(cmd1, cmd2, data)); }

  _log(msg) { if (this.debug) console.log(`[VTR422] ${msg}`); }

  _tryParse() {
    while (this._rx.length >= 3) {
      let found = false;
      const MAX_LEN = 256;
      for (let L = 3; L <= Math.min(MAX_LEN, this._rx.length); L++) {
        const slice = this._rx.slice(0, L);
        const sum = slice.slice(0, L - 1).reduce((a, b) => (a + b) & 0xFF, 0);
        if (sum === slice[L - 1]) {
          this._interpretPacket(slice);
          this._rx.splice(0, L);
          found = true;
          break;
        }
      }
      if (!found) {
        this._rx.shift();
      }
    }
  }

  _interpretPacket(p) {
    const c1 = p[0], c2 = p[1];
    if (c1 === 0x10 && c2 === 0x01) {
      this._log('ACK');
      return;
    }
    if (c1 === 0x10 && c2 === 0x12) {
      const mask = p[2] || 0;
      const bits = [];
      if (mask & 0x01) bits.push('UNKNOWN_CMD');
      if (mask & 0x04) bits.push('CHECKSUM_ERROR');
      if (mask & 0x10) bits.push('PARITY_ERROR');
      if (mask & 0x20) bits.push('BUFFER_OVERRUN');
      if (mask & 0x40) bits.push('FRAMING_ERROR');
      if (mask & 0x80) bits.push('TIMEOUT');
      this._log(`NAK ${mask.toString(16).padStart(2, '0')} [${bits.join(', ')}]`);
      return;
    }
    if (c1 === 0x12 && c2 === 0x11 && p.length >= 5) {
      const dev = (p[2] << 8) | p[3];
      this._log(`DEVICE TYPE 0x${dev.toString(16).padStart(4, '0')}`);
      return;
    }
    if ((c1 & 0xF0) === 0x70 && c2 === 0x20) {
      const data = p.slice(2, p.length - 1);
      this._log(`STATUS DATA ${data.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      return;
    }
  }

  async waitReady({ timeoutMs = 3000, intervalMs = 200 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await this.statusSense(0, 10);
      const got = await this._waitForEvent('status', intervalMs);
      if (got && (this.lastStatusFlags || []).includes('SERVO_LOCK')) return true;
    }
    return false;
  }

  _waitForEvent(event, timeoutMs) {
    return new Promise((resolve) => {
      let to;
      const handler = (m) => { clearTimeout(to); this.off(event, handler); resolve(m); };
      this.on(event, handler);
      to = setTimeout(() => { this.off(event, handler); resolve(null); }, timeoutMs);
    });
  }
}

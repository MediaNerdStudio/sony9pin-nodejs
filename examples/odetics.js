import { VTR422, Odetics, CurrentTimeSenseFlag } from '../index.js';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const vtr = new VTR422({ portPath: 'COM1', baudRate: 38400, dataBits: 8, parity: 'odd', stopBits: 1, debug: false });
  const od = new Odetics(vtr);

  vtr.on('timecode', (m) => console.log('[TIMECODE]', `${String(m.timecode.hours).padStart(2,'0')}:${String(m.timecode.minutes).padStart(2,'0')}:${String(m.timecode.seconds).padStart(2,'0')}:${String(m.timecode.frames).padStart(2,'0')}`));
  vtr.on('ack', () => console.log('[ACK]'));
  vtr.on('nak', (m) => console.log('[NAK]', m.reasons));
  vtr.on('status', (m) => console.log('[STATUS]', m.flags));
  vtr.on('raw', (m) => console.log('[RAW]', m.text));

  await vtr.open();

  await vtr.deviceType();
  await vtr.statusSense(0, 10);
  await vtr.currentTimeSense(CurrentTimeSenseFlag.AUTO);

  // Placeholder Odetics examples: replace cmd1/cmd2/data with values from docs once confirmed
  // await od.raw(0xAX, 0xYY, [/* data */]);

  await od.pollTimecode({ intervalMs: 250, durationMs: 2000 });

  await vtr.close();
}

main().catch((err) => { console.error(err); process.exit(1); });

import { VTR422, BlackmagicAMP, CurrentTimeSenseFlag } from '../index.js';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const vtr = new VTR422({ portPath: 'COM1', baudRate: 38400, dataBits: 8, parity: 'odd', stopBits: 1, debug: false });
  const bm = new BlackmagicAMP(vtr);

  vtr.on('timecode', (m) => console.log('[TIMECODE]', `${String(m.timecode.hours).padStart(2,'0')}:${String(m.timecode.minutes).padStart(2,'0')}:${String(m.timecode.seconds).padStart(2,'0')}:${String(m.timecode.frames).padStart(2,'0')}`));
  vtr.on('ack', () => console.log('[ACK]'));
  vtr.on('nak', (m) => console.log('[NAK]', m.reasons));
  vtr.on('status', (m) => console.log('[STATUS]', m.flags));

  await vtr.open();

  // Check device type and status
  await vtr.deviceType();
  await vtr.statusSense(0, 10);

  // Example: get auto timecode via Sony 9-pin sense
  await vtr.currentTimeSense(CurrentTimeSenseFlag.AUTO);

  // Example: poll timecode for 3 seconds using the helper
  await bm.pollTimecode({ intervalMs: 250, durationMs: 3000 });

  // Example: send a raw Blackmagic-specific command if you know cmd1/cmd2/data
  // NOTE: Replace with proper values from HyperDeck Manual (RS-422 AMP section)
  // await bm.raw(0x6X, 0xYY, [/* data bytes */]);

  await vtr.close();
}

main().catch((err) => { console.error(err); process.exit(1); });

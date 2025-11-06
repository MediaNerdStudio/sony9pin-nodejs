import { VTR422, CurrentTimeSenseFlag } from '../index.js';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const vtr = new VTR422({ portPath: 'COM1', baudRate: 38400, dataBits: 8, parity: 'odd', stopBits: 1 });

  // Ensure port is open
  if (!vtr.isOpen()) {
    await vtr.open();
  }

  // Subscribe to useful events for visibility
  vtr.on('status', (m) => console.log('[EVENT] STATUS', m.flags));
  vtr.on('timecode', (m) => console.log('[EVENT] TIMECODE', `${String(m.timecode.hours).padStart(2,'0')}:${String(m.timecode.minutes).padStart(2,'0')}:${String(m.timecode.seconds).padStart(2,'0')}:${String(m.timecode.frames).padStart(2,'0')}`));
  vtr.on('nak', (m) => console.log('[EVENT] NAK', m.reasons));
  vtr.on('ack', () => console.log('[EVENT] ACK'));
  vtr.on('device_type', (m) => console.log('[EVENT] DEVICE TYPE', `0x${m.deviceType.toString(16)}`));
  vtr.on('raw', (m) => console.log('[EVENT] RAW', m.text));

  // Query device type and a bit of status
  await vtr.deviceType();
  await vtr.statusSense(0, 10);
  
  // Request best available timecode (AUTO) before motion
  await vtr.currentTimeSense(CurrentTimeSenseFlag.AUTO);

  // Stabilize state before play
  await vtr.stop();
  await vtr.standbyOn();

  // Try a play then stop
  console.log('Sending PLAY for 2 seconds...');
  await vtr.play();
  // Continuously poll timecode during motion
  const pollIntervalMs = 20;
  const durationMs = 5000;
  const endAt = Date.now() + durationMs;
  while (Date.now() < endAt) {
    await vtr.currentTimeSense(CurrentTimeSenseFlag.AUTO);
    await sleep(pollIntervalMs);
  }
  console.log('STOP');
  await vtr.stop();

  await sleep(200);
  await vtr.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

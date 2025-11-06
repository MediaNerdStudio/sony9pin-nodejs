import { VTR422, BlackmagicAMP, CurrentTimeSenseFlag } from '../index.js';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const vtr = new VTR422({ portPath: 'COM1', baudRate: 38400, dataBits: 8, parity: 'odd', stopBits: 1, debug: false });
  const bm = new BlackmagicAMP(vtr);

  vtr.on('timecode', (m) => console.log('[TIMECODE]', `${String(m.timecode.hours).padStart(2,'0')}:${String(m.timecode.minutes).padStart(2,'0')}:${String(m.timecode.seconds).padStart(2,'0')}:${String(m.timecode.frames).padStart(2,'0')}`));
  vtr.on('ack', () => console.log('[ACK]'));
  vtr.on('nak', (m) => console.log('[NAK]', m.reasons));
  vtr.on('status', (m) => console.log('[STATUS]', m.flags));
  vtr.on('raw', (m) => console.log('[RAW]', m.text));

  await vtr.open();

  // Check device type and status
  await vtr.deviceType();
  await vtr.statusSense(0, 10);

  // Example: get auto timecode via Sony 9-pin sense
  await vtr.currentTimeSense(CurrentTimeSenseFlag.AUTO);

  // Blackmagic AMP examples
  // 1) Enable looping over Clip
  await vtr.play();  
  await bm.setPlaybackLoop({ enable: true, timeline: false });
  await sleep(20000);
  await vtr.stop();

  // 2) Stop mode: freeze on last frame
  // await bm.setStopMode(1);

  // 3) Seek to 50% timeline position
  // await sleep(2000);
  // await bm.seekToTimelinePosition(0.5);

  // 4) Skip forward 1 clip
  // await sleep(2000);
  // await bm.autoSkip(1);
  
  // 5) Request next 3 clip IDs
  // await bm.listNextId();

  // 6) Append preset named "Demo" with in/out points
  // await bm.appendPreset('Demo', { hh: 0, mm: 0, ss: 5, ff: 0 }, { hh: 0, mm: 0, ss: 10, ff: 0 });

  // Poll timecode for 2 seconds
  await bm.pollTimecode({ intervalMs: 250, durationMs: 2000 });

  await vtr.close();
}

main().catch((err) => { console.error(err); process.exit(1); });

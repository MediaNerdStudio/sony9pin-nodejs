import { VTR422, Odetics, CurrentTimeSenseFlag } from '../index.js';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function bcd(n){const v=Math.max(0,Math.min(99,n|0));const t=Math.floor(v/10);const o=v%10;return ((t&0x0F)<<4)|(o&0x0F);} 
function packTc({hh,mm,ss,ff}){return [bcd(ff),bcd(ss),bcd(mm),bcd(hh)];}
function lsmIdToBytes(id){const s=String(id);const bytes=[];for(let i=0;i<s.length;i++){bytes.push(s.charCodeAt(i)&0xFF);}return bytes;}

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

  const idLocal = '114A/00';
  const idRemote = '120C/12';
  const tc = packTc({hh:1,mm:2,ss:3,ff:4});

  console.log('Cue by TC only (24.31)...');
  await od.cueByTimecode({hh:1,mm:2,ss:3,ff:4});
  await sleep(500);

  console.log('Load and cue by LSM ID (28.31) local...');
  await od.loadAndCueById(idLocal);
  await sleep(500);

  console.log('Load by LSM ID and cue by TC (2C.31) remote...');
  await od.loadByIdAndCueByTimecode(idRemote, {hh:1,mm:2,ss:3,ff:4});
  await sleep(500);

  await od.pollTimecode({ intervalMs: 250, durationMs: 2000 });

  await vtr.close();
}

main().catch((err) => { console.error(err); process.exit(1); });

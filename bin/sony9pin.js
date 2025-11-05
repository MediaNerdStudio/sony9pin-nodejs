#!/usr/bin/env node
import { VTR422, Encoder, CurrentTimeSenseFlag } from '../index.js';

function parseTime(s) {
  const m = /^(\d\d?):(\d\d?):(\d\d?):(\d\d?)$/.exec(s);
  if (!m) throw new Error('Time must be HH:MM:SS:FF');
  return m.slice(1).map(x => parseInt(x, 10));
}

function argsMap(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v === undefined ? true : v;
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function main() {
  const args = argsMap(process.argv);
  const cmd = args._[0];
  if (!cmd || args.help) {
    console.log(`sony9pin CLI
Usage: sony9pin [--port=COM1] [--baud=38400] [--debug] <command> [args]

Commands:
  device                      Query device type
  status                      Status sense (page 0 size 10)
  timecode [auto|ltc|vitc]    Current time sense
  play | stop | record        Transport basics
  standby-on | standby-off    Standby control
  eject | ff | rew            Eject / fast forward / rewind
  cue HH:MM:SS:FF             Cue up with data
  jog <-127..127>             Jog relative 1-byte magnitude
  var <speed>                 Var speed -127..127
  shuttle <speed>             Shuttle -127..127
  raw <cmd1> <cmd2> [data..]  Send raw bytes (hex 0x.. or decimal)

Examples:
  sony9pin --port=COM3 play
  sony9pin status
  sony9pin timecode auto
  sony9pin cue 01:02:03:12
  sony9pin raw 0x61 0x20 0x0a
`);
    process.exit(0);
  }

  const vtr = new VTR422({
    portPath: args.port || 'COM1',
    baudRate: args.baud ? parseInt(args.baud, 10) : 38400,
    dataBits: 8,
    parity: 'odd',
    stopBits: 1,
    debug: !!args.debug,
  });

  vtr.on('ack', () => !args.debug && console.log('ACK'));
  vtr.on('nak', (m) => console.log('NAK', m.reasons));
  vtr.on('status', (m) => console.log('STATUS', m.flags));
  vtr.on('timecode', (m) => console.log('TIMECODE', `${String(m.timecode.hours).padStart(2,'0')}:${String(m.timecode.minutes).padStart(2,'0')}:${String(m.timecode.seconds).padStart(2,'0')}:${String(m.timecode.frames).padStart(2,'0')}`));
  vtr.on('device_type', (m) => console.log('DEVICE_TYPE', `0x${m.deviceType.toString(16)}`));

  await vtr.open();

  try {
    switch (cmd) {
      case 'device':
        await vtr.deviceType();
        break;
      case 'status':
        await vtr.statusSense(0, 10);
        break;
      case 'timecode': {
        const src = (args._[1] || 'auto').toLowerCase();
        const flag = src === 'ltc' ? CurrentTimeSenseFlag.LTC_TC
          : src === 'vitc' ? CurrentTimeSenseFlag.VITC_TC
          : CurrentTimeSenseFlag.AUTO;
        await vtr.currentTimeSense(flag);
        break;
      }
      case 'play':
        await vtr.play();
        break;
      case 'stop':
        await vtr.stop();
        break;
      case 'record':
        await vtr.record();
        break;
      case 'standby-on':
        await vtr.standbyOn();
        break;
      case 'standby-off':
        await vtr.standbyOff();
        break;
      case 'eject':
        await vtr.eject();
        break;
      case 'ff':
        await vtr.fastForward();
        break;
      case 'rew':
        await vtr.rewind();
        break;
      case 'cue': {
        const [hh, mm, ss, ff] = parseTime(args._[1] || '00:00:00:00');
        await vtr.cueUpWithData(hh, mm, ss, ff);
        break;
      }
      case 'jog': {
        const v = parseInt(args._[1] || '0', 10);
        await vtr.send(Encoder.jog(v));
        break;
      }
      case 'var': {
        const v = parseInt(args._[1] || '0', 10);
        await vtr.send(Encoder.varSpeed(v));
        break;
      }
      case 'shuttle': {
        const v = parseInt(args._[1] || '0', 10);
        await vtr.send(Encoder.shuttle(v));
        break;
      }
      case 'raw': {
        const c1 = Number(args._[1]);
        const c2 = Number(args._[2]);
        const data = args._.slice(3).map(Number);
        await vtr.sendCommand(c1, c2, data);
        break;
      }
      default:
        console.error('Unknown command:', cmd);
        process.exitCode = 2;
    }
  } finally {
    await vtr.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

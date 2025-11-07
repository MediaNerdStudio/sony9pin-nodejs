# sony9pin-nodejs

A small Node.js library to control VTRs/decks that support the Sony 9‑pin (RS‑422) protocol.

- Serial: 38400 baud, 8 data bits, odd parity, 1 stop bit (8O1)
- Packet framing: `[HEADER, CMD2, ...DATA, CHECKSUM]`
  - `HEADER = (CMD1 & 0xF0) | (DATA_LENGTH & 0x0F)`
  - `CHECKSUM = (sum of all previous bytes) & 0xFF`

This lib wraps serial I/O, encodes/decodes core protocol messages, and emits human‑readable events.

## Install

- Node 18+
- `npm i sony9pin-nodejs`

## Usage

```js
import { VTR422, CurrentTimeSenseFlag } from 'sony9pin-nodejs';

const vtr = new VTR422({
  portPath: 'COM1',
  baudRate: 38400,
  dataBits: 8,
  parity: 'odd',
  stopBits: 1,
  debug: false, // set true to see TX/RX hex and parsed logs
});

await vtr.open();

vtr.on('ack', () => console.log('ACK'));
vtr.on('nak', (m) => console.log('NAK', m.reasons));
vtr.on('status', (m) => console.log('STATUS', m.flags));
vtr.on('timecode', (m) => console.log('TIMECODE', m.timecode));

await vtr.deviceType();
await vtr.statusSense(0, 10);

// Play for 2 seconds with periodic timecode requests
await vtr.standbyOn();
await vtr.play();
for (let i = 0; i < 8; i++) {
  await vtr.currentTimeSense(CurrentTimeSenseFlag.AUTO);
  await new Promise(r => setTimeout(r, 250));
}
await vtr.stop();

await vtr.close();
```

## CLI

Installed globally or via npx:

```
npx sony9pin --port=COM3 play
npx sony9pin status
npx sony9pin timecode auto
```

Usage:

```
sony9pin [--port=COM1] [--baud=38400] [--debug] <command> [args]

Commands:
  device                      Query device type
  status                      Status sense (page 0 size 10)
  timecode [auto|ltc|vitc]    Current time sense (61 0C xx)
  play | stop | record        Transport basics
  standby-on | standby-off    Standby control
  eject | ff | rew            Eject / fast forward / rewind
  cue HH:MM:SS:FF             Cue up with data
  jog <-127..127>             Jog relative
  var <speed>                 Var speed -127..127
  shuttle <speed>             Shuttle -127..127
  raw <cmd1> <cmd2> [data..]  Send raw bytes (decimal or 0x..)
```

## Blackmagic Advanced Media Protocol (AMP)

This package can be used to communicate with Blackmagic devices that speak their Advanced Media Protocol over RS‑422 framing. Since models/firmware vary, we provide a thin helper that lets you issue exact `cmd1/cmd2/data` as documented by Blackmagic.

- Helper: `BlackmagicAMP` (wraps `VTR422`)
  - `bm.send(cmd1, cmd2, data)` / `bm.raw(...)` – 1:1 packet sender
  - `bm.timecodeAuto()` – convenience alias using Sony 61.0C.03
  - `bm.pollTimecode({ intervalMs, durationMs })`
  - HyperDeck-specific helpers: `bm.dmcSetFwd()`, `bm.dmcSetRev()`

Example:

```js
import { VTR422, BlackmagicAMP } from 'sony9pin-nodejs';
const vtr = new VTR422({ portPath: 'COM1' });
const bm = new BlackmagicAMP(vtr);
await vtr.open();
// Replace with the exact AMP command values from your device manual
// await bm.raw(0x6X, 0xYY, [/* data */]);
await vtr.close();
```

See also:
- HyperDeck Manual (AMP): https://documents.blackmagicdesign.com/UserManuals/HyperDeckManual.pdf
- Reference project: https://github.com/hideakitai/Sony9PinRemote

Demo:
- `examples/blackmagic-demo.js`

## Odetics extensions

This package includes helpers for Odetics (a superset of Sony 9‑pin used by various servers). As with AMP, devices/firmware vary, so wrappers are 1:1 and accept payloads where required.

- Helper: `Odetics` (wraps `VTR422`)
  - Examples: `listFirstId()`, `listNextId()`, `listClipTc()`, `idStatusRequest()`, `setDeviceId(...)`, `makeClip(...)`, `getEvent()`, `getFirstMachine()` and many more
  - EVS info helpers: `activeIdRequest()` (B1.09.01), `info(cmd1Variant, selector, ...data)` (BX.09)
  - Cue helpers (EVS variants of CueUpWithData):
    - `cueByTimecode({ hh, mm, ss, ff })` → 24.31
    - `loadAndCueById(lsmId)` → 28.31
    - `loadByIdAndCueByTimecode(lsmId, { hh, mm, ss, ff })` → 2C.31

Example:

```js
import { VTR422, Odetics } from 'sony9pin-nodejs';
const vtr = new VTR422({ portPath: 'COM1' });
const od = new Odetics(vtr);
await vtr.open();
await od.listFirstId();
await vtr.close();
```

See consolidated command tables in docs/COMMANDS.md for Sony, Blackmagic AMP, and Odetics.
Demo:
- `examples/odetics.js` (shows CueUpWithData variants for LSM IDs)

## API

### `new VTR422(options)`
- `portPath` string (default `COM1`)
- `baudRate` number (default `38400`)
- `dataBits` number (default `8`)
- `parity` string: `odd` (default)
- `stopBits` number: `1` (default)
- `autoOpen` boolean: default `false`
- `debug` boolean: default `false` (minimized logs). When `true`, logs TX/RX hex and parsed messages.

### Connection
- `open()` → Promise<void>
- `close()` → Promise<void>
- `isOpen()` → boolean

### Commands (helpers)
- System: `localDisable()`, `deviceType()`, `localEnable()`
- Transport: `play()`, `stop()`, `record()`, `standbyOn()`, `standbyOff()`, `eject()`, `fastForward()`, `rewind()`, `preroll()`, `preview()`, `review()`, `syncPlay()`, `cueUpWithData(h,m,s,f)`, `frameStepForward()`, `frameStepReverse()`, `jog(delta)`, `varSpeed(speed)`, `shuttle(speed)`
- Preset/Select: `inEntry()`, `outEntry()`, `inDataPreset(h,m,s,f)`, `outDataPreset(h,m,s,f)`, `prerollPreset(h,m,s,f)`, `autoModeOn()`, `autoModeOff()`, `inputCheck()`
- Sense: `statusSense(start,size)`, `currentTimeSense(flag)`, `tcGenSense()`, `inDataSense()`, `outDataSense()`, `deviceType()`

### Generic 1:1 wrapper
- `sendCommand(cmd1, cmd2, data?)` to send any Sony 9‑pin command directly.
- `Encoder.encode(cmd1, cmd2, data?)` returns a packet `Buffer` you can pass to `vtr.send(...)`.

### Timecode sense flags
- `CurrentTimeSenseFlag.LTC_TC` (0x01)
- `CurrentTimeSenseFlag.VITC_TC` (0x02)
- `CurrentTimeSenseFlag.AUTO` (0x03) → best source per Sony; corrected LTC (74.14) when both LTC/VITC not good

## Events (feedback)
- `ack` → `{ type: 'ack' }`
- `nak` → `{ type: 'nak', reasons: string[] }`
  - Reasons may include: `TIMEOUT`, `CHECKSUM_ERROR`, `PARITY_ERROR`, `FRAMING_ERROR`, `BUFFER_OVERRUN`, `UNKNOWN_CMD`
- `device_type` → `{ deviceType: number }` e.g., `0xF1E0`
- `status` → `{ flags: string[] }`
  - Examples: `STANDBY`, `STOP`, `PLAY`, `SERVO_LOCK`, `JOG`, `SHUTTLE`, `VAR`, `STILL`, `AUTO_MODE`, `FULL_EE`, `SELECT_EE`, `IN_SET`, `OUT_SET`, etc.
- `timecode` → `{ timecode: { hours, minutes, seconds, frames, dropFrame, colorFrame } }`
- `raw` → `{ text: string }` human‑readable dump for unknown payloads

## Notes on timecode
- `61.0C.03` (AUTO) chooses LTC or VITC based on signal quality; returns corrected LTC (74.14) if neither is good.
- At low tape speeds, LTC may be unreadable; VITC is recommended. AUTO handles this automatically.

## Design details
- Header length nibble included per Sony spec.
- Checksum is 8‑bit sum of all previous bytes in the packet.
- Serial settings are hardcoded to 38400 8O1, typical for Sony 9‑pin.

## Troubleshooting
- No ACK: ensure the deck is in Remote/RS‑422 mode and media is present.
- Frequent `TIMEOUT` NAKs: add short delays between commands, or query status before transport actions.
- No timecode: enable VITC/LTC on the deck, or use `AUTO` for corrected LTC.

## License
MIT

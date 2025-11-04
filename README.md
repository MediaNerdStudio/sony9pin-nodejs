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

### Commands (selected)
- Transport: `play()`, `stop()`, `record()`, `fastForward()`, `rewind()`, `standbyOn()`, `standbyOff()`, `preview()`, `review()`, `preroll()`
- Preset/Select: `cueUpWithData(hh, mm, ss, ff)`
- Sense: `statusSense(start, size)`, `currentTimeSense(flag)`, `deviceType()`

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

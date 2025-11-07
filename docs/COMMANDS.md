# Sony 9‑pin Command Families (Sony, Blackmagic AMP, Odetics)

This document summarizes the command families supported by this package and provides a compact reference for developers. For the full, machine-readable source tables, see the CSV files in this repo:

- docs/Sony 9-pin Commands [incl BM and Odetics] - Commands.csv
- docs/Sony 9-pin Commands [incl BM and Odetics] - Models.csv

## Packet Format (recap)
- Header = (Cmd1 & 0xF0) | (data_len & 0x0F)
- Body = [Header, Cmd2, ...Data]
- Checksum = Sum of all previous bytes (8‑bit)

Notes:
- Some returns reuse the 0x10 group with varying length nibble in Header (ACK 10 01, NAK 10 12, Device Type 12 11 are commonly seen as 11 01, 11 12, 12 11, etc.).
- Time values are BCD and ordered FF, SS, MM, HH unless otherwise specified.

## Families
- Sony 9‑pin (BVW series baseline)
- Blackmagic Advanced Media Protocol (AMP) over RS‑422
- Odetics extensions (superset of Sony)

---

## Sony 9‑pin (selected)

| Data (Cmd1 Cmd2) | Command | Return (Cmd1 Cmd2) | Reply | Notes |
| --- | --- | --- | --- | --- |
| 00 0C | Local Disable | 10 01 | Acknowledge | |
| 00 11 | DeviceTypeRequest | 12 11 | Device Type | NTSC/PAL/24P encoded in data |
| 00 1D | Local Enable | 10 01 | Acknowledge | |
| 20 00 | Stop | 10 01 | Acknowledge | |
| 20 01 | Play | 10 01 | Acknowledge | |
| 20 02 | Record | 10 01 | Acknowledge | |
| 20 10 | Fast Fwd | 10 01 | Acknowledge | |
| 20 20 | Rewind | 10 01 | Acknowledge | |
| 20 30 | Preroll | 10 01 | Acknowledge | |
| 20 34 | SyncPlay | 10 01 | Acknowledge | |
| 21 11 | JogFwd1 | 10 01 | Acknowledge | Uses 1‑byte magnitude |
| 21 12 | VarFwd1 | 10 01 | Acknowledge | |
| 21 13 | ShuttleFwd1 | 10 01 | Acknowledge | |
| 24 31 | CueData | 10 01 | Acknowledge | FF SS MM HH (BCD) |
| 40 10 | InEntry | 10 01 | Acknowledge | |
| 40 11 | OutEntry | 10 01 | Acknowledge | |
| 44 14 | InDataPreset | 10 01 | Acknowledge | FF SS MM HH (BCD) |
| 44 15 | OutDataPreset | 10 01 | Acknowledge | FF SS MM HH (BCD) |
| 61 0C | CurrentTimeSense | 74 xx | Time Data | AUTO/LTC/VITC flags |
| 61 20 | StatusSense | 7x 20 | Status Data | See status bits |

See the CSV for the exhaustive list.

---

## Blackmagic AMP (selected)

| Data | Command | Return | Reply | Notes |
| --- | --- | --- | --- | --- |
| A1 01 | AutoSkip | 10 01 | Acknowledge | signed 8‑bit skip count |
| A0/ A1 15 | ListNextID | 80/88 14 | IDListing | A0 single, A1 with count in data |
| 20 29 | ClearPlaylist | 10 01 | Acknowledge | |
| 41 42 | SetPlaybackLoop | 10 01 | Acknowledge | bit0 loop, bit1 timeline |
| 41 44 | SetStopMode | 10 01 | Acknowledge | 0..3 |
| 4F 16 | AppendPreset | 10 01 | Acknowledge | name length (BE), name, IN/OUT FF SS MM HH |
| 08 02 | SeekToTimelinePosition | 10 01 | Acknowledge | LE 16‑bit fraction |
| 81 03 | SeekRelativeClip | 10 01 | Acknowledge | signed 8‑bit |

HyperDeck-specific (observed):

| Data | Command | Return | Reply | Notes |
| --- | --- | --- | --- | --- |
| 22 5C | DMCSetFwd | 10 01 | Acknowledge | Device-specific forward DMC setting |
| 22 5D | DMCSetRev | 10 01 | Acknowledge | Device-specific reverse DMC setting |

---

## Odetics (selected)

| Data | Command | Return | Reply | Notes |
| --- | --- | --- | --- | --- |
| A0 01 | AutoSkip | 10 01 | Acknowledge | Odetics auto skip (signed 8‑bit) |
| A0 06 | PreviewInReset | 10 01 | Acknowledge | |
| A0 07 | PreviewOutReset | 10 01 | Acknowledge | |
| A0 14 | ListFirstID | 80/88 14 | | 80=no clip, 88=first ID |
| A0 15 | ListNextID | 80/88 14 | | Next ID |
| A0 1C | LongestContiguousAvailableStorage | 84 1C | | |
| A0 21 | DeviceIDRequest | 88 21 | | |
| A8 16 | ListClipTc | 80/88 16 | | First frame TC + duration |
| A8 17 | ListClipTc (EVS) | 80/89 17 | | Adds machine number |
| A8 18 | IDStatusRequest | 81 18 | | Status bits |
| A8 20 | SetDeviceID | 10 01 | Acknowledge | Payload = device id |
| AX 02 | RecordCueUpWithData | 10 01 | Acknowledge | Variant nibble; payload varies |
| AX 04 | PreviewInPreset | 10 01 | Acknowledge | Variant nibble |
| AX 05 | PreviewOutPreset | 10 01 | Acknowledge | Variant nibble |
| AX 10 | EraseID | 10 01 | Acknowledge | Variant nibble |
| B0 00 | GetEvent | 90/9x 00 | | Queue event |
| B1 01 | SetTargetMachine | 10 01 | Acknowledge | Payload exists |
| B8 02 | SetIdForData | 10 01 | Acknowledge | Prepares BC 02 |
| BC 02 | SetData | 10 01 | Acknowledge | Associates data with stored ID |
| B8 03 | GetData | 9C 03 | | Returns data for supplied ID |
| BX 04 | MakeClip | 10 01 | Acknowledge | Variant nibble |
| BA 05 | SetIDEVSStatus | 10 01 | Acknowledge | Xfiles flags |
| B8 06 | ListClipProtectTC | 98 06 | | Protect IN/OUT |
| B9 07 | GetKeyword | 9D 07 | | |
| B8 08 | SetKeyword 1 | 10 01 | Acknowledge | Set clip ID for BD 08 |
| BD 08 | SetKeyword 2 | 10 01 | Acknowledge | Set keyword on clip |
| B9 09 04 | ID LSM → ID Louth | 99/91 09 04 | | First data byte 0x04 |
| B9 09 05 | ID Louth → ID LSM | 99/91 09 05 | | First data byte 0x05 |
| B9 0A | NetMoveClipIdVDCP | Ack + Events | | |
| B9 0B 53/54 | NetMoveClipIdLsm | Ack + Events | | 53=source, 54=target |
| B8 0C / B9 0C | NetCopyClipIdVDCP | Ack + Events | | 1=source (B8), 2=target (B9) |
| B9 0D 53/54 | NetCopyClipIdLsm | Ack + Events | | 53=source, 54=target |
| B0 0E | GetFirstMachine | 90/9A 0E | | SDTI network |
| B0 0F | GetNextMachine | 90/9A 0F | | SDTI network |
| B4 10 | SetOptions | 10 01 | Acknowledge | |
| B0 11 | GetOptions | (varies) | | |
| BX 12 | SetInOut | (varies) | | Update short in/out |
| B8 13 | Live | 10 01 | Acknowledge | Go live on given camera |
| Cx 01 | Jump Forward X Frames | 10 01 | Acknowledge | Variant nibble Cx; data1=frames |
| Cx 02 | Jump Back X Frames | 10 01 | Acknowledge | Variant nibble Cx; data1=frames |
| Cx 03 | Get Loaded ID | 10 01 | Acknowledge | Variant nibble Cx |

For all details and any additional commands, refer to the full CSV listings.

---

## Usage
- Generic 1:1 senders
  - Sony: `vtr.sendCommand(cmd1, cmd2, data)` or `vtr.send(Encoder.encode(...))`
  - AMP: `bm.send(cmd1, cmd2, data)`
  - Odetics: `od.send(cmd1, cmd2, data)`
- Timecode helper: `FF, SS, MM, HH` order in BCD unless noted.

## Sources
- Sony 9-Pin Remote Protocol (PDF)
- HyperDeck Manual (AMP)
- TSS Owners Manual (Odetics)
- lathoub/Sony9Pin.net Acme.Odetics (C#)

If you find additional commands or variants, please open an issue or PR including the exact `cmd1 cmd2` pair and payload format.

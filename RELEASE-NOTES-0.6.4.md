# sony9pin-nodejs v0.6.4

## Highlights since v0.6.0

### 0.6.4
- fix(odetics): Enforce EVS LSM ID encoding as exactly 8 ASCII bytes with trailing space (0x20) to match EVS specs.
  Ensures OD Load and Cue by ID, and Load by ID + Cue by Timecode work out of the box.

### 0.6.3
- feat(odetics): Add cue helpers:
  - cueByTimecode (24.31)
  - loadAndCueById (28.31)
  - loadByIdAndCueByTimecode (2C.31)
- docs: Expand Odetics command coverage and examples.

### 0.6.2 / 0.6.1
- Internal improvements and documentation updates.

### 0.6.0
- feat(odetics): Initial Odetics helper set (list IDs, device ID, live, set data, etc.).
- Export Odetics class from package entry.

## Notes
- EVS LSM ID format is 8 bytes with last byte blank; helpers now normalize IDs automatically.
- See docs/ files including "Odetics for EVS XT Server_1.00.02" for protocol reference.

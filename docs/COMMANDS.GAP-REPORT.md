# Commands Gap Report

This report compares the consolidated CSV command list with the manuals and the current implementation to identify gaps.

Sources processed:
- CSV: docs/Sony 9-pin Commands [incl BM and Odetics] - Commands.csv
- Text manual: docs/Sony 9-Pin Remote Protocol.txt (parsed)
- Text manuals (encoding issue, please re-save as UTF‑8 if needed):
  - docs/HyperDeckManual.txt (could not read)
  - docs/TSS Owners Manual_V5.11_1-02-18.txt (could not read)

Implementation scope at v0.6.0:
- Sony 9‑pin: Common helpers + generic `sendCommand` and `Encoder.encode` for 1:1 packets
- Blackmagic AMP: Explicit helpers (AutoSkip, ListNextID, ClearPlaylist, SetPlaybackLoop, SetStopMode, AppendPreset, SeekToTimelinePosition, SeekRelativeClip) + raw sender
- Odetics: Explicit helpers for all CSV entries (A0/A8/AX/B0/B1/B4/B8/B9/BA/BD) + raw sender

## Coverage summary

- Blackmagic AMP: CSV ↔ implementation – no gaps detected (based on CSV).
- Odetics: CSV ↔ implementation – no gaps detected (based on CSV).
- Sony 9‑pin: CSV/manual include additional commands beyond current convenience helpers. These are still usable via raw 1:1 send. Below is a list of convenience wrappers that are not yet exposed in `Encoder`.

## Sony 9‑pin convenience wrappers missing (proposed to add)

Transport / System:
- 2X 54 Anti‑Clog Timer Disable
- 2X 55 Anti‑Clog Timer Enable
- 20 60 Full EE Off
- 20 61 Full EE On
- 20 63 Select EE On
- 20 64 Edit Off
- 20 65 Edit On
- 20 6A Freeze Off
- 20 6B Freeze On

Presets / Entries / Shifts / Flags / Recall:
- 44 00 Timer‑1 Preset
- 44 04 Time Code Preset
- 44 05 User Bit Preset
- 40 12 Audio In Entry
- 40 13 Audio Out Entry
- 40 18 In + Shift
- 40 19 In − Shift
- 40 1A Out + Shift
- 40 1B Out − Shift
- 40 1C Audio In + Shift
- 40 1D Audio In − Shift
- 40 1E Audio Out + Shift
- 40 1F Audio Out − Shift
- 40 20 In Flag Reset
- 40 21 Out Flag Reset
- 40 22 Audio In Flag Reset
- 40 23 Audio Out Flag Reset
- 40 24 In Recall
- 40 25 Out Recall
- 40 26 Audio In Recall
- 40 27 Audio Out Recall
- 40 2D Lost Lock Reset

Select / Modes:
- 41 32 Tape/Auto Select
- 41 33 Servo Ref Select
- 41 34 Head Select
- 41 35 Color Frame Select
- 41 36 Timer Mode Select
- 41 3A Edit Field Select
- 41 3B Freeze Mode Select
- 4X 3E Record Inhibit

Spot/Audios:
- 40 42 Spot Erase Off
- 40 43 Spot Erase On
- 40 44 Audio Split Off
- 40 45 Audio Split On

Phases / Levels:
- 4X 98 Output H Phase
- 4X 9B Output Video Phase
- 4X A0 Audio Input Level
- 4X A1 Audio Output Level
- 4X A2 Audio Adv Level
- 4X A8 Audio Output Phase
- 4X A9 Audio Adv Out Phase
- 4X AA Cross Fade Time Preset
- 4X B8 Local Key Map

Timers / Sense (beyond those already added):
- 42 F8 Still Off time
- 42 FA Stby Off time
- 60 2B Remaining Time Sense
- 60 2E Cmd Speed Sense
- 60 31 Preroll Time Sense
- 60 36 Timer Mode Sense
- 60 3E Record Inhibit Sense
- 62 23 Signal Control Sense
- 61 21 Extended VTR Status
- 6X 28 Local Key Map Sense
- 61 2A Head Meter Sense
- 60 52 DA Input Emphasis Sense
- 60 53 DA Playback Emphasis Sense
- 60 58 DA Sampling Frequency Sense
- 61 AA Cross Fade Time Sense

Notes:
- Many 4X commands are parameterized; wrappers should accept payload bytes or structured options.
- All missing items are accessible today via `vtr.sendCommand(cmd1, cmd2, data)`.

## Recommendations

1) Add thin wrappers in `Encoder` for the listed Sony commands (names mirroring the manual/CSV). Where payload formats are complex, accept either a byte array or a small options object.
2) Extend decoder with optional branches for common sense returns (e.g., Remaining Time) if sample frames are available to verify.
3) Re‑save the following text manuals in UTF‑8 so they can be parsed and diffed similarly:
   - docs/HyperDeckManual.txt
   - docs/TSS Owners Manual_V5.11_1-02-18.txt

## Appendix
- The CSV and Sony text manual appear consistent for the listed commands; the above list focuses on convenience helper parity with the spec.

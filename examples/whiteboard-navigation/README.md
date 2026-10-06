# 38 微秒：GPS 为什么需要相对论

An original 42-second, silent explanation on one persistent board. The phone, satellite, clocks, rays and signed time budget retain their world coordinates; the camera returns to the same objects. Paths are genuinely constructed by length. Chinese labels are conventional typesetting, not simulated handwriting.

## What transfers

- Make the board an argument: propagation time becomes range, two signed clock effects become a budget, and corrected signals return to the original phone
- Draw the −7 contribution backwards from +45 to +38 on a consistent scale, rather than adding three unrelated labels
- Construct all final schematic range circles through the same displayed phone point. Explicitly separate illustrative geometry from a physical GPS simulation
- Reserve a fixed caption band during wide camera moves. Final decoded checks repaired two world-label/caption collisions and retained a legible ending

## Facts and boundaries

NIST describes approximate satellite-versus-ground clock contributions of −7 microseconds/day from motion and +45 microseconds/day from gravity, giving about +38 microseconds/day uncorrected. Multiplying one day's 38-microsecond offset by light speed gives about 11.4 km as a signal-distance equivalent. It is not a claim that a real phone drifts 11.4 km every day. Actual GPS applies relativistic and other corrections and combines multiple satellite signals.

Primary sources: [NIST relativity overview](https://www.nist.gov/atomic-clocks/a-powerful-tool-for-science/putting-einstein-test), [NIST clock article](https://www.nist.gov/blogs/taking-measure/putting-einstein-test-worlds-most-accurate-clocks), [NIST GPS overview](https://www.nist.gov/atomic-clocks/a-technology-powerhouse/knowing-where-we-are).

Clock-hand speeds and planar range constraints are schematic. All artwork and code are original. No reference art, reference source or font binaries are bundled.

## Reproduce from the package root

```sh
python3 runtime/render_video.py frame --backend canvas --source examples/whiteboard-navigation/film.cjs --time 39 --width 1920 --height 1080 --out /tmp/heige-gps-frame-new
python3 runtime/render_video.py render --backend canvas --source examples/whiteboard-navigation/film.cjs --duration 42 --fps 24 --width 1920 --height 1080 --shutter-samples 2 --shutter-angle 144 --crf 18 --preset medium --out /tmp/heige-gps-film-new
python3 runtime/review_video.py --video /tmp/heige-gps-film-new/video.mp4 --manifest /tmp/heige-gps-film-new/manifest.json --actions 21:24,32.2:33.3,38.6:40.3 --out /tmp/heige-gps-review-new
```

The source uses the packaged `runtime/motion.cjs` through a verified relative import. It needs an installed CJK font, Canvas dependencies and FFmpeg. The final is silent. Matching source alone does not imply identical bytes on other font or encoder environments.

## Version and review

[Final MP4](../../demos/gps-relativity-v3.mp4) · [Verification](verification.json)

- Source SHA256: `c8c8e8f1ca3188a635eb1b22be7c0dc592b8ad678b410f58bd9c6a9b752a8455`
- Media SHA256: `d7f5288f661150723e03809f18313b431453136fd55e268b6d49627d7d05f92c`
- 42 seconds, 1920×1080, 24 fps, 1008 frames, no audio
- 17 source-time determinism checks; 18 exact-pixel comparisons between experiment and package import locations
- Independent decoded review accepted both repaired caption-band intervals and the ending with no remaining concrete visual blocker at the inspected scope

This is a coherent, simplified code-drawn explainer, not an optical/relativistic simulator or reference-parity claim. Full realtime playback, all-frame artistic review, listening, portrait layout and cross-platform reproduction remain unverified.

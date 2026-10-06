# Night Signal / 夜航 · editorial motion study

A single original event poster is edited into a more intentional composition, turns into a twelve-band rhythm instrument, then returns as the resolved poster. The event is fictional. All visual artwork and procedural audio are original; no third-party media or font files are included.

## What transfers

- Design the complete poster before the camera path. The paper, twelve ink bands and red marker keep their identity across macro, working view, quarter-turn and ending
- Let local alignment happen on the same artifact before the final arrangement. Typography and counterforms are designed content, rather than placeholders
- Reuse geometry with a second function: the bands become the instrument. Twelve exported strike cues drive the red contact response and the generated score
- Bound the rotated paper's visible extents during camera turns. Start the ending headline only after the paper has cleared its destination column

This is a credible improved motion study, not proof of reference-level parity or a template to recolor for every topic.

## Reproduce from the package root

```sh
python3 runtime/render_video.py frame --backend canvas --source examples/swiss-editorial/film.cjs --time 28 --width 1920 --height 1080 --out /tmp/heige-editorial-frame-new
python3 runtime/render_video.py render --backend canvas --source examples/swiss-editorial/film.cjs --duration 30 --fps 24 --width 1920 --height 1080 --out /tmp/heige-editorial-film-new
python3 examples/swiss-editorial/score.py
ffmpeg -v error -n -i /tmp/heige-editorial-film-new/video.mp4 -i examples/swiss-editorial/swiss-score.wav -c:v copy -c:a aac -b:a 192k -shortest /tmp/heige-editorial-film-new/swiss-editorial-v3.mp4
python3 runtime/review_video.py --video /tmp/heige-editorial-film-new/video.mp4 --manifest /tmp/heige-editorial-film-new/manifest.json --actions 15:17.5,18:23,26:27.5 --out /tmp/heige-editorial-review-new
```

The shared runtime render is silent; the following steps synthesize and mux the original score. `score.py` requires NumPy and writes its WAV/event report beside the source. The review command uses the silent runtime artifact and matching manifest. The muxed file has a different hash: review it as a new final artifact; do not reuse a stale manifest for it. Exact MP4 bytes depend on the pinned environment and encoder.

The source registers installed Linux Noto CJK Bold and DejaVu Sans Bold under internal font aliases. Their expected system locations are in `film.cjs`; no font binaries are distributed. Other font environments are untested. A fallback that renders text is not proof of matching typography.

## Version and evidence

- R5 source SHA256: `49395040d88af4b33338b158ccf06d82504d4b3e689102fe2490fa4107eea9e4`
- Included final [MP4](../../demos/swiss-editorial-v3.mp4): 30 seconds, 1920×1080, 24 fps, 720 video frames, H.264 with original AAC
- Final media SHA256: `5e57933b68ac5b9fef46f79e6e8cc7d32f931721b1045c4b12028fb417d34af7`
- [Verification](verification.json): 18 shuffled/repeated actual-pixel samples matched; independent decoded-frame recheck accepted the repaired camera corners and collision-free delayed ending headline
- [Score events](score-events.json): twelve shared strikes; measured peak approximately 0.1491 and RMS 0.0191 before encoding. Sound was not listened to

Review was sampled and targeted. Complete realtime playback, listening, every-frame acceptance, portrait composition and cross-platform reproduction remain unverified.

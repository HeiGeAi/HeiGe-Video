# 归岸 / Homeward · ink narrative

An original silent, 36-second film. A rower crosses a river, responds to a rock in the current, reaches a lit pier and visibly comes to rest. The same boat, route, rock and destination persist through wide, figure, overhead, detail and docking views.

## What transfers

- Build the ending into the world from the opening. The lit landing is an actual destination with a deck and post, not a final title pasted over drifting motion
- Separate preparation, stroke, route change and wake consequence. A paddle action begins before the change in travel is seen
- Attach pigment grain and pressure marks to their object geometry. Foreground ink and softer distance organize the image; procedural brush illustration is not physical wet-ink simulation
- Resolve the action visibly: the oar rests by 30.75 seconds, the bow contacts the pier at 31, the hand reaches the post by 32.15 and the body settles by 32.65. The final 33–36-second wide retains that same contact and pose

The final repair addressed a genuine story gap: numerical deceleration alone did not look like arrival. Material and body weight still feel procedural/vector-like. No reference-parity claim is made.

## Reproduce from the package root

```sh
python3 runtime/render_video.py frame --backend canvas --source examples/ink-narrative/film.cjs --font-family 'Noto Serif CJK SC' --time 18.7 --width 1280 --height 720 --out /tmp/heige-homeward-frame-new
python3 runtime/render_video.py render --backend canvas --source examples/ink-narrative/film.cjs --font-family 'Noto Serif CJK SC' --duration 36 --fps 24 --width 1280 --height 720 --out /tmp/heige-homeward-film-new
python3 runtime/review_video.py --video /tmp/heige-homeward-film-new/video.mp4 --manifest /tmp/heige-homeward-film-new/manifest.json --cuts 6,11,15.5,21.5,26.5,28.5,33 --actions 15.25:16,28.5:33.5 --out /tmp/heige-homeward-review-new
```

The source declares a 36-second authored timeline and seven hard cuts. It registers the installed Linux Noto Serif CJK font under an internal `InkSerif` alias. No font files are bundled; other font environments are untested. Matching source does not guarantee byte-identical encoding across toolchains.

## Version and evidence

- Source SHA256: `976dc3a69da8c2acf73fac4468a6e5347237be00c3406d3bd298b851a02b4d19`
- Included final [MP4](../../demos/homeward-ink-v3.mp4): 1280×720, 24 fps, 864 frames, 36 seconds, silent
- Media SHA256: `9a90c40cf6fed9606028f70927147d9466c91ee90840edae8aefb2b5884e75f5`
- [Verification](verification.json): 26 shuffled-time PNG hash comparisons at 640×360 matched; the shared-runtime 18.7-second frame was pixel-identical to the original adapter; declared duration, cuts and glyph checks passed
- Independent targeted decoded review accepted the repaired docking and obstacle cut, including visible contact, oar stow, post grip and resting final hold

No complete realtime playback or every-frame artistic acceptance is established. The film has no soundtrack. Portrait layout and cross-platform reproduction are unverified.

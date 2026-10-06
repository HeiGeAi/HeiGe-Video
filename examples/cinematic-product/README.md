# SPECTRA · an original product-concept film

Six recognizable authored objects become a library, a selected evidence note becomes a brief, storyboard cards become a real filmstrip, and a playhead reaches the matching optical scene. A beam traverses the same prism and receiving screen before the finished concept resolves. SPECTRA and every product screen are fictional, not a claim about a real service.

## What transfers

- Design the assets before animating them: a prism study, marked note, lens, spectrum swatch and supporting objects have recognizable content and identity
- Let one selected source ID visibly carry into the brief and storyboard. Objects move into the timeline instead of disappearing behind a new title card
- Derive the preview and playhead from the same editorial state. A segment change must occur when the playhead reaches that clip
- Keep child beam visibility inside its parent group; avoid alpha resets that reveal an effect before the object exists
- Transform the actual object or use a clean cut. Crossfading complete duplicate worlds caused double prisms/screens and was repaired
- Clear the result text before introducing the ending brand/CTA; inspect the encoded handoff rather than just the final still

The dark surfaces, materials and projected cards are authored Canvas 2.5D. The optical bench is explicitly schematic; it is not physically ray-traced glass.

## Reproduce from the package root

```sh
python3 runtime/render_video.py render --backend canvas --source examples/cinematic-product/film.cjs --duration 36 --fps 24 --width 1280 --height 720 --out /tmp/heige-spectra-film-new
python3 examples/cinematic-product/soundtrack.py
ffmpeg -v error -n -i examples/cinematic-product/final/sound-design.wav -af loudnorm=I=-20:TP=-2.5:LRA=7 -ar 48000 /tmp/heige-spectra-film-new/sound-design-master.wav
ffmpeg -v error -n -i /tmp/heige-spectra-film-new/video.mp4 -i /tmp/heige-spectra-film-new/sound-design-master.wav -c:v copy -c:a aac -b:a 192k -t 36 -movflags +faststart /tmp/heige-spectra-film-new/spectra-v3-sound.mp4
node --expose-gc examples/cinematic-product/check_history.cjs
python3 runtime/review_video.py --video /tmp/heige-spectra-film-new/video.mp4 --manifest /tmp/heige-spectra-film-new/manifest.json --actions 12.25:13.7,20.25:22.3,29.9:31.6,33:35 --out /tmp/heige-spectra-review-new
```

The runtime video is silent; the following steps synthesize/master/mux the original score. NumPy is required for synthesis. The soundtrack script writes under this example's `final` folder; the history checker writes under `validation`. The QA command uses the silent runtime video with its matching manifest. The muxed file is a new final artifact with a different hash and must not use a stale manifest.

Noto CJK and Noto Latin Regular/Bold are read from the installed Linux paths registered in the source. Fonts are not bundled. Cross-platform reproduction and exact MP4 byte equivalence across toolchains are unverified.

## Facts, rights and review

[Final MP4](../../demos/spectra-product-v3.mp4) · [Shot manifest](shot-manifest.json) · [Verification](verification.json)

General spectrum/refraction background: [NASA Visible Light](https://science.nasa.gov/ems/09_visiblelight/) and [NASA Wave Behaviors](https://science.nasa.gov/ems/03_behaviors/). No NASA media or prose is copied. The UI, notes, art and soundtrack are original; no reference footage, images, music, logos or source code is incorporated.

- Source SHA256: `4f723a08c5db4eae33c7b546e5bee66eabf22c70a3f35ee1f160ede3417d2c95`
- Media SHA256: `fde0acddac98c9cbc2d9a8ea236fc26caa1e690e87dbedff5c8013b02f29f55e`
- Final: 36 seconds, 1280×720, 24 fps, 864 frames; original stereo 48 kHz AAC
- 29 timestamps × three seek orders matched actual pixels. Twenty-one samples before 33 seconds preserved the previous repaired sequence
- Independent review accepted the final encoded ending after the result-to-brand collision was repaired
- Encoded audio measured −18.58 LUFS integrated and −4.08 dBTP. It was not listened to; these measurements do not approve the sound design

Remaining scope: sampled/targeted review, not complete realtime playback or all-frame aesthetic acceptance. This is a stylized concept workflow; no real-product performance, physical optics, expert-reference parity or model-cost advantage is established.

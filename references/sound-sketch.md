# Optional original sound sketches

`scripts/sound_sketch.py` generates deterministic stereo, non-speech WAV sketches from oscillator/noise events and a fixed seed. There are no downloaded samples, reference soundtracks, model calls or credentials. NumPy is an optional dependency for this step; the silent video runtime does not require it.

The included event schedules are authored for the 30-second tech, whiteboard, ink and keynote examples. They are not a general composer and must be retimed if the film changes. Dataviz deliberately remains silent. Ink has an intentional pause before its gust; do not fill that gap with a music bed automatically.

From the Skill folder, using a fresh writable output location:

```sh
python3 scripts/sound_sketch.py --style keynote --duration 30 --out /tmp/keynote-score-new.wav
ffmpeg -n -i /tmp/keynote-film-new/video.mp4 -i /tmp/keynote-score-new.wav -c:v copy -c:a aac -b:a 192k /tmp/keynote-with-sound-new.mp4
ffprobe -v error -show_streams -show_format -of json /tmp/keynote-with-sound-new.mp4
```

The generator also writes an event/peak JSON sidecar. Verify both output filenames are free before running. Do not use `-shortest` to conceal mismatched durations; check the actual resulting video/audio duration, clips and event alignment. Any gain or mixing revision creates a new audio version requiring fresh checks.

Numerical peak/duration checks prove neither timbre nor a good mix. These are sound sketches; the supplied examples' audio has been measured, not listened to. Actual listening remains required before an audiovisual quality claim. Optional synthesis does not imply narration, natural instrument recording or the soundtrack of any reference film.

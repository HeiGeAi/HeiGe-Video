# Dark-keynote worked example: 一束

This is an original 30-second concept/explainer film. A persistent amber idea token gathers notes, a readable brief names the topic “白光里有什么？”, and a full-stage optical scene becomes a framed completed result. It is explicitly labelled as a concept film, not a recording or performance demonstration of a real product.

`film.py` exposes pure-time SVG `render(t)`. The packaged source is the reviewed R4 version, verified by its source hash against the rendered candidate. The brief is readable around 6.4–7.5 seconds, the optical scene begins around 8 seconds, and the completed scene remains identifiable in the closing preview. The timeline is labelled as a shot-structure schematic with no misleading moving playhead.

A separate reviewer examined actual decoded frames, native-size views and dense samples of the changed intro. The requested overlapping-text, causal bridge and false-replay defects were repaired. Their result is a credible coded explainer/concept demonstration, not parity with the reference launch film. It remains a stylized optical illustration, not numerical refraction simulation. Continuous real-time playback was not reviewed.

The reference deliverable was encoded at 1280×720, 24 fps, 30 seconds. Original synthesized audio was added separately; both media streams have 30-second duration. Audio measurements were taken, but no listening review is claimed. See the shared [sound sketch instructions](../../references/sound-sketch.md) and versioned [example status](../../references/example-status.json).

From the Skill folder:

```sh
python3 runtime/render_video.py frame --source examples/dark-keynote/film.py --label dark-keynote --time 15 --width 1280 --height 720 --out /tmp/keynote-frame-new
python3 runtime/render_video.py render --source examples/dark-keynote/film.py --label dark-keynote --duration 30 --fps 24 --width 1280 --height 720 --cuts 5.5,6.125,6.375,6.5,7.5,8,23,26.5,28 --out /tmp/keynote-film-new
```

The custom-source output is `video.mp4`; its label does not select a preset or alter the source. Use the actual dense intro boundaries when reviewing a new change rather than the unrelated preset's default cut list.

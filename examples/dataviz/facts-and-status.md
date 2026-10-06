# Dataviz worked example: 一个极端值，怎样拉动平均数

An original 20-second Chinese data explanation: five persistent hypothetical orders show how one extreme value changes the mean while the median stays fixed. `film.py` is a complete SVG `render(t)` implementation; `data.json` holds the synthetic records; `shot-manifest.json` specifies six shots and their manual correspondence to code. This is a working example, not a generic chart-template engine.

## Facts and identity

A–E are the same five fictional orders throughout, measured in minutes. Initial values 8, 9, 10, 11, 12 have mean 10 and median 10. Only E changes from 12 to 62; the new mean is 20 and median remains 10. Four orders are below the final mean. The zero origin, 0–65 domain and row order remain fixed.

The animation is an explicitly disclosed counterfactual value change, not a measured time series or a simulation of real delivery time. Intermediate animated positions are labelled as changing rather than false observed readings. All geometry/code and data were created for this example; there are no reference images, stock clips, sound samples or real-business claims. Noto fonts are system dependencies, not redistributed assets.

## Verified scope of the source forward test

The authored version identified in `provenance.json` was encoded at 1280×720, 24 fps, 480 frames, 20.000 seconds. The data/row-key and text-bound checks covered all 480 timestamps. Seventeen shuffled/repeated timestamps matched at SVG and raster level. The whole MP4 decoded successfully. Its extracted source archive reproduced the 18-second raw pixels in the same environment.

The [independent review receipt](independent-review.md) records a separate reviewer inspecting actual decoded frames and approved the inspected 1280×720 visual result after two visible repairs: mean-line/value-label interference and conspicuous late-stage label backplates. This is sampled-image acceptance. Real-time playback, pacing and listening were not tested. The file has only a video track and deliberate silence; no audio-quality claim is made.

At 390 pixels wide, the headline, metric values and bar contrast survive, but supporting text/axis labels/disclosures are too small for comfortable reading. Do not claim phone-size acceptance or an authored portrait layout.

The actual executing model identifier was not exposed and is recorded as unknown. This is one exploratory forward application using a capable coding/review workflow, not a low-cost-model experiment, a controlled benchmark or a parity claim.

## Run and adapt

Use the shared package runtime, not a copied runtime inside this example. From the Skill folder:

```sh
python3 scripts/validate_package.py --manifest examples/dataviz/shot-manifest.json
python3 runtime/render_video.py frame --source examples/dataviz/film.py --time 18 --width 1280 --height 720 --out /tmp/dataviz-frame-new
python3 runtime/render_video.py render --source examples/dataviz/film.py --label dataviz --duration 20 --fps 24 --width 1280 --height 720 --cuts 1,1.8,4,6,9,11.7,12.5,15.5,16.2 --out /tmp/dataviz-film-new
python3 examples/dataviz/check_example.py
```

The packaged runner supports `--label dataviz`: it labels custom metadata and writes `video.mp4`. Historical forward-test output used the older runner name `tech.mp4`; its actual style was dataviz. A filename is not style provenance. The source manifest is implemented manually, so validate timing, IDs, state arithmetic and projection against the actual code rather than assuming the renderer consumes it.

When changing values, typography or timing, rerun the project-specific checks and actual-frame review. The supporting annotation layout is designed for this data range; arbitrary datasets need redesign. Regular and Bold faces need separate provenance/coverage/appearance checks. `check_example.py` is scoped to this film's invariants, not a universal chart checker.

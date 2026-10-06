# Original demo videos

These five final demo files are original HeiGe Video project renders. Source code and original procedural sound are covered by the root [MIT license](../LICENSE), with the existing heige-motion-kit contributors notice retained. They contain no redistributed reference footage, soundtrack samples, character artwork or bundled font files. Noto font glyphs appear in rendered frames; the font software is not included.

- [Swiss-tech](swiss-tech.mp4): 30 seconds; information reorganizes around two concrete notes; original procedural audio
- [Whiteboard](whiteboard.mp4): 30 seconds; schematic white-light/prism explanation; original procedural audio
- [Ink](ink.mp4): 30 seconds; a seed journey and poetic time-compressed growth; original procedural audio
- [Dark-keynote](dark-keynote.mp4): 30 seconds; original “一束” concept/explainer, not a real-product recording; original procedural audio
- [Dataviz](dataviz.mp4): 20 seconds; synthetic five-order mean/median explanation; intentionally silent

All files are H.264 MP4 at 1280 × 720 and 24 fps. The first four include AAC audio. Public-release preparation verified the source and media hashes against the existing acceptance records, checked stream metadata and fully decoded all five files. No video was regenerated or recompressed.

## Review scope

The examples have continuous-render technical checks and independent sampled-image/targeted visual review. Complete real-time playback and actual audio listening were not performed. Dataviz supporting text needs redesign for a 390-pixel-wide display. Different output dimensions do not automatically provide an authored portrait layout. These examples do not establish quality parity between models or reference creators.

[Per-example source hashes and review scope](../references/example-status.json) · [Public-release checks](../references/release-validation.json) · [Regenerate video](../USAGE.md) · [Procedural audio instructions](../references/sound-sketch.md) · [Third-party notices](../references/source-notices.md)

## Verify files

From this directory:

```sh
sha256sum -c checksums.sha256
```

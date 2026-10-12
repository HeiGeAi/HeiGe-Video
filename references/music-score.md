# 原创 Forge 音乐配乐

日期：2026-10-12。实现与编排位于 [music-score.mjs](../studio/lib/music-score.mjs)，测试位于 [music-score.test.mjs](../studio/test/music-score.test.mjs)。这是为铁黑、酸绿和硬边工业视觉编排的完整短配乐，不是把少量界面音效命名为 BGM。

本版固定 128 BPM、4/4、8 小节和 15 秒。每拍为 0.46875 秒，每个十六分音符为 0.1171875 秒。48 kHz 立体声 PCM 中每拍恰为 22500 个样本，画面可以按同一秒时钟求值；必须落在视频帧时用 `Math.round(time * fps)`，不要伪称所有拍点都与整数视频帧完全重合。

## 编排与画面 cue

| 结构 | 时间 | 音乐内容与动作用途 |
| :--- | :--- | :--- |
| strike | 0 至 1.875 秒 | 首拍即有 kick、低音与短 hook，直接建立主体。 |
| drive | 1.875 至 5.625 秒 | 切分 breakbeat、低音与和弦推进，支撑主体移动和拆解。 |
| charge | 5.625 至 7.5 秒 | 噪声抬升、缩短 hook 与鼓花，为关键变化蓄力。 |
| forge | 7.5 至 13.125 秒 | 完整鼓组、主 hook、低音及和声，承载影片主要变形与结果。 |
| seal | 13.125 至 15 秒 | 回到 D minor，在 14.0625 秒落下最后重拍与和弦，留下衰减。 |

鼓组包含饱和下滑 kick、身体与噪声叠层 snare、ghost notes、非整数频比金属 hats。低音采用带限锯齿、sub 与动态低通，演奏切分音型。和弦 stabs 与主 hook 使用失谐多振荡器和包络，配置节拍 delay。声部包含 drums、bass、harmony、hook 和 lift，没有下载采样、SoundFont、歌曲旋律、参考配乐或生成供应商调用。

本次交付候选 v2 共有 307 个实际编排事件，事件时间、音符、长度、声像和样本位置保留在 JSON 中。后续改变音色、音型、混音或增益必须生成新音频，不继承旧听感判断。

## 接口与复现

由主生产契约接入的建议字段是：

```json
{
  "continuity": {
    "musicScore": {
      "style": "forge-breakbeat",
      "bpm": 128,
      "volume": 0.8
    }
  }
}
```

`synthesizeMusicScore(plan, output)` 在没有该字段时返回 `null`。有配置时严格要求 15 秒的最终量化影片时钟、24 或 30 fps、正确总帧数、合法 style／bpm／volume，拒绝未知配置字段。另一份 `project.music` 资产与原创配乐互斥。固定种子复用 `project.seed`，缺省为 `20261012`。WAV 输出拒绝覆盖。

```sh
node studio/lib/music-score.mjs --out /tmp/heige-forge-score-new.wav --volume .8
node --test studio/test/music-score.test.mjs
```

CLI 写入 WAV 和同名 JSON。报告包含实际 PCM 峰值／RMS、WAV 与 PCM SHA256、时间结构、逐拍样本 cue、全部事件、声部能量与每半秒能量。`volume` 已在生成 WAV 时应用一次，后续混音不能再次应用同值导致配乐被压小。声效与配乐使用固定相对增益，仅由人声触发 ducking；最终混音单独限幅并重新测量。

## 首版实物与判断范围

候选 v2 的 WAV SHA256 为 `b6b2d48c1a675f9824af2db6cd6ef39b9243fb84eaa34fe4a386493406d1f743`。实际文件为 48 kHz、双声道、16-bit PCM、15.000 秒。PCM sample peak 为 `0.7040009766`，RMS 为 `0.1564996453`。独立 FFmpeg `ebur128` 检查得到约 `-15.1 LUFS`、true peak `-2.9 dBFS`；这些是本次候选测量，不能套用到改变了 gain 或混音的成片。

首版 v1 已独立保留，v2 提升了和弦与主 hook 相对鼓组的存在感。测试实跑 11 项通过、0 skip，验证真实 WAV、独立 PCM 测量、完整多声部编排、拍点、确定性、音量、坏时钟及输入不变。测试和数值不证明它好听。

当前没有人工听审通过结论。音色、鼓与低音关系、主 hook 是否抢画面、结尾是否自然，以及设备上的听感，必须播放实际 WAV 与最终视频判断。本文不把 finite、峰值、事件数量或响度当作音乐审美评分。已有 SoundFont 仅是可选对比资源，没有复制进本项目，也没有用于这次候选。

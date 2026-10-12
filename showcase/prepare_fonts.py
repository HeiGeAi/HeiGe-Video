#!/usr/bin/env python3
"""Make locally cached OFL fonts cover current scene text, without network calls."""
import hashlib
import json
from pathlib import Path
import re
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONTS = [
    ('CandyDisplay', '.cache/showcase-fonts/candy.ttf', ['Citrus.tsx', 'PaperFlight.tsx'],
     'https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf'),
    ('SerifDisplay', '.cache/showcase-fonts/mineral.ttf', ['MineralBloom.tsx'],
     'https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf'),
    ('VideoSans', '.cache/fonts/NotoSansCJKsc-Regular.otf', ['Citrus.tsx', 'PaperFlight.tsx', 'MineralBloom.tsx'],
     'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf'),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    records = []
    for family, relative, scenes, url in FONTS:
        src = ROOT/relative
        text = ''.join((ROOT/'showcase/scenes'/scene).read_text() for scene in scenes)
        chars = set(''.join(re.findall(r'[\u3400-\u9fff\u3000-\u303f\uff01-\uff60·]', text)))
        chars.update(chr(i) for i in range(32, 127))
        # The mineral footer's middle dot is rendered with VideoSans, not the
        # calligraphic display face. Keep that actual role distinction explicit.
        body_only = {'·'} if family == 'SerifDisplay' else set()
        chars.difference_update(body_only)
        font = TTFont(src, recalcTimestamp=False)
        cmap = font.getBestCmap()
        missing = sorted(char for char in chars if ord(char) not in cmap)
        if missing:
            raise ValueError(f'{family} missing: {missing}')
        options = subset.Options()
        options.flavor = 'woff'
        options.desubroutinize = True
        sub = subset.Subsetter(options=options)
        sub.populate(text=''.join(sorted(chars)))
        sub.subset(font)
        # Subsets use new family names; original attribution and license remain.
        for name in font['name'].names:
            if name.nameID in [1, 3, 4, 6, 16, 17]:
                value = f'HeiGe{family}' if name.nameID == 6 else f'HeiGe {family}'
                name.string = value.encode(name.getEncoding())
        font.flavor = 'woff'
        dest = ROOT/'showcase/public/fonts'/f'{family}.woff'
        font.save(dest)
        records.append({'family':family,'sourceUrl':url,'sourceSha256':sha(src),
                        'font':f'public/fonts/{family}.woff','fontSha256':sha(dest),
                        'characters':''.join(sorted(chars)),'missing':[],
                        'bodyOnlyCharacters':''.join(sorted(body_only)),
                        'license':f'public/fonts/{family}-OFL.txt'})
    (ROOT/'showcase/font-provenance.json').write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps([{'family':r['family'],'characters':len(r['characters']),'sha256':r['fontSha256']} for r in records], indent=2))


if __name__ == '__main__':
    main()

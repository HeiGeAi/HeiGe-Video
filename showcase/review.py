#!/usr/bin/env python3
"""Extract actual encoded frames and gallery media; no aesthetic approval implied."""
import argparse
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

FRAMES = [0, 15, 30, 60, 90, 120, 165, 210, 240, 285, 330, 375, 420, 450, 479]


def run(args):
    subprocess.run(args, check=True, capture_output=True, timeout=180)


def sheet(directory, prefix):
    paths = sorted(directory.glob(prefix + '*.png'), key=lambda p: int(p.stem.rsplit('-', 1)[1]))
    cell_w, cell_h, cols = 320, 260, 4
    image = Image.new('RGB', (cols*cell_w, ((len(paths)+cols-1)//cols)*cell_h), '#f5f1e6')
    draw = ImageDraw.Draw(image)
    for i, path in enumerate(paths):
        thumb = Image.open(path).convert('RGB')
        thumb.thumbnail((304, 224))
        x, y = (i % cols)*cell_w, (i//cols)*cell_h
        image.paste(thumb, (x+(cell_w-thumb.width)//2, y+(224-thumb.height)//2))
        frame = int(path.stem.rsplit('-', 1)[1])
        draw.text((x+10, y+230), f'frame {frame} / {frame/30:.2f}s', font=ImageFont.load_default(size=14), fill='#2536e8')
    image.save(directory/'review-sheet.png')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('command', choices=['proof', 'encoded'])
    p.add_argument('--dir', required=True)
    args = p.parse_args()
    directory = Path(args.dir)
    if args.command == 'proof':
        sheet(directory, 'frame-')
        return
    video = directory/'video.mp4'
    for frame in FRAMES:
        run(['ffmpeg', '-v', 'error', '-i', str(video), '-vf', f'select=eq(n\\,{frame})',
             '-frames:v', '1', str(directory/f'encoded-{frame}.png')])
    sheet(directory, 'encoded-')
    portrait = Image.open(directory/'encoded-0.png').height > Image.open(directory/'encoded-0.png').width
    size = 240 if portrait else 480
    run(['ffmpeg', '-v', 'error', '-i', str(video), '-filter_complex',
         f'[0:v]fps=10,scale={size}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
         '-loop', '0', str(directory/'preview.gif')])
    # Poster is a decoded, settled action result, not a separately designed image.
    poster_frame = 285 if 'citrus' in directory.name else 375 if 'paper' in directory.name else 420
    Image.open(directory/f'encoded-{poster_frame}.png').save(directory/'poster.png')
    (directory/'encoded-review.json').write_text(json.dumps({'frames':FRAMES,'scope':'Actual decoded PNG samples and a 10fps GIF from the final MP4. No full human viewing or listening.'}, indent=2)+'\n')


if __name__ == '__main__':
    main()

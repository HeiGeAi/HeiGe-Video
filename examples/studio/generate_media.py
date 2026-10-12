"""Reproduce original local-media integration fixtures; no network or fonts."""
from pathlib import Path
import math
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
image = Image.new('RGB', (720, 720), '#07191a')
draw = ImageDraw.Draw(image)
draw.rectangle((46, 46, 674, 674), outline='#285352', width=2)
for i in range(5):
    x = 110 + i * 125
    y = 235 + math.sin(i * .8) * 115
    if i:
        draw.line((last_x, last_y, x, y), fill='#46bbb6', width=6)
    draw.ellipse((x-26, y-26, x+26, y+26), fill='#dfefea', outline='#46bbb6', width=4)
    last_x, last_y = x, y
for i, length in enumerate([200, 340, 420]):
    y = 460 + i * 48
    draw.rectangle((110, y, 110 + length, y + 12), fill='#46bbb6')
image.save(ROOT / 'media-original.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'media-original.png'),
                '-vf', "zoompan=z='1+0.001*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=90:s=720x720:fps=30",
                '-frames:v', '90', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p',
                str(ROOT / 'media-original.mp4')], check=True)

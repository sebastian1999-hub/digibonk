from PIL import Image, ImageDraw
from pathlib import Path
out=Path(__file__).resolve().parent
im=Image.new('RGBA',(512,512),(0,0,0,0));d=ImageDraw.Draw(im)
d.rounded_rectangle((16,16,496,496),radius=110,fill='#193f37',outline='#c5ad74',width=10)
d.ellipse((100,385,420,448),fill='#102f2a');d.ellipse((117,103,397,429),fill='#c8b675')
d.ellipse((111,91,385,414),fill='#efe1b4');d.ellipse((145,108,332,349),fill='#f5e9c6')
d.polygon([(220,76),(276,76),(244,218),(308,210),(216,362),(237,255),(184,261)],fill='#5c9b91',outline='#214f45',width=8)
d.polygon([(331,294),(360,319),(345,349),(319,341)],fill='#b79c61')
for x,y,r in [(91,127,13),(419,207,10),(87,332,9),(401,383,13)]:
 d.polygon([(x,y-r),(x+4,y-4),(x+r,y),(x+4,y+4),(x,y+r),(x-4,y+4),(x-r,y),(x-4,y-4)],fill='#e9cf8c')
im.save(out/'digibonk-icon.png');im.save(out/'digibonk.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])

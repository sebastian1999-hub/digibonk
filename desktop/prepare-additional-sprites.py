"""Import reviewed World DS cells, preserve pixel art and precompute alpha bounds.
Usage: python desktop/prepare-additional-sprites.py --source PATH_TO_DOWNLOADED_SHEETS
Raw sheets are not redistributed; sources and authors are in CREDITOS-SPRITES.md.
"""
from pathlib import Path
from PIL import Image
from collections import Counter
import argparse,json,statistics
ROOT=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser();a.add_argument('--source',type=Path,required=True);args=a.parse_args()
ASSETS=ROOT/'game/assets'
def load_js(path):
 s=path.read_text(encoding='utf-8');return json.loads(s[s.index('=')+1:].strip().rstrip(';'))
def write_js(path,name,data):path.write_text('window.'+name+'='+json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8')
# Rectangles exclude source labels, icons and overworld sprites. End coordinates exclusive.
specs={
'Dorumon':([[1,1,75,83],[76,1,150,83],[151,1,225,83],[226,1,300,83],[301,1,375,83]],(255,0,255)),
'Impmon':([[4,41,60,113],[65,41,121,113],[126,41,182,113],[192,41,248,113],[253,41,309,113]],(80,176,88)),
'Dorugamon':([[2,34,114,162],[116,34,228,162],[230,34,342,162],[2,164,114,292],[116,164,228,292]],(72,176,88)),
'DoruGreymon':([[5,3,165,163],[173,3,333,163],[341,3,501,163],[5,171,165,331],[173,171,333,331]],(0,160,160)),
'Myotismon':([[3,5,131,141],[139,5,267,141],[275,5,403,141],[3,149,131,285],[139,149,267,285]],(160,200,248)),
'Taomon':([[4,5,102,149],[106,5,202,149],[208,5,306,149],[3,153,100,299],[103,153,199,297]],(0,168,168)),
'Beelzemon':([[2,34,178,210],[180,34,356,210],[358,34,534,210],[2,212,178,388],[180,212,356,388]],(56,208,152)),
'Dorugoramon':([[1,1,177,161],[185,1,361,161],[369,1,545,161],[1,169,249,332],[257,169,505,332]],(0,160,160)),
'Omnimon':([[1,27,118,182],[119,27,236,182],[237,27,354,182],[355,1,490,182],[491,1,626,182]],(255,0,255)),
'VenomMyotismon':([[5,4,129,164],[133,4,257,164],[261,4,385,164],[5,172,129,332],[137,172,261,332]],(112,144,176)),
'Sakuyamon':([[2,2,130,146],[138,2,266,146],[274,2,402,146],[2,154,138,306],[146,154,282,306]],(0,168,168)),
'Seraphimon':([[2,32,130,176],[132,32,260,176],[262,32,390,176],[2,178,130,322],[132,178,260,322]],(0,216,192)),
'Agumon':([[19,1,81,74],[82,1,144,74],[145,1,207,74],[208,1,270,74],[271,1,333,74]],(255,0,255)),
'WarGreymon':([[4,38,132,230],[140,38,268,230],[276,38,404,230],[4,238,132,430],[140,238,268,430]],(80,176,88)),
'Renamon':([[6,15,65,96],[66,15,118,96],[119,15,172,96],[173,15,228,96],[9,129,79,207],[7,250,78,332],[91,263,155,345]],(0,182,176))}
data=load_js(ASSETS/'sprites-data.js');portraits={};new_names=list(specs)[:12]
for name,(rects,bg) in specs.items():
 source=Image.open(args.source/(name+'.png')).convert('RGBA');frames=[]
 for rect in rects:
  tile=source.crop(rect);pixels=[(r,g,b,0 if (r,g,b)==bg or (name=='Beelzemon' and (r,g,b)==(0,128,128)) else alpha) for r,g,b,alpha in tile.getdata()];tile.putdata(pixels)
  bounds=tile.getbbox();assert bounds,name;frames.append(tile.crop(bounds))
 # Stable centre / foot placement, enough padding for wide attack poses.
 w=max(f.width for f in frames)+4;h=max(f.height for f in frames)+4;sheet=Image.new('RGBA',(w*len(frames),h));coords=[]
 for i,f in enumerate(frames):sheet.alpha_composite(f,(i*w+(w-f.width)//2,h-2-f.height));coords.append({'x':i*w,'y':0,'w':w,'h':h,'duration':.16})
 filename='ds_'+name.lower()+'.png';sheet.save(ASSETS/filename,optimize=True)
 idle=[0,1,2,1];hurt=4 if name=='Renamon' else 3;attack=5 if name=='Renamon' else 4
 action_indices={'idle':idle,'blink':idle,'walk':idle,'run':idle,'surprised':[hurt],'hit':[hurt],'jump':[hurt],'attack':[0,attack,0],'attack2':[0,attack,0],'attack3':[0,hurt,attack,0],'attack4':[attack,hurt,0],'flee':idle,'sleep':[0],'eat':idle,'happy':[0,1,2,1],'angry':[hurt],'cheer':[attack,0],'guard':[hurt],'train':[0,attack,0],'shout':[hurt,attack],'ko':[hurt]}
 entry={'sheet':'assets/'+filename,'width':w,'height':h,'sourcePrefix':'world-ds-'+name.lower(),'sourceGame':'Digimon World DS','uniquePoses':len(frames),'actions':{k:[dict(coords[i]) for i in seq] for k,seq in action_indices.items()}}
 if name in new_names:data[name]=entry
 else:portraits[name]=entry
# Bake opaque bounds once; avoid GPU readback and repeated per-frame alpha scans.
for entries in [data,portraits]:
 for name,spec in entries.items():
  sheet=Image.open(ROOT/'game'/spec['sheet']).convert('RGBA');cache={}
  for frames in spec['actions'].values():
   for f in frames:
    key=(f['x'],f['y'],f['w'],f['h'])
    if key not in cache:
     alpha=sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).getchannel('A').point(lambda n:255 if n>32 else 0);b=alpha.getbbox();cache[key]={'x':b[0],'y':b[1],'w':b[2]-b[0],'h':b[3]-b[1]} if b else None
    f['bounds']=cache[key]
  for action,frames in spec['actions'].items():
   removed=sum(f['bounds'] is None for f in frames)
   if removed:print('Empty frames removed:',name,action,removed)
   spec['actions'][action]=[f for f in frames if f['bounds']] or [f for f in spec['actions']['idle'] if f.get('bounds')]
  spec['referenceHeight']=statistics.median(f['bounds']['h']/f['h'] for f in spec['actions']['idle'])
write_js(ASSETS/'sprites-data.js','SPRITE_DATA',data);write_js(ASSETS/'portrait-data.js','PORTRAIT_DATA',portraits)
print(json.dumps({'worldSpecies':len(data),'newSpecies':new_names,'detailedPortraits':list(portraits),'precomputedFrames':sum(len(f) for s in data.values() for f in s['actions'].values())}))

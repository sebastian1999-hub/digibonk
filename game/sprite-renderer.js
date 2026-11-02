'use strict';
window.DigiSprites=(()=>{
 const images=new Map();let ready=false;
 const data=window.SPRITE_DATA||{};
 function ensure(name){if(images.has(name))return images.get(name);const spec=data[name];if(!spec)return null;const img=new Image();images.set(name,img);img.onload=()=>window.dispatchEvent(new Event('spritesready'));img.src=spec.sheet;return img;}
 const initial=['Koromon','Agumon','Greymon','Tsunomon','Gabumon','Garurumon','Tokomon','Patamon','Angemon'];
 const preload=Promise.all(initial.filter(name=>data[name]).map(name=>new Promise(resolve=>{const img=ensure(name);if(img.complete&&img.naturalWidth)return resolve(true);img.addEventListener('load',()=>resolve(true),{once:true});img.addEventListener('error',()=>resolve(false),{once:true});}))).then(()=>{ready=true;window.dispatchEvent(new Event('spritesready'));});
 function draw(ctx,name,action,x,y,height,time=0,faceLeft=false){const spec=data[name],img=ensure(name);if(!spec||!img?.complete||!img.naturalWidth)return false;const frames=spec.actions[action]||spec.actions.idle;if(!frames?.length)return false;const total=frames.reduce((s,f)=>s+(f.duration||.12),0);let t=((time%total)+total)%total,f=frames[frames.length-1];for(const current of frames){t-=current.duration||.12;if(t<0){f=current;break}}const ratio=height/f.h,w=f.w*ratio;ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y+height*.48));/* Original sheets face left. Public API uses faceLeft to match world coordinates. */ctx.scale(faceLeft?1:-1,1);ctx.drawImage(img,f.x,f.y,f.w,f.h,Math.round(-w/2),-Math.round(height),Math.round(w),Math.round(height));ctx.restore();return true;}
 // Ground contact uses the opaque foot of each frame, not the padded atlas cell.
 const feet=new Map();
 function drawGrounded(ctx,name,action,x,y,height,time=0,faceLeft=false){
  const spec=data[name],img=ensure(name);if(!spec||!img?.complete||!img.naturalWidth)return false;
  const frames=spec.actions[action]||spec.actions.idle;if(!frames?.length)return false;
  const total=frames.reduce((s,f)=>s+(f.duration||.12),0);let t=((time%total)+total)%total,f=frames.at(-1);
  for(const current of frames){t-=current.duration||.12;if(t<0){f=current;break;}}
  const key=name+':'+[f.x,f.y,f.w,f.h].join(',');let crop=feet.get(key);
  if(!crop){const tile=document.createElement('canvas');tile.width=f.w;tile.height=f.h;const c=tile.getContext('2d',{willReadFrequently:true});c.drawImage(img,f.x,f.y,f.w,f.h,0,0,f.w,f.h);const pixels=c.getImageData(0,0,f.w,f.h).data;let left=f.w,right=-1,top=f.h,bottom=-1;for(let yy=0;yy<f.h;yy++)for(let xx=0;xx<f.w;xx++)if(pixels[(yy*f.w+xx)*4+3]>32){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);}crop=right<0?{x:0,y:0,w:f.w,h:f.h}:{x:left,y:top,w:right-left+1,h:bottom-top+1};feet.set(key,crop);}
  const ratio=Math.max(0,Math.min(height/crop.h,(y-6)/crop.h,(2*Math.min(x,ctx.canvas.width-x)-12)/crop.w)),w=crop.w*ratio,h=crop.h*ratio;ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(faceLeft?1:-1,1);ctx.drawImage(img,f.x+crop.x,f.y+crop.y,crop.w,crop.h,Math.round(-w/2),-Math.round(h),Math.round(w),Math.round(h));ctx.restore();return true;
 }
 return {draw,drawGrounded,preload,get ready(){return ready}};
})();


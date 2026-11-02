(function(root){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function mainStage(time){return clamp(Math.floor(time/70)-1,-1,4);}
 function main(time,stage,boss=false){const t=Math.max(0,time),intro=clamp(t/90,0,1),adult=Math.max(0,stage);return {
  hp:(boss?300*Math.pow(1+t/120,1.65):18*Math.pow(1+t/100,1.65)*(1+adult*.25))*(boss?1:.7+.3*intro),
  speed:boss?4+stage*.3:(3.2+Math.min(5.6,t*.014))*(.85+.15*intro),
  contact:(9+t*.045+adult*2)*(.72+.28*intro),shot:10+adult*3+t*.025,
  interval:Math.max(.12,.72-t*.0016)*(1+.65*(1-intro)),elite:t<45?0:Math.min(.25,(.06+t/1800)*clamp((t-45)/45,0,1))
 };}
 function pressure(input,previous={}){return {version:1,level:Math.max(1,input.level,previous.level||1),time:Math.max(0,input.time,previous.time||0),stage:Math.max(-1,input.stage,previous.stage??-1),shops:Math.max(0,input.shops||0,previous.shops||0),cleansed:Math.max(0,input.cleansed||0,previous.cleansed||0)};}
 function realm(profile,wave=1,stageOverride){const stage=clamp(stageOverride??Math.max(profile.stage,mainStage(profile.time)),-1,4),outside=main(profile.time,stage),level=Math.pow(1+(profile.level-1)/12,.9),intensity=1.3+profile.cleansed*.12;
  return {stage,hp:Math.round(Math.max(30,outside.hp*intensity*level*(1+profile.shops*.025))*(1+(wave-1)*.18)),
   speed:Math.min(9.4,Math.max(4+Math.max(0,stage)*.3,outside.speed*1.1)+(wave-1)*.15),
   contact:Math.max(outside.contact*1.2,8+profile.level*.6)*(1+profile.cleansed*.1)*(1+(wave-1)*.08),
   shot:Math.max(outside.shot*1.2,10+profile.level*.5)*(1+profile.cleansed*.1),
   projectileSpeed:Math.min(14,9+wave*.5+profile.level*.035),shotInterval:Math.max(2.2,3.8-wave*.25-profile.level*.012),
   xp:Math.round((3+Math.max(0,stage)*2+Math.floor(profile.level/8))*(1+(wave-1)*.2)),coins:2+Math.floor(profile.level/12)+(wave===3?1:0),
   count:[10,15,20][wave-1]+Math.min(16,Math.floor((profile.level-1)/4))+profile.cleansed*2};
 }
 function tower(profile){return Math.round(Math.max(650,realm(profile,3).hp*(7+profile.cleansed)));}
 const api={mainStage,main,pressure,realm,tower};if(typeof module!=='undefined')module.exports=api;else root.DigibonkBalance=api;
})(typeof window!=='undefined'?window:globalThis);

(function(root){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function mainStage(time){return clamp(Math.floor(time/70)-1,-1,4);}
 function main(time,stage,boss=false){const t=Math.max(0,time),intro=clamp(t/90,0,1),adult=Math.max(0,stage);return {
  hp:(boss?300*Math.pow(1+t/120,1.65):18*Math.pow(1+t/100,1.65)*(1+adult*.25))*(boss?1:(.7+.3*intro)*.6),
  speed:boss?4+stage*.3:(3.2+Math.min(5.6,t*.014))*(.85+.15*intro),
  contact:(9+t*.045+adult*2)*(.72+.28*intro)*(boss?1:.8),shot:(10+adult*3+t*.025)*(boss?1:.85),
  batch:Math.min(6,3+Math.floor(t/120)),interval:Math.max(.28,.8-t*.0012)*(1+.4*(1-intro)),elite:t<45?0:Math.min(.16,(.04+t/2400)*clamp((t-45)/45,0,1))
 };}
 function pressure(input,previous={}){return {version:2,level:Math.max(1,input.level,previous.level||1),time:Math.max(0,input.time,previous.time||0),stage:Math.max(-1,input.stage,previous.stage??-1),shops:Math.max(0,input.shops||0,previous.shops||0),cleansed:Math.max(0,input.cleansed||0,previous.cleansed||0)};}
 function realm(profile,wave=1,stageOverride){const progress=clamp(profile.cleansed||0,0,5),stage=clamp(stageOverride??Math.max(profile.stage,mainStage(profile.time)),-1,4),outside=main(profile.time,stage),level=Math.pow(1+(profile.level-1)/20,.55),intensity=1.05+progress*.18;
  return {stage,hp:Math.round(Math.max(12,outside.hp*intensity*level*(1+profile.shops*.018))*(1+(wave-1)*.12)),
   speed:Math.min(9.4,Math.max(3.1+Math.max(0,stage)*.2,outside.speed*(.94+progress*.035))+(wave-1)*.1),
   contact:Math.max(outside.contact,6+profile.level*.35)*(.8+progress*.12)*(1+(wave-1)*.06),
   shot:Math.max(outside.shot,7+profile.level*.3)*(.8+progress*.12),
   projectileSpeed:Math.min(14,7.5+wave*.3+profile.level*.02+progress*.45),shotInterval:Math.max(2.2,4.8-wave*.2-profile.level*.008-progress*.22),
   eliteChance:.025+wave*.01+progress*.012+Math.min(.06,profile.level/600),rangedChance:.12+progress*.025,
   reinforcementCount:4+progress+Math.min(5,Math.floor(profile.level/15)),reinforcementInterval:12-progress*.9,
   xp:Math.max(1,Math.round(.6*(3+Math.max(0,stage)*2+Math.floor(profile.level/8))*(1+(wave-1)*.2))),coins:2+Math.floor(profile.level/12)+(wave===3?1:0),
   count:Math.min(145,[18,28,40][wave-1]+Math.min(20,Math.floor((profile.level-1)/3))+progress*[6,9,12][wave-1])};
 }
 function tower(profile){return Math.round(Math.max(350,realm(profile,3).hp/.6*(4+clamp(profile.cleansed||0,0,5))));}
 const api={mainStage,main,pressure,realm,tower};if(typeof module!=='undefined')module.exports=api;else root.DigibonkBalance=api;
})(typeof window!=='undefined'?window:globalThis);

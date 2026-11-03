(function(root){'use strict';function install(C,S){const p=C.Run.prototype,dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 p.castPattern=function(skill,rank,nearest,damage){const s=this.s,p=s.player,apply=e=>{this.hurt(e,damage,skill.id);},radius=(skill.pattern==='ring'?5:skill.pattern==='cone'?7:3.5)*p.area*(1+(rank-1)*.035),targets=this.combatTargets(s.enemies);
 if(skill.pattern==='volley'){for(const e of targets.slice(0,Math.min(6,3+p.projectileBonus+Math.floor(rank/4))))s.shots.push({id:s.nextId++,x:p.x,z:p.z,ox:p.x,oz:p.z,target:e.id,height:1.2,bornAt:s.time,speed:26,damage,area:0,life:2.8,skillId:skill.id,color:skill.color});return;}
 if(skill.pattern==='cone'){const dx=nearest.x-p.x,dz=nearest.z-p.z,n=Math.hypot(dx,dz)||1;for(const e of targets){const d=dist(e,p);if(d<radius&&((e.x-p.x)*dx+(e.z-p.z)*dz)/(Math.max(.01,d)*n)>.5)apply(e);}this.effect('burst',p.x,p.z,{skillId:skill.id,size:radius/3,radius,dx:dx/n,dz:dz/n,life:.7,maxLife:.7});return;}
 if(skill.pattern==='ring'){for(const e of targets)if(dist(e,p)<radius)apply(e);this.effect('burst',p.x,p.z,{skillId:skill.id,radius,size:radius/3,life:1,maxLife:1});return;}
 if(skill.pattern==='chain'){let origin=p;const available=[...targets];for(let i=0;i<3;i++){available.sort((a,b)=>dist(a,origin)-dist(b,origin));const e=available.shift();if(!e||dist(e,origin)>15)break;apply(e);this.effect('burst',e.x,e.z,{skillId:skill.id,fromX:origin.x,fromZ:origin.z,life:.65,maxLife:.65});origin=e;}return;}
 s.attackFields??=[];s.attackFields.push({x:nearest.x,z:nearest.z,radius,damage,skillId:skill.id,left:.4});if(s.attackFields.length>48)s.attackFields.shift();this.effect('burst',nearest.x,nearest.z,{skillId:skill.id,radius,size:radius/3,life:.9,maxLife:.9});
 };
 p.updatePatternFields=function(dt){const s=this.s;if(s.done)return;s.attackFields??=[];for(const field of s.attackFields){field.left-=dt;if(field.left<=0){for(const e of [...s.enemies])if(e.hp>0&&!e.shielded&&dist(e,field)<field.radius){this.hurt(e,field.damage,field.skillId);}}}s.attackFields=s.attackFields.filter(f=>f.left>0);};
}
const api={install};if(typeof module!=='undefined')module.exports=api;else root.DigibonkPatternCombat=api;
})(typeof window!=='undefined'?window:globalThis);

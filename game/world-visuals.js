import * as THREE from './vendor/three.module.js';

const W=window.DigibonkWorld,C=window.DigibonkCore;

export class WorldVisuals {

 constructor(renderer){this.r=renderer;this.key='';this.group=null;this.textures=new Map();this.animated=[];}

 texture(kind){if(this.textures.has(kind))return this.textures.get(kind);const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle=kind==='fire'?'#302325':kind==='flood'?'#347eab':'#2c1d46';c.fillRect(0,0,256,256);

  if(kind==='fire'){for(let i=0;i<70;i++){const x=C.hash(i,1,77)%256,y=C.hash(i,2,77)%256;c.fillStyle=i%2?'#141c1d':'#50402d';c.beginPath();c.ellipse(x,y,8+i%13,5+i%9,i,0,Math.PI*2);c.fill();}c.strokeStyle='#ff9a4d';c.lineWidth=2;c.shadowColor='#ff682a';c.shadowBlur=9;for(let i=0;i<15;i++){let x=C.hash(i,7,77)%256,y=C.hash(i,8,77)%256;c.beginPath();c.moveTo(x,y);for(let j=0;j<5;j++){x+=Math.sin(i*4+j)*14;y+=9;c.lineTo(x,y);}c.stroke();}}

  if(kind==='flood'){c.strokeStyle='#91e5f0';c.lineWidth=2;for(let y=-20;y<290;y+=25){c.beginPath();for(let x=-5;x<265;x+=4){const yy=y+Math.sin(x/25+y*.2)*5;if(x===-5)c.moveTo(x,yy);else c.lineTo(x,yy);}c.stroke();}c.globalAlpha=.45;c.strokeStyle='#e0ffff';for(let i=0;i<10;i++){c.beginPath();c.ellipse(C.hash(i,3,7)%256,C.hash(i,4,7)%256,12,5,0,0,Math.PI*2);c.stroke();}}

  if(kind==='glitch'){c.strokeStyle='#7549ac';c.lineWidth=1;for(let i=0;i<256;i+=32){c.beginPath();c.moveTo(i,0);c.lineTo(i,256);c.moveTo(0,i);c.lineTo(256,i);c.stroke();}for(let i=0;i<24;i++){const x=C.hash(i,3,3)%240,y=C.hash(i,9,3)%240;c.strokeStyle=i%2?'#65f5df':'#e88bf5';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+12,y);c.lineTo(x+12,y+18);c.lineTo(x+24,y+18);c.stroke();c.fillStyle=c.strokeStyle;c.fillRect(x-2,y-2,4,4);}}

  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set((kind==='fire'?4:3)*W.SECTOR_SIZE/72,(kind==='fire'?4:3)*W.SECTOR_SIZE/72);t.anisotropy=4;this.textures.set(kind,t);return t;

 }

 clear(){if(this.group){this.group.removeFromParent();const geos=new Set(),mats=new Set();this.group.traverse(o=>{if(o.geometry&&!Object.values(this.r.geo).includes(o.geometry))geos.add(o.geometry);if(o.material)mats.add(o.material);if(o.userData.labelTexture)o.userData.labelTexture.dispose();});for(const g of geos)g.dispose();for(const m of mats)m.dispose();}this.group=null;this.animated=[];}

 tint(sectors){const r=this.r,geometry=r.terrain.geometry,colors=geometry.attributes.color,positions=geometry.attributes.position;if(!geometry.userData.baseColors)geometry.userData.baseColors=colors.array.slice();const source=geometry.userData.baseColors,color=new THREE.Color();for(let i=0;i<colors.count;i++){const z=sectors[W.sectorIndex(positions.getX(i),positions.getZ(i))];color.setRGB(source[i*3],source[i*3+1],source[i*3+2]);if(z.kind)color.lerp(new THREE.Color(z.kind==='fire'?'#453b31':z.kind==='flood'?'#50939a':'#72648d'),.7);else if(z.purified)color.lerp(new THREE.Color('#8fc9a0'),.15);colors.setXYZ(i,color.r,color.g,color.b);}colors.needsUpdate=true;

  r.world.traverse(o=>{if(!o.isInstancedMesh||o.userData.environment)return;if(!o.instanceColor)return;if(!o.userData.baseColors)o.userData.baseColors=o.instanceColor.array.slice();const data=o.userData.baseColors,matrix=new THREE.Matrix4(),point=new THREE.Vector3();for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);const zone=sectors[W.sectorIndex(point.x,point.z)];color.setRGB(data[i*3],data[i*3+1],data[i*3+2]);if(zone.kind)color.lerp(new THREE.Color(o.userData.obstacleType==='rock'&&zone.kind==='fire'?'#e5d9d4':zone.kind==='fire'?'#4f352b':zone.kind==='flood'?'#517d8a':'#89689e'),o.userData.obstacleType==='rock'&&zone.kind==='fire'?.85:.75);o.setColorAt(i,color);}o.instanceColor.needsUpdate=true;});

 }

 label(text,subtitle,color,x,y,z){const c=document.createElement('canvas');c.width=384;c.height=118;const ctx=c.getContext('2d');ctx.fillStyle='#132d2ded';ctx.beginPath();ctx.roundRect(2,2,380,114,14);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();ctx.textAlign='center';ctx.fillStyle=color;ctx.font='bold 30px Segoe UI';ctx.fillText(text,192,46);ctx.fillStyle='#eff5df';ctx.font='20px Segoe UI';ctx.fillText(subtitle,192,84);const t=new THREE.CanvasTexture(c),m=new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false}),sprite=new THREE.Sprite(m);sprite.position.set(x,y,z);sprite.scale.set(8,2.45,1);sprite.userData.labelTexture=t;this.group.add(sprite);}

 rebuild(s){this.clear();this.tint(s.sectors);this.group=new THREE.Group();this.r.world.add(this.group);const r=this.r,seed=s.mapSeed;

  const add=(geometry,color,x,y,z,scale,opacity=1)=>{const material=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1,toneMapped:false,side:THREE.DoubleSide}),m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);if(scale)m.scale.set(...scale);this.group.add(m);return m;};

  for(const zone of s.sectors){if(!zone.kind&&!zone.purified)continue;const definition=W.types[zone.kind],color=definition?.color||'#89e5b0',minX=zone.x-W.SECTOR_SIZE/2,minZ=zone.z-W.SECTOR_SIZE/2,anchor=zone.anchor,h=C.heightAt(anchor.x,anchor.z,seed);

   if(zone.kind){const geo=new THREE.PlaneGeometry(W.SECTOR_SIZE-.4,W.SECTOR_SIZE-.4,48,48);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i)+zone.x,z=pos.getZ(i)+zone.z;pos.setXYZ(i,x,C.heightAt(x,z,seed)+.105,z);}geo.computeVertexNormals();const mat=new THREE.MeshBasicMaterial({map:this.texture(zone.kind),transparent:true,opacity:zone.kind==='flood'?.68:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});this.group.add(new THREE.Mesh(geo,mat));

    const points=[];for(let edge=0;edge<4;edge++)for(let i=0;i<=18;i++){const f=i/18,x=edge===0?minX+W.SECTOR_SIZE*f:edge===1?minX+W.SECTOR_SIZE:edge===2?minX+W.SECTOR_SIZE-W.SECTOR_SIZE*f:minX,z=edge===0?minZ:edge===1?minZ+W.SECTOR_SIZE*f:edge===2?minZ+W.SECTOR_SIZE:minZ+W.SECTOR_SIZE-W.SECTOR_SIZE*f;points.push(new THREE.Vector3(x,C.heightAt(x,z,seed)+.22,z));}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color,dashSize:1.5,gapSize:.8,transparent:true,opacity:.85}));line.computeLineDistances();this.group.add(line);

    const props=[];for(let i=0;i<42*(W.SECTOR_SIZE/72)**2;i++){const x=minX+3+(C.hash(i,zone.id+2,seed)%((W.SECTOR_SIZE-6)*100))/100,z=minZ+3+(C.hash(i,zone.id+12,seed)%((W.SECTOR_SIZE-6)*100))/100;if(Math.hypot(x-anchor.x,z-anchor.z)>5&&C.walkable(x,z,seed,.2))props.push({x,z,phase:i*.71});}

    const geometry=zone.kind==='fire'?new THREE.ConeGeometry(.42,1.6,7):zone.kind==='flood'?new THREE.TorusGeometry(1,.045,4,28):new THREE.BoxGeometry(.65,1.7,.65),matProps=new THREE.MeshBasicMaterial({color,transparent:true,opacity:zone.kind==='fire'?.8:.55,depthWrite:false,toneMapped:false}),instances=new THREE.InstancedMesh(geometry,matProps,props.length);instances.userData.environment=true;this.group.add(instances);this.animated.push({kind:zone.kind,mesh:instances,props});

    if(zone.kind==='fire'){const smoke=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.65,1),new THREE.MeshBasicMaterial({color:'#3d4445',transparent:true,opacity:.22,depthWrite:false}),props.length);smoke.userData.environment=true;this.group.add(smoke);this.animated.push({kind:'smoke',mesh:smoke,props});}

   }

   if(s.realm)continue;

   const ring=add(r.geo.ring,color,anchor.x,h+.17,anchor.z,[3.4,3.4,3.4],.85);ring.rotation.x=-Math.PI/2;add(r.geo.cube,'#284445',anchor.x,h+.15,anchor.z,[1.4,.3,1.4]);const gem=add(r.geo.gem,color,anchor.x,h+2.1,anchor.z,[.7,1.3,.7],.95);this.animated.push({kind:'node',mesh:gem,props:[{x:anchor.x,z:anchor.z,phase:zone.id}]});if(zone.kind){const beam=add(new THREE.CylinderGeometry(.55,.9,5,12,1,true),color,anchor.x,h+2.5,anchor.z,null,.12);this.label(definition.name.toUpperCase(),'[F] PURIFICAR · 5 S',color,anchor.x,h+6.2,anchor.z);}else this.label('SECTOR RESTAURADO','PURIFICADO · OBJETIVO AVANZADO',color,anchor.x,h+5.5,anchor.z);

  }

  const volcanicRocks=r.map.obstacles.filter(o=>o.type==='rock'&&s.sectors[W.sectorIndex(o.x,o.z)].kind==='fire');if(volcanicRocks.length){const base=new THREE.InstancedMesh(new THREE.RingGeometry(.6,1,24),new THREE.MeshBasicMaterial({color:'#211c2a',side:THREE.DoubleSide}),volcanicRocks.length),rim=new THREE.InstancedMesh(new THREE.RingGeometry(.94,1,24),new THREE.MeshBasicMaterial({color:'#e8b5a0',side:THREE.DoubleSide}),volcanicRocks.length);const d=new THREE.Object3D();for(let i=0;i<volcanicRocks.length;i++){const o=volcanicRocks[i];d.position.set(o.x,C.heightAt(o.x,o.z,seed)+.15,o.z);d.rotation.x=-Math.PI/2;d.scale.setScalar(Math.max(o.r,o.size*1.2)+.35);d.updateMatrix();base.setMatrixAt(i,d.matrix);rim.setMatrixAt(i,d.matrix);}this.group.add(base,rim);}
  this.portals(s,add);

  if(s.realm)return;

  const centerY=C.heightAt(0,0,seed),phase=s.world.phase,sealColor=phase==='endless'?'#a6f1c3':phase==='devimon'?'#df97fc':'#b9a1d0';const seal=add(r.geo.ring,sealColor,0,centerY+.14,0,[10,10,10],.6);seal.rotation.x=-Math.PI/2;for(let i=0;i<8;i++){const angle=i*Math.PI/4,obelisk=add(r.geo.gem,sealColor,Math.cos(angle)*10,centerY+.65,Math.sin(angle)*10,[.35,.8,.35],.8);}this.label(phase==='devimon'?'DEVIMON · JEFE FINAL':phase==='endless'?'DEVIMON DERROTADO':'SELLO DE DEVIMON',phase==='devimon'?'ACÉRCATE AL SELLO CENTRAL':phase==='endless'?'MODO RÉCORD · SIGUE SOBREVIVIENDO':'CIERRA LOS 6 PORTALES',sealColor,0,centerY+6,0);

 }

 portals(s,add){const r=this.r,seed=s.mapSeed;

  const portal=(p,returning=false)=>{const color=returning||p.closed?'#93ffd0':W.types[p.kind].color,h=C.heightAt(p.x,p.z,seed),g=new THREE.Group();g.position.set(p.x,h,p.z);this.group.add(g);const part=(geo,c,y,scale,opacity=1)=>{const m=add(geo,c,0,y,0,scale,opacity);g.attach(m);m.position.set(0,y,0);return m;};

   part(new THREE.CylinderGeometry(3,3.5,.5,8),'#39454c',.25);for(const x of [-3,3]){const pillar=part(new THREE.BoxGeometry(.7,5,.9),'#28313e',2.7);pillar.position.x=x;const cap=part(new THREE.OctahedronGeometry(.6),color,5.6);cap.position.x=x;}

   const ring=part(new THREE.TorusGeometry(2.5,.16,8,64),color,3.5,[1,1.35,1]);this.animated.push({kind:'portal-ring',mesh:ring});if(!p.closed||returning){const disc=part(new THREE.CircleGeometry(2.32,64),color,3.5,[1,1.35,1],.38);this.animated.push({kind:'portal-disc',mesh:disc});for(let i=0;i<3;i++){const inner=part(new THREE.TorusGeometry(1.2+i*.4,.035,4,48),color,3.5,[1,1.35,1],.65);inner.rotation.z=i;this.animated.push({kind:'portal-ring',mesh:inner,phase:i});}}

   this.label(returning?'REGRESO':p.closed?'PORTAL CERRADO':'PORTAL '+p.name.toUpperCase(),returning?'['+(this.r.bindings?.label('interact')||'E')+'] MAPA PRINCIPAL':p.closed?'TORRE DESTRUIDA · PURIFICADO':'['+(this.r.bindings?.label('interact')||'E')+'] ENTRAR · '+W.types[p.kind].name.toUpperCase(),color,p.x,h+8,p.z);

  };

  if(!s.realm){for(const p of s.world.portals)portal(p);return;}

  portal({x:0,z:0},true);const pos=s.realm.towerPosition,h=C.heightAt(pos.x,pos.z,seed),tower=new THREE.Group();tower.position.set(pos.x,h,pos.z);this.group.add(tower);this.tower=tower;this.towerGround=h;

  const piece=(geo,color,y,scale,opacity=1)=>{const m=add(geo,color,0,y,0,scale,opacity);tower.attach(m);m.position.set(0,y,0);return m;};

  piece(new THREE.CylinderGeometry(2.8,3.4,.8,8),'#151525',.4);piece(new THREE.CylinderGeometry(1.3,1.7,12,8),'#191724',6.7);for(let i=0;i<5;i++){piece(new THREE.CylinderGeometry(1.6,1.8,.45,8),'#3d354e',1.5+i*2.4);piece(new THREE.TorusGeometry(1.65,.06,4,8),'#c15fee',1.75+i*2.4).rotation.x=-Math.PI/2;}piece(new THREE.ConeGeometry(1.8,4,8),'#12101c',14);piece(new THREE.OctahedronGeometry(.65),'#e4a3ff',12.7,[1,1.8,1]);

  for(let i=0;i<4;i++){const a=i*Math.PI/2,fin=piece(new THREE.BoxGeometry(.22,10,.22),'#9550d5',6.7);fin.position.x=Math.cos(a)*1.35;fin.position.z=Math.sin(a)*1.35;}

  const shield=piece(new THREE.CylinderGeometry(4,4,15,32,1,true),'#b27aff',7.5,null,.12);shield.visible=s.realm.phase==='waves';this.animated.push({kind:'tower-shield',mesh:shield});const beacon=piece(new THREE.CylinderGeometry(.18,.65,65,12,1,true),'#d18aff',40,null,.18);this.label('TORRE NEGRA',s.realm.phase==='waves'?'PROTEGIDA · COMPLETA 3 OLEADAS':s.realm.phase==='cleared'?'DESTRUIDA · MAPA PURIFICADO':'VULNERABLE · ['+(this.r.bindings?.label('interact')||'E')+'] FIJAR OBJETIVO','#e5b4ff',pos.x,h+18,pos.z);

 }

 render(s,time){const key=s?s.mapSeed+':'+s.sectors.map(z=>z.revision+':'+z.kind+':'+z.purified).join('|')+':'+(this.r.bindings?.label('interact')||'E')+':'+s.world.phase+':'+s.world.portals.map(p=>p.closed).join('')+':'+(s.realm?.phase||'main'):'menu';if(key!==this.key){this.key=key;if(s)this.rebuild(s);else this.clear();}if(!s){const normal=new THREE.Color('#aec8bd');this.r.scene.fog.color.lerp(normal,.025);this.r.scene.background.lerp(normal,.025);return;}const current=s.sectors[W.sectorIndex(s.player.x,s.player.z)],fog=new THREE.Color(current.kind==='fire'?'#b6a08c':current.kind==='flood'?'#89beca':current.kind==='glitch'?'#a99bbe':'#aec8bd');this.r.scene.fog.color.lerp(fog,.025);this.r.scene.background.lerp(fog,.025);if(this.textures.has('flood'))this.textures.get('flood').offset.x=(time*.012)%1;const dummy=new THREE.Object3D();if(s.realm&&this.tower){const t=s.enemies.find(e=>e.tower),fall=s.realm.phase==='cleared'?Math.min(1,(time-s.realm.clearedAt)/1.6):0;this.tower.traverse(o=>{if(o.isMesh){o.userData.baseColor??=o.material.color.clone();o.material.color.copy(o.userData.baseColor);if(t?.hit>0)o.material.color.lerp(new THREE.Color('#ffffff'),.6);}});this.tower.scale.setScalar(1-fall*.8);this.tower.position.y=this.towerGround-fall*12;this.tower.rotation.z=fall*.25;}for(const entry of this.animated){if(entry.kind==='portal-ring'){entry.mesh.rotation.z=time*.25+(entry.phase||0);continue;}if(entry.kind==='portal-disc'){entry.mesh.material.opacity=.3+Math.sin(time*2)*.1;continue;}if(entry.kind==='tower-shield'){entry.mesh.rotation.y=time*.2;entry.mesh.material.opacity=.1+Math.sin(time*3)*.04;continue;}if(entry.kind==='node'){entry.mesh.rotation.y=time*.8;entry.mesh.position.y=C.heightAt(entry.props[0].x,entry.props[0].z,s.mapSeed)+2.1+Math.sin(time*2)*.18;continue;}for(let i=0;i<entry.props.length;i++){const o=entry.props[i],ground=C.heightAt(o.x,o.z,s.mapSeed),wave=Math.sin(time*2+o.phase);dummy.position.set(o.x,ground+.5,o.z);dummy.rotation.set(0,o.phase,0);dummy.scale.set(1,1,1);if(entry.kind==='fire'){dummy.position.y=ground+.7;dummy.scale.set(.8,.65+wave*.2,.8);}if(entry.kind==='smoke'){dummy.position.y=ground+1.8+((time*.35+o.phase)%2);dummy.scale.setScalar(.7+((time*.35+o.phase)%2)*.35);}if(entry.kind==='flood'){dummy.position.y=ground+.16;dummy.rotation.x=-Math.PI/2;dummy.scale.setScalar(1.3+wave*.15);}if(entry.kind==='glitch'){dummy.position.y=ground+.7+wave*.18;dummy.rotation.y=time*.3+o.phase;dummy.scale.set(.7,.6+wave*.1,.7);}dummy.updateMatrix();entry.mesh.setMatrixAt(i,dummy.matrix);}entry.mesh.instanceMatrix.needsUpdate=true;}

  for(const hazard of s.worldHazards){const progress=1-hazard.life/hazard.maxLife,mesh=this.r.pooled('world-warning-'+hazard.id,'ring',0xff9554).mesh;mesh.position.set(hazard.x,C.heightAt(hazard.x,hazard.z,s.mapSeed)+.22,hazard.z);mesh.rotation.x=-Math.PI/2;mesh.scale.setScalar(hazard.radius);mesh.material.opacity=.7;const inner=this.r.pooled('world-countdown-'+hazard.id,'ring',0xffe6a0).mesh;inner.position.copy(mesh.position);inner.rotation.x=-Math.PI/2;inner.scale.setScalar(Math.max(.1,hazard.radius*(1-progress)));inner.material.opacity=.9;}

  for(const f of s.styleFields){const color=f.kind==='roots'?0x91e58e:f.kind==='bomb'?0xa4eeff:0xffe6a5,ring=this.r.pooled('style-ring-'+f.id,'ring',color).mesh;ring.position.set(f.x,C.heightAt(f.x,f.z,s.mapSeed)+.18,f.z);ring.rotation.x=-Math.PI/2;ring.scale.setScalar(f.radius);ring.material.opacity=.8;const fill=this.r.pooled('style-fill-'+f.id,'orb',color).mesh;fill.position.copy(ring.position);fill.scale.set(f.radius,.025,f.radius);fill.material.opacity=.12;if(f.kind==='bomb'){const beam=this.r.pooled('style-target-'+f.id,'beam',color).mesh;beam.position.set(f.x,ring.position.y+4,f.z);beam.scale.set(2,8,2);beam.material.opacity=.3;}else for(let i=0;i<6;i++){const angle=i*Math.PI/3+time*.2,spark=this.r.pooled('style-orbit-'+f.id+'-'+i,f.kind==='roots'?'ice':'gem',color).mesh;spark.position.set(f.x+Math.cos(angle)*f.radius,C.heightAt(f.x,f.z,s.mapSeed)+.6+Math.sin(time*2+i)*.2,f.z+Math.sin(angle)*f.radius);spark.scale.setScalar(.32);}}

  if(s.player.preyId){const enemy=s.enemies.find(e=>e.id===s.player.preyId&&e.hp>0);if(enemy){const mark=this.r.pooled('prey-mark','gem',0x9cf3f0).mesh;mark.position.set(enemy.x,C.heightAt(enemy.x,enemy.z,s.mapSeed)+3.4,enemy.z);mark.scale.set(.3,.65,.3);mark.rotation.y=time*2;}}

 }

}


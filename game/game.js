import {renderBook} from './technique-book.js';
import {ChestCarousel} from './chest-carousel.js';
import {Cloud} from './cloud.js';

import {Music} from './music.js';

import {Renderer3D} from './render3d.js';

const $=s=>document.querySelector(s),C=window.DigibonkCore,SETTINGS_KEY='digibonk.settings.v1';

let RUN_KEY='digibonk.run.v1',RECORDS_KEY='digibonk.records.v1';

const stageNames={[-2]:'HUEVO',[-1]:'BEBÉ I',0:'BEBÉ II',1:'ROOKIE',2:'CHAMPION',3:'ULTIMATE',4:'MEGA'};

window.SkillPose=Object.fromEntries(Object.values(SkillSystem.skills).map(s=>[s.id,s.kind!=='damage'?'guard':s.stage>=3?'attack4':s.stage>=2?'attack3':'attack2']));

let loading=false;
let renderer,run=null,active=false,paused=false,last=0,saveClock=0,hudClock=0,overlayKey='',toastLeft=0,choiceCanvases=[],eggCanvases=[],keys=new DigibonkInput(),moveTarget=null,specialQueued=false,records=read(RECORDS_KEY,[]),settings=read(SETTINGS_KEY,{sound:true});

settings.visibility=Object.fromEntries(['player','experience','enemy'].map(id=>[id,typeof settings.visibility?.[id]==='number'&&Number.isFinite(settings.visibility[id])?Math.max(0,Math.min(1,settings.visibility[id])):1]));
keys=new DigibonkInput(settings.bindings);let bindingCapture=null,settingsWasPaused=false;
const keyLabel=action=>keys.label(action);

function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}

function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{$('#home-message').textContent='No se ha podido guardar en este ordenador. Comprueba el espacio disponible.';}}

const clock=t=>Math.floor(t/60).toString().padStart(2,'0')+':'+Math.floor(t%60).toString().padStart(2,'0'),number=n=>Math.floor(n).toLocaleString('es-ES');

function toast(text){$('#toast').textContent=text;toastLeft=4;}

class Audio{

 constructor(){this.ctx=null;this.lastGem=0;this.lastHit=0;}

 unlock(){if(!settings.sound)return;try{this.ctx??=new AudioContext();if(this.ctx.state==='suspended')void this.ctx.resume();}catch{}}

 tone(freq,duration=.08,volume=.025,type='sine',delay=0){if(!this.ctx||!settings.sound)return;const at=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(this.ctx.destination);o.start(at);o.stop(at+duration);}

 play(type){this.unlock();const time=performance.now();if(type==='gem'){if(time-this.lastGem<100)return;this.lastGem=time;this.tone(700+Math.random()*350,.05,.012);}if(type==='damage'){if(time-this.lastHit<150)return;this.lastHit=time;this.tone(90,.1,.055,'triangle');}if(type==='pick'||type==='hatch'){this.tone(440,.1,.03);this.tone(660,.15,.025,'sine',.08);}if(type==='level')for(let i=0;i<3;i++)this.tone([440,554,660][i],.13,.025,'triangle',i*.09);if(type==='evolution')for(let i=0;i<6;i++)this.tone([220,330,440,554,660,880][i],.35,.035,'sine',i*.18);if(type==='boss')for(let i=0;i<3;i++)this.tone(110+i*15,.3,.05,'triangle',i*.25);if(type==='end')this.tone(150,.4,.035,'triangle');}

}

const audio=new Audio();

const cloud=new Cloud();

const music=new Music();

$('#music-toggle').onclick=()=>{music.enabled=!music.enabled;music.start();$('#music-toggle').textContent=music.enabled?'♫ Música':'♫ Música desactivada';};

$('#music-volume').oninput=e=>music.setVolume(Number(e.target.value)/100);

$('#music-file').onchange=e=>{const file=e.target.files[0];if(file){music.load(file);$('#music-track').textContent=file.name+' (esta sesión)';}};



function save(){if(run&&!run.s.done){bankBits();store(RUN_KEY,run.snapshot());}}

function syncSound(){$('#sound-toggle').textContent=settings.sound?'♪ Efectos':'♪ Sin efectos';store(SETTINGS_KEY,settings);}

$('#sound-toggle').onclick=()=>{settings.sound=!settings.sound;audio.unlock();syncSound();};syncSound();

function refreshControlLabels(){for(const el of document.querySelectorAll('[data-control]'))el.textContent=keyLabel(el.dataset.control);$('#controls-hint').textContent=keyLabel('up')+' · '+keyLabel('left')+' · '+keyLabel('down')+' · '+keyLabel('right')+' o clic · '+keyLabel('dash')+': esquivar · '+keyLabel('interact')+': interactuar · '+keyLabel('special')+': habilidad · '+keyLabel('map')+': mapa · Esc: pausa';$('#style-key-hint').textContent=keyLabel('special')+' · Acción de tu digievolución · detalles en Equipo';}
function renderBindings(){const list=$('#bindings-list');list.replaceChildren();for(const [action,name] of Object.entries(DigibonkInput.names)){const row=document.createElement('div'),label=document.createElement('strong');row.className='binding-row';label.textContent=name;row.append(label);for(let slot=0;slot<2;slot++){const button=document.createElement('button'),value=keys.bindings[action][slot];button.type='button';button.textContent=value?DigibonkInput.keyLabel(value):'Sin asignar';button.setAttribute('aria-label',name+' · '+(slot?'secundaria':'principal')+' · '+button.textContent);button.dataset.action=action;button.dataset.slot=slot;if(bindingCapture?.action===action&&bindingCapture.slot===slot){button.textContent='Pulsa una tecla…';button.classList.add('listening');}button.onclick=()=>{bindingCapture={action,slot};$('#binding-message').textContent='Pulsa la nueva tecla. Esc cancela.'+(slot?' Supr o Retroceso elimina esta tecla secundaria.':'');renderBindings();};row.append(button);}list.append(row);}}
function openSettings(){if($('#settings-dialog').open)return;settingsWasPaused=paused;if(active&&!run?.s.done){paused=true;save();}keys.clear();moveTarget=null;specialQueued=false;bindingCapture=null;$('#binding-message').textContent='Los cambios se guardan en este ordenador. Esc siempre permite pausar o cerrar.';renderBindings();$('#settings-dialog').showModal();}
for(const id of ['player','experience','enemy']){const input=$('#opacity-'+id),output=$('#opacity-'+id+'-value'),preview=$('#opacity-'+id+'-preview');input.value=String(Math.round(settings.visibility[id]*100));output.textContent=input.value+' %';preview.style.opacity=settings.visibility[id];input.oninput=()=>{settings.visibility[id]=Number(input.value)/100;output.textContent=input.value+' %';preview.style.opacity=settings.visibility[id];store(SETTINGS_KEY,settings);};}
$('#visibility-reset').onclick=()=>{for(const id of ['player','experience','enemy']){settings.visibility[id]=1;$('#opacity-'+id).value='100';$('#opacity-'+id+'-value').textContent='100 %';$('#opacity-'+id+'-preview').style.opacity='1';}store(SETTINGS_KEY,settings);};
$('#settings-toggle').onclick=openSettings;$('#pause-settings').onclick=openSettings;
$('#bindings-reset').onclick=()=>{keys.resetBindings();bindingCapture=null;settings.bindings=keys.bindings;store(SETTINGS_KEY,settings);renderBindings();refreshControlLabels();$('#binding-message').textContent='Controles predeterminados restaurados.';};
$('#settings-dialog').addEventListener('cancel',event=>{if(bindingCapture){event.preventDefault();bindingCapture=null;renderBindings();$('#binding-message').textContent='Cambio cancelado.';}});
$('#settings-dialog').addEventListener('close',()=>{bindingCapture=null;keys.clear();specialQueued=false;moveTarget=null;paused=settingsWasPaused;if(active)$('#world').focus({preventScroll:true});});
refreshControlLabels();

let mapWasPaused=false;
function openMap(){if(!active||!run||run.s.done||$('#map-dialog').open||document.querySelector('dialog[open]'))return;mapWasPaused=paused;paused=true;keys.clear();specialQueued=false;moveTarget=null;save();renderer.minimap($('#world-map'),run,{large:true});$('#map-dialog-title').textContent=run.s.realm?'Mapa del portal · '+run.s.realm.name:'Mapa principal';$('#map-dialog').showModal();}
$('#map-toggle').onclick=openMap;$('#minimap').onclick=openMap;
$('#map-dialog').addEventListener('close',()=>{keys.clear();specialQueued=false;paused=mapWasPaused;if(active)$('#world').focus({preventScroll:true});});
const fullLegend=$('#map-full-legend');for(const [type,name] of Object.entries(DigibonkMap.names)){const item=document.createElement('span'),canvas=document.createElement('canvas');canvas.dataset.mapIcon=type;item.append(canvas,document.createTextNode(name));fullLegend.append(item);}for(const canvas of document.querySelectorAll('[data-map-icon]')){canvas.width=canvas.height=28;DigibonkMap.symbol(canvas.getContext('2d'),canvas.dataset.mapIcon,14,14,22);}
function openHelp(){specialQueued=false;if(active&&!run.s.done){paused=true;save();}$('#help-dialog').showModal();}

$('#help-toggle').onclick=openHelp;$('#pause-help').onclick=openHelp;

function openGear(){specialQueued=false;if(active&&!run.s.done){paused=true;save();}const list=$('#gear-list');list.replaceChildren();const s=run?.s;if(run?.style()){const role=run.style(),article=document.createElement('article'),title=document.createElement('strong'),text=document.createElement('p');title.textContent=role.name+' · '+role.ability;text.textContent=role.passive+' '+role.description;article.append(title,text);list.append(article);}for(const w of s?.player?.weapons||[]){const article=document.createElement('article'),title=document.createElement('strong'),text=document.createElement('p');title.textContent=SkillSystem.skills[w.id].name+' · técnica '+w.rank+'/9';text.textContent=C.describeTechnique(w.id,w.rank,s.player);article.append(title,text);list.append(article);}if(!s?.player?.weapons?.length&&!s?.relics?.length&&!s?.buddies?.length){const p=document.createElement('p');p.textContent='Abre cofres para formar tu equipo. Las reliquias y compañeros no ocupan huecos de técnica.';list.append(p);}for(const relic of s?.relics||[]){const def=DigibonkLoot.relics.find(d=>d.id===relic.id);if(!def)continue;const article=document.createElement('article'),title=document.createElement('strong'),text=document.createElement('p');title.textContent=def.icon+' '+def.name+' · '+(def.legendary?'Legendario único':relic.rank+'/3');text.textContent=def.description(relic.rank);article.append(title,text);list.append(article);}for(const buddy of s?.buddies||[]){const def=DigibonkLoot.companions.find(d=>d.id===buddy.species),article=document.createElement('article'),title=document.createElement('strong'),text=document.createElement('p');title.textContent=def.name+' · '+def.role;text.textContent=def.description;article.append(title,text);list.append(article);}$('#gear-dialog').showModal();}

$('#gear-toggle').onclick=openGear;
let bookMode='techniques',bookWasPaused=false;
for(const [id,name] of Object.entries(SkillSystem.familyNames)){const option=document.createElement('option');option.value=id;option.textContent=name;$('#book-family').append(option);}
function refreshBook(){$('#book-family-label').hidden=bookMode!=='techniques';$('#book-techniques').classList.toggle('primary',bookMode==='techniques');$('#book-relics').classList.toggle('primary',bookMode==='relics');$('#book-states').classList.toggle('primary',bookMode==='states');renderBook($('#book-grid'),run,bookMode,$('#book-family').value);}
$('#book-toggle').onclick=()=>{bookWasPaused=paused;if(active&&!run.s.done){paused=true;save();}keys.clear();specialQueued=false;bookMode='techniques';$('#book-family').value=run?SkillSystem.family(run.s.player.species):'all';refreshBook();$('#book-dialog').showModal();};
$('#book-techniques').onclick=()=>{bookMode='techniques';refreshBook();};$('#book-relics').onclick=()=>{bookMode='relics';refreshBook();};$('#book-states').onclick=()=>{bookMode='states';refreshBook();};$('#book-family').onchange=refreshBook;
$('#book-dialog').addEventListener('close',()=>{paused=bookWasPaused;keys.clear();moveTarget=null;specialQueued=false;if(active)$('#world').focus({preventScroll:true});});


function refreshEquipment(){if(!run)return;const s=run.s,strip=$('#equipment-strip');strip.hidden=!active||s.done;const signature=JSON.stringify([s.relics,s.buddies.map(b=>b.species)]);if(strip.dataset.signature===signature)return;strip.dataset.signature=signature;strip.replaceChildren();for(const relic of s.relics){const def=DigibonkLoot.relics.find(d=>d.id===relic.id);if(!def)continue;const b=document.createElement('button');b.className='relic-chip '+def.theme;const img=document.createElement('img');img.src=DigibonkLoot.icon(def.id);img.alt='';b.append(img,document.createTextNode(def.name+' '+(def.legendary?'Legendario':relic.rank+'/3')));b.title=def.description(relic.rank);b.onclick=openGear;strip.append(b);}for(const buddy of s.buddies){const b=document.createElement('button');b.className='relic-chip buddy-chip';b.textContent='◆ '+buddy.species;b.title='Ver tu compañero y sus efectos';b.onclick=openGear;strip.append(b);}}

function openRecords(){specialQueued=false;if(active&&!run.s.done){paused=true;save();}const list=$('#records-list');list.replaceChildren(...records.slice(0,10).map((record,i)=>{const row=document.createElement('article'),rank=document.createElement('b'),body=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small'),score=document.createElement('span');rank.textContent=String(i+1).padStart(2,'0');name.textContent=record.species+' · Nv. '+record.level;detail.textContent=clock(record.time)+' · '+number(record.kills)+' bajas · '+new Date(record.date).toLocaleDateString('es-ES');score.textContent=number(record.score);body.append(name,detail);row.append(rank,body,score);return row;}));if(!records.length)list.textContent='Tu primera leyenda todavía está por escribirse.';$('#records-dialog').showModal();}

$('#records-toggle').onclick=openRecords;$('#result-records').onclick=openRecords;

function showHome(){makeEggs();$('#portal-timer').hidden=true;$('#style-panel').hidden=true;specialQueued=false;$('#equipment-strip').hidden=true;active=false;paused=false;keys.clear();moveTarget=null;$('#home').hidden=false;$('#hud').hidden=true;$('#map-panel').hidden=true;$('#controls-hint').hidden=true;for(const id of ['#pause-overlay','#result-overlay','#choice-overlay','#evolution-cinema','#boss-bar','#interact','#challenge-label'])$(id).hidden=true;overlayKey='';const saved=read(RUN_KEY,null);$('#continue-run').hidden=!saved||saved.done;$('#continue-run').textContent=saved?'Continuar · '+saved.player.species+' · Nv. '+saved.level+' · '+clock(saved.time):'Continuar partida';const high=records[0],bestTime=Math.max(0,...records.map(r=>r.time));$('#home-records').replaceChildren();for(const [label,value] of [['RÉCORD',high?number(high.score):'—'],['SUPERVIVENCIA',bestTime?clock(bestTime):'—'],['HUEVOS',Object.keys(progression.eggs).length+'/'+C.eggChoices.length]]){const span=document.createElement('span'),b=document.createElement('b');b.textContent=value;span.append(b,document.createTextNode(label));$('#home-records').append(span);}}

function begin(egg){if(loading||!progression.eggs[egg])return;audio.unlock();sceneTransition(()=>{run=new C.Run(egg);DigibonkProgression.apply(run,progression.eggs[egg]);run.s.onlineOwner=cloud.user?.id||null;run.s.cloudVersion='1.3.0';activate();},'Preparando tu aventura');}

function activate(){music.start();specialQueued=false;active=true;paused=false;overlayKey='';keys.clear();moveTarget=null;saveClock=0;$('#home').hidden=true;$('#hud').hidden=false;$('#map-panel').hidden=false;$('#controls-hint').hidden=false;$('#result-overlay').hidden=true;$('#pause-overlay').hidden=true;$('#choice-overlay').hidden=true;if(run.s.evolution&&run.style())toast('Nuevo estilo: '+run.style().name+' · '+keyLabel('special')+': '+run.style().ability);save();refreshHud();}

$('#continue-run').onclick=()=>{if(loading)return;audio.unlock();sceneTransition(()=>{run=new C.Run(null,{saved:read(RUN_KEY,null)});activate();},'Recuperando tu aventura');};

$('#brand').onclick=e=>{e.preventDefault();if(active&&!run.s.done){paused=true;return;}showHome();};

$('#new-run').onclick=showHome;

$('#pause-run').onclick=()=>{if(active&&!run.s.done&&!run.s.choice&&!run.s.evolution){paused=!paused;specialQueued=false;keys.clear();save();}};

$('#resume-run').onclick=()=>{paused=false;keys.clear();moveTarget=null;};

$('#save-menu').onclick=()=>{save();showHome();};

let META_KEY='digibonk.progression.v1',progression=read(META_KEY,null)||DigibonkProgression.fresh();
function bankBits(){if(run){DigibonkProgression.claim(progression,run.s);store(META_KEY,progression);}}
let homeTab='play',selectedEgg='Botamon';
function purchase(id,stat,index){if(DigibonkProgression.buy(progression,id,stat,index)){store(META_KEY,progression);makeEggs();}}
function makeEggs(){
 const grid=$('#egg-grid');grid.replaceChildren();eggCanvases=[];
 if(!C.eggChoices.some(e=>e.id===selectedEgg))selectedEgg='Botamon';
 $('#home-bits').textContent=number(progression.bits)+' bits';
 $('#tab-play').classList.toggle('primary',homeTab==='play');$('#tab-incubator').classList.toggle('primary',homeTab==='incubator');
 $('#tab-play').setAttribute('aria-selected',homeTab==='play');$('#tab-incubator').setAttribute('aria-selected',homeTab==='incubator');
 $('#egg-section-title').textContent=homeTab==='play'?'ELIGE TU HUEVO':'INCUBADORA';
 $('#egg-section-hint').textContent=homeTab==='play'?'Selecciona un huevo para empezar':'Mejora el huevo seleccionado con tus bits';
 for(const egg of C.eggChoices){const owned=!!progression.eggs[egg.id],button=document.createElement('button');button.className='egg-card'+(selectedEgg===egg.id?' selected':'');button.setAttribute('aria-pressed',selectedEgg===egg.id);const canvas=document.createElement('canvas');canvas.width=120;canvas.height=100;const name=document.createElement('b'),sub=document.createElement('small');name.textContent=egg.id;sub.textContent=owned?'Desbloqueado':'Bloqueado';button.append(canvas,name,sub);button.onclick=()=>{selectedEgg=egg.id;makeEggs();};grid.append(button);eggCanvases.push({canvas,egg});}
 const egg=C.eggChoices.find(e=>e.id===selectedEgg),training=progression.eggs[selectedEgg],panel=document.createElement('section');panel.className='selected-egg-panel';const title=document.createElement('h3');title.textContent=selectedEgg;panel.append(title);
 if(homeTab==='play'){const play=document.createElement('button');play.className='primary';play.textContent=training?'Jugar con '+selectedEgg:'Desbloquear en Incubadora';play.onclick=()=>{if(training)begin(selectedEgg);else{homeTab='incubator';makeEggs();}};panel.append(play);}
 else{const balance=document.createElement('p');balance.className='incubator-balance';balance.textContent='Disponibles: '+number(progression.bits)+' bits';panel.append(balance);if(!training){const unlock=document.createElement('button'),index=C.eggChoices.indexOf(egg),cost=DigibonkProgression.eggCost(index);unlock.textContent='Desbloquear huevo · '+cost+' bits';unlock.disabled=progression.bits<cost;unlock.onclick=()=>purchase(egg.id,null,index);panel.append(unlock);}else{const level=DigibonkProgression.level(training),quality=document.createElement('p');quality.textContent='Calidad del huevo · Nivel '+level+' · '+Math.min(egg.branches.length,1+Math.floor(level/2))+'/'+egg.branches.length+' primeras ramas disponibles';panel.append(quality);for(const [stat,def] of Object.entries(DigibonkProgression.stats)){const n=training[stat]||0,cost=DigibonkProgression.cost(training,stat),button=document.createElement('button');button.textContent=def.name+' · '+n+'/10 · +'+Math.round(n*def.step*(stat==='maxHp'?1:100))+(stat==='maxHp'?' vida':' %')+' — '+(n>=10?'Máximo':cost+' bits');button.disabled=n>=10||progression.bits<cost;button.onclick=()=>purchase(egg.id,stat,C.eggChoices.indexOf(egg));panel.append(button);}const help=document.createElement('p');help.textContent='Cada 2 mejoras de calidad abres otra rama evolutiva por etapa. Las mejoras se aplican a tus próximas partidas.';panel.append(help);}const tip=document.createElement('small');tip.textContent='Ganas bits al jugar: 1 cada 3 bajas y cada 20 segundos; 50 por portal y 250 por Devimon. Se guardan automáticamente.';panel.append(tip);}
 grid.append(panel);
}
$('#tab-play').onclick=()=>{homeTab='play';makeEggs();};$('#tab-incubator').onclick=()=>{homeTab='incubator';makeEggs();};


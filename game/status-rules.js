(function(root){'use strict';
 const effects={
 burn:{name:'Quemadura',color:'#ffae62',duration:3,ratio:.08,text:'Daño cada 0,5 s: 8 % del golpe que la causó, durante 3 s.'},
 poison:{name:'Veneno',color:'#b9e575',duration:3,ratio:.12,text:'Daño cada 0,5 s: 12 % del golpe que lo causó, durante 3 s.'},
 bleed:{name:'Sangrado',color:'#ff8891',duration:3,ratio:.06,text:'Daño cada 0,5 s: 6 % del golpe que lo causó, durante 3 s.'},
 chill:{name:'Escarcha',color:'#b4edff',duration:3,text:'Reduce un 35 % la velocidad de movimiento durante 3 s.'},
 freeze:{name:'Congelación',color:'#91dfff',duration:.8,control:true,text:'Impide moverse y atacar durante 0,8 s. Después hay 3 s de resistencia a nuevos controles.'},
 shock:{name:'Parálisis',color:'#fff090',duration:.7,control:true,text:'Impide moverse y atacar durante 0,7 s. Después hay 3 s de resistencia a nuevos controles.'},
 wet:{name:'Empapado',color:'#76dfff',duration:4,text:'La siguiente descarga eléctrica causa un 25 % más de daño y consume el agua. Dura 4 s.'},
 curse:{name:'Maldición',color:'#d29bff',duration:4,text:'Recibe un 15 % más de daño directo durante 4 s.'},
 fracture:{name:'Fisura de datos',color:'#f8b8df',duration:3,text:'Recibe un 12 % más de daño directo durante 3 s. No se suma a Maldición: se usa la mayor.'},
 root:{name:'Raíces',color:'#b6d78f',duration:2,control:true,text:'Impide moverse durante 2 s, pero permite atacar. Después hay 3 s de resistencia a nuevos controles.'},
 weaken:{name:'Debilidad',color:'#f1d79d',duration:3,text:'Reduce un 20 % el daño de contacto y de los proyectiles que lance durante 3 s.'}
 };
 const electric=skill=>!!skill&&(['lightning','thunder-cloud'].includes(skill.visual)||skill.id==='electric-cloud');
 function forSkill(skill){if(!skill||skill.kind!=='damage')return [];if(electric(skill))return [{id:'shock',chance:.25}];if(skill.id==='root-bind')return [{id:'root',chance:1}];if(skill.status==='poison'||skill.id==='spore-burst')return [{id:'poison',chance:1}];switch(skill.family){case 'fire':return[{id:'burn',chance:.35}];case 'ice':return[{id:'chill',chance:1},{id:'freeze',chance:.2}];case 'water':return[{id:'wet',chance:1}];case 'nature':return[{id:'poison',chance:.3}];case 'wind':case 'holy':return[{id:'weaken',chance:.3}];case 'dark':return[{id:'curse',chance:.4}];case 'machine':return[{id:'fracture',chance:.3}];case 'beast':return[{id:'bleed',chance:.3}];default:return [];}}
 const summaries={burn:'8 % del golpe cada 0,5 s',poison:'12 % del golpe cada 0,5 s',bleed:'6 % del golpe cada 0,5 s',chill:'−35 % de movimiento',freeze:'no se mueve ni ataca',shock:'no se mueve ni ataca',wet:'una descarga causa +25 % de daño',curse:'+15 % de daño recibido',fracture:'+12 % de daño recibido',root:'sin movimiento; puede atacar',weaken:'−20 % de daño de contacto y disparos'};
 function describe(skill){return forSkill(skill).map(s=>{const d=effects[s.id];return d.name+' '+Math.round(s.chance*100)+' %: '+summaries[s.id]+' ('+String(d.duration).replace('.',',')+' s).';}).join(' ');}

 const api={effects,electric,forSkill,describe};if(typeof module!=='undefined')module.exports=api;else root.DigibonkStatusRules=api;
})(typeof window!=='undefined'?window:globalThis);

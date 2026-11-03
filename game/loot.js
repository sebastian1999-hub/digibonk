(function(root){'use strict';
 const relics=[
  {id:'vacuum',name:'Imán de bolsillo',icon:'⊕',description:r=>'Al esquivar, atrae fragmentos a '+(8+r*2)+' metros. Ideal para explorar.',theme:'mint'},
  {id:'thorns',name:'Coraza de espinas',icon:'✹',description:r=>'Al recibir daño, devuelve '+(r*40)+' % de tu daño a los enemigos a 3 metros.',theme:'green'},
  {id:'finisher',name:'Colmillo depredador',icon:'◈',description:r=>'Inflige '+(r*15)+' % más de daño a enemigos con menos del 30 % de vida.',theme:'gold'},
  {id:'boss-hunter',name:'Marca del cazador',icon:'⌖',description:r=>'Inflige '+(r*12)+' % más de daño a invasores y élites.',theme:'coral'},
  {id:'battery',name:'Batería de emergencia',icon:'ϟ',description:r=>'Cada '+(24-r*4)+' bajas, obtienes un escudo de 2 segundos. Recarga mínima: 12 s.',theme:'mint'},
  {id:'dash-burst',name:'Botas de choque',icon:'»',description:r=>'Tu esquiva libera una onda que inflige '+(r*40)+' % de tu daño a 3 metros.',theme:'coral'},
  {id:'frost',name:'Cristal de escarcha',icon:'❄',description:r=>'Tus críticos ralentizan un 35 % durante '+(1+r*.5).toFixed(1)+' s. No afecta a su cadencia de disparo.',theme:'ice'},
  {id:'rations',name:'Raciones de reserva',icon:'♡',description:r=>'Al abrir el siguiente cofre y los posteriores, recuperas un '+(r*5)+' % de vida máxima.',theme:'green'}
 ];
 const companions=[
  {id:'Terriermon',name:'Terriermon',role:'Artillero',description:'Dispara aire cada 3,8 s. Su daño equivale al 55 % de tu ataque.',skill:'air-shot',cooldown:3.8},
  {id:'Salamon',name:'Salamon',role:'Sanador',description:'Recupera el 6 % de tu vida máxima cada 14 s si estás herido.',skill:'heal',cooldown:14},
  {id:'Hagurumon',name:'Hagurumon',role:'Recolector',description:'Cada 9 s atrae los fragmentos situados a 14 metros de él.',skill:'focus',cooldown:9}
 ];
 const icon=id=>'assets/loot/'+id+'.png';
 const api={relics,companions,icon,maxRelics:4,maxRank:3};if(typeof module!=='undefined')module.exports=api;else root.DigibonkLoot=api;
})(typeof window!=='undefined'?window:globalThis);

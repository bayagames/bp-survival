/* ============================================================
   HUD — the on-screen interface during a run.

   updateHUD(dt) refreshes generator count, stamina / battery
   bars, health, prompts, the skill-check needle, the terror
   vignette and the heartbeat pacing. Pure DOM updates —
   no game logic decisions are made here.
   ============================================================ */

import { $, clamp } from './utils.js';
import { S } from './state.js';
import { heartbeat, setChase } from './audio.js';

export function updateHUD(dt){
  const p=S.player;
  const k=S.killer;

  $('gens').textContent=
    S.exitOpen?'EXIT POWERED':`Generators: ${S.gensDone} / ${S.gensNeeded}`;

  $('stam').style.width=p.stamina+'%';
  $('stam').style.background=p.exhausted?'#a44':'#ddd';
  $('batt').style.width=p.battery+'%';

  $('health').textContent=p.health>=2?'HEALTHY':'INJURED';
  $('health').style.color=p.health>=2?'#8d8':'#e44';

  $('view').textContent=(S.fp?'First person':'Third person')+' [V]';
  $('flashTxt').textContent=
    'Flashlight: '+
    (p.battery<=0&&S.flashOn?'DEAD':S.flashOn?'ON':'OFF')+
    ' [F]';

  $('cross').style.display=S.fp?'block':'none';

  let prompt='';

  if(p.near){
    prompt=p.repairing?'Repairing... watch for skill checks':'Hold E to repair';
  }else if(p.exhausted){
    prompt='Exhausted';
  }

  $('prompt').textContent=prompt;

  if(p.near){
    $('repair').classList.remove('hidden');
    $('repairFill').style.width=p.near.progress*100+'%';
  }else{
    $('repair').classList.add('hidden');
  }

  if(S.skill.active){
    $('skillNeedle').style.left=
      clamp(S.skill.t/S.skill.dur,0,1)*100+'%';
  }

  // terror: closer to the killer = faster heartbeat + red vignette
  const dist=Math.hypot(k.x-p.x,k.z-p.z);
  const terror=Math.max(0,1-dist/k.cfg.terror);

  if(terror>0){
    S.beatT-=dt;

    if(S.beatT<=0){
      heartbeat(.12+.45*terror);
      S.beatT=1.25-.8*terror;
    }
  }

  setChase(k.state==='chase');

  $('vig').style.opacity=Math.min(
    1,
    terror*.6+(p.health<2?.35:0)
  );

  S.flashT=Math.max(0,S.flashT-dt);
  $('hitflash').style.opacity=S.flashT*.8;

  if(S.msgT>0){
    S.msgT-=dt;
    if(S.msgT<=0)$('msg').style.opacity=0;
  }
}

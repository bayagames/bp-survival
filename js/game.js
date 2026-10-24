/* ============================================================
   GAME — run lifecycle + the generator / skill-check rules.

   startGame(killerId, mapId) builds a fresh procedural run.
   endGame(won) / toMenu() wrap a run up.
   The rest here is repairing logic: noise alerts, skill checks,
   generator completion and opening the exit.
   (Player movement and killer AI live in js/actors.js.)
   ============================================================ */

import * as THREE from 'three';
import { CELL, PLAYER } from './config.js';
import { $ } from './utils.js';
import { S } from './state.js';
import { initAudio, resetChase, setChase, beep, noiseBurst } from './audio.js';
import { applyMapLook, scene, renderer } from './graphics.js';
import { genMaze } from './maze.js';
import { buildLevel } from './world.js';
import { placeGenerators, buildDoor, buildPlayerMesh, createKiller } from './objects.js';
import { showMenuPanel } from './menu.js';
import { MAPS } from './data.js';

/* ---------- Run lifecycle ---------- */

function configureMap(id){
  S.activeMapId=id;
  S.activeMap=MAPS[id];
  applyMapLook(S.activeMap);
}

function clearWorld(){
  if(S.world){
    scene.remove(S.world);
    S.world.traverse(o=>{
      if(o.geometry)o.geometry.dispose();
    });
  }

  S.world=null;
  S.gens=[];
  S.door=null;
  S.killer=null;
  S.playerMesh=null;
  S.fireflies=null;
  S.waterSurface=null;
}

export function startGame(killerId,mapId){
  initAudio();
  configureMap(mapId);
  clearWorld();

  S.world=new THREE.Group();
  scene.add(S.world);

  S.exitOpen=false;
  S.gensDone=0;
  S.gens=[];
  S.grid=genMaze();

  buildLevel();
  placeGenerators();
  buildDoor();

  // face the player towards an open corridor at the spawn corner
  let yaw=0;
  if(S.grid[1][2]===0)yaw=-Math.PI/2;
  else if(S.grid[2][1]===0)yaw=Math.PI;

  Object.assign(S.player,{
    x:CELL*1.5,
    z:CELL*1.5,
    yaw,
    pitch:0,
    stamina:100,
    exhausted:false,
    restT:0,
    health:2,
    crouch:false,
    eyeH:PLAYER.eyeHeight,
    hurtBoost:0,
    battery:100,
    noiseT:0,
    repNoiseT:0,
    bobT:0,
    moving:false,
    repairing:false,
    near:null
  });

  S.playerMesh=buildPlayerMesh();
  S.world.add(S.playerMesh);

  S.killer=createKiller(killerId,11,11);

  S.skill={active:false,cool:2};
  S.flashOn=true;
  S.beatT=0;
  S.flashT=0;
  resetChase();

  $('mapHud').textContent=S.activeMap.name.toUpperCase();
  $('kname').textContent='Hunted by: '+S.killer.cfg.name;

  ['splash','mainMenu','comingSoon','end','pause'].forEach(id=>{
    $(id).classList.add('hidden');
  });

  $('menuFX').classList.add('hidden');
  $('hud').classList.remove('hidden');

  S.startTime=performance.now();
  S.state='playing';

  showMsg('Find and repair the generators.',3);
  lockPointer();
}

export function endGame(won){
  S.state='over';
  document.exitPointerLock();
  setChase(false);

  const t=Math.floor((performance.now()-S.startTime)/1000);

  $('endTitle').textContent=won?'YOU ESCAPED':'YOU WERE CAUGHT';
  $('endTitle').style.color=won?'#4c6':'#c22';
  $('endStats').textContent=
    `Map: ${S.activeMap.name} · Killer: ${S.killer.cfg.name} · Generators: ${S.gensDone}/${S.gensNeeded} · Time: ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;

  $('hud').classList.add('hidden');
  $('end').classList.remove('hidden');

  if(won){
    beep(523,.4);
    setTimeout(()=>beep(784,.6),200);
  }else{
    noiseBurst(1.2,.6,1500);
    beep(90,1.2,.3,'sawtooth');
  }
}

export function toMenu(){
  S.state='menu';
  document.exitPointerLock();
  setChase(false);
  clearWorld();

  $('hud').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('end').classList.add('hidden');
  $('menuFX').classList.remove('hidden');
  $('mainMenu').classList.remove('hidden');
  $('splash').classList.add('hidden');

  showMenuPanel('home');
}

// floating message in the middle of the screen
export function showMsg(text,t=2.5){
  $('msg').textContent=text;
  $('msg').style.opacity=1;
  S.msgT=t;
}

/* ---------- Pointer lock ---------- */

export function lockPointer(){
  try{
    const result=renderer.domElement.requestPointerLock();
    if(result&&result.catch)result.catch(()=>{});
  }catch(e){}
}

/* ---------- Noise alerts ---------- */

// the killer hears a noise at (x,z) within radius r (metres)
export function makeNoise(x,z,r){
  const k=S.killer;
  if(!k||k.state==='chase')return;

  if(Math.hypot(x-k.x,z-k.z)<r*k.cfg.hearing){
    k.state='search';
    k.lastKnown={x,z};
    k.searchT=0;
    k.stuckT=0;
  }
}

/* ---------- Generators & skill checks ---------- */

// nearest unfinished generator within interaction range of the player
export function nearestGen(){
  let best=null;
  let bd=1.9;

  for(const g of S.gens){
    if(g.done)continue;

    const d=Math.hypot(g.x-S.player.x,g.z-S.player.z);

    if(d<bd){
      bd=d;
      best=g;
    }
  }

  return best;
}

// begin a skill check: needle sweeps, hit SPACE inside the zone
export function startSkill(gen){
  S.skill={
    active:true,
    t:-.4,
    dur:1.2,
    zs:.45+Math.random()*.35,
    zw:.13,
    gen,
    cool:0
  };

  $('skillZone').style.left=S.skill.zs*100+'%';
  $('skillZone').style.width=S.skill.zw*100+'%';
  $('skill').classList.remove('hidden');
  beep(880,.08,.12);
}

// SPACE pressed (ok=true) or needle ran past the zone (ok=false)
export function skillResult(ok){
  const g=S.skill.gen;

  S.skill.active=false;
  S.skill.cool=2.5;
  $('skill').classList.add('hidden');

  if(ok){
    g.progress=Math.min(1,g.progress+.02);
    beep(1320,.1,.1);
  }else{
    g.progress=Math.max(0,g.progress-.1);
    noiseBurst(.6,.5,1200);
    makeNoise(g.x,g.z,45);
    g.light.intensity=25;
    showMsg('Skill check failed. The killer heard that!',2.5);
  }
}

export function completeGen(g){
  g.done=true;
  g.progress=1;
  g.light.color.set(0x55ff77);
  g.bulbMat.color.set(0x55ff77);
  S.gensDone++;

  if(S.skill.active){
    S.skill.active=false;
    $('skill').classList.add('hidden');
  }

  beep(660,.3,.12);
  setTimeout(()=>beep(990,.4,.12),150);

  makeNoise(g.x,g.z,200);

  if(S.gensDone>=S.gensNeeded&&!S.exitOpen)openExit();
  else showMsg(`Generator repaired (${S.gensDone}/${S.gensNeeded})`,2.5);
}

function openExit(){
  S.exitOpen=true;
  S.door.open=true;
  S.door.light.color.set(0x44ff66);
  S.door.stripeMat.color.set(0x44ff66);
  S.door.glow.visible=true;

  showMsg('EXIT POWERED! Escape through the far corner!',5);

  beep(440,.5,.15,'triangle');
  setTimeout(()=>beep(660,.5,.15,'triangle'),250);
  setTimeout(()=>beep(880,.8,.15,'triangle'),500);
}

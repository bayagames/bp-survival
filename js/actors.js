/* ============================================================
   ACTORS — the two characters of the game:

   THE SURVIVOR (you):  updatePlayer(), hitPlayer(), updateCamera()
   THE HUNTER (AI):     updateKiller() and its helpers

   The killer has three states:
     patrol — wanders, biased towards unfinished generators
     search — heard a noise, goes to look around
     chase  — can see you, hunts you directly

   updateKiller()/updatePlayer()/updateCamera() are called every
   frame by the loop in js/main.js.
   ============================================================ */

import * as THREE from 'three';
import { CELL, W, H, PLAYER } from './config.js';
import { $, clamp, rand, angDiff } from './utils.js';
import { S, flashActive } from './state.js';
import { noiseBurst, beep } from './audio.js';
import { camera, flashlight, playerLight } from './graphics.js';
import {
  moveEntity, cellOf, lineClear, inBounds, collides, bfs
} from './maze.js';
import {
  makeNoise, nearestGen, startSkill, skillResult,
  completeGen, showMsg, endGame
} from './game.js';

/* ============================================================
   THE SURVIVOR
   ============================================================ */

export function updatePlayer(dt){
  const p=S.player;

  p.crouch=!!S.keys.KeyC;

  const f=(S.keys.KeyW?1:0)-(S.keys.KeyS?1:0);
  const s=(S.keys.KeyD?1:0)-(S.keys.KeyA?1:0);

  const sy=Math.sin(p.yaw);
  const cy=Math.cos(p.yaw);

  let vx=-sy*f+cy*s;
  let vz=-cy*f-sy*s;

  const len=Math.hypot(vx,vz);
  const near=nearestGen();

  p.near=near;
  p.repairing=!!(near&&S.keys.KeyE&&len===0);
  p.moving=len>0;

  if(len>0){
    vx/=len;
    vz/=len;
  }

  const sprinting=
    p.moving&&
    (S.keys.ShiftLeft||S.keys.ShiftRight)&&!p.crouch&&!p.exhausted;

  // stamina
  if(sprinting){
    p.stamina-=PLAYER.staminaDrain*dt;
    p.restT=1;

    if(p.stamina<=0){
      p.stamina=0;
      p.exhausted=true;
    }
  }else{
    p.restT-=dt;

    if(p.restT<=0)p.stamina=Math.min(100,p.stamina+PLAYER.staminaRegen*dt);
    if(p.exhausted&&p.stamina>=35)p.exhausted=false;
  }

  let speed=p.crouch?PLAYER.crouchSpeed:sprinting?PLAYER.sprintSpeed:PLAYER.walkSpeed;

  if(S.activeMap.type==='sewer')speed*=.92;   // wading through water

  if(p.hurtBoost>0){                          // adrenaline after a hit
    p.hurtBoost-=dt;
    speed*=1.45;
  }

  if(p.moving){
    moveEntity(p,vx*speed*dt,vz*speed*dt,PLAYER.radius,false);
    p.bobT+=dt*speed*2.2;
  }

  // footsteps make noise the killer can hear
  p.noiseT-=dt;

  if(p.moving&&p.noiseT<=0){
    p.noiseT=sprinting?.32:.5;

    if(!p.crouch){
      makeNoise(p.x,p.z,sprinting?16:5);
      noiseBurst(.08,sprinting?.05:.025,600);
    }
  }

  // flashlight battery
  if(flashActive())p.battery=Math.max(0,p.battery-PLAYER.batteryDrain*dt);
  else if(!S.flashOn)p.battery=Math.min(100,p.battery+PLAYER.batteryRegen*dt);

  // repairing + skill checks
  if(p.repairing){
    near.progress+=dt/PLAYER.repairTime;
    p.repNoiseT-=dt;

    if(p.repNoiseT<=0){
      p.repNoiseT=1;
      makeNoise(near.x,near.z,7);
    }

    if(!S.skill.active){
      S.skill.cool-=dt;

      if(S.skill.cool<=0&&Math.random()<dt*.4){
        startSkill(near);
      }
    }else{
      S.skill.t+=dt;

      if(S.skill.t>=S.skill.dur)skillResult(false);
    }

    if(near.progress>=1)completeGen(near);
  }else if(S.skill.active){
    S.skill.active=false;
    S.skill.cool=1.5;
    $('skill').classList.add('hidden');
  }

  // stepped onto the open exit cell?
  const [cx,cz]=cellOf(p.x,p.z);

  if(S.exitOpen&&inBounds(cx,cz)&&S.grid[cz][cx]===2){
    endGame(true);
  }
}

export function hitPlayer(){
  const p=S.player;

  p.health--;
  S.flashT=.6;

  noiseBurst(.35,.5,2500);
  beep(140,.4,.3,'sawtooth');

  if(p.health<=0){
    endGame(false);
    return;
  }

  p.hurtBoost=2.2;
  showMsg('You were hit! RUN!',2.5);
}

/* ---------- Camera (follows the survivor) ---------- */

// scratch vectors (reused every frame, no allocation)
const _fwd=new THREE.Vector3();
const _right=new THREE.Vector3();
const _head=new THREE.Vector3();
const _des=new THREE.Vector3();
const _q=new THREE.Vector3();
const _pos=new THREE.Vector3();
const _org=new THREE.Vector3();

export function updateCamera(dt){
  const p=S.player;

  p.eyeH+=
    ((p.crouch?PLAYER.crouchEyeHeight:PLAYER.eyeHeight)-p.eyeH)*
    Math.min(1,dt*10);

  const cp=Math.cos(p.pitch);

  _fwd.set(
    -Math.sin(p.yaw)*cp,
    Math.sin(p.pitch),
    -Math.cos(p.yaw)*cp
  );

  _right.set(
    Math.cos(p.yaw),
    0,
    -Math.sin(p.yaw)
  );

  S.playerMesh.position.set(p.x,0,p.z);
  S.playerMesh.rotation.y=p.yaw;
  S.playerMesh.scale.y=.6+.4*(p.eyeH-.95)/.65;

  if(S.fp){
    const bob=p.moving?Math.sin(p.bobT)*.05:0;
    camera.position.set(p.x,p.eyeH+bob,p.z);
    S.playerMesh.visible=false;
  }else{
    // third person: camera on a boom behind the shoulder,
    // pulled in if a wall gets in the way
    S.playerMesh.visible=true;

    _head.set(p.x,p.eyeH+.15,p.z);
    _des.copy(_head).addScaledVector(_fwd,-3.2).addScaledVector(_right,.6);

    _des.y+=.3;
    _pos.copy(_head);

    for(let i=1;i<=24;i++){
      _q.copy(_head).lerp(_des,i/24);

      if(
        _q.y<.25||
        _q.y>S.activeMap.wallH-.15||
        collides(_q.x,_q.z,.2,false,true)
      )break;

      _pos.copy(_q);
    }

    camera.position.copy(_pos);
  }

  camera.rotation.set(p.pitch,p.yaw,0);

  // flashlight hangs slightly below/beside the eye
  if(S.fp){
    _org.copy(camera.position).addScaledVector(_right,.2);
    _org.y-=.15;
  }else{
    _org.set(p.x,p.eyeH-.35,p.z).addScaledVector(_right,.3).addScaledVector(_fwd,.35);
  }

  flashlight.position.copy(_org);
  flashlight.target.position.copy(_org).addScaledVector(_fwd,10);

  // dying battery flickers
  const flicker=
    p.battery<20&&Math.random()<.15?.2:1;

  flashlight.intensity=flashActive()?90*flicker:0;
  playerLight.position.set(p.x,p.eyeH,p.z);
}

/* ============================================================
   THE HUNTER (AI)
   ============================================================ */

// can the killer see the player right now?
function canSee(k,dist,dx,dz){
  const p=S.player;
  let range=k.cfg.sight;

  if(p.crouch)range*=.55;        // crouching = much harder to spot
  if(flashActive())range*=1.35;  // flashlight gives you away
  if(k.state==='chase')range*=1.7;

  if(dist>range)return false;

  // outside a ~60 degree front cone (unless already chasing)
  if(
    dist>2.2&&
    k.state!=='chase'&&
    Math.abs(angDiff(k.dir,Math.atan2(dx,dz)))>1.05
  )return false;

  return lineClear(k.x,k.z,p.x,p.z);
}

// walk straight towards a point
function steer(k,tx,tz,speed,dt){
  let dx=tx-k.x;
  let dz=tz-k.z;
  const d=Math.hypot(dx,dz);

  if(d<.05)return false;

  dx/=d;
  dz/=d;

  const step=Math.min(d,speed*dt);
  moveEntity(k,dx*step,dz*step,.4,true);

  k.dir+=angDiff(k.dir,Math.atan2(dx,dz))*Math.min(1,dt*8);
  return true;
}

// walk a BFS path towards a point (recalculating twice a second)
function followPath(k,tx,tz,speed,dt){
  k.repath-=dt;

  const tc=cellOf(tx,tz);
  const goal=tc[1]*W+tc[0];

  if(k.repath<=0||k.pathGoal!==goal){
    k.path=bfs(cellOf(k.x,k.z),tc);
    k.pathI=1;
    k.repath=.5;
    k.pathGoal=goal;
  }

  let wx=tx;
  let wz=tz;

  if(k.path&&k.pathI<k.path.length){
    const c=k.path[k.pathI];
    wx=c[0]*CELL+CELL/2;
    wz=c[1]*CELL+CELL/2;

    if(Math.hypot(wx-k.x,wz-k.z)<.4){
      k.pathI++;
      return true;
    }
  }

  return steer(k,wx,wz,speed,dt);
}

// where should the killer wander next?
function pickPatrolTarget(){
  const pending=S.gens.filter(g=>!g.done);

  // 55% of the time: go lurk near an unfinished generator
  if(pending.length&&Math.random()<.55){
    const g=pending[rand(pending.length)];
    return {
      x:g.cx*CELL+CELL/2,
      z:g.cz*CELL+CELL/2
    };
  }

  for(let i=0;i<200;i++){
    const x=1+rand(W-2);
    const z=1+rand(H-2);

    if(S.grid[z][x]===0){
      return {
        x:x*CELL+CELL/2,
        z:z*CELL+CELL/2
      };
    }
  }

  return {x:11*CELL+2,z:11*CELL+2};
}

// the Wraith's signature move: teleport 3-5 cells from the player
function wraithBlink(k){
  const p=S.player;
  const [pcx,pcz]=cellOf(p.x,p.z);
  const opts=[];

  for(let z=1;z<H-1;z++){
    for(let x=1;x<W-1;x++){
      if(S.grid[z][x]!==0)continue;

      const m=Math.abs(x-pcx)+Math.abs(z-pcz);
      if(m<3||m>5)continue;

      const wx=x*CELL+CELL/2;
      const wz=z*CELL+CELL/2;

      if(lineClear(p.x,p.z,wx,wz))continue;   // must NOT be visible
      opts.push([wx,wz]);
    }
  }

  if(!opts.length)return false;

  const o=opts[rand(opts.length)];
  k.x=o[0];
  k.z=o[1];
  k.path=null;

  noiseBurst(.9,.25,500);
  return true;
}

export function updateKiller(dt){
  const k=S.killer;
  const p=S.player;

  k.cooldown=Math.max(0,k.cooldown-dt);

  const dx=p.x-k.x;
  const dz=p.z-k.z;
  const dist=Math.hypot(dx,dz);

  if(k.stunT>0){                    // brief pause after landing a hit
    k.stunT-=dt;
    animateKiller(k,dt,false,dist);
    return;
  }

  const sees=canSee(k,dist,dx,dz);

  if(sees){
    if(k.state!=='chase'){
      k.state='chase';
      k.chaseT=0;
    }

    k.lastKnown={x:p.x,z:p.z};
    k.lostT=0;
  }

  let speed=k.cfg.speed;
  let tx=null;
  let tz=null;
  let direct=false;

  if(k.state==='chase'){
    k.chaseT+=dt;

    if(!sees){
      k.lostT+=dt;

      if(k.lostT<1.5)k.lastKnown={x:p.x,z:p.z};
      if(k.lostT>5){
        k.state='search';
        k.searchT=0;
        k.stuckT=0;
      }
    }

    if(k.id==='butcher'&&k.chaseT>4)speed+=.8;   // rage

    if(sees){
      tx=p.x;
      tz=p.z;
      direct=k.stuckT<.4;
    }else{
      tx=k.lastKnown.x;
      tz=k.lastKnown.z;
    }
  }else{
    speed*=k.id==='hound'?.65:.75;               // patrol is calmer

    if(k.state==='search'){
      tx=k.lastKnown.x;
      tz=k.lastKnown.z;

      if(
        Math.hypot(tx-k.x,tz-k.z)<1.2||
        k.stuckT>1
      ){
        tx=null;
        k.searchT+=dt;
        k.dir+=dt*2.2*Math.sin(k.searchT*1.7);   // scanning around

        if(k.searchT>3.5){
          k.state='patrol';
          k.patrolTarget=null;
          k.stuckT=0;
        }
      }
    }

    if(k.state==='patrol'){
      if(!k.patrolTarget||
        Math.hypot(k.patrolTarget.x-k.x,k.patrolTarget.z-k.z)<1.2||
        k.stuckT>1.5
      ){
        k.patrolTarget=pickPatrolTarget();
        k.stuckT=0;
      }

      tx=k.patrolTarget.x;
      tz=k.patrolTarget.z;
    }
  }

  const px=k.x;
  const pz=k.z;
  let moved=false;

  if(tx!==null){
    moved=direct?steer(k,tx,tz,speed,dt):followPath(k,tx,tz,speed,dt);
  }

  const md=Math.hypot(k.x-px,k.z-pz);

  if(tx!==null&&md<speed*dt*.2)k.stuckT+=dt;    // bumping into walls
  else k.stuckT=Math.max(0,k.stuckT-dt);

  // attack!
  if(
    dist<1.25&&
    k.cooldown<=0&&
    lineClear(k.x,k.z,p.x,p.z)
  ){
    k.cooldown=2.6;
    k.stunT=1.6;
    hitPlayer();

    if(S.state!=='playing')return;
  }

  // wraith teleports while hunting from afar
  if(k.id==='wraith'){
    k.blinkT-=dt;

    if(
      k.blinkT<=0&&
      k.state!=='patrol'&&
      dist>10
    ){
      k.blinkT=wraithBlink(k)?14:2;
    }
  }

  animateKiller(k,dt,moved&&md>.001,dist,speed);
}

function animateKiller(k,dt,moved,dist,speed=4){
  k.mesh.position.set(k.x,0,k.z);
  k.mesh.rotation.y=k.dir;

  if(moved){
    k.walkPhase+=dt*speed*2;
    k.mesh.position.y=Math.abs(Math.sin(k.walkPhase))*.06;

    // footstep sounds (the Shade is silent)
    if(k.id!=='shade'){
      k.stepT-=dt;

      if(k.stepT<=0){
        k.stepT=k.state==='chase'?.33:.5;
        const vol=Math.max(0,1-dist/22)*.18;

        if(vol>.01)noiseBurst(.12,vol,180);
      }
    }
  }

  // the Shade fades to almost invisible unless it's chasing
  if(k.id==='shade'){
    const target=k.state==='chase'?.95:.1;
    k.opacity+=(target-k.opacity)*Math.min(1,dt*3);
    k.mats.forEach(m=>m.opacity=k.opacity);
  }
}

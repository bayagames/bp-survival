/* ============================================================
   MAIN — the entry point. Boots the menu, owns raw input and
   the frame loop. Nothing else "starts" the game: every other
   module is imported for its side effects or called from here.

   Frame loop (60x/second):
     read input -> updatePlayer -> updateKiller -> updateWorld
                -> updateCamera -> updateHUD -> render
   ============================================================ */

import * as THREE from 'three';
import { MOUSE_SENSITIVITY } from './config.js';
import { $, clamp } from './utils.js';
import { S } from './state.js';
import { beep } from './audio.js';
import { renderer, scene, camera } from './graphics.js';
import { initMenu, gameTransition } from './menu.js';
import { startGame, toMenu, skillResult, lockPointer } from './game.js';
import { updatePlayer, updateKiller, updateCamera } from './actors.js';
import { updateWorld } from './world.js';
import { updateHUD } from './hud.js';

/* ---------- Boot the menus ---------- */
// The menu gets a callback so it never needs to import game logic:
// when the player hits DEPLOY, we start the run + play the wipe.
initMenu({
  onDeploy(killerId,mapId){
    startGame(killerId,mapId);
    gameTransition();
  }
});

/* ---------- Input ---------- */

// clicking the game area re-locks the mouse after a pause
renderer.domElement.addEventListener('click',()=>{
  if(S.state==='playing')lockPointer();
});

// pause overlay: click anywhere on it (except Quit) to resume
$('pause').addEventListener('click',e=>{
  if(e.target.id!=='quitBtn')lockPointer();
});

$('quitBtn').addEventListener('click',toMenu);
$('againBtn').addEventListener('click',toMenu);

// mouse lock lost (user pressed ESC) -> pause the run
document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===renderer.domElement;

  if(locked){
    if(S.state==='paused'){
      S.state='playing';
      clock.getDelta();   // swallow the pause duration
    }
    $('pause').classList.add('hidden');
  }else if(S.state==='playing'){
    S.state='paused';
    $('pause').classList.remove('hidden');

    for(const k in S.keys)S.keys[k]=false;
  }
});

document.addEventListener('pointerlockerror',()=>{
  if(S.state==='playing'){
    S.state='paused';
    $('pause').classList.remove('hidden');
  }
});

// look around (only while the pointer is locked in a live run)
document.addEventListener('mousemove',e=>{
  if(
    S.state!=='playing'||
    document.pointerLockElement!==renderer.domElement
  )return;

  S.player.yaw-=e.movementX*MOUSE_SENSITIVITY;
  S.player.pitch=clamp(
    S.player.pitch-e.movementY*MOUSE_SENSITIVITY,
    -1.4,
    1.4
  );
});

addEventListener('keydown',e=>{
  if(e.code==='Space')e.preventDefault();

  S.keys[e.code]=true;

  if(S.state!=='playing'||e.repeat)return;

  if(e.code==='KeyF'){
    S.flashOn=!S.flashOn;
    beep(2000,.03,.05,'square');
  }

  if(e.code==='KeyV')S.fp=!S.fp;

  // skill check: hit SPACE while the needle is inside the zone
  if(e.code==='Space'&&S.skill.active){
    const pos=S.skill.t/S.skill.dur;

    skillResult(
      S.skill.t>=0&&
      pos>=S.skill.zs&&
      pos<=S.skill.zs+S.skill.zw
    );
  }
});

addEventListener('keyup',e=>{
  S.keys[e.code]=false;
});

// tab lost focus -> let go of every key
addEventListener('blur',()=>{
  for(const k in S.keys)S.keys[k]=false;
});

/* ---------- The frame loop ---------- */

const clock=new THREE.Clock();

function loop(){
  requestAnimationFrame(loop);

  const dt=Math.min(clock.getDelta(),.05);

  if(S.state==='playing'){
    updatePlayer(dt);

    if(S.state==='playing')updateKiller(dt);

    if(S.state==='playing'){
      updateWorld(dt,clock.elapsedTime);
      updateCamera(dt);
      updateHUD(dt);
    }
  }

  renderer.render(scene,camera);
}

loop();

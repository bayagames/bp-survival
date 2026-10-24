/* ============================================================
   MENU — splash screen, main menu, Free Play setup, and the
   animated menu background (canvas grid + drifting embers).

   initMenu({ onDeploy }) wires every menu button; main.js
   passes in what happens when the player hits DEPLOY.
   ============================================================ */

import { $, hex } from './utils.js';
import { MAPS, KILLERS } from './data.js';
import { S } from './state.js';
import { initAudio } from './audio.js';

/* ---------- Animated background (runs while any menu is up) ---------- */

const menuCanvas = $('menuCanvas');
const menuCtx = menuCanvas.getContext('2d');
let menuParticles = [];

function resizeMenuCanvas(){
  const dpr=Math.min(devicePixelRatio||1,2);
  menuCanvas.width=innerWidth*dpr;
  menuCanvas.height=innerHeight*dpr;
  menuCtx.setTransform(dpr,0,0,dpr,0,0);
}

function createMenuParticles(){
  menuParticles=Array.from({length:85},()=>({
    x:Math.random()*innerWidth,
    y:Math.random()*innerHeight,
    r:Math.random()*1.8+.3,
    vx:(Math.random()-.5)*.2,
    vy:(Math.random()-.5)*.2,
    a:Math.random()*.7+.1
  }));
}

function animateMenuBackground(t){
  const w=innerWidth,h=innerHeight;
  menuCtx.clearRect(0,0,w,h);
  menuCtx.fillStyle='rgba(3,4,7,.4)';
  menuCtx.fillRect(0,0,w,h);

  menuCtx.strokeStyle='rgba(180,50,60,.075)';
  menuCtx.lineWidth=1;

  const offset=(t*.012)%80;
  for(let x=-80+offset;x<w+80;x+=80){
    menuCtx.beginPath();
    menuCtx.moveTo(x,0);
    menuCtx.lineTo(x,h);
    menuCtx.stroke();
  }
  for(let y=-80+offset;y<h+80;y+=80){
    menuCtx.beginPath();
    menuCtx.moveTo(0,y);
    menuCtx.lineTo(w,y);
    menuCtx.stroke();
  }

  for(const p of menuParticles){
    p.x+=p.vx;
    p.y+=p.vy;
    if(p.x<0)p.x=w;
    if(p.x>w)p.x=0;
    if(p.y<0)p.y=h;
    if(p.y>h)p.y=0;

    menuCtx.fillStyle=`rgba(224,66,75,${p.a})`;
    menuCtx.beginPath();
    menuCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
    menuCtx.fill();
  }

  requestAnimationFrame(animateMenuBackground);
}

resizeMenuCanvas();
createMenuParticles();
addEventListener('resize',()=>{
  resizeMenuCanvas();
  createMenuParticles();
});
requestAnimationFrame(animateMenuBackground);

/* ---------- Map / killer selection ---------- */

function selectMap(id){
  S.selectedMapId=id;

  document.querySelectorAll('.map-card').forEach(card=>{
    card.classList.toggle('selected',card.dataset.map===id);
  });

  const map=MAPS[id];
  $('selectionName').textContent=map.name;
  $('selectionDetail').textContent=map.desc;
  $('homeMapName').textContent=map.name;
  $('homeMapDetail').textContent=map.desc;
  $('deployBtn').disabled=false;
  $('deployBtn').innerHTML=`Deploy <span>${map.code}</span>`;
}

function selectKiller(id){
  S.selectedKillerId=id;

  document.querySelectorAll('.killer-card').forEach(card=>{
    card.classList.toggle('selected',card.dataset.killer===id);
  });

  const k=KILLERS[id];
  $('deployBtn').innerHTML=`Deploy <span>${MAPS[S.selectedMapId].name} · ${k.name}</span>`;
}

function buildMenuCards(){
  for(const [id,map] of Object.entries(MAPS)){
    const card=document.createElement('article');
    card.className='map-card';
    card.dataset.map=id;

    card.innerHTML=`
      <div class="map-art ${map.art}">
        <div class="map-number">${map.code}</div>
        <div class="map-art-label">${map.name}</div>
      </div>
      <div class="map-info">
        <h3>${map.name}</h3>
        <p>${map.tagline}</p>
        <span class="map-type">${map.type.toUpperCase()} ENVIRONMENT</span>
      </div>
    `;

    card.addEventListener('click',()=>selectMap(id));
    $('mapCards').appendChild(card);
  }

  for(const [id,k] of Object.entries(KILLERS)){
    const card=document.createElement('button');
    card.type='button';
    card.className='killer-card';
    card.dataset.killer=id;

    card.innerHTML=`
      <span class="killer-sigil" style="--killer:${hex(k.color)}"></span>
      <span>
        <strong>${k.name}</strong>
        <small>${k.stats}</small>
      </span>
    `;

    card.addEventListener('click',()=>selectKiller(id));
    $('killerCards').appendChild(card);
  }

  selectMap(S.selectedMapId);
  selectKiller(S.selectedKillerId);
}

/* ---------- Panels & transitions ---------- */

export function showMenuPanel(panel){
  const free=panel==='freeplay';

  $('homePanel').classList.toggle('hidden',free);
  $('freeplayPanel').classList.toggle('hidden',!free);

  document.querySelectorAll('.nav-item[data-panel]').forEach(button=>{
    button.classList.toggle('active',button.dataset.panel===panel);
  });
}

function runMenuTransition(callback){
  const transition=$('transition');
  transition.classList.remove('hidden');

  requestAnimationFrame(()=>transition.classList.add('on'));

  setTimeout(()=>{
    callback();
    transition.classList.remove('on');
    setTimeout(()=>transition.classList.add('hidden'),300);
  },430);
}

// longer wipe used when a run begins
export function gameTransition(){
  const transition=$('transition');
  transition.classList.remove('hidden');

  requestAnimationFrame(()=>transition.classList.add('on'));

  setTimeout(()=>{
    transition.classList.remove('on');
    setTimeout(()=>transition.classList.add('hidden'),300);
  },650);
}

function openComingSoon(title){
  $('comingTitle').textContent=title;
  $('comingText').textContent=
    `${title} is planned for a future build. Free Play is available now with procedural environments and killer selection.`;
  $('comingSoon').classList.remove('hidden');
}

export function showMainMenu(panel='home'){
  $('menuFX').classList.remove('hidden');
  $('splash').classList.add('hidden');
  $('mainMenu').classList.remove('hidden');
  showMenuPanel(panel);
}

/* ---------- Boot the menu (called once by js/main.js) ---------- */

export function initMenu({ onDeploy }){
  buildMenuCards();

  $('startBtn').addEventListener('click',()=>{
    initAudio();
    runMenuTransition(()=>showMainMenu('home'));
  });

  document.querySelectorAll('[data-mode]').forEach(button=>{
    button.addEventListener('click',()=>{
      const mode=button.dataset.mode;

      if(mode==='freeplay'){
        runMenuTransition(()=>{
          showMainMenu('freeplay');
          selectMap(S.selectedMapId);
          selectKiller(S.selectedKillerId);
        });
      }else{
        openComingSoon(mode==='story'?'Story Mode':'Online Mode');
      }
    });
  });

  document.querySelectorAll('[data-panel]').forEach(button=>{
    button.addEventListener('click',()=>{
      const panel=button.dataset.panel;

      if(panel==='freeplay'){
        runMenuTransition(()=>{
          showMenuPanel('freeplay');
          selectMap(S.selectedMapId);
          selectKiller(S.selectedKillerId);
        });
      }else{
        showMenuPanel(panel);
      }
    });
  });

  $('backHome').addEventListener('click',()=>showMenuPanel('home'));
  $('closeComing').addEventListener('click',()=>$('comingSoon').classList.add('hidden'));

  $('comingSoon').addEventListener('click',e=>{
    if(e.target===$('comingSoon'))$('comingSoon').classList.add('hidden');
  });

  $('deployBtn').addEventListener('click',()=>{
    if($('deployBtn').disabled)return;
    onDeploy(S.selectedKillerId,S.selectedMapId);
  });
}

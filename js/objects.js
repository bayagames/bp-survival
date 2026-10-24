/* ============================================================
   OBJECTS — the interactive things placed on the map:
   generators, the exit door, and the player/killer bodies.

   placeGenerators() / buildDoor()  are called by js/game.js
   buildPlayerMesh() / createKiller() build the actors' 3D bodies
   ============================================================ */

import * as THREE from 'three';
import { CELL, W, H, GENS_TOTAL } from './config.js';
import { rand, shuffle } from './utils.js';
import { S } from './state.js';
import { darkMetal } from './graphics.js';
import { KILLERS } from './data.js';

/* ---------- Generators ---------- */

// pick GENS_TOTAL wall-adjacent spots, spread out across the maze
export function placeGenerators(){
  S.gens=[];

  const candidates=[];

  for(let z=1;z<H-1;z++){
    for(let x=1;x<W-1;x++){
      if(S.grid[z][x]!==0)continue;
      if(Math.abs(x-1)+Math.abs(z-1)<7)continue;              // not near spawn
      if(Math.abs(x-11)<=2&&Math.abs(z-11)<=2)continue;       // not in centre plaza
      if(Math.abs(x-(W-2))+Math.abs(z-(H-2))<3)continue;      // not near exit

      const sides=[
        [1,0],[-1,0],[0,1],[0,-1]
      ].filter(([dx,dz])=>S.grid[z+dz][x+dx]===1);

      if(sides.length)candidates.push({x,z,sides});
    }
  }

  shuffle(candidates);

  // prefer far-apart placements first, relax the distance over passes
  for(const minD of [8,6,4,2]){
    for(const c of candidates){
      if(S.gens.length>=GENS_TOTAL)break;
      if(S.gens.some(g=>Math.abs(g.cx-c.x)+Math.abs(g.cz-c.z)<minD))continue;
      addGenerator(c);
    }
    if(S.gens.length>=GENS_TOTAL)break;
  }

  S.gensNeeded=Math.min(S.activeMap.need,S.gens.length);
}

function addGenerator(c){
  const side=c.sides[rand(c.sides.length)];

  const x=c.x*CELL+CELL/2+side[0]*1.35;
  const z=c.z*CELL+CELL/2+side[1]*1.35;

  const group=new THREE.Group();

  const genMat=new THREE.MeshStandardMaterial({
    color:S.activeMap.genBody,
    roughness:.6,
    metalness:.5
  });

  const body=new THREE.Mesh(
    new THREE.BoxGeometry(1.3,1,.9),
    genMat
  );
  body.position.y=.5;

  const top=new THREE.Mesh(
    new THREE.BoxGeometry(1,.25,.6),
    darkMetal
  );
  top.position.y=1.12;

  const pipe=new THREE.Mesh(
    new THREE.CylinderGeometry(.06,.06,.9),
    darkMetal
  );
  pipe.position.set(.45,1.45,0);

  const bulbMat=new THREE.MeshBasicMaterial({
    color:S.activeMap.genLight
  });

  const bulb=new THREE.Mesh(
    new THREE.SphereGeometry(.09,10,8),
    bulbMat
  );
  bulb.position.set(-.4,1.32,0);

  [body,top,pipe].forEach(o=>{
    o.castShadow=true;
    o.receiveShadow=true;
  });

  group.add(body,top,pipe,bulb);
  group.position.set(x,0,z);
  group.rotation.y=side[0]!==0?Math.PI/2:0;

  const light=new THREE.PointLight(
    S.activeMap.genLight,
    6,
    9,
    2
  );
  light.position.set(x,1.6,z);

  S.world.add(group,light);

  S.gens.push({
    cx:c.x,
    cz:c.z,
    x,
    z,
    progress:0,
    done:false,
    light,
    bulbMat
  });
}

/* ---------- Exit door ---------- */

export function buildDoor(){
  const h=S.activeMap.wallH;
  const dx=(W-1)*CELL;
  const dz=(H-2)*CELL;

  const mesh=new THREE.Mesh(
    new THREE.BoxGeometry(CELL,h,CELL),
    new THREE.MeshStandardMaterial({
      color:S.activeMap.doorColor,
      roughness:.55,
      metalness:.7
    })
  );

  mesh.position.set(dx+CELL/2,h/2,dz+CELL/2);
  mesh.castShadow=true;
  mesh.receiveShadow=true;

  const stripeMat=new THREE.MeshBasicMaterial({color:0xff2222});
  const stripe=new THREE.Mesh(
    new THREE.BoxGeometry(.05,.15,CELL*.9),
    stripeMat
  );
  stripe.position.set(-CELL/2-.03,.9,0);
  mesh.add(stripe);

  const light=new THREE.PointLight(0xff2222,8,12,2);
  light.position.set(dx-1,h*.78,dz+CELL/2);

  const glow=new THREE.Mesh(
    new THREE.PlaneGeometry(CELL,h),
    new THREE.MeshBasicMaterial({
      color:0xcfe3ff,
      fog:false,
      transparent:true,
      opacity:.45,
      side:THREE.DoubleSide
    })
  );
  glow.rotation.y=-Math.PI/2;
  glow.position.set(dx+CELL-.05,h/2,dz+CELL/2);
  glow.visible=false;

  S.world.add(mesh,light,glow);
  S.door={mesh,stripeMat,light,glow,open:false};
}

/* ---------- Player body ---------- */

// visible in third person; hidden in first person
export function buildPlayerMesh(){
  const group=new THREE.Group();

  const body=new THREE.Mesh(
    new THREE.CapsuleGeometry(.3,1,4,8),
    new THREE.MeshStandardMaterial({
      color:S.activeMap.type==='forest'?0x405e4d:0x335577,
      roughness:.8
    })
  );
  body.position.y=.8;
  body.receiveShadow=true;

  group.add(body);
  return group;
}

/* ---------- Killer body ---------- */

function buildKillerMesh(id,cfg){
  const group=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({
    color:cfg.color,
    roughness:.8,
    transparent:id==='shade',
    opacity:1
  });
  const eyeMat=new THREE.MeshBasicMaterial({color:0xff1a1a});
  const h=cfg.height;
  let head;

  if(id==='hound'){
    const body=new THREE.Mesh(
      new THREE.CapsuleGeometry(.35,1,4,8),
      mat
    );
    body.rotation.x=Math.PI/2;
    body.position.y=.6;

    head=new THREE.Mesh(
      new THREE.SphereGeometry(.26,12,10),
      mat
    );
    head.position.set(0,.85,.8);
    group.add(body);
  }else{
    const body=new THREE.Mesh(
      new THREE.CapsuleGeometry(.38,h-1.2,4,8),
      mat
    );
    body.position.y=(h-.44)/2;

    head=new THREE.Mesh(
      new THREE.SphereGeometry(.24,12,10),
      mat
    );
    head.position.set(0,h-.24,0);

    group.add(body);

    if(id==='butcher'){
      const cleaver=new THREE.Mesh(
        new THREE.BoxGeometry(.05,.5,.3),
        darkMetal
      );
      cleaver.position.set(.5,h*.45,.25);
      group.add(cleaver);
    }
  }

  group.add(head);

  for(const sx of [-.09,.09]){
    const eye=new THREE.Mesh(
      new THREE.SphereGeometry(.045,8,6),
      eyeMat
    );
    eye.position.set(
      head.position.x+sx,
      head.position.y+.03,
      head.position.z+.21
    );
    group.add(eye);
  }

  group.traverse(o=>{
    if(o.isMesh&&o.material!==eyeMat)o.castShadow=true;
  });

  return {group,mats:[mat]};
}

// creates the killer entity (data + mesh) at grid cell (cx,cz)
export function createKiller(id,cx,cz){
  const cfg=KILLERS[id];
  const built=buildKillerMesh(id,cfg);

  S.world.add(built.group);

  return {
    id,
    cfg,
    x:cx*CELL+CELL/2,
    z:cz*CELL+CELL/2,
    dir:0,
    state:'patrol',      // patrol | search | chase
    path:null,
    pathI:0,
    repath:0,
    pathGoal:-1,
    lastKnown:null,
    lostT:0,
    cooldown:0,
    stunT:0,
    chaseT:0,
    blinkT:10,
    searchT:0,
    patrolTarget:null,
    stuckT:0,
    stepT:0,
    walkPhase:0,
    mesh:built.group,
    mats:built.mats,
    opacity:1
  };
}

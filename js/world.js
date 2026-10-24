/* ============================================================
   WORLD — builds and animates the 3D environment.

   buildLevel() is called once per run by js/game.js and
   dispatches on the map's `type` field (see js/data.js):
     facility -> box walls + cabinets/beds + red warning lamps
     forest   -> trees as the "walls" + bushes + fireflies
     sewer    -> box walls + water + pipes + hanging bulbs

   updateWorld() animates the small living details each frame.
   ============================================================ */

import * as THREE from 'three';
import { CELL, W, H } from './config.js';
import { rand } from './utils.js';
import { S } from './state.js';
import {
  MATERIALS, darkMetal,
  forestTrunkMat, forestLeafMat, forestBushMat
} from './graphics.js';

/* ---------- Walls ---------- */

function buildBoxWalls(material){
  let count=0;

  for(let z=0;z<H;z++){
    for(let x=0;x<W;x++){
      if(S.grid[z][x]===1)count++;
    }
  }

  const walls=new THREE.InstancedMesh(
    new THREE.BoxGeometry(CELL,S.activeMap.wallH,CELL),
    material,
    count
  );

  const matrix=new THREE.Matrix4();
  let i=0;

  for(let z=0;z<H;z++){
    for(let x=0;x<W;x++){
      if(S.grid[z][x]!==1)continue;

      matrix.makeTranslation(
        x*CELL+CELL/2,
        S.activeMap.wallH/2,
        z*CELL+CELL/2
      );

      walls.setMatrixAt(i++,matrix);
    }
  }

  walls.instanceMatrix.needsUpdate=true;
  walls.castShadow=true;
  walls.receiveShadow=true;
  S.world.add(walls);
}

/* ---------- Forest ---------- */

function buildForestEnvironment(){
  const trunkGeo=new THREE.CylinderGeometry(.34,.55,3.5,7);
  const crownGeo=new THREE.ConeGeometry(1.45,3.7,7);
  const rootGeo=new THREE.SphereGeometry(.85,7,5);
  const bushGeo=new THREE.SphereGeometry(.65,8,6);

  for(let z=0;z<H;z++){
    for(let x=0;x<W;x++){
      if(S.grid[z][x]===1){
        const tree=new THREE.Group();

        const root=new THREE.Mesh(rootGeo,forestTrunkMat);
        root.scale.y=.35;
        root.position.y=.25;

        const trunk=new THREE.Mesh(trunkGeo,forestTrunkMat);
        trunk.position.y=1.8;

        const crown=new THREE.Mesh(crownGeo,forestLeafMat);
        crown.position.y=4.9;

        tree.add(root,trunk,crown);
        tree.position.set(
          x*CELL+CELL/2+(Math.random()-.5)*.65,
          0,
          z*CELL+CELL/2+(Math.random()-.5)*.65
        );
        tree.rotation.y=Math.random()*Math.PI;
        tree.scale.setScalar(.8+Math.random()*.35);

        tree.traverse(o=>{
          if(o.isMesh){
            o.castShadow=true;
            o.receiveShadow=true;
          }
        });

        S.world.add(tree);
      }else if(Math.random()<.16){
        const bush=new THREE.Mesh(bushGeo,forestBushMat);
        bush.position.set(
          x*CELL+CELL/2+(Math.random()-.5)*1.2,.3,
          z*CELL+CELL/2+(Math.random()-.5)*1.2
        );
        bush.scale.set(1,.55,1);
        S.world.add(bush);
      }
    }
  }

  // fireflies: a drifting cloud of glowing points
  const positions=[];

  for(let i=0;i<90;i++){
    let x,z;

    do{
      x=1+rand(W-2);
      z=1+rand(H-2);
    }while(S.grid[z][x]!==0);

    positions.push(
      x*CELL+Math.random()*CELL,
      1.5+Math.random()*3.5,
      z*CELL+Math.random()*CELL
    );
  }

  const geo=new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions,3)
  );

  const mat=new THREE.PointsMaterial({
    color:0xb8ffd0,
    size:.09,
    transparent:true,
    opacity:.85
  });

  S.fireflies=new THREE.Points(geo,mat);
  S.world.add(S.fireflies);
}

/* ---------- Facility decor ---------- */

function buildFacilityDecor(){
  const cabinetGeo=new THREE.BoxGeometry(.7,1.75,.5);
  const cabinetMat=new THREE.MeshStandardMaterial({
    color:0x34373a,
    roughness:.7,
    metalness:.45
  });

  const bedFrameGeo=new THREE.BoxGeometry(1.6,.18,.65);
  const mattressGeo=new THREE.BoxGeometry(1.45,.22,.55);
  const pillowGeo=new THREE.BoxGeometry(.38,.12,.48);
  const mattressMat=new THREE.MeshStandardMaterial({color:0x5f6464,roughness:1});
  const pillowMat=new THREE.MeshStandardMaterial({color:0xb3aaa0,roughness:1});

  for(let z=1;z<H-1;z++){
    for(let x=1;x<W-1;x++){
      if(S.grid[z][x]!==0)continue;
      if(Math.abs(x-1)+Math.abs(z-1)<6)continue;
      if(Math.random()<.09){
        const cabinet=new THREE.Mesh(cabinetGeo,cabinetMat);
        cabinet.position.set(
          x*CELL+CELL/2+(Math.random()-.5)*1.5,.88,
          z*CELL+CELL/2+(Math.random()-.5)*1.5
        );
        cabinet.rotation.y=Math.random()*Math.PI;
        cabinet.castShadow=true;
        S.world.add(cabinet);
      }

      if(Math.random()<.045){
        const bed=new THREE.Group();

        const frame=new THREE.Mesh(bedFrameGeo,darkMetal);
        frame.position.y=.65;

        const mattress=new THREE.Mesh(mattressGeo,mattressMat);
        mattress.position.y=.86;

        const pillow=new THREE.Mesh(pillowGeo,pillowMat);
        pillow.position.set(.48,.99,0);

        bed.add(frame,mattress,pillow);
        bed.position.set(
          x*CELL+CELL/2,
          0,
          z*CELL+CELL/2
        );
        bed.rotation.y=Math.random()*Math.PI;
        bed.traverse(o=>{
          if(o.isMesh){
            o.castShadow=true;
            o.receiveShadow=true;
          }
        });
        S.world.add(bed);
      }
    }
  }

  // red warning lamps on the walls
  const warningMat=new THREE.MeshBasicMaterial({color:0xff2525});
  let lamps=0;

  for(let z=1;z<H-1&&lamps<24;z++){
    for(let x=1;x<W-1&&lamps<24;x++){
      if(S.grid[z][x]!==0||Math.random()>.2)continue;

      const sides=[
        [1,0],[-1,0],[0,1],[0,-1]
      ].filter(([dx,dz])=>S.grid[z+dz][x+dx]===1);

      if(!sides.length)continue;

      const side=sides[rand(sides.length)];
      const marker=new THREE.Mesh(
        new THREE.BoxGeometry(.12,.16,.5),
        warningMat
      );

      marker.position.set(
        x*CELL+CELL/2+side[0]*1.75,
        2.5,
        z*CELL+CELL/2+side[1]*1.75
      );

      const light=new THREE.PointLight(0xff2020,1.4,8,2);
      light.position.copy(marker.position);

      S.world.add(marker,light);
      lamps++;
    }
  }
}

/* ---------- Sewer decor ---------- */

function buildSewerDecor(){
  // sheet of water covering the whole floor
  const water=new THREE.Mesh(
    new THREE.PlaneGeometry(W*CELL,H*CELL),
    MATERIALS.sewer.water
  );
  water.rotation.x=-Math.PI/2;
  water.position.set(W*CELL/2,.025,H*CELL/2);
  S.waterSurface=water;
  S.world.add(water);

  const puddleGeo=new THREE.CircleGeometry(.8,20);
  const puddleMat=new THREE.MeshStandardMaterial({
    color:0x061b22,
    transparent:true,
    opacity:.7,
    roughness:.1,
    metalness:.5
  });

  const pipeGeo=new THREE.CylinderGeometry(.12,.12,CELL*.9,10);
  const pipeMat=new THREE.MeshStandardMaterial({
    color:0x536367,
    roughness:.45,
    metalness:.75
  });

  const barrelGeo=new THREE.CylinderGeometry(.35,.35,.8,12);
  const barrelMat=new THREE.MeshStandardMaterial({
    color:0x35494b,
    roughness:.75,
    metalness:.4
  });

  for(let z=1;z<H-1;z++){
    for(let x=1;x<W-1;x++){
      if(S.grid[z][x]!==0)continue;

      const cx=x*CELL+CELL/2;
      const cz=z*CELL+CELL/2;

      if(Math.random()<.24){
        const puddle=new THREE.Mesh(puddleGeo,puddleMat);
        puddle.rotation.x=-Math.PI/2;
        puddle.position.set(
          cx+(Math.random()-.5)*1.2,.04,
          cz+(Math.random()-.5)*1.2
        );
        puddle.scale.set(1+Math.random(),.6+Math.random()*.5,1);
        S.world.add(puddle);
      }

      if(Math.random()<.11){
        const pipe=new THREE.Mesh(pipeGeo,pipeMat);
        pipe.position.set(cx,S.activeMap.wallH*.72,cz);

        if(Math.random()<.5)pipe.rotation.z=Math.PI/2;
        else pipe.rotation.x=Math.PI/2;

        pipe.castShadow=true;
        S.world.add(pipe);
      }

      if(Math.random()<.055){
        const barrel=new THREE.Mesh(barrelGeo,barrelMat);
        barrel.position.set(
          cx+(Math.random()-.5)*1.4,.4,
          cz+(Math.random()-.5)*1.4
        );
        barrel.rotation.y=Math.random()*Math.PI;
        barrel.castShadow=true;
        S.world.add(barrel);
      }
    }
  }

  // hanging bulbs with warm point lights
  for(let i=0;i<20;i++){
    let x,z;

    do{
      x=1+rand(W-2);
      z=1+rand(H-2);
    }while(S.grid[z][x]!==0);

    const cord=new THREE.Mesh(
      new THREE.CylinderGeometry(.018,.018,.55,6),
      darkMetal
    );
    cord.position.set(x*CELL+CELL/2,S.activeMap.wallH-.25,z*CELL+CELL/2);

    const bulb=new THREE.Mesh(
      new THREE.SphereGeometry(.1,8,6),
      new THREE.MeshBasicMaterial({color:0xffc477})
    );
    bulb.position.set(x*CELL+CELL/2,S.activeMap.wallH-.55,z*CELL+CELL/2);

    const light=new THREE.PointLight(0xff9a55,1.8,9,2);
    light.position.copy(bulb.position);

    S.world.add(cord,bulb,light);
  }
}

/* ---------- Level assembly ---------- */

// builds floor + ceiling + walls/trees + decor for the active map
export function buildLevel(){
  const mats=MATERIALS[S.activeMap.type];

  const floor=new THREE.Mesh(
    new THREE.PlaneGeometry(W*CELL,H*CELL),
    mats.floor
  );
  floor.rotation.x=-Math.PI/2;
  floor.position.set(W*CELL/2,0,H*CELL/2);
  floor.receiveShadow=true;
  S.world.add(floor);

  if(S.activeMap.type!=='forest'){
    const ceiling=new THREE.Mesh(
      new THREE.PlaneGeometry(W*CELL,H*CELL),
      mats.ceiling
    );
    ceiling.rotation.x=Math.PI/2;
    ceiling.position.set(W*CELL/2,S.activeMap.wallH,H*CELL/2);
    S.world.add(ceiling);
  }

  if(S.activeMap.type==='forest')buildForestEnvironment();
  else buildBoxWalls(mats.wall);

  if(S.activeMap.type==='facility')buildFacilityDecor();
  if(S.activeMap.type==='sewer')buildSewerDecor();
}

/* ---------- Per-frame world animation ---------- */

export function updateWorld(dt,time){
  // generator light flicker
  for(const g of S.gens){
    if(g.done){
      g.light.intensity=6;
      continue;
    }

    const base=
      S.player.repairing&&S.player.near===g?5+g.progress*6:2.5;

    g.light.intensity+=
      (base*(.85+Math.random()*.3)-g.light.intensity)*
      Math.min(1,dt*6);
  }

  // exit door slides up once powered
  if(S.door.open){
    S.door.mesh.position.y+=
      (S.activeMap.wallH*1.5-.2-S.door.mesh.position.y)*
      Math.min(1,dt*1.5);
  }

  S.door.light.intensity=8+Math.sin(time*4)*2;

  if(S.fireflies)S.fireflies.rotation.y+=dt*.015;

  if(S.waterSurface){
    S.waterSurface.material.opacity=.47+Math.sin(time*1.4)*.04;
  }
}

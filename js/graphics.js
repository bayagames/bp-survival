/* ============================================================
   GRAPHICS — the Three.js engine layer.

   Owns the renderer, scene, camera, global lights, and every
   shared material/texture. Also applies a map's look (fog,
   light colours) via applyMapLook().

   This module initialises itself the moment it is imported:
   the render canvas is created and appended to <body>.
   ============================================================ */

import * as THREE from 'three';
import { W, H, FOV } from './config.js';
import { rand } from './utils.js';

/* ---------- Renderer ---------- */

export const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.domElement.style.position='fixed';
renderer.domElement.style.inset='0';
renderer.domElement.style.zIndex='0';
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background=new THREE.Color(0x000000);
scene.fog=new THREE.FogExp2(0x020203,.055);

export const camera = new THREE.PerspectiveCamera(FOV,innerWidth/innerHeight,.05,200);
camera.rotation.order='YXZ';

/* ---------- Global lights ---------- */

export const hemi = new THREE.HemisphereLight(0x223355,0x110808,.35);

export const moon = new THREE.DirectionalLight(0x6677a0,.25);
moon.position.set(-30,45,-20);
moon.castShadow=true;
moon.shadow.mapSize.set(1024,1024);

export const flashlight = new THREE.SpotLight(0xfff1d6,90,38,.42,.55,2);
flashlight.castShadow=true;
flashlight.shadow.mapSize.set(1024,1024);
flashlight.shadow.camera.near=.2;
flashlight.shadow.bias=-.0005;

export const playerLight = new THREE.PointLight(0x8899bb,.8,7,2);

scene.add(hemi,moon,flashlight,flashlight.target,playerLight);

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* ---------- Textures and materials ---------- */

// builds a grimy 128x128 canvas texture: base colour + noise + blood stains
function makeTex(base,variance,stains){
  const c=document.createElement('canvas');
  c.width=c.height=128;
  const g=c.getContext('2d');

  g.fillStyle=base;
  g.fillRect(0,0,128,128);

  const img=g.getImageData(0,0,128,128);
  for(let i=0;i<img.data.length;i+=4){
    const n=(Math.random()-.5)*variance;
    img.data[i]+=n;
    img.data[i+1]+=n;
    img.data[i+2]+=n;
  }
  g.putImageData(img,0,0);

  for(let i=0;i<stains;i++){
    g.fillStyle=`rgba(${20+rand(40)},0,0,${Math.random()*.3})`;
    g.beginPath();
    g.arc(Math.random()*128,Math.random()*128,Math.random()*18+4,0,Math.PI*2);
    g.fill();
  }

  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.colorSpace=THREE.SRGBColorSpace;
  return t;
}

const facilityWallTex=makeTex('#4a443d',28,14);
const facilityFloorTex=makeTex('#2b2622',22,22);
const facilityCeilTex=makeTex('#1a1816',12,4);
facilityFloorTex.repeat.set(W,H);
facilityCeilTex.repeat.set(W,H);

const forestFloorTex=makeTex('#172118',20,28);
forestFloorTex.repeat.set(W,H);

const sewerWallTex=makeTex('#39484b',20,17);
const sewerFloorTex=makeTex('#172a2d',20,23);
const sewerCeilTex=makeTex('#131d20',10,5);
sewerFloorTex.repeat.set(W,H);
sewerCeilTex.repeat.set(W,H);

// one entry per map type — picked by js/world.js buildLevel()
export const MATERIALS={
  facility:{
    wall:new THREE.MeshStandardMaterial({map:facilityWallTex,roughness:.95}),
    floor:new THREE.MeshStandardMaterial({map:facilityFloorTex,roughness:1}),
    ceiling:new THREE.MeshStandardMaterial({map:facilityCeilTex,roughness:1})
  },
  forest:{
    wall:new THREE.MeshStandardMaterial({color:0x1d2a22,roughness:1}),
    floor:new THREE.MeshStandardMaterial({map:forestFloorTex,roughness:1})
  },
  sewer:{
    wall:new THREE.MeshStandardMaterial({map:sewerWallTex,roughness:.95}),
    floor:new THREE.MeshStandardMaterial({map:sewerFloorTex,roughness:1}),
    ceiling:new THREE.MeshStandardMaterial({map:sewerCeilTex,roughness:1}),
    water:new THREE.MeshStandardMaterial({
      color:0x0c3944,
      roughness:.15,
      metalness:.25,
      transparent:true,
      opacity:.52,
      side:THREE.DoubleSide
    })
  }
};

export const darkMetal=new THREE.MeshStandardMaterial({
  color:0x2a2a2a,
  roughness:.5,
  metalness:.7
});

export const forestTrunkMat=new THREE.MeshStandardMaterial({
  color:0x241812,
  roughness:1
});
export const forestLeafMat=new THREE.MeshStandardMaterial({
  color:0x102d25,
  roughness:1
});
export const forestBushMat=new THREE.MeshStandardMaterial({
  color:0x1c4a2c,
  roughness:1
});

/* ---------- Per-map look ---------- */

// applies a map's atmosphere to the global scene/lights
// (called by js/game.js startGame)
export function applyMapLook(map){
  scene.background.set(map.bg);
  scene.fog=new THREE.FogExp2(
    map.fogColor,
    map.fogDensity
  );

  hemi.color.set(map.sky);
  hemi.groundColor.set(map.ground);
  hemi.intensity=map.hemi;

  moon.color.set(map.moon);
  moon.intensity=map.moonIntensity;

  playerLight.color.set(map.playerLight);
  flashlight.color.set(map.flashlight);
}

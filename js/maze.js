/* ============================================================
   MAZE — generation, collision and pathfinding on the grid.

   The world is a grid of cells (see config.js CELL / W / H).
   Grid values (S.grid[z][x]):  0 = floor, 1 = wall, 2 = exit

   genMaze()   — carves a random maze every run (braided + rooms)
   collides()  — circle-vs-grid collision test
   moveEntity()- moves an entity with wall sliding
   lineClear() — line-of-sight test
   bfs()       — shortest path between two cells (killer AI)
   ============================================================ */

import { CELL, W, H } from './config.js';
import { shuffle, rand, clamp } from './utils.js';
import { S } from './state.js';

export function genMaze(){
  const g=Array.from({length:H},()=>Array(W).fill(1));
  const stack=[[1,1]];

  g[1][1]=0;

  while(stack.length){
    const [cx,cy]=stack[stack.length-1];
    let moved=false;

    for(const [dx,dy] of shuffle([[2,0],[-2,0],[0,2],[0,-2]])){
      const nx=cx+dx;
      const ny=cy+dy;

      if(nx>0&&nx<W-1&&ny>0&&ny<H-1&&g[ny][nx]===1){
        g[cy+dy/2][cx+dx/2]=0;
        g[ny][nx]=0;
        stack.push([nx,ny]);
        moved=true;
        break;
      }
    }

    if(!moved)stack.pop();
  }

  // "Braid" the maze: knock some walls down so it has loops
  // (forest = very open, sewer = tight, facility = in between).
  const braidChance=
    S.activeMap.type==='forest'?.38:
    S.activeMap.type==='sewer'?.18:.24;

  for(let y=1;y<H-1;y++){
    for(let x=1;x<W-1;x++){
      if(g[y][x]!==1)continue;

      const horizontal=
        g[y][x-1]===0&&g[y][x+1]===0&&
        g[y-1][x]===1&&g[y+1][x]===1;

      const vertical=
        g[y-1][x]===0&&g[y+1][x]===0&&
        g[y][x-1]===1&&g[y][x+1]===1;

      if((horizontal||vertical)&&Math.random()<braidChance)g[y][x]=0;
    }
  }

  // carve a few open rooms
  const roomCount=S.activeMap.type==='forest'?5:3;

  for(let i=0;i<roomCount;i++){
    const rx=3+2*rand(9);
    const ry=3+2*rand(9);

    for(let dy=-1;dy<=1;dy++){
      for(let dx=-1;dx<=1;dx++){
        g[ry+dy][rx+dx]=0;
      }
    }
  }

  // guaranteed open plaza at the centre (the killer spawns here)
  for(let y=10;y<=12;y++){
    for(let x=10;x<=12;x++)g[y][x]=0;
  }

  // Ensure the exit has a reachable interior tile.
  g[H-2][W-2]=0;
  g[H-3][W-2]=0;
  g[H-2][W-3]=0;
  g[H-2][W-1]=2;   // the exit door cell

  return g;
}

/* ---------- Grid queries ---------- */

export const inBounds=(x,z)=>x>=0&&z>=0&&x<W&&z<H;
export const solid=(x,z)=>!inBounds(x,z)||S.grid[z][x]!==0;
export const blocked=(x,z)=>!inBounds(x,z)||S.grid[z][x]===1||(S.grid[z][x]===2&&!S.exitOpen);
export const cellOf=(x,z)=>[Math.floor(x/CELL),Math.floor(z/CELL)];

/* ---------- Collision ---------- */

// circle (x,z,r) vs walls (+closed exit) (+generators unless noGens)
export function collides(x,z,r,isKiller=false,noGens=false){
  const x0=Math.floor((x-r)/CELL);
  const x1=Math.floor((x+r)/CELL);
  const z0=Math.floor((z-r)/CELL);
  const z1=Math.floor((z+r)/CELL);

  for(let gz=z0;gz<=z1;gz++){
    for(let gx=x0;gx<=x1;gx++){
      if(isKiller?solid(gx,gz):blocked(gx,gz)){
        const cx=clamp(x,gx*CELL,gx*CELL+CELL);
        const cz=clamp(z,gz*CELL,gz*CELL+CELL);
        const dx=x-cx;
        const dz=z-cz;

        if(dx*dx+dz*dz<r*r)return true;
      }
    }
  }

  if(!noGens){
    for(const g of S.gens){
      const dx=x-g.x;
      const dz=z-g.z;
      const rr=r+.65;
      if(dx*dx+dz*dz<rr*rr)return true;
    }
  }

  return false;
}

// move with axis-separated wall sliding
export function moveEntity(e,dx,dz,r,isKiller){
  if(!collides(e.x+dx,e.z,r,isKiller))e.x+=dx;
  if(!collides(e.x,e.z+dz,r,isKiller))e.z+=dz;
}

// is the straight line between two points free of walls?
export function lineClear(x1,z1,x2,z2){
  const d=Math.hypot(x2-x1,z2-z1);
  const n=Math.ceil(d/.3);

  for(let i=1;i<n;i++){
    const t=i/n;
    const x=x1+(x2-x1)*t;
    const z=z1+(z2-z1)*t;

    if(solid(Math.floor(x/CELL),Math.floor(z/CELL)))return false;
  }

  return true;
}

/* ---------- Pathfinding (BFS) ---------- */

// returns an array of [cellX,cellZ] steps from s to t, or null
export function bfs(s,t){
  const si=s[1]*W+s[0];
  const ti=t[1]*W+t[0];

  if(solid(t[0],t[1]))return null;

  const prev=new Int32Array(W*H).fill(-1);
  const q=[si];
  prev[si]=si;

  for(let h=0;h<q.length;h++){
    const cur=q[h];
    if(cur===ti)break;

    const cx=cur%W;
    const cz=(cur/W)|0;

    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx;
      const nz=cz+dz;

      if(solid(nx,nz))continue;

      const ni=nz*W+nx;
      if(prev[ni]===-1){
        prev[ni]=cur;
        q.push(ni);
      }
    }
  }

  if(prev[ti]===-1)return null;

  const path=[];
  let c=ti;

  while(c!==si){
    path.push([c%W,(c/W)|0]);
    c=prev[c];
  }

  path.push(s);
  return path.reverse();
}

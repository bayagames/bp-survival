/* ============================================================
   UTILS — tiny helpers used everywhere. No game logic.
   ============================================================ */

// document.getElementById shortcut: $('hud') === document.getElementById('hud')
export const $ = id => document.getElementById(id);

// clamp a value between a minimum and a maximum
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

// random integer from 0 to n-1:  rand(6) -> 0..5
export const rand = n => Math.floor(Math.random()*n);

// 0xff9933 -> '#ff9933' (for CSS inline styles)
export const hex = n => '#' + n.toString(16).padStart(6,'0');

// randomise the order of an array (in place)
export const shuffle = a => {
  for(let i=a.length-1;i>0;i--){
    const j=rand(i+1);
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
};

// shortest signed difference between two angles, in radians
export const angDiff = (a,b) => {
  let d=(b-a)%(Math.PI*2);
  if(d>Math.PI)d-=Math.PI*2;
  if(d<-Math.PI)d+=Math.PI*2;
  return d;
};

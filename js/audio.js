/* ============================================================
   AUDIO — all sound, synthesized live with the Web Audio API.

   No audio files exist in this project: the ambient drone,
   chase music, heartbeat, footsteps and UI beeps are all
   oscillators / noise buffers. initAudio() must be called once
   from a user click (browser autoplay policy).
   ============================================================ */

let actx=null;
let master=null;
let chaseGain=null;
let lastChase=false;

export function initAudio(){
  if(actx){
    if(actx.state==='suspended')actx.resume();
    return;
  }

  actx=new(window.AudioContext||window.webkitAudioContext)();

  master=actx.createGain();
  master.gain.value=.7;
  master.connect(actx.destination);

  // Ambient dread: three detuned sawtooths through a lowpass.
  const lp=actx.createBiquadFilter();
  lp.type='lowpass';
  lp.frequency.value=160;

  const amb=actx.createGain();
  amb.gain.value=.05;
  lp.connect(amb).connect(master);

  [43,43.6,65.2].forEach(f=>{
    const o=actx.createOscillator();
    o.type='sawtooth';
    o.frequency.value=f;
    o.connect(lp);
    o.start();
  });

  // Chase layer: pulsing low sawtooth, faded in by setChase(true).
  chaseGain=actx.createGain();
  chaseGain.gain.value=0;
  chaseGain.connect(master);

  const clp=actx.createBiquadFilter();
  clp.type='lowpass';
  clp.frequency.value=380;

  const co=actx.createOscillator();
  co.type='sawtooth';
  co.frequency.value=82;

  const lfo=actx.createOscillator();
  lfo.frequency.value=3.2;

  const lg=actx.createGain();
  lg.gain.value=150;

  lfo.connect(lg).connect(clp.frequency);
  co.connect(clp).connect(chaseGain);
  co.start();
  lfo.start();
}

// reset the chase layer between runs (called by startGame)
export function resetChase(){
  lastChase=false;
  if(chaseGain)chaseGain.gain.value=0;
}

// one deep drum hit (used by heartbeat)
function thump(vol){
  if(!actx)return;
  const t=actx.currentTime;
  const o=actx.createOscillator();
  const g=actx.createGain();

  o.frequency.setValueAtTime(70,t);
  o.frequency.exponentialRampToValueAtTime(35,t+.15);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(vol,t+.01);
  g.gain.exponentialRampToValueAtTime(.0001,t+.25);

  o.connect(g).connect(master);
  o.start(t);
  o.stop(t+.3);
}

// two thumps: boom-boom
export function heartbeat(vol){
  thump(vol);
  setTimeout(()=>thump(vol*.7),180);
}

// short tone for UI / events
export function beep(freq,dur,vol=.15,type='sine'){
  if(!actx)return;
  const t=actx.currentTime;
  const o=actx.createOscillator();
  const g=actx.createGain();

  o.type=type;
  o.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);

  o.connect(g).connect(master);
  o.start(t);
  o.stop(t+dur+.05);
}

// filtered white-noise burst (hits, footsteps, teleports)
export function noiseBurst(dur,vol,freq=800){
  if(!actx)return;

  const len=Math.floor(actx.sampleRate*dur);
  const buf=actx.createBuffer(1,len,actx.sampleRate);
  const d=buf.getChannelData(0);

  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);

  const src=actx.createBufferSource();
  src.buffer=buf;

  const f=actx.createBiquadFilter();
  f.type='lowpass';
  f.frequency.value=freq;

  const g=actx.createGain();
  g.gain.value=vol;

  src.connect(f).connect(g).connect(master);
  src.start();
}

// fade the chase music in/out
export function setChase(on){
  if(!actx||on===lastChase)return;
  lastChase=on;
  chaseGain.gain.setTargetAtTime(on?.07:0,actx.currentTime,.6);
}

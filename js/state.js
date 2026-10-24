/* ============================================================
   STATE — the game's shared blackboard.

   Every module imports this one object `S` and reads/writes
   properties on it (e.g. S.player, S.grid, S.state = 'playing').

   Why? ES modules can't reassign each other's plain variables,
   but they CAN mutate properties of a shared object — so this
   is the one place all live game data flows through.

   Lifecycle values:
     S.state: 'menu' | 'playing' | 'paused' | 'over'
   ============================================================ */

import { MAPS } from './data.js';

export const S = {
  // ---- lifecycle ----
  state:'menu',

  // ---- the 3D world (rebuilt every run) ----
  world:null,          // THREE.Group holding everything in the level
  grid:null,           // 2D maze grid. Legend: 0 = floor, 1 = wall, 2 = exit door
  gens:[],             // generator objects {x,z,cx,cz,progress,done,light,bulbMat}
  gensDone:0,          // generators repaired so far
  gensNeeded:4,        // generators required to open the exit
  exitOpen:false,
  door:null,           // exit door object {mesh,stripeMat,light,glow,open}
  killer:null,         // the hunter object (see js/objects.js createKiller)
  playerMesh:null,     // the player's 3D body
  fireflies:null,      // forest particle effect
  waterSurface:null,   // sewer water plane

  // ---- current run choices ----
  activeMapId:'facility',
  activeMap:MAPS.facility,
  selectedMapId:'facility',     // chosen in the menu (Free Play panel)
  selectedKillerId:'butcher',

  // ---- view / feel toggles ----
  fp:true,             // true = first person, false = third person  [V key]
  flashOn:true,        // flashlight on/off                            [F key]

  // ---- timers ----
  startTime:0,         // performance.now() when the run began
  beatT:0,             // heartbeat audio countdown
  flashT:0,            // red hit-flash countdown
  msgT:0,              // on-screen message countdown

  // ---- the survivor ----
  player:{},           // position, stamina, battery, health... (reset in startGame)

  // ---- raw input ----
  keys:{},             // which keys are held, e.g. keys.KeyW === true

  // ---- skill-check minigame (set while repairing) ----
  skill:{active:false,cool:2},
};

// Derived helper: is the flashlight actually producing light?
// (must be switched on AND still have battery)
export const flashActive = () => S.flashOn && S.player.battery > 0;

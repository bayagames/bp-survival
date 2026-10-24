/* ============================================================
   CONFIG — global tuning numbers for the whole game.

   Want the player faster? More stamina? Brighter flashlight
   battery? Change it here — no game logic lives in this file.
   ============================================================ */

// ---- World / maze ----
export const CELL = 4;         // size of one maze cell, in metres
export const W = 23;           // maze width  in cells (keep it odd)
export const H = 23;           // maze height in cells (keep it odd)
export const GENS_TOTAL = 5;   // how many generators get placed on the map

// ---- Player (used by js/actors.js) ----
export const PLAYER = {
  walkSpeed:    3.6,   // metres / second
  sprintSpeed:  6.2,
  crouchSpeed:  1.8,
  radius:       0.32,  // collision radius
  eyeHeight:    1.6,   // standing camera height
  crouchEyeHeight: 0.95,

  staminaDrain: 24,    // stamina lost per second while sprinting
  staminaRegen: 16,    // stamina regained per second while resting
  batteryDrain: 1.6,   // flashlight battery lost per second (when on)
  batteryRegen: 5,     // battery regained per second (when off)
  repairTime:   14,    // seconds to fully repair one generator
};

// ---- Controls ----
export const MOUSE_SENSITIVITY = 0.0022;  // radians per pixel of mouse move

// ---- Camera ----
export const FOV = 75;         // field of view, degrees

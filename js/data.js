/* ============================================================
   DATA — the game CONTENT: maps and killers.

   This is the file you (or an AI) edit to add or rebalance
   content. No logic here — pure data.

   ADD A NEW MAP:   copy one block below, give it a new id
                    (the object key), change the numbers/text.
   ADD A NEW KILLER: same idea — copy a killer block.
   The menus pick these up automatically (js/menu.js reads them).
   ============================================================ */

/* Colour values are hex numbers: 0xRRGGBB.
   fogDensity: bigger = thicker fog = shorter view distance. */
export const MAPS = {
  facility:{
    name:'Hollowpoint Facility',          // shown in menus + HUD
    code:'SECTOR 02 / CONTAINMENT',       // small label on the map card
    type:'facility',                      // engine key: picks the builder in js/world.js
    art:'facility',                       // CSS art class on the menu card
    tagline:'A dead research wing full of concrete halls and emergency lights.',
    desc:'Procedural corridors, medical debris, lockers, red warning lamps and abandoned equipment.',
    wallH:3.6,                            // wall height in metres
    fogColor:0x060608,
    fogDensity:.055,
    bg:0x020203,                          // scene background colour
    sky:0x26324d,                         // hemisphere light (sky) colour
    ground:0x120808,                      // hemisphere light (ground) colour
    hemi:.32,                             // hemisphere light intensity
    moon:0x6677a0,                        // moonlight colour
    moonIntensity:.25,
    playerLight:0x8899bb,                 // soft glow around the player
    flashlight:0xfff1d6,                  // flashlight colour
    genBody:0x6b5a3a,                     // generator body colour
    genLight:0xff9933,                    // generator bulb + light colour
    doorColor:0x3a3f44,                   // exit door colour
    need:4                                // generators needed to open the exit
  },
  forest:{
    name:'Blackwood Preserve',
    code:'ZONE 07 / WOODS',
    type:'forest',
    art:'forest',
    tagline:'A hostile forest where the trees make their own maze.',
    desc:'Dense procedural trees, mist, undergrowth, fireflies and moonlit clearings.',
    wallH:5.4,
    fogColor:0x071615,
    fogDensity:.035,
    bg:0x020807,
    sky:0x182e30,
    ground:0x07110b,
    hemi:.38,
    moon:0x7aa4a0,
    moonIntensity:.42,
    playerLight:0x8db9a7,
    flashlight:0xd8ffe7,
    genBody:0x4b3b2a,
    genLight:0x8bd4ff,
    doorColor:0x3d271c,
    need:4
  },
  sewer:{
    name:'The Flooded Archive',
    code:'LOWER LEVEL / FLOOD ZONE',
    type:'sewer',
    art:'sewer',
    tagline:'A flooded underground archive with pipes, water and failing lamps.',
    desc:'Wet concrete, reflective water, pipes, barrels, hanging lights and heavy fog.',
    wallH:3.8,
    fogColor:0x0a1a20,
    fogDensity:.075,
    bg:0x03090d,
    sky:0x294956,
    ground:0x071015,
    hemi:.3,
    moon:0x6692a2,
    moonIntensity:.22,
    playerLight:0x8ab8ca,
    flashlight:0xbfeeff,
    genBody:0x5b4934,
    genLight:0xffb04a,
    doorColor:0x303c42,
    need:4
  }
};

/* Killer stats:
   speed  — metres / second while chasing (patrol is slower, see js/actors.js)
   sight  — how far it can see you (metres; less when you crouch, more with flashlight on)
   terror — radius of the heartbeat / vignette effect around it
   hearing— multiplier on how far noise (sprinting, failed skill checks) carries */
export const KILLERS = {
  butcher:{
    name:'The Butcher',
    speed:4.5,
    sight:18,
    terror:24,
    hearing:1,
    color:0x5a1a1a,
    height:2.3,
    desc:'A relentless brute. Gets faster the longer a chase lasts.',
    stats:'Speed: medium · Terror radius: large'
  },
  shade:{
    name:'The Shade',
    speed:4.3,
    sight:15,
    terror:8,
    hearing:1,
    color:0x101016,
    height:2.1,
    desc:'Nearly invisible and silent until it starts chasing you.',
    stats:'Speed: medium · Terror radius: tiny'
  },
  wraith:{
    name:'The Wraith',
    speed:4,
    sight:16,
    terror:20,
    hearing:1,
    color:0x2c2c3e,
    height:2.4,
    desc:'Slow, but blinks close to you while it is hunting.',
    stats:'Speed: slow · Ability: teleport'
  },
  hound:{
    name:'The Hound',
    speed:5.2,
    sight:11,
    terror:22,
    hearing:1.8,
    color:0x3d2a15,
    height:1.6,
    desc:'Fastest in a chase. Poor eyesight, but hears everything.',
    stats:'Speed: fast · Hearing: keen'
  }
};

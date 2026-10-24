# BP SURVIVAL

A procedural asymmetric horror prototype. Repair the generators, power the exit,
and outlast the thing hunting you — in a maze that is rebuilt on every run.

Built with plain **HTML / CSS / JavaScript (ES modules)** and **Three.js**.
No build step, no npm install, no framework — what you edit is what runs.

---

## The project map

One job per file. Find the thing you want to change, open that file, change it.

| File | What it does | Edit it to… |
|---|---|---|
| `index.html` | The page + every menu/HUD screen (all the HTML) | change text, add a menu item, rework layout |
| `css/style.css` | Every visual style (colours, menus, HUD) | change the look/theme/colours |
| `js/main.js` | **Entry point.** Boots the menu, reads input, runs the frame loop | change controls, change what happens each frame |
| `js/config.js` | Tuning numbers (speeds, stamina, battery, maze size) | rebalance the game |
| `js/data.js` | **Content: the 3 maps and 4 killers** | add a map, add a killer, change stats |
| `js/state.js` | The shared "blackboard" `S` — all live game data | understand what data exists |
| `js/utils.js` | Tiny helpers (`$`, `clamp`, `rand`…) | add a helper |
| `js/audio.js` | All sound (synthesized live, no audio files) | tweak volumes, add a sound |
| `js/graphics.js` | Renderer, scene, camera, lights, materials | change graphics settings |
| `js/maze.js` | Maze generation, collision, killer pathfinding | change maze size/loopiness |
| `js/world.js` | Builds + animates each environment (walls, trees, decor) | change props/visuals per map |
| `js/objects.js` | Generators, exit door, player & killer bodies | change what objects look like |
| `js/menu.js` | Splash, main menu, Free Play setup, background FX | change menu behaviour |
| `js/hud.js` | The on-screen HUD during a run | change what the HUD shows |
| `js/game.js` | Run lifecycle + repair/skill-check rules | change win/lose flow |
| `js/actors.js` | Player movement + killer AI | change how the killer hunts |
| `js/vendor/three.module.js` | Three.js r160 (vendored, MIT license) — **never edit** | nothing, it's the engine |

> Golden rule for imports: modules import each other with relative paths
> (`./state.js`) and the bare name `three` (mapped to the local vendor copy in
> `index.html`). Never use paths starting with `/` — they break GitHub Pages.

---

## Run it locally

The game uses ES modules, so it must be **served over http** — opening
`index.html` by double-clicking it (the `file://` protocol) will show a black
screen. From the project folder, run **one** of these:

```bash
# Option A — Python (installed on most systems)
python3 -m http.server 8000
# then open  http://localhost:8000

# Option B — Node
npx serve .
```

Or use the **Live Server** extension in VS Code (right-click `index.html`
→ "Open with Live Server").

---

## Host it on GitHub Pages (free)

1. Create a repository on GitHub (e.g. `bp-survival`), public.
2. Push this folder's contents to it:
   ```bash
   git init
   git add .
   git commit -m "BP Survival — restructured prototype"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/bp-survival.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages** → Build and deployment →
   Source: **Deploy from a branch** → Branch: `main` / folder `/ (root)` → Save.
4. Wait ~1 minute. The game is live at:

   **`https://YOUR-USERNAME.github.io/bp-survival/`**

Every future `git push` to `main` updates the live site automatically.

---

## How to play

| Key | Action |
|---|---|
| WASD | Move |
| Mouse | Look |
| Shift | Sprint (drains stamina) |
| C | Crouch (quieter, harder to see) |
| E (hold) | Repair generator |
| Space | Hit the skill-check zone |
| F | Flashlight on/off |
| V | First / third person |
| Esc | Pause |

Repair enough generators → the exit door in the far corner powers up (turns
green) → walk into it to escape. Two hits and you're done.

---

## Editing recipes

### Add a new killer
Open `js/data.js`, copy an existing killer block, give it a new id:

```js
stalker:{
  name:'The Stalker',
  speed:4.8, sight:14, terror:18, hearing:1.4,
  color:0x123321, height:2.0,
  desc:'Lurks. Follows. Waits for you to tire.',
  stats:'Speed: fast · Terror radius: medium'
}
```

That's it — the menu picks it up automatically. (For a *unique body shape or
power* like the Hound's or Wraith's, see the small `id===` branches in
`js/objects.js` and `js/actors.js`.)

### Add a new map
Copy a map block in `js/data.js` with a new id. The `type` field decides which
builder runs — reuse `'facility'`, `'forest'` or `'sewer'` to inherit their
props and lighting, then tweak `fogDensity`, `wallH`, `need`, colours, etc.

### Make the game easier / harder
Everything lives in `js/config.js` (player speed, stamina, battery, repair
time, maze size) and the stat blocks in `js/data.js` (killer speed/sight/
terror, generators needed per map). Both files are pure data — change a
number, refresh the page.

### Change the look
- Colours & menus: CSS variables at the top of `css/style.css` (`--red`,
  `--gold`, …) plus the rest of that file.
- Atmosphere per map (fog, light colours): the map blocks in `js/data.js`.
- Textures are generated in code (`makeTex()` in `js/graphics.js`).

---

## Notes for AI assistants editing this project

* The game's shared state is the object `S` in `js/state.js`. Read/write it as
  `S.player`, `S.killer`, `S.grid`, `S.state`, etc. — never try to export
  mutable `let` variables from modules; everything flows through `S`.
* Grid legend (`S.grid[z][x]`): `0` = floor, `1` = wall, `2` = exit door.
* Killer entity fields (set in `js/objects.js` → `createKiller`): `x, z, dir,
  state ('patrol'|'search'|'chase'), path, lastKnown, cooldown, stunT, …`.
* The frame loop lives at the bottom of `js/main.js` — the order is
  `updatePlayer → updateKiller → updateWorld → updateCamera → updateHUD →
  render`.
* There is **no build step**: edit a file, refresh the browser. Test with any
  static server (`python3 -m http.server`), not by opening the file directly.
* Keep all asset paths **relative** (no leading `/`) so GitHub Pages works.
* Three.js is vendored at `js/vendor/three.module.js` and exposed under the
  bare specifier `three` via the import map in `index.html`. Don't edit it;
  if you upgrade it, re-download the matching `three.module.js` build and keep
  the import map pointing at the same path.

---

## Credits & license

Game code: original prototype, restructured into modules.
[Three.js](https://threejs.org) © its authors, MIT license (vendored copy
retains its license header).

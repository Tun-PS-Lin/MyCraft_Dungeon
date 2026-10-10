# Portfolio Village

A small explorable 3D village that works as a portfolio. Walk up to a market stall and press **E** (or click it) to open a project.

Built with [Vite](https://vitejs.dev) and [three.js](https://threejs.org). No game engine, no backend.

## Run it

```bash
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # production build in dist/
```

## Put it online

**Vercel:** push this folder to a GitHub repository, then in Vercel choose *Add New → Project*, pick the repository and press Deploy. Vercel detects Vite on its own (build command `npm run build`, output folder `dist`).

**GitHub Pages or any static host:** run `npm run build` and upload the contents of `dist/`.

## Controls

| Action | Keyboard | Phone |
| --- | --- | --- |
| Move | W A S D or arrow keys | on-screen stick |
| Run | hold Shift | push the stick to its edge |
| Jump | Space | Jump button |
| Open a stall | E when near it, or click it | Open button, or tap it |
| Close | Esc, E or the × button | × button |

The three buttons in the top-right corner are sound on/off, day/night, and the menu. The day/night choice and the sound setting are remembered in the visitor's browser.

## Change the content

Everything you are likely to edit is in **`src/config.js`**:

- `PROJECTS`: the name, description, link and map position of each stall. A project with an empty `url` shows "Link coming soon".
- `CONTACT_EMAIL`: the address shown in the Contact popup.
- `CREDIT` and `REPO_URL`: the small credit line at the bottom of the screen and where it links. With `REPO_URL` empty it is plain text.
- `SOUND_FILES` and `AMBIENT_LOOP`: real sound files (see below).
- `TUNING`: walk and run speed, jump height, camera angle and distance, and how close you must be to a stall to open it.

## Add your own assets

Until you add files, every sound is a small synthesized placeholder and every texture is generated in code, so the site works with nothing in `public/assets/`.

### Sounds

Put `.mp3` or `.ogg` files in `public/assets/sounds/` and list them in `SOUND_FILES` in `src/config.js`:

```js
export const SOUND_FILES = {
  step: ['step1.mp3', 'step2.mp3', 'step3.mp3'],
  jump: ['jump.mp3'],
};
export const AMBIENT_LOOP = 'forest.mp3';
```

| Key | Used for | Suggested |
| --- | --- | --- |
| `step` | footsteps | 3 to 4 short variants |
| `jump`, `land` | jumping and landing | one each |
| `open`, `close` | project popup | one each |
| `near` | walking into range of a stall | a soft blip |
| `menu` | menu opening and closing | one |
| `cluck` | startled chicken | 2 to 3 variants |
| `bird` | occasional bird call | 2 to 3 variants |
| `AMBIENT_LOOP` | background birds, wind or music | a seamless 30 to 60 second loop |

### Visuals

| What | Where it goes |
| --- | --- |
| Popup picture for each project | `ART` in `src/ui.js` (swap the pixel drawing for an `<img>`) |
| Block textures (16×16 PNG) | `src/textures.js` (replace a generated canvas with a loaded image) |
| Stall models (`.glb`, e.g. from Blockbench) | `src/stalls.js` (load the model in place of that stall's builder) |
| Character skin | the small pixel canvases at the top of `src/player.js` |
| Favicon | `public/favicon.svg` |
| Social preview image (1200×630) | add to `public/` and reference it from `index.html` |

Use original or CC0 assets. Do not ship Mojang's own textures, sounds or font on a public site.

## How the code is laid out

```
index.html          page markup (canvas, popup, menu, touch controls)
src/config.js       content, links, sounds, tuning
src/main.js         renderer, lights, input, camera, game loop
src/world.js        ground, paving stones, fences, forest, guide slab
src/stalls.js       the four stalls
src/player.js       character model and animation
src/critters.js     chickens
src/collision.js    walls, steps and jumping onto things
src/textures.js     pixel textures, materials, instancing helpers
src/ui.js           labels, popup, menu
src/audio.js        sound effects
src/lights.js       lanterns and the day/night colours (edit `MOOD` to retune either mode)
src/style.css       interface styling
scripts/build-preview.mjs   optional: bundles everything into one HTML file
```

## Notes

- three.js is pinned to `0.128.0`. The lighting and colour handling are tuned for that version; upgrading will change how the scene looks and needs a pass over `src/main.js` and `src/textures.js`.
- The world's shadows are rendered once at start-up and moving things use soft blob shadows, which keeps the frame rate high. If you add something that moves and should cast a real shadow, set `renderer.shadowMap.needsUpdate = true` when it moves.

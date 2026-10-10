# Portfolio Village

A small explorable 3D village that works as a portfolio. Walk up to a market stall and press **E** (or click it) to open a project, change outfit at the Outfits stall, and visit the town hall to meet the agents.

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
| Open a stall or talk to an agent | E when near, or click it | the yellow button, or tap it |
| Close | Esc, E or the × button | × button |

The five buttons in the top-right corner are language (English / Burmese), music, sound effects, day/night, and the menu. A fresh visit opens in day or night to match the visitor's clock; the button overrides it for that visit. Music and sound settings, the chosen outfit, explored stalls and the wolf are remembered in the visitor's browser.

Picking a place in the menu makes the character walk there, and so does tapping or clicking the ground. Scroll, pinch, or press + and - to zoom a little; the camera angle is fixed. Opening all six stalls unlocks a wolf companion.

## Change the content

Everything you are likely to edit is in **`src/config.js`**:

- `STALLS`: the name, description, link, map position and facing of each stall, plus its Burmese text in `my`. A project with an empty `url` shows "Link coming soon". `image` names a picture in `public/assets/images/` that is shown in the popup; leave it `''` for none.
- `AGENTS`: the town hall agents: name, role, robe colours, which desk, and the line they say. Talking to an agent only shows its line; nothing real is triggered yet.
- `MUSIC_FILE` and `MUSIC_VOLUME`: the looping background track.
- `CONTACT_EMAIL`: the address shown in the Contact popup.
- `CREDIT` and `REPO_URL`: the small credit line at the bottom of the screen and where it links. With `REPO_URL` empty it is plain text.
- `SOUND_FILES`: real sound-effect files (see below).
- `TUNING`: walk and run speed, jump height, camera angle and distance, and how close you must be to a stall to open it.

Interface wording (buttons, menu, prompts, the achievement text) in both languages is in **`src/i18n.js`**.

## Link preview image

This is the card shown when the site address is pasted into Telegram, LinkedIn, Facebook, X and so on.

1. Take a screenshot of the village and crop it to **1200 × 630 pixels**.
2. Save it as **`public/og-image.jpg`**.
3. Open **`index.html`** and replace `https://YOUR-SITE` with your real address in the two `og:` lines near the top (for example `https://mycraft.vercel.app`). The image address must be the full address, not a relative path.
4. Commit, push, and let Vercel redeploy.
5. Check it by pasting your address into https://www.opengraph.xyz or by sending the link to yourself on Telegram. Apps cache previews; on Telegram, send the link to `@WebpageBot` to refresh it.

## Add your own assets

Until you add files, every sound is a small synthesized placeholder and every texture is generated in code, so the site works with nothing in `public/assets/`.

### Sounds

Put `.mp3` or `.ogg` files in `public/assets/sounds/` and list them in `SOUND_FILES` in `src/config.js`:

```js
export const SOUND_FILES = {
  step: ['step1.mp3', 'step2.mp3', 'step3.mp3'],
  jump: ['jump.mp3'],
};
```

| Key | Used for | Suggested |
| --- | --- | --- |
| `step` | footsteps | 3 to 4 short variants |
| `jump`, `land` | jumping and landing | one each |
| `open`, `close` | project popup | one each |
| `near` | walking into range of a stall | a soft blip |
| `menu` | menu opening and closing | one |
| `cluck` | startled chicken | 2 to 3 variants |
| `bird`, `cricket` | occasional bird call by day, cricket by night | 2 to 3 variants |
| `villager` | an agent greeting you | 2 to 3 short grunts |
| `bark` | the wolf | one |
| `achieve` | achievement unlocked | a short jingle |

Background music is `public/assets/sounds/background_music.mp3`. Replace the file, or point `MUSIC_FILE` at another one.

### Visuals

| What | Where it goes |
| --- | --- |
| Popup picture for each project | put a `.jpg` or `.png` (about 1100 px wide, 16:9) in `public/assets/images/` and name it in that stall's `image` field in `src/config.js` |
| Popup pixel icon | `ART` in `src/ui.js` |
| Block textures (16×16 PNG) | `src/textures.js` (replace a generated canvas with a loaded image) |
| Stall models (`.glb`, e.g. from Blockbench) | `src/stalls.js` (load the model in place of that stall's builder) |
| Outfits | add an entry to `OUTFITS` in `src/figures.js` (colours and a few style switches) |
| Favicon | `public/favicon.svg` |
| Social preview image (1200×630) | add to `public/` and reference it from `index.html` |

Use original or CC0 assets. Do not ship Mojang's own textures, sounds or font on a public site.

## How the code is laid out

```
index.html          page markup (canvas, popup, menu, touch controls)
src/config.js       content, links, sounds, tuning
src/i18n.js         interface wording in English and Burmese
src/main.js         renderer, lights, input, camera, game loop
src/world.js        ground, paving stones, fences, forest, guide slab
src/stalls.js       the six stalls
src/hall.js         the town hall, its fading roof and the desks inside
src/agents.js       the agents who walk and work in the hall
src/figures.js      the blocky people: outfits, painting, posing
src/player.js       the player's state and shadow
src/critters.js     chickens and the wolf
src/nav.js          path finding for walk-to
src/ambience.js     fireflies and drifting leaves
src/collision.js    the walkable area, steps and jumping onto things
src/textures.js     pixel textures, materials, instancing helpers
src/ui.js           labels, popup, menu, wardrobe, chat box, achievement badge
src/audio.js        sound effects and music
src/lights.js       lanterns and the day/night colours (edit `MOOD` to retune either mode)
src/style.css       interface styling
scripts/build-preview.mjs   optional: bundles everything into one HTML file
```

## Notes

- three.js is pinned to `0.128.0`. The lighting and colour handling are tuned for that version; upgrading will change how the scene looks and needs a pass over `src/main.js` and `src/textures.js`.
- The world's shadows are rendered once at start-up and moving things use soft blob shadows, which keeps the frame rate high. If you add something that moves and should cast a real shadow, set `renderer.shadowMap.needsUpdate = true` when it moves.

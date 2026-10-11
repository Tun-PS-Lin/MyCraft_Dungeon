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

The four buttons in the top-right corner are music, sound effects, day/night, and the menu. On phones only day/night and the menu stay on screen; music and sound move into the menu under Settings. The English / Burmese button is switched off for now: set `LANGUAGE_TOGGLE` to `true` in `src/config.js` to bring it back (all the Burmese text is still in place). A fresh visit opens in day or night to match the visitor's clock; the button overrides it for that visit. Music and sound settings, the chosen outfit, explored stalls and the wolf are remembered in the visitor's browser.

Picking a place in the menu makes the character walk there, and so does tapping or clicking the ground. Scroll, pinch, or press + and - to zoom a little; the camera angle is fixed. Opening all six stalls unlocks a wolf companion.

## Change the content

Everything you are likely to edit is in **`src/config.js`**:

- `STALLS`: the name, description, link, map position and facing of each stall, plus its Burmese text in `my`. A project with an empty `url` shows "Link coming soon". `image` names a picture in `public/assets/images/` that is shown in the popup; leave it `''` for none.
- `AGENTS`: the town hall agents: name, role, robe colours, which desk, the line they say, and the `about` / `schedule` / `delivers` text shown on the agent board.
- `MUSIC_FILE` and `MUSIC_VOLUME`: the looping background track.
- `CONTACT_EMAIL`: the address shown in the Contact popup.
- `INTRO_NAME`: the name on the short title card shown when the page opens.
- `CREDIT` and `REPO_URL`: the small credit line at the bottom of the screen and where it links. With `REPO_URL` empty it is plain text.
- `SOUND_FILES`: real sound-effect files (see below).
- `TUNING`: walk and run speed, jump height, camera angle and distance, and how close you must be to a stall to open it.

Interface wording (buttons, menu, prompts, the achievement text) in both languages is in **`src/i18n.js`**.

## The town hall and the agents

- Agents sit and type at their desks, walk the carpets, and sometimes take a break out in the village (at most two at a time). Their name tag shows what they are doing.
- The big **agent board** at the end of the hall lists everyone and their status. Press E beside it for the board menu: details for each agent and a button that calls one over to the board.
- Talking to an agent opens its **demo**. Each demo is a small function in `src/demos.js` that runs entirely in the browser on made-up sample data. Nothing is fetched, sent or triggered. To wire up a real action later, replace a button's handler there with a call to your own endpoint.

## Link preview image

This is the card shown when the site address is pasted into Telegram, LinkedIn, Facebook, X and so on.

1. The picture is already in place as **`public/og-image.jpg`** (1200 × 630 pixels). Replace that file to change it.
2. Deploy the site once so you know its address.
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
| Outfits | add an entry to `OUTFITS` in `src/figures.js`: colours, a hairstyle, and a `gear` list of raised pieces (hats, belt, backpack, pouches, cape, boots ...). New pieces go in `GEAR` in the same file |
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
src/stalls.js       the six stalls and their roofs
src/hall.js         the town hall, its fading roof, the desks and the agent board
src/agents.js       the agents: desk work, breaks outside, being called to the board
src/demos.js        the demo each agent shows when you talk to them (sample data only)
src/figures.js      the blocky people: outfits, painting, posing
src/player.js       the player's state and shadow
src/critters.js     chickens and the wolf
src/nav.js          path finding for walk-to
src/ambience.js     fireflies and drifting leaves
src/collision.js    the walkable area, steps and jumping onto things
src/textures.js     pixel textures, materials, instancing helpers
src/ui.js           labels, popup, menu, wardrobe, chat panel, agent board menu, achievement badge
src/audio.js        sound effects and music
src/lights.js       lanterns and the day/night colours (edit `MOOD` to retune either mode)
src/style.css       interface styling
scripts/build-preview.mjs   optional: bundles everything into one HTML file
```

## Notes

- three.js is pinned to `0.128.0`. The lighting and colour handling are tuned for that version; upgrading will change how the scene looks and needs a pass over `src/main.js` and `src/textures.js`.
- The world's shadows are rendered once at start-up and moving things use soft blob shadows, which keeps the frame rate high. If you add something that moves and should cast a real shadow, set `renderer.shadowMap.needsUpdate = true` when it moves.

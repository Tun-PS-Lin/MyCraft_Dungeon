// ─────────────────────────────────────────────────────────────
// Everything you are likely to edit lives in this file:
// stall text and links, the agents in the town hall, sounds and movement feel.
// ─────────────────────────────────────────────────────────────

export const CONTACT_EMAIL = 'tunpyaysonelin@gmail.com';

// Small credit line at the bottom of the screen. Leave REPO_URL empty for plain text.
export const CREDIT = 'Made by Tun. L';
export const REPO_URL = 'https://github.com/Tun-PS-Lin/MyCraft_Dungeon';

// The stalls. pos is [x, z] on the map. The camera looks from +z toward -z,
// so negative z is the top of the screen and negative x is the left.
// kind 'project' opens the project popup; kind 'outfits' opens the wardrobe.
export const STALLS = [
  {
    id: 'urban', kind: 'project',
    label: 'Urban Expansion',
    title: 'Incomplete Theory of Urban Expansion',
    pos: [-16.5, -9.5],
    color: '#c98a2b', glow: '#8fd0ff',
    desc: 'A mathematical framework for how cities grow outward, tested on Yangon.',
    url: 'https://drive.google.com/file/d/12T6Tg6l2Z3MKGV9wCo5UdtmauGHceIt2/view?usp=sharing',
    cta: 'Go to project', sub: 'Open the paper',
  },
  {
    id: 'alacrity', kind: 'project',
    label: 'Alacrity Research',
    title: 'Alacrity Research',
    pos: [-7.5, -9.5],
    color: '#2f66c4', glow: '#62e4ff',
    desc: 'An internal CRM to visualize and manage real estate projects, with an AI voice assistant that learns as you use it.',
    url: 'https://map.alacrityresearch.xyz',
    cta: 'Go to project', sub: 'Open project website',
  },
  {
    id: 'mingalar', kind: 'project',
    label: 'Mingalar News',
    title: 'Mingalar News',
    pos: [-15.5, 4],
    color: '#2f7a3c', glow: '#ffd84a',
    desc: 'A media organization for Myanmar migrants in Thailand, expanding into data-driven market insights on this community.',
    url: 'https://mingalar.news',
    cta: 'Go to project', sub: 'Open project website',
  },
  {
    id: 'outfits', kind: 'outfits',
    label: 'Outfits',
    title: 'Outfits',
    pos: [0, 10.5],
    color: '#c2317a', glow: '#ffb3d9',
  },
  {
    id: 'contact', kind: 'project',
    label: 'Contact Me',
    title: 'Contact Me',
    pos: [14, 9],
    color: '#a23fc4', glow: '#ff9de0',
    desc: 'Want to work together or talk through an idea? Send me an email.',
    url: 'mailto:' + CONTACT_EMAIL,
    email: CONTACT_EMAIL,
    cta: 'Send an email', sub: 'Opens your mail app',
  },
];

// The town hall and the agents who work in it. desk is which corner of the hall
// the agent's desk stands in: 'nw', 'ne', 'sw' or 'se'.
export const HALL_LABEL = 'AI Agents';
export const AGENTS = [
  { id: 'bobby', name: 'Bobby', role: 'News scraper', desk: 'sw', color: '#2f7a3c', robe: '#3d8a4a', trim: '#e9d9a8',
    line: "I'm Bobby. I'm a news scraper: I search and filter news for Mingalar News every day at 10:30am Bangkok time." },
  { id: 'friday', name: 'Friday', role: 'Personal assistant', desk: 'nw', color: '#2f66c4', robe: '#3b6fd0', trim: '#cfe6ff',
    line: "I'm Friday. I'm the personal assistant for Alacrity Research: ask me about a project and I'll look it up for you." },
  { id: 'sally', name: 'Sally', role: 'Researcher', desk: 'ne', color: '#1f8a7a', robe: '#2b9a88', trim: '#f3ead2',
    line: "I'm Sally. I'm the researcher for Urban Expansion: I gather city data and check the growth model against it." },
  { id: 'edwin', name: 'Edwin', role: 'Financial advisor', desk: 'se', color: '#7a4fc2', robe: '#6a3fb0', trim: '#e4b93a',
    line: "I'm Edwin. I'm a financial advisor and portfolio manager: I watch the portfolio and flag what needs attention." },
];

// Achievement: open every stall (the town hall does not count) to unlock the wolf.
export const ACHIEVEMENT = { title: 'Best Friend', text: 'You explored every stall. A wolf now follows you.' };

// Sound effects. Drop files in public/assets/sounds/ and list them here.
// Any sound left out keeps its built-in synthesized placeholder.
// Several files for one sound are picked at random each time it plays.
// Example:  step: ['step1.mp3', 'step2.mp3', 'step3.mp3'],
export const SOUND_FILES = {
  // step: [],      // footsteps
  // jump: [],
  // land: [],
  // open: [],      // popup opens
  // close: [],     // popup closes
  // near: [],      // walked into range of something you can open
  // menu: [],      // menu and buttons
  // cluck: [],     // chicken
  // bird: [],      // occasional bird call (day)
  // cricket: [],   // occasional cricket (night)
  // villager: [],  // an agent greets you
  // bark: [],      // the wolf
  // achieve: [],   // achievement unlocked
};
// Background music, looped. '' for none. Volume is 0 to 1; keep it low so effects stay clear.
export const MUSIC_FILE = 'background_music.mp3';
export const MUSIC_VOLUME = 0.14;

export const TUNING = {
  walkSpeed: 4.3,
  runSpeed: 7.6,
  jumpSpeed: 7.6,
  gravity: 22,
  playerScale: 1.2,   // 1 is two blocks tall
  interactRange: 2.6, // how close to a stall (from any side) before E works
  talkRange: 2.4,     // how close to an agent before E works
  cameraYaw: 0.16,    // radians; 0 looks straight up the map
  cameraBack: 29,     // further back and lower gives a flatter, more tilted-up view
  cameraUp: 30.5,
  cameraFov: 30,
  nightStartsAt: 18.5, // local hour (24h) when a fresh visit opens in night mode
  nightEndsAt: 6,
};

// The walkable village square, and the town hall attached to its top-right corner.
export const BOUNDS = { x0: -21, x1: 25, z0: -14, z1: 15 };
export const HALL = { x0: 6, x1: 25, z0: -24, z1: -10, doorX: 15.5, doorW: 4, floor: 0.4, wallH: 6 };
export const FLOOR = 0.08; // the height the player walks at everywhere on the square

// ─────────────────────────────────────────────────────────────
// Everything you are likely to edit lives in this file:
// project text, links, stall positions, sounds and movement feel.
// ─────────────────────────────────────────────────────────────

export const CONTACT_EMAIL = 'tunpyaysonelin@gmail.com';

// pos is [x, z] on the map. The camera looks from +z toward -z,
// so negative z is the top of the screen and negative x is the left.
export const PROJECTS = [
  {
    id: 'alacrity',
    label: 'Alacrity Research',
    title: 'Alacrity Research',
    pos: [-10.5, -8.5],
    color: '#2f66c4',
    glow: '#62e4ff',
    desc: 'An internal CRM to visualize and manage real estate projects, with an integrated AI voice assistant that learns the entire workflow over time.',
    url: 'https://map.alacrityresearch.xyz',
    cta: 'Go to project',
    sub: 'Open project website',
  },
  {
    id: 'mingalar',
    label: 'Mingalar News',
    title: 'Mingalar News',
    pos: [10.5, -8.5],
    color: '#2f7a3c',
    glow: '#ffd84a',
    desc: 'A media and market insights organization for Myanmar audiences and migrant workers in Thailand, built on data-driven editorial content and consumer research.',
    url: 'https://mingalar.news',
    cta: 'Go to project',
    sub: 'Open project website',
  },
  {
    id: 'urban',
    label: 'Urban Expansion',
    title: 'Incomplete Theory of Urban Expansion',
    pos: [-10.5, 8],
    color: '#c98a2b',
    glow: '#8fd0ff',
    desc: 'A mathematical framework for how single-centre cities grow outward, joining three empirical models into one and testing it on Yangon from 1989 to 2014.',
    url: '', // add the paper or project link here
    cta: 'Go to project',
    sub: 'Open the paper',
  },
  {
    id: 'contact',
    label: 'Contact Me',
    title: 'Contact Me',
    pos: [10.5, 8],
    color: '#a23fc4',
    glow: '#ff9de0',
    desc: 'Want to work together or talk through an idea? Send me an email.',
    url: 'mailto:' + CONTACT_EMAIL,
    email: CONTACT_EMAIL,
    cta: 'Send an email',
    sub: 'Opens your mail app',
  },
];

// Real sound files. Drop files in public/assets/sounds/ and list them here.
// Any sound left out keeps its built-in synthesized placeholder.
// Several files for one sound are picked at random each time it plays.
// Example:  step: ['step1.mp3', 'step2.mp3', 'step3.mp3'],
export const SOUND_FILES = {
  // step: [],     // footsteps
  // jump: [],
  // land: [],
  // open: [],     // popup opens
  // close: [],    // popup closes
  // near: [],     // walked into range of a stall
  // menu: [],     // sidebar opens or closes
  // cluck: [],    // chicken
  // bird: [],     // occasional bird call
};
// One looping background track (birds, wind or music), or '' for none.
export const AMBIENT_LOOP = '';

export const TUNING = {
  walkSpeed: 4.3,
  runSpeed: 7.6,
  jumpSpeed: 7.6,
  gravity: 22,
  interactRange: 2.6, // how close to a stall (from any side) before E works
  cameraYaw: 0.16,    // radians; 0 looks straight up the map
  cameraBack: 23,
  cameraUp: 30,
  cameraFov: 30,
};

// Map size (half-widths, in blocks).
export const PLAZA = { x: 17, z: 14 };

// ─────────────────────────────────────────────────────────────
// Everything you are likely to edit lives in this file:
// stall text and links, the agents in the town hall, sounds and movement feel.
// Burmese text for each stall and agent sits in its `my` block.
// (Interface words such as button labels are in src/i18n.js.)
// ─────────────────────────────────────────────────────────────

export const CONTACT_EMAIL = 'tunpyaysonelin@gmail.com';

// Small credit line at the bottom of the screen. Leave REPO_URL empty for plain text.
export const CREDIT = 'Made by Tun. L';
// The site's name: the title card when the page opens, and the simple version's heading.
// (The browser tab title and link preview are written in index.html and plain.html.)
export const SITE_NAME = 'MyCraft Dungeon';
export const INTRO_NAME = SITE_NAME;
export const INTRO_BY = 'A portfolio by Tun. L';
export const SITE_URL = 'https://portfolio.alacrityresearch.xyz';
export const REPO_URL = 'https://github.com/Tun-PS-Lin/MyCraft_Dungeon';

// The stalls.
//   pos    [x, z] on the map. The camera looks from +z toward -z, so negative z is
//          the top of the screen and negative x is the left.
//   face   which way the stall front points: 'south' (toward the camera), 'east' (right) or 'west' (left)
//   kind   'project' opens the project popup; 'outfits' opens the wardrobe
//   scale  optional, draws the stall smaller or larger (1 is the usual size)
//   image  optional picture shown in the popup, a file in public/assets/images/
//   url    '' shows "Link coming soon"
export const STALLS = [
  {
    // The signpost above the movement guide. about: true keeps it out of the "stalls explored" count,
    // and its button opens the village map instead of a link.
    id: 'about', kind: 'project', about: true, face: 'south',
    label: 'About Me', title: 'About Me',
    pos: [0, -4.8], labelY: 4.4,
    color: '#d9a93a', glow: '#ffd84a',
    image: '',
    desc: "I'm Tun Pyay Sone Lin. I work in real estate and media, and I research how cities expand. Have a wander around the village and check out my projects.",
    url: '',
    cta: 'See my projects', sub: 'Opens the village map',
    my: { label: 'ကျွန်တော့်အကြောင်း', title: 'ကျွန်တော့်အကြောင်း', desc: 'ကျွန်တော် Tun Pyay Sone Lin ပါ။ အိမ်ခြံမြေနှင့် မီဒီယာ လုပ်ငန်းများတွင် လုပ်ကိုင်နေပြီး မြို့ပြများ မည်သို့ ကျယ်ပြန့်လာသည်ကို သုတေသနပြုနေပါသည်။ ရွာထဲ လျှောက်ကြည့်ပြီး ကျွန်တော့် ပရောဂျက်များကို လေ့လာကြည့်ပါ။', cta: 'ပရောဂျက်များ ကြည့်ရန်', sub: 'ရွာမြေပုံကို ဖွင့်ပါမည်' },
  },
  {
    id: 'mingalar', kind: 'project', face: 'south',
    label: 'Mingalar News', title: 'Mingalar News',
    pos: [-16.8, -9.5],
    color: '#2f7a3c', glow: '#ffd84a',
    image: 'mingalar.jpg',
    desc: 'A media organization for Myanmar migrants in Thailand, expanding into data-driven market insights on this community.',
    url: 'https://mingalar.news',
    cta: 'Go to project', sub: 'Open project website',
    my: { desc: 'ထိုင်းနိုင်ငံရောက် မြန်မာရွှေ့ပြောင်းလုပ်သားများအတွက် မီဒီယာအဖွဲ့အစည်းတစ်ခုဖြစ်ပြီး ဤအသိုင်းအဝိုင်းဆိုင်ရာ ဒေတာအခြေပြု ဈေးကွက်သုံးသပ်ချက်များဆီသို့ တိုးချဲ့လျက်ရှိသည်။', cta: 'ပရောဂျက်သို့ သွားရန်', sub: 'ဝက်ဘ်ဆိုက် ဖွင့်ရန်' },
  },
  {
    id: 'alacrity', kind: 'project', face: 'south',
    label: 'Alacrity Research', title: 'Alacrity Research',
    pos: [-7.5, -9.5],
    color: '#2f66c4', glow: '#62e4ff',
    image: 'alacrity.jpg',
    desc: 'An internal CRM to visualize and manage real estate projects, with an AI voice assistant that learns as you use it.',
    url: 'https://map.alacrityresearch.xyz',
    cta: 'Go to project', sub: 'Open project website',
    my: { desc: 'အိမ်ခြံမြေ ပရောဂျက်များကို မြေပုံပေါ်တွင် ကြည့်ရှုစီမံနိုင်သည့် အတွင်းသုံး CRM တစ်ခုဖြစ်ပြီး အသုံးပြုသလောက် သင်ယူတတ်မြောက်လာသည့် AI အသံလက်ထောက် ပါဝင်သည်။', cta: 'ပရောဂျက်သို့ သွားရန်', sub: 'ဝက်ဘ်ဆိုက် ဖွင့်ရန်' },
  },
  {
    id: 'urban', kind: 'project', face: 'east',
    label: 'Urban Expansion', title: 'Urban Expansion',
    pos: [-17, 1.5],
    color: '#c98a2b', glow: '#8fd0ff',
    image: 'urban.jpg',
    desc: 'A mathematical framework for how cities grow outward, tested on Yangon.',
    url: 'https://drive.google.com/file/d/12T6Tg6l2Z3MKGV9wCo5UdtmauGHceIt2/view?usp=sharing',
    cta: 'Go to project', sub: 'Open the paper',
    my: { label: 'မြို့ပြတိုးချဲ့မှု', title: 'မြို့ပြတိုးချဲ့မှု၏ မပြည့်စုံသေးသော သီအိုရီ', desc: 'မြို့များ အပြင်ဘက်သို့ မည်သို့ကြီးထွားလာသည်ကို ရှင်းပြသည့် သင်္ချာမူဘောင်တစ်ခုဖြစ်ပြီး ရန်ကုန်မြို့တွင် စမ်းသပ်ထားသည်။', cta: 'ပရောဂျက်သို့ သွားရန်', sub: 'စာတမ်း ဖွင့်ရန်' },
  },
  {
    id: 'urbansim', kind: 'project', face: 'east',
    label: 'Urban Simulation', title: 'Urban Simulation',
    pos: [-17, 10.5],
    color: '#d2542f', glow: '#ffb35a',
    image: '',
    desc: 'A simulated heat map for investments based on the findings of Urban Research.',
    url: '', // add the link here when it is ready
    cta: 'Go to project', sub: 'Open project website',
    my: { label: 'မြို့ပြ ပုံတူစမ်းသပ်မှု', title: 'မြို့ပြ ပုံတူစမ်းသပ်မှု', desc: 'မြို့ပြသုတေသန၏ တွေ့ရှိချက်များအပေါ် အခြေခံထားသည့် ရင်းနှီးမြှုပ်နှံမှုဆိုင်ရာ ပုံတူ အပူပြမြေပုံ။', cta: 'ပရောဂျက်သို့ သွားရန်', sub: 'ဝက်ဘ်ဆိုက် ဖွင့်ရန်' },
  },
  {
    id: 'cinema', kind: 'project', face: 'south',
    label: 'AI Cinema', title: 'AI Cinema',
    pos: [-6.2, 12.9], scale: 0.8, labelY: 4.5, // a smaller stall, tucked down by the ridge
    color: '#b3242f', glow: '#ffd27a',
    image: '',
    desc: 'An AI animated series about “38 Mingalar Blessings”.',
    url: '', // add the link here when it is ready
    cta: 'Go to project', sub: 'Open project website',
  },
  {
    id: 'outfits', kind: 'outfits', face: 'west',
    label: 'Outfits', title: 'Outfits',
    pos: [21, 1],
    color: '#c2317a', glow: '#ffb3d9',
    my: { label: 'အဝတ်အစားများ', title: 'အဝတ်အစားများ' },
  },
  {
    id: 'contact', kind: 'project', face: 'west',
    label: 'Contact Me', title: 'Contact Me',
    pos: [21, 10.5],
    color: '#a23fc4', glow: '#ff9de0',
    image: '',
    desc: 'Want to work together or talk through an idea? Send me an email.',
    url: 'mailto:' + CONTACT_EMAIL,
    email: CONTACT_EMAIL,
    cta: 'Send an email', sub: 'Opens your mail app',
    my: { label: 'ဆက်သွယ်ရန်', title: 'ဆက်သွယ်ရန်', desc: 'အတူတကွ လုပ်ဆောင်လိုပါသလား၊ စိတ်ကူးတစ်ခု ဆွေးနွေးလိုပါသလား။ ကျွန်ုပ်ထံ အီးမေးလ် ပို့ပါ။', cta: 'အီးမေးလ် ပို့ရန်', sub: 'သင့်မေးလ်အက်ပ်ကို ဖွင့်ပါမည်' },
  },
];
const FACING = { south: [0, 1], east: [1, 0], west: [-1, 0] };
// the point `dist` blocks out from the front of a stall
export const frontOf = (s, dist) => { const f = FACING[s.face || 'south']; return [s.pos[0] + f[0] * dist, s.pos[1] + f[1] * dist]; };

// The town hall and the agents who work in it. desk is which corner of the hall
// the agent's desk stands in: 'nw', 'ne', 'sw' or 'se'.
// The English / Burmese button. The Burmese text is all still here; set this to true to bring the button back.
export const LANGUAGE_TOGGLE = false;

// about / schedule / delivers are shown on the agent board inside the hall.
// haunt is the stall an agent walks over to on a break.
// runsAt ('HH:MM', Bangkok time) and result feed the board's "last run" line; agents without
// runsAt show their latest piece of work instead. How each agent looks is set in src/agents.js.
//
// The board's "last run" lines are sample data. To show real ones, put the address of a JSON
// endpoint here that returns { "bobby": { "when": "Today 10:30", "result": "12 stories" }, ... }.
export const LIVE_STATUS_URL = '';
export const HALL_LABEL = { en: 'AI Agents', my: 'AI အေးဂျင့်များ' };
export const AGENTS = [
  { id: 'bobby', name: 'Bobby', role: 'News scraper', desk: 'sw', color: '#2f7a3c', robe: '#3d8a4a', trim: '#e9d9a8',
    line: "I'm Bobby. I'm a news scraper: I search and filter news for Mingalar News every day at 10:30am Bangkok time.",
    about: 'Reads Thai and Myanmar news sources, removes duplicates, and ranks what matters to Myanmar migrants in Thailand.', schedule: 'Every day at 10:30am Bangkok time', delivers: 'A ranked shortlist on Telegram',
    haunt: 'mingalar', runsAt: '10:30', result: '12 stories shortlisted',
    my: { role: 'သတင်းရှာဖွေသူ', line: 'ကျွန်တော် Bobby ပါ။ Mingalar News အတွက် နေ့စဉ် ဘန်ကောက်စံတော်ချိန် နံနက် ၁၀:၃၀ တွင် သတင်းများကို ရှာဖွေစစ်ထုတ်ပေးသည့် သတင်းရှာဖွေသူ ဖြစ်ပါသည်။' } },
  { id: 'friday', name: 'Friday', role: 'Personal assistant', desk: 'nw', color: '#2f66c4', robe: '#3b6fd0', trim: '#cfe6ff',
    line: "I'm Friday. I'm the personal assistant for Alacrity Research: ask me about a project and I'll look it up for you.",
    about: 'Answers questions about plots, tasks and progress in the Alacrity Research map, by text or by voice.', schedule: 'Whenever she is asked', delivers: 'A short spoken or written answer',
    haunt: 'alacrity',
    my: { role: 'ကိုယ်ရေးလက်ထောက်', line: 'ကျွန်မ Friday ပါ။ Alacrity Research ၏ ကိုယ်ရေးလက်ထောက် ဖြစ်ပါသည်။ ပရောဂျက်တစ်ခုအကြောင်း မေးလိုက်ပါက ရှာဖွေပေးပါမည်။' } },
  { id: 'sally', name: 'Sally', role: 'Researcher', desk: 'ne', color: '#1f8a7a', robe: '#2b9a88', trim: '#f3ead2',
    line: "I'm Sally. I'm the researcher for Urban Expansion: I gather city data and check the growth model against it.",
    about: 'Gathers city growth data and tests the urban expansion model against it.', schedule: 'Whenever she is asked', delivers: 'Fitted numbers and a short note',
    haunt: 'urban',
    my: { role: 'သုတေသီ', line: 'ကျွန်မ Sally ပါ။ Urban Expansion အတွက် သုတေသီ ဖြစ်ပါသည်။ မြို့ပြဒေတာများ စုဆောင်းပြီး ကြီးထွားမှုပုံစံနှင့် တိုက်ဆိုင်စစ်ဆေးပါသည်။' } },
  { id: 'edwin', name: 'Edwin', role: 'Financial advisor', desk: 'se', color: '#7a4fc2', robe: '#6a3fb0', trim: '#e4b93a',
    line: "I'm Edwin. I'm a financial advisor and portfolio manager: I watch the portfolio and flag what needs attention.",
    about: 'Watches a portfolio against its targets and flags what needs attention.', schedule: 'Every weekday at 8:00am Bangkok time', delivers: 'A short morning brief',
    haunt: 'urbansim', runsAt: '08:00', weekdays: true, result: 'Brief sent, 2 items flagged',
    my: { role: 'ဘဏ္ဍာရေးအကြံပေး', line: 'ကျွန်တော် Edwin ပါ။ ဘဏ္ဍာရေးအကြံပေးနှင့် ရင်းနှီးမြှုပ်နှံမှု စီမံခန့်ခွဲသူ ဖြစ်ပါသည်။ ရင်းနှီးမြှုပ်နှံမှုများကို စောင့်ကြည့်ပြီး အာရုံစိုက်ရန်လိုသည်များကို အသိပေးပါသည်။' } },
];

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
  runSpeed: 6.6,
  jumpSpeed: 7.6,
  rollSpeed: 11.5,    // the dash roll (Space twice quickly, or the Jump button twice on phones)
  rollTime: 0.46,     // seconds the roll lasts
  gravity: 22,
  playerScale: 1.15,  // 1 is two blocks tall
  interactRange: 2.6, // how close to a stall (from any side) before E works
  talkRange: 2.4,     // how close to an agent before E works
  cameraYaw: 0.16,    // radians; 0 looks straight up the map
  cameraBack: 29,     // further back and lower gives a flatter, more tilted-up view
  cameraUp: 30.5,
  cameraFov: 30,
  zoomStart: 0.72,    // 1 is fully zoomed out; the page opens zoomed in
  zoomMin: 0.62,      // closest
  zoomMax: 1.0,       // furthest
  nightStartsAt: 18.5, // local hour (24h) when a fresh visit opens in night mode
  nightEndsAt: 6,
};

// The walkable village square, and the town hall attached to its top-right corner.
export const BOUNDS = { x0: -21, x1: 25, z0: -14, z1: 16 };
export const HALL = { x0: 6, x1: 25, z0: -30, z1: -10, doorX: 15.5, doorW: 4, floor: 0.4, wallH: 6 };
export const FLOOR = 0.08; // the height the player walks at everywhere on the square
// The cave at the bottom of the square: stairs down from z0 to z1, w wide. Walking down them
// (or pressing E at the top) travels to the Hideout, an underground room built far to the south.
export const CAVE = { x: 0, z0: 16, z1: 21, w: 4 };
// The fishing pond to the right of the cave: an oval of water (rx by rz) with a bridge across
// its east end (bridgeX) and a dock from the west shore (dock: x0 to x1 along z).
export const POND = { x: 10.6, z: 11.6, rx: 3.6, rz: 2.5, bridgeX: 12.8, bridgeW: 1.4, dock: { x0: 6.0, x1: 9.4, z: 11.5, w: 1.0 } };
export const HIDEOUT = { cx: 0, cz: 170, x0: -12, x1: 12, z0: -7.5, z1: 7.5, doorX: -9.4 };

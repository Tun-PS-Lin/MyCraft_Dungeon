import { LANGUAGE_TOGGLE } from './config.js';

// Interface text in English and Burmese, and the current-language switch.
// Stall and agent text is translated in config.js (each entry's `my` block).
const UI = {
  en: {
    introSub: 'Portfolio village', settings: 'Settings',
    break: 'On a break', coming: 'On the way', here: 'At the table', lastRun: 'Last run', activity: 'Activity', sampleLog: 'Sample activity, generated in your browser.', today: 'Today', yesterday: 'Yesterday', notYet: 'Nothing yet this visit', minsAgo: '{n} min ago', justNow: 'Just now', openBoard: 'Open the agent board', boardTitle: 'Agent board', boardHint: 'Pick an agent to see what they do and what they last did.',
    schedule: 'Runs', delivers: 'Delivers', where: 'Right now', whereDesk: 'At the desk', whereHall: 'In the town hall', whereOut: 'Out in the village', whereWay: 'Walking over', whereHere: 'Waiting at the meeting table', whereStall: 'Over at {name}',
    call: 'Call to the meeting table', called: 'On the way', isHere: 'At the table', boardTalk: 'Walk up to an agent and press E to try their demo.', boardTalkTouch: 'Walk up to an agent and tap Talk to try their demo.',
    demoNote: 'Demo with sample data. Nothing real is triggered.',
    mapTitle: 'Village map', projects: 'Projects', village: 'Village', hello: 'Say hello', townHall: '{name} (town hall)',
    progress: '{n} of {t} stalls explored', progHint: 'Open every stall to earn a companion', progWon: 'Wolf companion unlocked',
    menuHint: 'Pick a place and the character walks there. Tap or click the ground to walk too.',
    kMove: 'move', kRun: 'run', kJump: 'jump', kRoll: 'twice to roll',
    hideoutNav: 'The Hideout (down the cave)', enterCave: 'Go down into the cave', goUp: 'Climb back to the village', useMusic: 'Open the CD player', useJournal: 'Read the journal', useGallery: 'Look at the gallery', useLibrary: 'Browse the bookshelves', petCat: 'Pet the cat', kOpen: 'open or talk', kClose: 'close', kZoom: 'Scroll or pinch to zoom',
    open: 'Open {name}', changeOutfit: 'Change outfit', talkTo: 'Talk to {name}', use: 'Open', talk: 'Talk', jump: 'Jump',
    soon: 'Link coming soon', soonSub: 'Project link not added yet', copy: 'Copy', copied: 'Copied',
    working: 'Working', chatHint: 'Press E or Esc to close', chatHintTouch: 'Tap × to close',
    outfits: 'Outfits', selected: 'Selected', done: 'Done',
    achievement: 'Achievement unlocked', achTitle: 'Best Friend', achText: 'You explored every stall. A wolf now follows you.',
    slabTitle: 'MOVEMENT GUIDE', slabOr: 'OR', slabMove: 'WASD OR ARROWS TO MOVE', slabKeys: 'SPACE JUMP   SPACE TWICE ROLL', slabKeys2: 'SHIFT RUN   E OPEN',
    'o.adventurer': 'Adventurer', 'o.explorer': 'Explorer', 'o.ranger': 'Ranger', 'o.scholar': 'Scholar', 'o.performer': 'Performer', 'o.smith': 'Blacksmith',
    'o.mage': 'Mage', 'o.merchant': 'Merchant', 'o.farmer': 'Farmer', 'o.knight': 'Knight', 'o.sailor': 'Sailor', 'o.watch': 'Night watch',
  },
  my: {
    introSub: 'ပို့ဖိုလီယို ရွာလေး', settings: 'ဆက်တင်များ',
    mapTitle: 'ရွာမြေပုံ', projects: 'ပရောဂျက်များ', village: 'ရွာ', hello: 'နှုတ်ဆက်ရန်', townHall: '{name} (မြို့တော်ခန်းမ)',
    progress: 'ဆိုင် {t} ခုအနက် {n} ခု လည်ပတ်ပြီး', progHint: 'အဖော်တစ်ကောင် ရရန် ဆိုင်အားလုံးကို ဖွင့်ကြည့်ပါ', progWon: 'ဝံပုလွေအဖော် ရရှိပြီ',
    menuHint: 'နေရာတစ်ခု ရွေးလိုက်ပါက ဇာတ်ကောင်က ထိုနေရာသို့ လမ်းလျှောက်သွားပါမည်။ မြေပြင်ကို နှိပ်၍လည်း သွားနိုင်သည်။',
    kMove: 'ရွှေ့', kRun: 'ပြေး', kJump: 'ခုန်', kRoll: 'နှစ်ချက် လှိမ့်', kOpen: 'ဖွင့် / စကားပြော', kClose: 'ပိတ်', kZoom: 'ချဲ့ရန် / ချုံ့ရန် scroll သို့မဟုတ် လက်နှစ်ချောင်းသုံးပါ',
    open: '{name} ဖွင့်ရန်', changeOutfit: 'အဝတ်လဲရန်', talkTo: '{name} နှင့် စကားပြောရန်', use: 'ဖွင့်', talk: 'ပြော', jump: 'ခုန်',
    soon: 'လင့်ခ် မကြာမီ လာမည်', soonSub: 'ပရောဂျက်လင့်ခ် မထည့်ရသေးပါ', copy: 'ကူးယူ', copied: 'ကူးပြီး',
    working: 'အလုပ်လုပ်နေသည်', chatHint: 'ပိတ်ရန် E သို့မဟုတ် Esc နှိပ်ပါ', chatHintTouch: 'ပိတ်ရန် × ကို နှိပ်ပါ',
    outfits: 'အဝတ်အစားများ', selected: 'ရွေးထားသည်', done: 'ပြီးပြီ',
    achievement: 'အောင်မြင်မှု ရရှိပြီ', achTitle: 'အချစ်ဆုံးသူငယ်ချင်း', achText: 'ဆိုင်အားလုံးကို လည်ပတ်ပြီးပါပြီ။ ဝံပုလွေတစ်ကောင် သင့်နောက် လိုက်ပါလာပါမည်။',
    slabTitle: 'လှုပ်ရှားမှု လမ်းညွှန်', slabOr: 'သို့', slabMove: 'WASD သို့မဟုတ် မြှားခလုတ်များဖြင့် ရွှေ့ပါ', slabKeys: 'SPACE ခုန်   SPACE နှစ်ချက် လှိမ့်', slabKeys2: 'SHIFT ပြေး   E ဖွင့်',
    'o.adventurer': 'စွန့်စားသူ', 'o.explorer': 'စူးစမ်းသူ', 'o.ranger': 'တောစောင့်', 'o.scholar': 'ပညာရှင်', 'o.performer': 'ဖျော်ဖြေသူ', 'o.smith': 'ပန်းပဲဆရာ',
    'o.mage': 'မှော်ဆရာ', 'o.merchant': 'ကုန်သည်', 'o.farmer': 'လယ်သမား', 'o.knight': 'သူရဲကောင်း', 'o.sailor': 'သင်္ဘောသား', 'o.watch': 'ညစောင့်',
  },
};

let lang = 'en';
if (LANGUAGE_TOGGLE) { try { if (localStorage.getItem('pv-lang') === 'my') lang = 'my'; } catch (e) { /* storage unavailable */ } }
document.documentElement.lang = lang;
const listeners = [];

export const getLang = () => lang;
export function setLang(l) { lang = l === 'my' ? 'my' : 'en'; try { localStorage.setItem('pv-lang', lang); } catch (e) { /* ignore */ } document.documentElement.lang = lang; listeners.forEach((f) => f(lang)); }
export const onLang = (f) => listeners.push(f);
// interface text, with {placeholders}
export const t = (key, vars) => { const s = UI[lang][key] !== undefined ? UI[lang][key] : UI.en[key] !== undefined ? UI.en[key] : key; return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s; };
// a field of a stall or agent in the current language, falling back to English
export const tr = (obj, field) => (lang === 'my' && obj.my && obj.my[field]) || obj[field];

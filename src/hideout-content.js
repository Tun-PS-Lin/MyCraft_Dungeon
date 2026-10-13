// What lives in the Hideout, the underground room reached through the cave at the bottom
// of the village: the CDs in the music player, the journal entries, and the paintings.
// The 3D room and the menus read from these lists, and so does the simple version of the
// site (plain.html).

/* ── the CD player ──
   file:  an .mp3 in public/assets/sounds/
   cover: the disc art, an image in public/assets/images/cds/ (square, transparent outside the disc)
   color: the colour the player's lights and the 3D disc glow take while this CD plays */
export const RECORDS = [
  { id: 'default', title: 'Village Theme', album: 'MyCraft Dungeon', by: 'Background music', file: 'background_music.mp3', cover: 'default.webp', color: '#e4b93a' },
  { id: 'igor', title: 'EARFQUAKE', album: 'IGOR', by: 'Tyler, The Creator', file: 'earfquake.mp3', cover: 'igor.webp', color: '#ff6fb5' },
  { id: 'afterhours', title: 'After Hours', album: 'After Hours', by: 'The Weeknd', file: 'after-hours.mp3', cover: 'after-hours.webp', color: '#d8403a' },
  { id: 'mbdtf', title: 'Runaway', album: 'My Beautiful Dark Twisted Fantasy', by: 'Kanye West', file: 'runaway.mp3', cover: 'mbdtf.webp', color: '#e4b93a' },
  { id: 'spiderverse', title: 'Am I Dreaming', album: 'Across the Spider-Verse', by: 'Metro Boomin', file: 'am-i-dreaming.mp3', cover: 'spiderverse.webp', color: '#62e4ff' },
];

/* ── the journal: mental models ──
   Each entry: a title, a quote and who said it, the key points, and a small icon
   ('lattice', 'eye', 'dice', 'fork', 'circle', 'ball', 'pig', 'flame', 'seed', 'wave'). */
export const JOURNAL = [
  { id: 'models', n: 1, title: 'Mental Models', icon: 'lattice', quote: 'Take a simple idea and take it seriously.', by: 'Charlie Munger',
    points: ['A latticework of mental models compounds.'] },
  { id: 'second', n: 2, title: 'Second-Level Thinking', icon: 'eye', quote: 'Outsized returns often come from betting against conventional wisdom, and conventional wisdom is usually right.', by: 'Jeff Bezos',
    points: ['You must be different and right, though the consensus is usually correct.', 'Visualize the future; connect the dots looking backwards.'] },
  { id: 'ergodicity', n: 3, title: 'Ergodicity & Skewness', icon: 'dice', quote: 'Never risk ruin.',
    points: ['Capital preservation and hitting home runs (the Loser’s Game).', 'Mean > Median (positive skewness).'] },
  { id: 'path', n: 4, title: 'Path Dependency', icon: 'fork', quote: 'Consequences.',
    points: ['One-way and two-way doors: a decision model.', 'Early choices narrow the future; early events compound.'] },
  { id: 'circle', n: 5, title: 'Circle of Competence', icon: 'circle', quote: 'Knowing what you don’t know is more useful than being brilliant.', by: 'Charlie Munger',
    points: ['Invert, always invert: what NOT to do?', 'High-bar conviction inside the circle.'] },
  { id: 'fat', n: 6, title: 'Fat Pitches', icon: 'ball', quote: 'The stock market is a no-called-strike game.', by: 'Warren Buffett',
    points: ['The 20-slot punch card: fewer decisions, fewer errors.', 'But remember: vaguely right beats precisely wrong.'] },
  { id: 'concentrated', n: 7, title: 'Concentrated Bets', icon: 'pig', quote: 'It takes courage to be a pig.', by: 'Stanley Druckenmiller',
    points: ['Go for the jugular when the fat pitch finally arrives: size to edge and conviction.', 'Concentrate the bets, never the ruin risk (circle of competence).'] },
  { id: 'hotcold', n: 8, title: 'Hot or Cold', icon: 'flame', quote: 'Press when hot, cut when cold.',
    points: ['A streak reveals market momentum and your psychology, not decision quality.', 'Know when to take a loss.'] },
  { id: 'growth', n: 9, title: 'Growth vs Value', icon: 'seed', quote: 'It’s far better to buy a wonderful company at a fair price than a fair company at a wonderful price.', by: 'Warren Buffett',
    points: ['Time is the friend of the wonderful business, the enemy of the mediocre.', 'Quality is a margin of safety that compounds; a discount is one you pay.'] },
  { id: 'cycles', n: 10, title: 'Market Cycles', icon: 'wave', quote: 'Being too far ahead of your time is indistinguishable from being wrong.', by: 'Howard Marks',
    points: ['Don’t forecast: take the market’s temperature. Where do we stand?', 'Three stages: the Innovator → the Imitator → the Idiot.'] },
];

/* ── the gallery ──
   Side projects shown as paintings. art picks the painting: 'world', 'voice', 'stars'.
   url '' shows "Link coming soon". */
export const GALLERY = [
  { id: 'world', title: 'Virtual World', art: 'world', desc: 'Mingalar World: a 3D town in the browser with a virtual mall, a garage, an office and a target range.', url: 'https://mingalar-world.vercel.app/' },
  { id: 'voice', title: 'Burmese Text-to-Speech', art: 'voice', desc: 'A Burmese text-to-speech project with several voice options.', url: '' },
  { id: 'mahabote', title: 'Mahabhote Burmese Astrology', art: 'stars', desc: 'A Burmese Mahabhote astrology bot on Telegram that remembers the conversation and asks follow-up questions.', url: '' },
];

/* ── the library ──
   The books on the shelves round the enchanting table. cover: an image in public/assets/images/books/.
   spine: the colours of the book's spine in the shelf menu; spineTitle: a shorter title for the spine. takeaway: one line on why it matters.
   The takeaways here are drafts: rewrite them in your own words. */
export const BOOKS = [
  { id: 'poor-charlie', spineTitle: 'Poor Charlie\u2019s Almanack', title: 'Poor Charlie’s Almanack', author: 'Charles T. Munger', note: 'Edited by Peter D. Kaufman', cover: 'poor-charlie.webp',
    spine: { bg: '#d9cf8a', fg: '#2a2f86', band: '#2a2f86' }, page: '#b9b06f',
    takeaway: 'Build a latticework of models from many disciplines, and invert: avoid stupidity before reaching for brilliance.' },
  { id: 'most-important', spineTitle: 'The Most Important Thing', title: 'The Most Important Thing', author: 'Howard Marks', note: 'Illuminated edition', cover: 'most-important-thing.webp',
    spine: { bg: '#f3ead2', fg: '#1d6b3a', band: '#1d6b3a' }, page: '#e8dcb6',
    takeaway: 'Risk is more things happening than will happen: know where we stand in the cycle, and let second-level thinking set the price.' },
  { id: 'four-pillars', spineTitle: 'Four Pillars of Investing', title: 'The Four Pillars of Investing', author: 'William J. Bernstein', cover: 'four-pillars.webp',
    spine: { bg: '#f1efe6', fg: '#b52a26', band: '#2b2f9a' }, page: '#d9d4c6',
    takeaway: 'Theory, history, psychology and the business itself: own the market cheaply, and stay the course when it hurts.' },
  { id: 'invent-wander', spineTitle: 'Invent & Wander', title: 'Invent & Wander', author: 'Jeff Bezos', note: 'Introduction by Walter Isaacson', cover: 'invent-wander.webp',
    spine: { bg: '#f6f3ea', fg: '#22a8e0', band: '#c8955a' }, page: '#e6dccb',
    takeaway: 'Focus on what won’t change, treat most decisions as two-way doors, and be willing to be misunderstood for a long time.' },
  { id: 'zero-to-one', spineTitle: 'Zero to One', title: 'Zero to One', author: 'Peter Thiel', note: 'With Blake Masters', cover: 'zero-to-one.webp',
    spine: { bg: '#7fb0dc', fg: '#141a24', band: '#f1efe6' }, page: '#a9c8e6',
    takeaway: 'Competition is for losers: build something new for a small market that badly wants it, then expand from a monopoly.' },
  { id: 'elon-musk', spineTitle: 'Elon Musk', title: 'Elon Musk', author: 'Ashlee Vance', cover: 'elon-musk.webp',
    spine: { bg: '#141418', fg: '#d9b25a', band: '#d9b25a' }, page: '#3a3a40',
    takeaway: 'Reason from first principles and pick goals big enough to bend the cost curve, then outwork everyone getting there.' },
  { id: 'aiming-high', spineTitle: 'Aiming High', title: 'Aiming High', author: 'Atsuo Inoue', note: 'Masayoshi Son, SoftBank, and Disrupting Silicon Valley', cover: 'aiming-high.webp',
    spine: { bg: '#0d0d10', fg: '#f1efe6', band: '#e0303a' }, page: '#2a2a30',
    takeaway: 'Bet early and big on the next technology wave, think in decades, and survive the drawdowns that come with it.' },
  { id: 'hitchhikers', spineTitle: 'Hitchhiker\u2019s Guide', title: 'The Hitchhiker\u2019s Guide to the Galaxy', author: 'Douglas Adams', note: 'Five novels in one volume', cover: 'hitchhikers.webp',
    spine: { bg: '#1b2140', fg: '#7ccf4a', band: '#f6f1e3' }, page: '#232a4a',
    takeaway: 'Don\u2019t panic: the universe is absurd, so ask better questions, keep your sense of humour, and always know where your towel is.' },
  { id: 'ready-player-one', spineTitle: 'Ready Player One', title: 'Ready Player One', author: 'Ernest Cline', cover: 'ready-player-one.webp',
    spine: { bg: '#e8194a', fg: '#ffd27a', band: '#ffd27a' }, page: '#f2c46e',
    takeaway: 'Obsessive curiosity is an edge: know the history of the game better than anyone and the hidden keys start to show.' },
  { id: 'the-martian', spineTitle: 'The Martian', title: 'The Martian', author: 'Andy Weir', cover: 'the-martian.webp',
    spine: { bg: '#d8501f', fg: '#fbf1e6', band: '#3a1a10' }, page: '#e8783a',
    takeaway: 'Work the problem: solve one thing, then the next, and enough of them in a row is how you get home.' },
];

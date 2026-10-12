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

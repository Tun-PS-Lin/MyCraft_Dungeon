// What lives in the Hideout, the underground room reached through the cave at the bottom
// of the village: the records in the music box, the journal entries, and the paintings.
// Everything here is a placeholder for now. Edit it freely; the 3D room and the menus
// read from these lists, and so does the simple version of the site (plain.html).

/* ── the music box ──
   file:  an .mp3 in public/assets/sounds/ (the village track is the first record)
   synth: one of the small built-in demo tunes ('cave', 'rain', 'market'), used until you add your own files
   disc:  the colour of the record's label */
export const RECORDS = [
  { id: 'village', title: 'Village Theme', by: 'Background music', file: 'background_music.mp3', disc: '#e4b93a' },
  { id: 'cave', title: 'Cave Lights', by: 'Demo track', synth: 'cave', disc: '#62c8ff' },
  { id: 'rain', title: 'Rain on the Window', by: 'Demo track', synth: 'rain', disc: '#b68cff' },
  { id: 'market', title: 'Market Day', by: 'Demo track', synth: 'market', disc: '#57d47c' },
];

/* ── the journal ──
   Each entry: a title, a date, a small icon ('quill', 'map', 'note', 'lamp', 'house', 'disc') and paragraphs of text. */
export const JOURNAL = [
  {
    id: 'village', title: 'Why I built a village', date: 'Demo entry', icon: 'house', tag: 'Notes',
    body: [
      'This is a demo journal entry. The real post will go here: a short story about why this portfolio is a place you walk around instead of a page you scroll.',
      'Placeholder text continues. It might cover the first sketch of the square, choosing the stalls, and what changed after friends tried it on their phones.',
      'A second paragraph of demo text, so you can see how longer entries scroll inside the book. Use the scroll wheel, drag, or the arrow keys.',
      'And a closing paragraph. Replace all of this in src/hideout-content.js.',
    ],
  },
  {
    id: 'cities', title: 'Notes on how cities grow', date: 'Demo entry', icon: 'map', tag: 'Research',
    body: [
      'Demo entry. This page will hold notes from the urban expansion research: what a growth ring is, why the edge of a city moves the way it does, and what surprised me in the data.',
      'More placeholder text sits here to show a second paragraph.',
    ],
  },
  {
    id: 'field', title: 'Field notes from Bangkok', date: 'Demo entry', icon: 'quill', tag: 'Notes',
    body: [
      'Demo entry. A place for short observations from the street: markets, new bus routes, how neighbourhoods change from one visit to the next.',
      'Placeholder paragraph two.',
      'Placeholder paragraph three.',
    ],
  },
  {
    id: 'listening', title: 'What I am listening to', date: 'Demo entry', icon: 'disc', tag: 'Music',
    body: [
      'Demo entry. A list of songs and albums on repeat, with a line about each. It pairs with the music box in the corner.',
    ],
  },
];

/* ── the gallery ──
   Side projects shown as paintings. art picks the painting: 'voice', 'stars', 'town', 'bot', 'chart'.
   url '' shows "Link coming soon". These are drafts: check the wording and add the links. */
export const GALLERY = [
  { id: 'voice', title: 'Burmese Voice', art: 'voice', desc: 'A Burmese text-to-speech project with several voice options, built on an open-source speech model.', url: '' },
  { id: 'mahabote', title: 'Mahabote Bot', art: 'stars', desc: 'A Burmese Mahabote astrology bot on Telegram that remembers the conversation and asks follow-up questions.', url: '' },
  { id: 'luxury', title: 'Virtual Luxury Home', art: 'town', desc: 'A small 3D town to explore in the browser, with a garage, mini golf and a luxury home gallery.', url: '' },
];

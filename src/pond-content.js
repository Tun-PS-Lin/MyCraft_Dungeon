// The facts you can catch at the fishing pond. Edit them freely.
//   photos:  pictures in public/assets/images/photos/ (each has a full-size file and a -thumb.jpg)
//   article: the writing shown with the research fact
export const FACTS = [
  {
    id: 'photography', kind: 'photos', title: 'I love photography and traveling',
    note: 'A few frames from the road. Tap a photo to see it full size.',
    photos: [
      { file: 'lake-boat', caption: 'Morning on the lake' },
      { file: 'dune', caption: 'Desert dune at dusk' },
      { file: 'blue-door', caption: 'The blue door' },
      { file: 'brooklyn-bridge', caption: 'Brooklyn Bridge, New York' },
      { file: 'neon-beer', caption: 'Neon after dark' },
      { file: 'cable-car', caption: 'Cable car, San Francisco' },
      { file: 'train-market', caption: 'The railway market, Thailand' },
      { file: 'whirling-dancer', caption: 'The whirling dancer' },
    ],
  },
  {
    id: 'coffee', kind: 'coffee', title: 'I can’t live without coffee',
    note: 'First thing in the morning, and usually a second one after lunch.',
  },
  {
    id: 'writing', kind: 'writing', title: 'I have a big interest in research papers and whitepapers, and I write sometimes',
    note: 'Most recently on how Curve’s StableSwap invariant works.',
    article: { title: 'Curve v1: The StableSwap Invariant', where: 'On Medium', cover: 'curve.webp', url: 'https://medium.com/@0xmirai77/curve-v1-the-stableswap-invariant-f87ad7641aa0' },
  },
];

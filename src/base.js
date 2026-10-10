// Where static files (sounds, images) are served from. './' unless Vite sets a base path.
export const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';

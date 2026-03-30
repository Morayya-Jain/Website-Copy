/** Runtime base path — matches Vite's `base` config. Empty string in dev, '/Website-Copy' in prod. */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '')

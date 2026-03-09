# BrainDock Website - Agent Guidelines

## Project Overview

BrainDock is an AI-powered focus assistant. This repo is the **landing page website + authenticated dashboard**, built with Vite and deployed on Netlify. The desktop app lives in a separate repo.

- **Stack:** Vanilla JS (ES modules via Vite), HTML, CSS. No framework.
- **Backend:** Supabase (auth, database, edge functions) + Stripe (payments).
- **Deployment:** Netlify (static build from `dist/`). Edge functions deploy to Supabase.
- **Dev server:** `npx vite --port 5173`

## Project Structure

- `public/` - Landing page (index.html, css/, js/, translations/, assets/)
- `src/` - Dashboard pages and shared modules (bundled by Vite)
- `src/pages/` - One JS file per dashboard page
- `auth/` - Auth page HTML shells (login, signup, callback, reset-password)
- `supabase/functions/` - Supabase Edge Functions (Deno/TypeScript)
- `public/js/translations/` - 6 language JSON files (en, ja, de, fr, zh, hi)

## Coding Conventions

- Prioritise simplicity and functionality over fancy code.
- Use descriptive variable/function names with simple docstrings.
- Use `escapeHtml()` from `src/utils.js` for ALL dynamic content in innerHTML.
- Use `logError()` from `src/logger.js` instead of raw `console.error` in src/ files.
- Never use em-dash or en-dash in copy. Use " - " (hyphen with spaces) instead.
- Never expose raw error messages (err.message) to users. Show generic messages.
- Guard against null/undefined before DOM operations.

## i18n System (CRITICAL)

There are TWO i18n systems. Both read from the same JSON files in `public/js/translations/`.

### Landing page (public/)
- Uses `data-i18n="key"` attributes on HTML elements.
- `public/js/i18n.js` replaces textContent on page load.
- For JS-generated text, use `I18n.getTranslation('key') || fallback`.

### Dashboard pages (src/)
- Uses `t('dotted.key', 'fallback')` from `src/dashboard-i18n.js`.
- Import: `import { t } from '../dashboard-i18n.js'`

### RULES - Every new text MUST be translated
1. **Any new user-visible text** must use `t()` or `data-i18n`.
2. **Add the key to ALL 6 language files** (en, ja, de, fr, zh, hi).
3. **Brand names** (Instagram, YouTube, Netflix, etc.) stay in English.
4. **Item/device names** (Phone, Tablet, Game Controller) ARE translated.
5. **Placeholders** in inputs must use `t()` or `data-i18n-placeholder`.
6. **Error messages** shown to users must go through `t()`.
7. **Never hardcode English strings** in template literals without a `t()` wrapper.
8. After adding keys, validate JSON: `node -e "JSON.parse(require('fs').readFileSync('file','utf8'))"`

## Auth & Security

- Auth pages do NOT use the dashboard i18n system (separate architecture).
- Supabase anon key is public by design; security comes from RLS.
- Use `friendlyError()` for auth error messages (maps to generic strings).
- CSP is configured in `netlify.toml` - update it if adding new external resources.
- Edge functions use `DENO_ENV` to conditionally include localhost CORS origins.
- Never send raw Stripe/Supabase error details to the client.

## Supabase Integration

- Client: `src/supabase.js` (shared singleton).
- Always add `.eq('user_id', userId)` as defense-in-depth on sensitive queries.
- Use specific column names in `.select()`, never `select('*')` on public pages.
- Edge functions are in `supabase/functions/` (Deno TypeScript).

## CSS

- Landing page: `public/css/style.css`
- Dashboard: `src/dashboard.css`
- Auth pages: `src/auth.css`
- Always include `-webkit-backdrop-filter` before `backdrop-filter` for Safari.
- Use `100dvh` alongside `100vh` for iOS Safari compatibility.
- Target Safari 15+ (macOS Monterey). Add `@supports` fallbacks for newer features.

## Testing

- `npm run build` must pass before any changes are considered complete.
- Validate JSON files after editing translations.
- Check `localhost:5173` with language switching to verify translations.

## Files to Know

| File | Purpose |
|------|---------|
| `src/dashboard-layout.js` | Auth guard, sidebar, shared layout for all dashboard pages |
| `src/dashboard-i18n.js` | Dashboard translation system (`t()` function) |
| `src/auth-helpers.js` | Shared auth utilities (redirects, errors, desktop linking) |
| `src/utils.js` | `escapeHtml`, `formatDuration`, `formatPrice`, `showInlineError` |
| `src/validators.js` | Input validation (email, password, URL, app name) |
| `src/credits.js` | Credit balance fetching |
| `netlify.toml` | Security headers, CSP, caching, redirects |
| `vite.config.js` | Multi-page build config (15 HTML entry points) |

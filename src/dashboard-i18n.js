/**
 * Dashboard internationalisation (i18n) module.
 * Shares the same localStorage key and translation JSON files as the
 * main website's public/js/i18n.js, but packaged as an ES module for
 * use inside Vite-bundled dashboard pages.
 */

import { logError } from './logger.js'
import { track, EVENTS } from './analytics.js'

const STORAGE_KEY = 'braindock-language'
const DEFAULT_LANG = 'en'
export const SUPPORTED_LANGUAGES = ['en', 'ja', 'de', 'fr', 'zh', 'hi']

/** Language display names (same order as SUPPORTED_LANGUAGES) */
export const LANGUAGE_LABELS = {
  en: 'English',
  ja: '日本語',
  de: 'Deutsch',
  fr: 'Français',
  zh: '中文',
  hi: 'हिन्दी',
}

// Cached translations object loaded from JSON
let translations = null
let currentLang = DEFAULT_LANG

/**
 * Read saved language from localStorage (falls back to 'en').
 */
export function getCurrentLang() {
  return currentLang
}

/** Map app language codes to BCP 47 locale strings for date/time formatting. */
const LOCALE_MAP = { en: 'en-AU', ja: 'ja-JP', de: 'de-DE', fr: 'fr-FR', zh: 'zh-CN', hi: 'hi-IN' }

/**
 * Get the BCP 47 locale string for the current language.
 * Used by toLocaleDateString / toLocaleTimeString.
 */
export function getLocale() {
  return LOCALE_MAP[currentLang] || 'en-AU'
}

/**
 * Initialise the dashboard i18n system.
 * Reads the saved language preference and fetches the translation JSON.
 * Call once before using t().
 */
export async function initDashboardI18n() {
  const saved = localStorage.getItem(STORAGE_KEY)
  currentLang = saved && SUPPORTED_LANGUAGES.includes(saved) ? saved : DEFAULT_LANG

  try {
    const res = await fetch(`/js/translations/${currentLang}.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    translations = await res.json()
  } catch (err) {
    logError('Dashboard i18n: failed to load translations, falling back to English', err)
    // If we weren't already trying English, attempt that as fallback
    if (currentLang !== DEFAULT_LANG) {
      try {
        const fallback = await fetch(`/js/translations/${DEFAULT_LANG}.json`)
        if (fallback.ok) translations = await fallback.json()
      } catch (_) { /* silent */ }
      currentLang = DEFAULT_LANG
    }
  }
}

/**
 * Retrieve a translated string using dot-notation key.
 * Always returns a string - the translation, the fallback, or the key itself.
 *
 * @param {string} key - Dot-notation key, e.g. "dashboard.nav.sessions"
 * @param {string} [fallback] - Fallback text if the key is missing
 * @returns {string}
 */
export function t(key, fallback) {
  if (!translations) return fallback ?? key

  const parts = key.split('.')
  let value = translations
  for (const k of parts) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return fallback ?? key
    }
  }
  return typeof value === 'string' ? value : (fallback ?? key)
}

/**
 * Change the active language. Saves to localStorage and reloads the page
 * so the dashboard re-renders with the new language (same approach as
 * the main website).
 *
 * @param {string} lang - Language code, e.g. "ja"
 */
export function changeLang(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return
  track(EVENTS.LANGUAGE_CHANGED, { language: lang })
  localStorage.setItem(STORAGE_KEY, lang)
  window.location.reload()
}

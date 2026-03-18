/**
 * Configuration page: combines blocklist (quick toggles, custom URLs/apps)
 * and detection (item type toggles) into a single settings view.
 * Both sections auto-save with debounce. Toggles render as clickable pills.
 */

import { supabase } from '../supabase.js'
import { initDashboardLayout } from '../dashboard-layout.js'
import { validateUrlPattern, validateAppPattern } from '../validators.js'
import { escapeHtml, showInlineError } from '../utils.js'
import { logError } from '../logger.js'
import { t } from '../dashboard-i18n.js'
import { track, EVENTS } from '../analytics.js'
import {
  createIcons,
  Smartphone,
  Gamepad2,
  Gamepad,
  Watch,
  Laptop,
  UtensilsCrossed,
  Camera,
  Headphones,
  Instagram,
  Youtube,
  Twitch,
  Facebook,
  Linkedin,
  Newspaper,
  PlayCircle,
} from 'lucide/dist/cjs/lucide.js'

// Small inline SVG for remove (X) buttons on chips
const CROSS_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

// Brand SVGs for platforms without Lucide icons (paths from Simple Icons, 24x24 viewBox)
const BRAND_SVGS = {
  snapchat: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/></svg>`,
  spotify: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`,
  tiktok: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
  pinterest: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>`,
  reddit: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>`,
  discord: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1569 2.4189z"/></svg>`,
  threads: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/></svg>`,
  netflix: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.33V0h-4.715zM5.398 1.5V24c1.873-.225 2.81-.312 4.715-.398V14.83L5.398 1.5z"/></svg>`,
  twitter: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg>`,
}

// Custom SVGs for detection items (Lucide's tablet and smartphone look identical at 14px)
const ITEM_SVGS = {
  tablet: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="3"/><line x1="12" y1="19" x2="12.01" y2="19"/></svg>`,
  tv: `<svg class="pill-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="14" rx="2"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg>`,
}

// -- Blocklist constants --
// Entries with an id matching a BRAND_SVGS key use custom brand icons;
// their `icon` field is only a Lucide fallback and not normally rendered.

const QUICK_SITES = [
  { id: 'instagram', name: 'Instagram', icon: 'instagram', desc: 'Photo and video sharing social network by Meta.' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube', desc: 'Video streaming and sharing platform by Google.' },
  { id: 'netflix', name: 'Netflix', desc: 'Subscription streaming service for movies and TV shows.' },
  { id: 'threads', name: 'Threads', desc: 'Text-based social app by Meta, linked to Instagram.' },
  { id: 'tiktok', name: 'TikTok', desc: 'Short-form video platform for entertainment and trends.' },
  { id: 'twitter', name: 'Twitter/X', desc: 'Microblogging platform for posts, news, and discussions.' },
  { id: 'facebook', name: 'Facebook', icon: 'facebook', desc: 'Social network for connecting with friends and groups.' },
  { id: 'snapchat', name: 'Snapchat', desc: 'Messaging app with disappearing photos and stories.' },
  { id: 'twitch', name: 'Twitch', icon: 'twitch', desc: 'Live streaming platform focused on gaming and entertainment.' },
  { id: 'reddit', name: 'Reddit', desc: 'Community-driven forum with thousands of topic boards.' },
  { id: 'pinterest', name: 'Pinterest', desc: 'Visual discovery platform for ideas and inspiration.' },
  { id: 'discord', name: 'Discord', desc: 'Voice, video, and text chat app for communities.' },
  { id: 'primevideo', name: 'Prime Video', icon: 'play-circle', desc: 'Amazon streaming service for movies and series.' },
  { id: 'spotify', name: 'Spotify', desc: 'Music and podcast streaming service.' },
]

const DEBOUNCE_MS = 800

// -- Detection constants --

const ITEM_PRESETS = [
  { id: 'phone', name: 'Phone', icon: 'smartphone', desc: 'Any smartphone - iPhone, Android, or similar 5-7 inch handheld device.' },
  { id: 'tablet', name: 'Tablet / iPad', icon: 'tablet', desc: 'Tablets and iPads - larger 8+ inch touchscreen devices.' },
  { id: 'laptop', name: 'Laptop', icon: 'laptop', desc: 'A secondary laptop or notebook visible alongside your main screen.' },
  { id: 'controller', name: 'Game Controller', icon: 'gamepad-2', desc: 'Gaming controllers like PS5, Xbox, or generic Bluetooth gamepads.' },
  { id: 'tv', name: 'TV / Remote', icon: 'tv', desc: 'Television screen or a TV remote control in view.' },
  { id: 'nintendo_switch', name: 'Nintendo Switch', icon: 'gamepad', desc: 'Nintendo Switch console in handheld or tabletop mode.' },
  { id: 'smartwatch', name: 'Smartwatch', icon: 'watch', desc: 'Wrist-worn smart devices like Apple Watch, Fitbit, or Galaxy Watch.' },
  { id: 'camera', name: 'Camera', icon: 'camera', desc: 'Standalone cameras - DSLR, mirrorless, or action cameras.' },
  { id: 'headphones', name: 'Headphones', icon: 'headphones', desc: 'Over-ear headphones or visible earbuds being worn.' },
  { id: 'food', name: 'Food / Snacks', icon: 'utensils-crossed', desc: 'Food, drinks, or snacks visible on your desk.' },
]

// Icons needed by createIcons after render
const PAGE_ICONS = {
  Smartphone, Gamepad2, Gamepad, Watch, Laptop, UtensilsCrossed, Camera, Headphones,
  Instagram, Youtube, Twitch, Facebook,
  Linkedin, Newspaper, PlayCircle,
}

// -- Data helpers --

async function loadBlocklist(userId) {
  /** Load blocklist config from Supabase. */
  const { data, error } = await supabase.from('blocklist_configs').select('quick_blocks, categories, custom_urls, custom_apps').eq('user_id', userId).single()
  if (error) throw error
  return data
}

async function saveBlocklist(userId, payload) {
  /** Persist blocklist changes. */
  const { error } = await supabase.from('blocklist_configs').update(payload).eq('user_id', userId)
  if (error) throw error
}

async function loadDetectionSettings(userId) {
  /** Load detection item settings (gadgets + distraction level) from Supabase. */
  const { data, error } = await supabase.from('user_settings').select('enabled_gadgets, distraction_level').eq('user_id', userId).single()
  if (error) throw error
  return data
}

async function saveDetectionSettings(userId, enabledItems) {
  /** Persist detection item changes. */
  const { error } = await supabase.from('user_settings').update({ enabled_gadgets: enabledItems }).eq('user_id', userId)
  if (error) throw error
}

async function saveDistractionLevel(userId, level) {
  /** Persist distraction level (1=track, 2=warn+delay). */
  const { error } = await supabase.from('user_settings').update({ distraction_level: level }).eq('user_id', userId)
  if (error) throw error
}

// -- Render --

function render(main, blocklistConfig, detectionSettings, userId) {
  // Blocklist state
  const state = {
    quick_blocks: { ...(blocklistConfig?.quick_blocks || {}) },
    categories: { ...(blocklistConfig?.categories || {}) },
    custom_urls: Array.isArray(blocklistConfig?.custom_urls) ? [...blocklistConfig.custom_urls] : [],
    custom_apps: Array.isArray(blocklistConfig?.custom_apps) ? [...blocklistConfig.custom_apps] : [],
  }

  // Detection state
  const enabledItems = Array.isArray(detectionSettings?.enabled_gadgets)
    ? detectionSettings.enabled_gadgets
    : ['phone']
  const itemSet = new Set(enabledItems)

  // Auto-save blocklist with debounce
  let blocklistSaveTimeout = null
  function scheduleBlocklistSave() {
    clearTimeout(blocklistSaveTimeout)
    blocklistSaveTimeout = setTimeout(async () => {
      try {
        await saveBlocklist(userId, {
          quick_blocks: state.quick_blocks,
          categories: state.categories,
          custom_urls: state.custom_urls,
          custom_apps: state.custom_apps,
        })
      } catch (err) {
        logError('Blocklist save failed:', err)
        showInlineError(main, t('dashboard.blocklist.saveError', 'Could not save blocklist. Please try again.'))
      }
    }, DEBOUNCE_MS)
  }

  // Auto-save detection with debounce
  let detectionSaveTimeout = null
  function scheduleDetectionSave() {
    clearTimeout(detectionSaveTimeout)
    detectionSaveTimeout = setTimeout(async () => {
      try {
        const enabled = getEnabledItems()
        await saveDetectionSettings(userId, enabled)
      } catch (err) {
        logError('Detection settings save failed:', err)
        showInlineError(main, t('dashboard.blocklist.saveError', 'Could not save settings. Please try again.'))
      }
    }, DEBOUNCE_MS)
  }

  /** Read currently-active item pills. */
  function getEnabledItems() {
    const arr = []
    main.querySelectorAll('.pill-toggle.active[data-item]').forEach((el) => {
      arr.push(el.dataset.item)
    })
    return arr
  }

  // Distraction level state (1=track, 2=warn+delay)
  let distractionLevel = detectionSettings?.distraction_level || 1

  main.innerHTML = `
    <h1 class="dashboard-page-title">${t('dashboard.config.title', 'Configuration')}</h1>
    <p class="dashboard-page-subtitle">
      ${t('dashboard.config.subtitle', 'Configure what counts as a distraction. These settings are loaded by the desktop app when you start a session.')}
    </p>

    <div class="dashboard-card-grid">

      <!-- Distraction response level -->
      <div class="dashboard-card">
        <h2 class="dashboard-section-title mb-xs">${t('dashboard.config.levelTitle', 'Distraction Mode')}</h2>
        <p class="dashboard-meta mb-l">${t('dashboard.config.levelDesc', 'Choose what happens when a distraction is detected during a session.')}</p>
        <div class="distraction-level-toggle" id="distraction-level-toggle">
          <button type="button" class="level-option ${distractionLevel === 1 ? 'active' : ''}" data-level="1" aria-pressed="${distractionLevel === 1}">
            <span class="level-option-title">${t('dashboard.config.trackOnlyTitle', 'Track Only')}</span>
            <span class="level-option-desc">${t('dashboard.config.trackOnlyDesc', 'Silent logging. You won\'t be interrupted.')}</span>
          </button>
          <button type="button" class="level-option ${distractionLevel === 2 ? 'active' : ''}" data-level="2" aria-pressed="${distractionLevel === 2}">
            <span class="level-option-title">${t('dashboard.config.warningTitle', 'Warning + Delay')}</span>
            <span class="level-option-desc">${t('dashboard.config.warningDesc', 'A 15-second pause screen appears. You choose whether to continue.')}</span>
          </button>
        </div>
      </div>

      <!-- Detection: item pills -->
      <div class="dashboard-card">
        <h2 class="dashboard-section-title mb-xs">${t('dashboard.config.itemsTitle', 'Items to Notify')}</h2>
        <p class="dashboard-meta mb-l">${t('dashboard.config.itemsDesc', 'Select items you want to add to your list.')}</p>
        <div class="pill-toggle-wrap">
          ${ITEM_PRESETS.map((g) => `
            <button type="button" class="pill-toggle ${itemSet.has(g.id) ? 'active' : ''}" data-item="${g.id}" data-desc="${escapeHtml(g.desc)}" data-name="${escapeHtml(g.name)}" aria-pressed="${itemSet.has(g.id)}">
              ${ITEM_SVGS[g.id] || `<i data-lucide="${g.icon}" class="pill-toggle-icon" aria-hidden="true"></i>`}
              <span>${escapeHtml(g.name)}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Blocklist: quick block pills -->
      <div class="dashboard-card">
        <h2 class="dashboard-section-title mb-xs">${t('dashboard.config.websitesTitle', 'Websites to Notify')}</h2>
        <p class="dashboard-meta mb-l">${t('dashboard.config.websitesDesc', 'Select websites you want to add to your list.')}</p>
        <div id="quick-blocks-container" class="pill-toggle-wrap"></div>
      </div>

      <!-- Custom URLs + Custom Apps side by side -->
      <div class="dashboard-card-row">
        <div class="dashboard-card">
          <h2 class="dashboard-section-title mb-xs">${t('dashboard.config.customUrls', 'Custom URLs')}</h2>
          <p class="dashboard-meta mb-m">${t('dashboard.config.customUrlsDesc', 'Add domains to your list.')}</p>
          <div class="dashboard-input-row">
            <input type="text" id="custom-url-input" class="dashboard-input dashboard-input--narrow" placeholder="example.com" maxlength="253">
            <button type="button" class="btn btn-secondary dashboard-btn-sm" id="custom-url-add">${t('dashboard.actions.add', 'Add')}</button>
          </div>
          <p id="custom-url-hint" class="dashboard-input-hint" role="status" aria-live="polite"></p>
          <div id="custom-urls-list"></div>
        </div>

        <div class="dashboard-card">
          <h2 class="dashboard-section-title mb-xs">${t('dashboard.config.customApps', 'Custom Apps')}</h2>
          <p class="dashboard-meta mb-m">${t('dashboard.config.customAppsDesc', 'Add app names to your list.')}</p>
          <div class="dashboard-input-row">
            <input type="text" id="custom-app-input" class="dashboard-input dashboard-input--narrow" placeholder="App name" maxlength="50">
            <button type="button" class="btn btn-secondary dashboard-btn-sm" id="custom-app-add">${t('dashboard.actions.add', 'Add')}</button>
          </div>
          <p id="custom-app-hint" class="dashboard-input-hint" role="status" aria-live="polite"></p>
          <div id="custom-apps-list"></div>
        </div>
      </div>
    </div>
  `

  // -- Distraction level toggle interactivity --

  main.querySelectorAll('.level-option[data-level]').forEach((el) => {
    el.addEventListener('click', async () => {
      const level = parseInt(el.dataset.level, 10)
      if (level === distractionLevel) return
      distractionLevel = level
      track(EVENTS.DISTRACTION_LEVEL_CHANGED, { level })
      // Update active state on all level buttons
      main.querySelectorAll('.level-option[data-level]').forEach((btn) => {
        const isActive = parseInt(btn.dataset.level, 10) === level
        btn.classList.toggle('active', isActive)
        btn.setAttribute('aria-pressed', isActive)
      })
      // Save immediately (no debounce needed for a single toggle)
      try {
        await saveDistractionLevel(userId, level)
      } catch (err) {
        logError('Distraction level save failed:', err)
        showInlineError(main, t('dashboard.blocklist.saveError', 'Could not save settings. Please try again.'))
      }
    })
  })

  // -- Detection interactivity (pill click toggles + auto-save) --

  main.querySelectorAll('.pill-toggle[data-item]').forEach((el) => {
    el.addEventListener('click', () => {
      el.classList.toggle('active')
      el.setAttribute('aria-pressed', el.classList.contains('active'))
      track(EVENTS.BLOCKLIST_ITEM_TOGGLED, { item_id: el.dataset.item, enabled: el.classList.contains('active') })
      scheduleDetectionSave()
    })
  })

  // -- Blocklist: quick block pills --

  const quickContainer = main.querySelector('#quick-blocks-container')
  quickContainer.innerHTML = QUICK_SITES.map((q) => `
    <button type="button" class="pill-toggle ${state.quick_blocks[q.id] ? 'active' : ''}" data-quick="${q.id}" data-desc="${escapeHtml(q.desc)}" data-name="${escapeHtml(q.name)}" aria-pressed="${!!state.quick_blocks[q.id]}">
      ${BRAND_SVGS[q.id] || `<i data-lucide="${q.icon}" class="pill-toggle-icon" aria-hidden="true"></i>`}
      <span>${escapeHtml(q.name)}</span>
    </button>
  `).join('')

  quickContainer.querySelectorAll('.pill-toggle[data-quick]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.quick
      const next = !el.classList.contains('active')
      el.classList.toggle('active', next)
      el.setAttribute('aria-pressed', next)
      track(EVENTS.BLOCKLIST_SITE_TOGGLED, { site_id: id, enabled: next })
      state.quick_blocks[id] = next
      scheduleBlocklistSave()
    })
  })

  // -- Blocklist: custom URL list --

  function renderCustomUrls() {
    const list = main.querySelector('#custom-urls-list')
    list.innerHTML = state.custom_urls.length === 0
      ? `<p class="dashboard-meta-sub">${t('dashboard.config.noCustomUrls', 'No custom URLs added.')}</p>`
      : state.custom_urls.map((u) => `
          <span class="dashboard-chip">
            ${escapeHtml(u)}
            <button type="button" class="dashboard-remove-btn" data-url="${escapeHtml(u)}" aria-label="Remove ${escapeHtml(u)}">${CROSS_SVG}</button>
          </span>
        `).join('')
    list.querySelectorAll('.dashboard-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const u = btn.dataset.url
        const idx = state.custom_urls.indexOf(u)
        if (idx !== -1) state.custom_urls.splice(idx, 1)
        renderCustomUrls()
        scheduleBlocklistSave()
      })
    })
  }

  // -- Blocklist: custom app list --

  function renderCustomApps() {
    const list = main.querySelector('#custom-apps-list')
    list.innerHTML = state.custom_apps.length === 0
      ? `<p class="dashboard-meta-sub">${t('dashboard.config.noCustomApps', 'No custom apps added.')}</p>`
      : state.custom_apps.map((a) => `
          <span class="dashboard-chip">
            ${escapeHtml(a)}
            <button type="button" class="dashboard-remove-btn" data-app="${escapeHtml(a)}" aria-label="Remove ${escapeHtml(a)}">${CROSS_SVG}</button>
          </span>
        `).join('')
    list.querySelectorAll('.dashboard-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.app
        const idx = state.custom_apps.indexOf(a)
        if (idx !== -1) state.custom_apps.splice(idx, 1)
        renderCustomApps()
        scheduleBlocklistSave()
      })
    })
  }

  renderCustomUrls()
  renderCustomApps()

  // -- Blocklist: add helpers --

  function setHint(hintEl, message, type) {
    if (!hintEl) return
    hintEl.textContent = message || ''
    hintEl.className = 'dashboard-input-hint' + (type ? ` dashboard-input-hint--${type}` : '')
  }

  async function addCustomUrl() {
    const input = main.querySelector('#custom-url-input')
    const addBtn = main.querySelector('#custom-url-add')
    const hintEl = main.querySelector('#custom-url-hint')
    const val = input.value.trim()
    if (!val) {
      setHint(hintEl, '', '')
      return
    }
    // Disable button during async validation to prevent duplicate entries
    if (addBtn) addBtn.disabled = true
    setHint(hintEl, t('dashboard.config.checking', 'Checking...'), '')
    const result = await validateUrlPattern(val)
    if (addBtn) addBtn.disabled = false
    if (!result.valid) {
      setHint(hintEl, result.message, 'error')
      return
    }
    const normalized = val.toLowerCase()
    if (state.custom_urls.includes(normalized)) {
      setHint(hintEl, '', '')
      return
    }
    state.custom_urls.push(normalized)
    track(EVENTS.BLOCKLIST_CUSTOM_URL_ADDED)
    input.value = ''
    setHint(hintEl, result.isWarning ? result.message : t('dashboard.config.added', 'Added.'), result.isWarning ? 'warning' : 'success')
    setTimeout(() => setHint(hintEl, '', ''), 3000)
    renderCustomUrls()
    scheduleBlocklistSave()
  }

  async function addCustomApp() {
    const input = main.querySelector('#custom-app-input')
    const addBtn = main.querySelector('#custom-app-add')
    const hintEl = main.querySelector('#custom-app-hint')
    const val = input.value.trim()
    if (!val) {
      setHint(hintEl, '', '')
      return
    }
    // Disable button during async validation to prevent duplicate entries
    if (addBtn) addBtn.disabled = true
    setHint(hintEl, t('dashboard.config.checking', 'Checking...'), '')
    const result = await validateAppPattern(val)
    if (addBtn) addBtn.disabled = false
    if (!result.valid) {
      setHint(hintEl, result.message, 'error')
      return
    }
    const normalizedApp = val.toLowerCase()
    if (state.custom_apps.some((a) => a.toLowerCase() === normalizedApp)) {
      setHint(hintEl, '', '')
      return
    }
    state.custom_apps.push(val)
    track(EVENTS.BLOCKLIST_CUSTOM_APP_ADDED)
    input.value = ''
    setHint(hintEl, result.isWarning ? result.message : t('dashboard.config.added', 'Added.'), result.isWarning ? 'warning' : 'success')
    setTimeout(() => setHint(hintEl, '', ''), 3000)
    renderCustomApps()
    scheduleBlocklistSave()
  }

  main.querySelector('#custom-url-add').addEventListener('click', addCustomUrl)
  main.querySelector('#custom-app-add').addEventListener('click', addCustomApp)

  main.querySelector('#custom-url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomUrl() }
  })
  main.querySelector('#custom-app-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomApp() }
  })

  // Clear error hints when the user empties the input
  main.querySelector('#custom-url-input').addEventListener('input', (e) => {
    if (!e.target.value.trim()) {
      setHint(main.querySelector('#custom-url-hint'), '', '')
    }
  })
  main.querySelector('#custom-app-input').addEventListener('input', (e) => {
    if (!e.target.value.trim()) {
      setHint(main.querySelector('#custom-app-hint'), '', '')
    }
  })

  // -- Pill hover description popup (shows after 2s hover, near the pill) --

  // Append overlay + modal to document.body so they cover the full viewport.
  // Remove any existing ones first to prevent duplicates if render() is called again.
  document.querySelector('.pill-desc-overlay')?.remove()
  document.querySelector('.pill-desc-modal')?.remove()

  const overlay = document.createElement('div')
  overlay.className = 'pill-desc-overlay'
  overlay.setAttribute('aria-hidden', 'true')
  document.body.appendChild(overlay)

  const modal = document.createElement('div')
  modal.className = 'pill-desc-modal'
  modal.setAttribute('role', 'dialog')
  modal.innerHTML = `
    <h3 class="pill-desc-modal-title" id="pill-desc-title"></h3>
    <p class="pill-desc-modal-text" id="pill-desc-text"></p>
  `
  document.body.appendChild(modal)

  let hoverTimer = null

  /** Position the modal near the pill element and show it. */
  function showDescModal(pillEl, name, desc) {
    document.getElementById('pill-desc-title').textContent = name
    document.getElementById('pill-desc-text').textContent = desc

    // Get pill position and place modal just below it
    const rect = pillEl.getBoundingClientRect()
    const modalWidth = 300
    let left = rect.left + (rect.width / 2) - (modalWidth / 2)

    // Keep modal within viewport horizontally
    left = Math.max(12, Math.min(left, window.innerWidth - modalWidth - 12))

    modal.style.left = `${left}px`
    modal.style.top = `${rect.bottom + 8}px`
    modal.style.width = `${modalWidth}px`

    overlay.classList.add('active')
    modal.classList.add('active')
  }

  function hideDescModal() {
    overlay.classList.remove('active')
    modal.classList.remove('active')
  }

  // Attach hover and focus handlers to all pills with descriptions
  main.querySelectorAll('.pill-toggle[data-desc]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer)
      hoverTimer = setTimeout(() => {
        showDescModal(el, el.dataset.name, el.dataset.desc)
      }, 1000)
    })
    el.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer)
      hideDescModal()
    })
    // Show description on keyboard focus too (accessibility)
    el.addEventListener('focus', () => {
      clearTimeout(hoverTimer)
      hoverTimer = setTimeout(() => {
        showDescModal(el, el.dataset.name, el.dataset.desc)
      }, 1000)
    })
    el.addEventListener('blur', () => {
      clearTimeout(hoverTimer)
      hideDescModal()
    })
    // Clicking the pill toggles it - don't show modal on click
    el.addEventListener('click', () => {
      clearTimeout(hoverTimer)
    })
  })

  // Render Lucide icons inside the page content
  createIcons({ icons: PAGE_ICONS, root: main })
}

// -- Entry point --

async function main() {
  const result = await initDashboardLayout()
  if (!result) return

  const mainEl = document.querySelector('.dashboard-main')
  if (!mainEl) return

  mainEl.innerHTML = `<div class="dashboard-loading"><div class="dashboard-spinner"></div><p>${t('dashboard.config.loading', 'Loading configuration...')}</p></div>`

  try {
    // Load blocklist and detection data in parallel
    const [blocklistConfig, detectionSettings] = await Promise.all([
      loadBlocklist(result.user.id),
      loadDetectionSettings(result.user.id),
    ])
    render(mainEl, blocklistConfig, detectionSettings, result.user.id)
  } catch (err) {
    logError('Configuration load failed:', err)
    mainEl.innerHTML = `
      <div class="dashboard-empty">
        <p class="dashboard-empty-title">${t('dashboard.config.errorTitle', 'Could not load configuration')}</p>
        <p>${t('dashboard.common.tryAgain', 'Please try again.')}</p>
      </div>
    `
  }
}

main()

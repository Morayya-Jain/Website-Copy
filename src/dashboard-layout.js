/**
 * Shared dashboard layout: auth guard, sidebar navigation, content wrapper.
 * Import from any authenticated dashboard page. Ensures user is logged in,
 * injects sidebar + main area, moves page content into main, returns user.
 */

import { supabase } from './supabase.js'
import { escapeHtml } from './utils.js'
import {
  initDashboardI18n,
  t,
  getCurrentLang,
  changeLang,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
} from './dashboard-i18n.js'
import {
  createIcons,
  LayoutDashboard,
  Clock,
  Settings,
  ChevronDown,
  Smartphone,
  CreditCard,
  BookOpen,
  Hourglass,
} from 'lucide/dist/cjs/lucide.js'
import { MACOS_URL, WINDOWS_URL } from './constants.js'
import { fetchRemainingSeconds } from './credits.js'
import { identify } from './analytics.js'
import './dashboard.css'

const LOGIN_PATH = '/auth/login/'
const DASHBOARD_PATH = '/dashboard/'

/** Detect user's OS and return the matching download URL. Falls back to /download/ page. */
function getDownloadUrl() {
  const ua = navigator.userAgent || ''
  // Exclude mobile devices - BrainDock is desktop-only
  if (/iPhone|iPad|iPod|Android/.test(ua)) return '/download/'
  if (/Mac/.test(ua)) return MACOS_URL
  if (/Win/.test(ua)) return WINDOWS_URL
  return '/download/'
}

/**
 * Format seconds into human-readable duration for the pill display.
 * Examples: "2 hours", "45 min", "0 sec"
 */
function formatPillDuration(seconds) {
  if (seconds == null || seconds < 0) return `0 ${t('dashboard.time.sec', 'sec')}`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h} ${h === 1 ? t('dashboard.time.hour', 'hour') : t('dashboard.time.hours', 'hours')}`
  if (m > 0) return `${m} ${t('dashboard.time.min', 'min')}`
  return `${s} ${t('dashboard.time.sec', 'sec')}`
}

/**
 * Get current path for sidebar active state (e.g. /settings/blocklist).
 */
function getCurrentPath() {
  const path = window.location.pathname
  // Strip trailing slash for consistent matching (except for root)
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path
}

/**
 * Build sidebar HTML with active state for current path.
 */
function buildSidebarHTML(currentPath) {
  const base = window.location.origin

  return `
    <a href="${base}/" class="dashboard-sidebar-logo" aria-label="BrainDock home">
      <img src="/assets/logo_with_text.png" alt="BrainDock">
    </a>
    <nav class="dashboard-sidebar-nav" aria-label="Dashboard navigation">
      <ul class="dashboard-sidebar-list">
        <li>
          <a href="${base}/settings/blocklist/" class="dashboard-sidebar-link ${currentPath === '/settings/blocklist' ? 'active' : ''}">
            <i data-lucide="settings" class="dashboard-sidebar-icon" aria-hidden="true"></i>
            <span>${t('dashboard.nav.configuration', 'Configuration')}</span>
          </a>
        </li>
        <li>
          <a href="${base}/how-to-use/" class="dashboard-sidebar-link ${currentPath === '/how-to-use' ? 'active' : ''}">
            <i data-lucide="book-open" class="dashboard-sidebar-icon" aria-hidden="true"></i>
            <span>${t('dashboard.nav.howToUse', 'How to Use')}</span>
          </a>
        </li>
        <li>
          <a href="${base}${DASHBOARD_PATH}" class="dashboard-sidebar-link ${currentPath === '/dashboard' ? 'active' : ''}">
            <i data-lucide="layout-dashboard" class="dashboard-sidebar-icon" aria-hidden="true"></i>
            <span>${t('dashboard.nav.dashboard', 'Dashboard')}</span>
          </a>
        </li>
        <li>
          <a href="${base}/sessions/" class="dashboard-sidebar-link ${currentPath.startsWith('/sessions') ? 'active' : ''}">
            <i data-lucide="clock" class="dashboard-sidebar-icon" aria-hidden="true"></i>
            <span>${t('dashboard.nav.sessions', 'Sessions')}</span>
          </a>
        </li>
        <li>
          <a href="${base}/account/subscription/" class="dashboard-sidebar-link ${currentPath === '/account/subscription' ? 'active' : ''}">
            <i data-lucide="credit-card" class="dashboard-sidebar-icon" aria-hidden="true"></i>
            <span>${t('dashboard.nav.billingUsage', 'Billing & Usage')}</span>
          </a>
        </li>
        <li>
          <a href="${base}/settings/devices/" class="dashboard-sidebar-link ${currentPath === '/settings/devices' ? 'active' : ''}">
            <i data-lucide="smartphone" class="dashboard-sidebar-icon" aria-hidden="true"></i>
            <span>${t('dashboard.nav.linkedDevices', 'Linked Devices')}</span>
          </a>
        </li>
      </ul>
      <a href="${getDownloadUrl()}" class="btn btn-primary nav-cta dashboard-sidebar-download">
        <span>${t('dashboard.nav.download', 'Download')}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </a>
    </nav>
    <div class="dashboard-sidebar-footer">
      <button type="button" class="dashboard-sidebar-footer-trigger" id="dashboard-sidebar-footer-trigger" aria-expanded="false" aria-haspopup="true">
        <span class="dashboard-avatar dashboard-avatar-footer" id="dashboard-sidebar-avatar" aria-hidden="true"></span>
        <span class="dashboard-sidebar-user-info">
          <span class="dashboard-sidebar-user-name" id="dashboard-sidebar-user-name"></span>
          <span class="dashboard-sidebar-user-email" id="dashboard-sidebar-user-email"></span>
        </span>
      </button>
      <div class="dashboard-sidebar-popup" id="dashboard-sidebar-popup" hidden>
        <a href="${base}/" class="dashboard-sidebar-popup-link">${t('dashboard.actions.backToWebsite', 'Back to Website')}</a>
        <button type="button" class="dashboard-sidebar-popup-signout" id="dashboard-sidebar-signout">${t('dashboard.actions.signOut', 'Sign Out')}</button>
      </div>
    </div>
  `
}

/**
 * Get user avatar URL from metadata (OAuth providers like Google provide this).
 */
function getUserAvatarUrl(user) {
  return user.user_metadata?.avatar_url || user.user_metadata?.picture || null
}

/**
 * Get user initials for avatar (first letter of name or email).
 */
function getUserInitials(user) {
  const name = user.user_metadata?.full_name || ''
  const email = user.email || ''
  if (name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
    }
    return name.trim().slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return '?'
}

/**
 * Render avatar element (image if URL exists, otherwise initials).
 */
function renderAvatar(avatarUrl, initials) {
  if (avatarUrl) {
    return `<img src="${escapeHtml(avatarUrl)}" alt="" class="dashboard-avatar-img" referrerpolicy="no-referrer" aria-hidden="true" data-fallback-initials="${escapeHtml(initials)}">`
  }
  return escapeHtml(initials)
}

/**
 * Attach error handlers to avatar images so they fall back to initials.
 * Uses JS event listeners instead of inline onerror to comply with CSP.
 * Also handles the case where the image already failed before the listener was attached.
 */
function initAvatarFallbacks(root) {
  root.querySelectorAll('.dashboard-avatar-img[data-fallback-initials]').forEach((img) => {
    function fallback() {
      const initials = img.getAttribute('data-fallback-initials') || '?'
      img.style.display = 'none'
      img.parentElement.textContent = initials
    }
    img.addEventListener('error', fallback)
    // If the image already failed before the listener was attached, trigger fallback now
    if (img.complete && img.naturalWidth === 0) fallback()
  })
}

/**
 * Initialize sidebar sign out, footer popup, and mobile menu.
 */
function initSidebarBehavior() {
  const signoutBtn = document.getElementById('dashboard-sidebar-signout')
  if (signoutBtn) {
    signoutBtn.addEventListener('click', handleSignOut)
  }

  // Sidebar footer popup (click profile to toggle)
  initSidebarFooterPopup()

  // Mobile: toggle sidebar and close on overlay click
  const sidebarToggle = document.getElementById('dashboard-sidebar-toggle')
  const sidebar = document.querySelector('.dashboard-sidebar')
  const overlay = document.querySelector('.dashboard-sidebar-overlay')
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open')
    })
  }
  if (overlay && sidebar) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open')
    })
  }
}

/**
 * Initialize sidebar footer popup: toggle on profile click, close on outside click.
 */
function initSidebarFooterPopup() {
  const trigger = document.getElementById('dashboard-sidebar-footer-trigger')
  const popup = document.getElementById('dashboard-sidebar-popup')
  if (!trigger || !popup) return

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    const open = popup.hidden
    popup.hidden = !open
    trigger.setAttribute('aria-expanded', open)
  })

  // Close popup when clicking outside
  document.addEventListener('click', () => {
    if (!popup.hidden) {
      popup.hidden = true
      trigger.setAttribute('aria-expanded', 'false')
    }
  })

  popup.addEventListener('click', (e) => e.stopPropagation())
}

async function handleSignOut() {
  try {
    // scope: 'local' (default) - only clears this browser session.
    // scope: 'global' would revoke ALL tokens including the desktop app,
    // causing silent session data loss if user is mid-focus. Password reset
    // uses 'global' (reset-password.js) which is the appropriate place.
    await supabase.auth.signOut()
  } catch (_) {
    // Redirect even if signOut fails (e.g. network error) so user is not stuck
  }
  // Clear session-scoped state to prevent stale values affecting the next login
  sessionStorage.removeItem('braindock_desktop')
  sessionStorage.removeItem('braindock_redirect')
  sessionStorage.removeItem('braindock_signup_reload_count')
  sessionStorage.removeItem('braindock_signup_reload_bail')
  sessionStorage.removeItem('braindock_checkout_tracked')
  // Reset PostHog identity so events are not attributed to the signed-out user
  try { window.posthog?.reset?.() } catch (_) { /* silent */ }
  window.location.href = '/'
}

/**
 * Initialize dashboard layout: check auth, inject sidebar and wrap content.
 * Returns the current user or null (after redirect).
 *
 * @param {Object} [options]
 * @param {string} [options.contentSelector] - Selector for element whose contents to move into main. Default: '#dashboard-content' or body content.
 * @returns {Promise<{ user: import('@supabase/supabase-js').User } | null>}
 */
export async function initDashboardLayout(options = {}) {
  // Load translations before building any UI so t() calls work
  await initDashboardI18n()

  // Try getSession first (reads localStorage, instant). If that fails,
  // wait for onAuthStateChange which fires once the client finishes init.
  let session = null
  try {
    const res = await supabase.auth.getSession()
    session = res.data?.session ?? null
  } catch (_) { /* ignore */ }

  // If getSession returned nothing, give the client a moment to initialize
  // and listen for the INITIAL_SESSION event (covers OAuth callback + refresh).
  if (!session) {
    session = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        resolve(null)
      }, 3000)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, sess) => {
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
            clearTimeout(timeout)
            subscription.unsubscribe()
            resolve(sess)
          }
        }
      )
    })
  }

  if (!session?.user) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `${LOGIN_PATH}?redirect=${returnTo}`
    return null
  }

  const user = session.user
  identify(user.id)
  const currentPath = getCurrentPath()
  const base = window.location.origin
  const avatarUrl = getUserAvatarUrl(user)
  const initials = getUserInitials(user)
  const displayName = user.user_metadata?.full_name || user.email || t('dashboard.common.signedIn', 'Signed in')

  const app = document.createElement('div')
  app.className = 'dashboard-app'

  const sidebar = document.createElement('aside')
  sidebar.className = 'dashboard-sidebar'
  sidebar.setAttribute('aria-label', 'Navigation')
  sidebar.innerHTML = buildSidebarHTML(currentPath)

  const userNameEl = sidebar.querySelector('#dashboard-sidebar-user-name')
  const userEmailEl = sidebar.querySelector('#dashboard-sidebar-user-email')
  const sidebarAvatarEl = sidebar.querySelector('#dashboard-sidebar-avatar')
  // Show full name as primary, email as secondary
  const fullName = user.user_metadata?.full_name || ''
  if (userNameEl) userNameEl.textContent = fullName || user.email || t('dashboard.common.signedIn', 'Signed in')
  if (userEmailEl) userEmailEl.textContent = fullName ? (user.email || '') : ''
  if (sidebarAvatarEl) {
    sidebarAvatarEl.innerHTML = renderAvatar(avatarUrl, initials)
  }

  const main = document.createElement('main')
  main.className = 'dashboard-main'

  // Fetch remaining credits for the pill (non-blocking, updates when ready)
  const remainingPromise = fetchRemainingSeconds()

  // Top-right header (desktop): remaining pill + download button + profile dropdown
  const headerWrap = document.createElement('div')
  headerWrap.className = 'dashboard-header-wrap'
  headerWrap.innerHTML = `
    <a href="${base}/account/subscription/" class="dashboard-remaining-pill" id="dashboard-remaining-pill" title="${t('dashboard.common.remainingTime', 'Remaining session time')}">
      <i data-lucide="hourglass" class="dashboard-remaining-pill-icon" aria-hidden="true"></i>
      <span id="dashboard-remaining-text">...</span>
    </a>
    <div class="dashboard-profile-wrap">
      <button type="button" class="dashboard-profile-trigger" id="dashboard-profile-trigger" aria-expanded="false" aria-haspopup="true" aria-label="Account menu">
        <span class="dashboard-avatar dashboard-avatar-md" id="dashboard-profile-avatar"></span>
      </button>
      <div class="dashboard-profile-dropdown" id="dashboard-profile-dropdown" hidden>
        <p class="dashboard-profile-email" id="dashboard-profile-email">${escapeHtml(displayName)}</p>
        <a href="${base}/" class="dashboard-profile-link">${t('dashboard.actions.backToWebsite', 'Back to Website')}</a>
        <button type="button" class="dashboard-profile-signout" id="dashboard-profile-signout">${t('dashboard.actions.signOut', 'Sign Out')}</button>
      </div>
    </div>
  `
  main.appendChild(headerWrap)

  const contentSelector = options.contentSelector || '#dashboard-content'
  const source = document.querySelector(contentSelector)
  if (source) {
    while (source.firstChild) {
      main.appendChild(source.firstChild)
    }
  } else {
    const body = document.body
    const scripts = []
    const toMove = []
    for (const child of body.childNodes) {
      if (child.tagName === 'SCRIPT') {
        scripts.push(child)
      } else if (child.nodeType === Node.ELEMENT_NODE && child.id !== 'dashboard-layout-mount') {
        toMove.push(child)
      }
    }
    toMove.forEach((el) => main.appendChild(el))
  }

  const header = document.createElement('header')
  header.className = 'dashboard-mobile-header'
  header.innerHTML = `
    <button type="button" class="dashboard-mobile-menu-btn" id="dashboard-sidebar-toggle" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
    <a href="${window.location.origin}/" class="dashboard-mobile-logo">
      <img src="/assets/logo_with_text.png" alt="BrainDock">
    </a>
  `

  const overlay = document.createElement('div')
  overlay.className = 'dashboard-sidebar-overlay'
  overlay.setAttribute('aria-hidden', 'true')

  app.appendChild(header)
  app.appendChild(sidebar)
  app.appendChild(overlay)
  app.appendChild(main)

  // Remove boot loading screen if present
  const boot = document.getElementById('dashboard-boot')
  if (boot) boot.remove()

  const mount = document.getElementById('dashboard-layout-mount')
  if (mount) {
    mount.appendChild(app)
  } else {
    document.body.appendChild(app)
  }

  createIcons({
    icons: { LayoutDashboard, Clock, Settings, ChevronDown, Smartphone, CreditCard, BookOpen, Hourglass },
    attrs: { class: 'dashboard-sidebar-icon' },
    root: app,
  })

  // Set profile avatar (top-right)
  const profileAvatarEl = document.getElementById('dashboard-profile-avatar')
  if (profileAvatarEl) {
    profileAvatarEl.innerHTML = renderAvatar(avatarUrl, initials)
  }

  // Attach avatar error fallbacks (CSP-safe, no inline handlers)
  initAvatarFallbacks(app)

  initSidebarBehavior()
  initProfileDropdown()
  initLangToggle()

  // Populate remaining-time pill once credits load
  remainingPromise
    .then((seconds) => {
      const textEl = document.getElementById('dashboard-remaining-text')
      if (textEl) textEl.textContent = formatPillDuration(seconds)
    })
    .catch(() => { /* credits fetch failed - pill stays as "..." */ })

  // Redirect to login if the user signs out in another tab
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      window.location.href = LOGIN_PATH
    }
  })

  return { user }
}

/**
 * Initialize top-right profile dropdown: toggle on trigger click, close on outside click.
 */
function initProfileDropdown() {
  const trigger = document.getElementById('dashboard-profile-trigger')
  const dropdown = document.getElementById('dashboard-profile-dropdown')
  const signoutBtn = document.getElementById('dashboard-profile-signout')
  if (!trigger || !dropdown) return

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    const open = dropdown.hidden
    dropdown.hidden = !open
    trigger.setAttribute('aria-expanded', open)
  })

  signoutBtn?.addEventListener('click', handleSignOut)

  document.addEventListener('click', () => {
    if (!dropdown.hidden) {
      dropdown.hidden = true
      trigger.setAttribute('aria-expanded', 'false')
    }
  })

  dropdown.addEventListener('click', (e) => e.stopPropagation())
}

/**
 * Create and wire up the floating language toggle (bottom-right FAB).
 */
function initLangToggle() {
  const lang = getCurrentLang()

  // Build the floating toggle + dropdown
  const wrap = document.createElement('div')
  wrap.className = 'dashboard-lang-fab'
  wrap.innerHTML = `
    <button type="button" class="dashboard-lang-fab-btn" id="dashboard-lang-btn"
            aria-expanded="false" aria-haspopup="listbox" aria-label="Select language">
      <svg class="dashboard-lang-globe" width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
      <span class="dashboard-lang-fab-label">${escapeHtml(LANGUAGE_LABELS[lang] || lang)}</span>
    </button>
    <ul class="dashboard-lang-dropdown" id="dashboard-lang-dropdown" role="listbox" hidden>
      ${SUPPORTED_LANGUAGES.map((code) => `
        <li role="option" data-lang="${code}" aria-selected="${code === lang}"
            class="${code === lang ? 'selected' : ''}">${escapeHtml(LANGUAGE_LABELS[code] || code)}</li>
      `).join('')}
    </ul>
  `
  document.body.appendChild(wrap)

  // Toggle dropdown
  const btn = document.getElementById('dashboard-lang-btn')
  const dropdown = document.getElementById('dashboard-lang-dropdown')
  if (!btn || !dropdown) return

  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    const open = dropdown.hidden
    dropdown.hidden = !open
    btn.setAttribute('aria-expanded', open)
  })

  // Language selection
  dropdown.querySelectorAll('[data-lang]').forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation()
      const newLang = option.getAttribute('data-lang')
      if (newLang && newLang !== lang) {
        changeLang(newLang)
      }
      dropdown.hidden = true
      btn.setAttribute('aria-expanded', 'false')
    })
  })

  // Close on outside click
  document.addEventListener('click', () => {
    if (!dropdown.hidden) {
      dropdown.hidden = true
      btn.setAttribute('aria-expanded', 'false')
    }
  })

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hidden) {
      dropdown.hidden = true
      btn.setAttribute('aria-expanded', 'false')
    }
  })

  // Prevent dropdown clicks from bubbling
  dropdown.addEventListener('click', (e) => e.stopPropagation())
}

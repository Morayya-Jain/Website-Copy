/**
 * Shared auth utilities used across all auth pages.
 * Handles redirects, error/loading UI, and desktop deep-link flow.
 */

import { supabaseUrl, supabaseAnonKey } from './supabase.js'
import { logError } from './logger.js'

const DESKTOP_SOURCE_KEY = 'braindock_desktop'
/** Used by signup to pass redirect into emailRedirectTo; also read in getRedirectPath(). */
export const REDIRECT_STORAGE_KEY = 'braindock_redirect'

/**
 * Validate that a redirect path is safe (relative, no open-redirect tricks).
 * Rejects protocol-relative paths (//), backslash paths (/\), and non-parseable URLs.
 */
function isValidRedirectPath(path) {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.includes('\\')) return false
  try {
    const url = new URL(path, window.location.origin)
    return url.origin === window.location.origin
  } catch {
    return false
  }
}

export function getRedirectPath() {
  const stored = sessionStorage.getItem(REDIRECT_STORAGE_KEY)
  if (isValidRedirectPath(stored)) {
    sessionStorage.removeItem(REDIRECT_STORAGE_KEY)
    return stored
  }
  const params = new URLSearchParams(window.location.search)
  const redirect = params.get('redirect')
  if (isValidRedirectPath(redirect)) {
    return redirect
  }
  return '/settings/blocklist/'
}

/**
 * Capture ?source=desktop from the URL and persist in sessionStorage.
 * Call this at the top of every auth page (login, signup).
 * sessionStorage survives the OAuth redirect round-trip within the same tab.
 */
export function captureDesktopSource() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('source') === 'desktop') {
    sessionStorage.setItem(DESKTOP_SOURCE_KEY, 'true')
  }
}

/**
 * Capture ?redirect= from the URL and persist in sessionStorage.
 * OAuth and email confirmation flows lose the URL, so we persist it and read it back in getRedirectPath().
 * Call at the top of login and signup pages.
 */
export function captureRedirect() {
  const params = new URLSearchParams(window.location.search)
  const redirect = params.get('redirect')
  if (isValidRedirectPath(redirect)) {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, redirect)
  }
}

/**
 * Check whether the current auth flow originated from the desktop app.
 * Reads the flag set by captureDesktopSource() without consuming it.
 */
export function isDesktopSource() {
  return sessionStorage.getItem(DESKTOP_SOURCE_KEY) === 'true'
}

/**
 * Synchronously check localStorage for a Supabase session token.
 * Works before the Supabase client finishes async init, so the page
 * can show a spinner immediately instead of flashing the form.
 */
export function hasStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.access_token) return true
        }
      }
    }
  } catch (_) { /* ignore */ }
  return false
}

/**
 * Redirect after successful auth.
 * If the user came from the desktop app (?source=desktop), generates
 * a one-time linking code via Edge Function and redirects to
 * braindock://callback?code=... so the desktop app can log in.
 * Otherwise redirects to the web dashboard.
 * Uses raw fetch() for full control; shows visible errors when card is passed.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {HTMLElement | null} [card] - Optional .auth-card container for showing errors
 */
export async function handlePostAuthRedirect(supabase, card = null) {
  const isDesktop = sessionStorage.getItem(DESKTOP_SOURCE_KEY) === 'true'
  if (!isDesktop) {
    window.location.href = getRedirectPath()
    return true
  }

  // Don't clear the desktop flag yet — preserve it through errors so retries
  // from the login form still use the desktop flow.  Cleared below on success.

  try {
    // Refresh the session first to ensure the access token is valid.
    // getSession() returns stale tokens; refreshSession() gets fresh ones.
    const { data: refreshed } = await supabase.auth.refreshSession()
    const session = refreshed?.session
    if (!session) {
      if (card) showError(card, 'Session expired. Please try logging in again.')
      else window.location.href = getRedirectPath()
      return
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      if (card) showError(card, 'App configuration error. Please try again later.')
      else window.location.href = getRedirectPath()
      return
    }

    // Abort after 8 seconds to prevent hanging forever
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let resp
    try {
      resp = await fetch(`${supabaseUrl}/functions/v1/generate-linking-code`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const result = await resp.json().catch(() => ({}))
    if (!resp.ok || !result?.code) {
      const detail = result?.error || result?.message || result?.msg || `HTTP ${resp.status}`
      logError('Failed to generate linking code:', resp.status, detail, result)
      if (card) showError(card, 'Desktop login failed. Please try again.')
      else window.location.href = getRedirectPath()
      return
    }

    // Linking code obtained — clear the desktop flag now (refresh goes to dashboard)
    sessionStorage.removeItem(DESKTOP_SOURCE_KEY)

    // Update any visible spinner text to reflect the deep-link step
    if (card) {
      const spinnerText = card.querySelector('.auth-loading-text')
      if (spinnerText) spinnerText.textContent = 'Opening BrainDock...'
    }

    const deepLink = `braindock://callback?code=${encodeURIComponent(result.code)}`
    window.location.href = deepLink

    // If browser blocks custom scheme, page stays visible; show code after 2s
    let redirectTimer = null
    setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
        if (card) {
          // Build the fallback UI with safe DOM APIs (no innerHTML with user data)
          const codeDisplay = document.createElement('div')
          codeDisplay.className = 'auth-linking-fallback'

          const msg = document.createElement('p')
          msg.textContent = 'If the app did not log in, copy this code and paste it in BrainDock:'
          codeDisplay.appendChild(msg)

          const row = document.createElement('div')
          row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:8px 0;'

          const codeEl = document.createElement('code')
          codeEl.style.cssText = 'user-select:all;padding:4px 8px;background:rgba(0,0,0,0.1);border-radius:4px;font-size:1.1rem;'
          codeEl.textContent = result.code // safe - no HTML parsing
          row.appendChild(codeEl)

          const copyBtn = document.createElement('button')
          copyBtn.type = 'button'
          copyBtn.className = 'btn btn-secondary'
          copyBtn.style.cssText = 'padding:4px 12px;font-size:0.85rem;'
          copyBtn.textContent = 'Copy'
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(result.code).then(() => {
              copyBtn.textContent = 'Copied!'
            }).catch(() => {
              copyBtn.textContent = 'Copy failed'
            })
          })
          row.appendChild(copyBtn)
          codeDisplay.appendChild(row)

          // Keep the 30s redirect active — the user has plenty of time to copy
          card.appendChild(codeDisplay)
        }
      }
    }, 2000)

    // Redirect to dashboard after 30s to give user time to copy the code
    redirectTimer = setTimeout(() => {
      window.location.href = getRedirectPath()
    }, 30000)

    // Signal callers that the deep-link flow is active (don't restore the form)
    return true
  } catch (err) {
    logError('Desktop linking error:', err)
    if (card) showError(card, 'Desktop login failed. Please try again.')
    else window.location.href = getRedirectPath()
  }
}

/**
 * Build an auth page URL. Utility for inter-page links.
 */
export function buildAuthUrl(path) {
  return path
}

/**
 * Display an error message inside the given container element.
 * Reuses the existing .auth-error element or creates one.
 */
export function showError(container, message) {
  let el = container.querySelector('.auth-error')
  if (!el) {
    el = document.createElement('div')
    el.className = 'auth-error'
    el.setAttribute('role', 'alert')
    container.prepend(el)
  }
  el.textContent = message
  el.hidden = false
}

/** Hide the error message inside the container. */
export function hideError(container) {
  const el = container.querySelector('.auth-error')
  if (el) el.hidden = true
}

/**
 * Display a success message inside the given container element.
 */
export function showSuccess(container, message) {
  let el = container.querySelector('.auth-success')
  if (!el) {
    el = document.createElement('div')
    el.className = 'auth-success'
    el.setAttribute('role', 'status')
    container.prepend(el)
  }
  el.textContent = message
  el.hidden = false
}

/**
 * Set a button to its loading state (disabled + spinner text).
 * Disabling prevents double submission; call hideLoading after the request completes.
 * Stores original label so it can be restored.
 */
export function showLoading(button) {
  button.dataset.originalLabel = button.textContent
  button.textContent = 'Loading...'
  button.disabled = true
  button.classList.add('btn-loading')
}

/** Restore a button from its loading state. */
export function hideLoading(button) {
  button.textContent = button.dataset.originalLabel || button.textContent
  button.disabled = false
  button.classList.remove('btn-loading')
}

/**
 * Map common Supabase auth error messages to user-friendly strings.
 */
export function friendlyError(error) {
  const msg = error?.message || 'Something went wrong. Please try again.'

  if (msg.includes('disposable email')) {
    return 'This email provider is not supported. Please use a different email address.'
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (msg.includes('User already registered')) {
    return 'An account with this email already exists. Try logging in instead.'
  }
  if (msg.includes('Password should be at least')) {
    return 'Password must be at least 6 characters.'
  }
  if (msg.includes('Email rate limit exceeded')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (msg.includes('For security purposes')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  // Don't leak raw Supabase error details to user - log for debugging
  logError('Unmapped auth error:', msg)
  return 'Something went wrong. Please try again.'
}

import { supabase } from '../supabase.js'
import {
  captureDesktopSource,
  captureRedirect,
  hasStoredSession,
  isDesktopSource,
  handlePostAuthRedirect,
  showError,
  hideError,
  showLoading,
  hideLoading,
  friendlyError,
} from '../auth-helpers.js'
import { isValidEmail, isValidPassword, LIMITS } from '../validators.js'
import { track, EVENTS } from '../analytics.js'
import '../auth.css'

// Persist ?source=desktop and ?redirect= before they are lost to OAuth redirects
captureDesktopSource()
captureRedirect()

// DOM elements used by both the auto-login check and form handlers
const loginForm = document.getElementById('login-form')
const authCard = document.querySelector('.auth-card')
const loginBtn = document.getElementById('login-btn')
const googleBtn = document.getElementById('google-btn')

// -- Helpers for the auto-login spinner state --
let spinnerWrap = null

/** Hide form elements and show the "Signing you in..." spinner. */
function showSigningInSpinner() {
  loginForm.style.display = 'none'
  authCard.querySelector('.auth-divider').style.display = 'none'
  googleBtn.style.display = 'none'
  authCard.querySelector('.auth-footer').style.display = 'none'
  authCard.querySelector('.auth-title').textContent = 'Signing you in...'
  authCard.querySelector('.auth-subtitle').textContent = ''
  spinnerWrap = document.createElement('div')
  spinnerWrap.className = 'auth-loading'
  spinnerWrap.innerHTML = '<div class="auth-spinner"></div><p class="auth-loading-text">Signing you in...</p>'
  authCard.appendChild(spinnerWrap)
}

/** Restore the login form after a failed auto-login attempt. */
function restoreLoginForm() {
  loginForm.style.display = ''
  authCard.querySelector('.auth-divider').style.display = ''
  googleBtn.style.display = ''
  authCard.querySelector('.auth-footer').style.display = ''
  authCard.querySelector('.auth-title').textContent = 'Welcome back'
  authCard.querySelector('.auth-subtitle').textContent = 'Log in to your BrainDock account'
  if (spinnerWrap) {
    spinnerWrap.remove()
    spinnerWrap = null
  }
}

// Show spinner immediately if a stored session exists (avoids form flash)
if (hasStoredSession()) {
  showSigningInSpinner()
}

// Validate the session asynchronously and proceed with redirect or restore form
;(async () => {
  let session = null
  try {
    const res = await supabase.auth.getSession()
    session = res.data?.session ?? null
  } catch (_) { /* ignore */ }

  // If getSession didn't find one, wait for the client's INITIAL_SESSION event
  if (!session) {
    session = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        resolve(null)
      }, 2000)
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

  if (session) {
    // Spinner might already be showing from the synchronous check; show it if not
    if (!spinnerWrap) showSigningInSpinner()

    const handled = await handlePostAuthRedirect(supabase, authCard)

    // Only restore the form on error (handled=falsy).
    // For desktop deep-link flow handled=true — keep the spinner visible.
    if (!handled) restoreLoginForm()
  } else if (spinnerWrap) {
    // Spinner was shown synchronously but session is stale/expired — restore form
    restoreLoginForm()
  }
})()

// Email + password login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError(authCard)

  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value

  if (!email || !password) {
    showError(authCard, 'Please enter your email and password.')
    return
  }
  if (!isValidEmail(email)) {
    showError(authCard, 'Please enter a valid email address.')
    return
  }
  if (!isValidPassword(password)) {
    showError(authCard, `Password must be ${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters.`)
    return
  }

  showLoading(loginBtn)
  track(EVENTS.LOGIN_STARTED, { method: 'email' })

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    track(EVENTS.LOGIN_FAILED, { method: 'email' })
    hideLoading(loginBtn)
    showError(authCard, friendlyError(error))
    return
  }

  track(EVENTS.LOGIN_COMPLETED, { method: 'email' })

  // For desktop flow, switch to spinner before the linking/deep-link step
  // so the paste-code fallback appears on a spinner page, not the login form.
  if (isDesktopSource()) {
    showSigningInSpinner()
  }

  const handled = await handlePostAuthRedirect(supabase, authCard)

  // Restore the form only on error (handled=falsy)
  if (!handled) {
    hideLoading(loginBtn)
    if (spinnerWrap) restoreLoginForm()
  }
})

// Google OAuth login
googleBtn.addEventListener('click', async () => {
  hideError(authCard)
  track(EVENTS.LOGIN_STARTED, { method: 'google' })

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback/`,
    },
  })

  if (error) {
    track(EVENTS.LOGIN_FAILED, { method: 'google' })
    showError(authCard, friendlyError(error))
  }
})

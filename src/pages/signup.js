import { supabase } from '../supabase.js'
import {
  captureDesktopSource,
  captureRedirect,
  hasStoredSession,
  isDesktopSource,
  REDIRECT_STORAGE_KEY,
  handlePostAuthRedirect,
  showError,
  hideError,
  showSuccess,
  showLoading,
  hideLoading,
  friendlyError,
} from '../auth-helpers.js'
import { isValidName, isValidEmail, isValidPassword, LIMITS } from '../validators.js'
import { track, EVENTS } from '../analytics.js'
import '../auth.css'

// Persist ?source=desktop and ?redirect= FIRST (synchronous, before any async work)
captureDesktopSource()
captureRedirect()

const RELOAD_BAIL_KEY = 'braindock_signup_reload_bail'

// If we bailed out of reload loop (corrupt token), clear the flag and show form
const wasBailed = !!sessionStorage.getItem(RELOAD_BAIL_KEY)
if (wasBailed) {
  sessionStorage.removeItem(RELOAD_BAIL_KEY)
}

// If already logged in (and not recovering from a bail), hide the form and show loading
const reloadCountKey = 'braindock_signup_reload_count'
if (hasStoredSession() && !wasBailed) {
  const authCard = document.querySelector('.auth-card')
  if (authCard) {
    authCard.innerHTML = `
      <div class="auth-loading">
        <div class="auth-spinner"></div>
        <p class="auth-loading-text">Signing you in...</p>
      </div>
    `
  }

  ;(async () => {
    let session = null
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await supabase.auth.getSession()
        session = res.data?.session ?? null
      } catch (_) { /* ignore */ }
      if (session) break
      await new Promise((r) => setTimeout(r, 100))
    }
    if (session) {
      await handlePostAuthRedirect(supabase, authCard)
    } else {
      // Stale/corrupt token in localStorage - sign out to clear it and show the form
      try { await supabase.auth.signOut() } catch (_) { /* ignore */ }
      sessionStorage.removeItem(reloadCountKey)
      // Restore the signup form
      window.location.href = '/auth/signup/'
    }
  })()
}

const form = document.getElementById('signup-form')
const signupBtn = document.getElementById('signup-btn')
const googleBtn = document.getElementById('google-btn')
const card = document.querySelector('.auth-card')

// Email + password signup
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError(card)

  const name = document.getElementById('name').value.trim()
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value

  if (!name || !email || !password) {
    showError(card, 'Please fill in all fields.')
    return
  }
  if (!isValidName(name)) {
    showError(card, `Name must be 1-${LIMITS.NAME_MAX} characters and cannot contain < or >.`)
    return
  }
  if (!isValidEmail(email)) {
    showError(card, 'Please enter a valid email address.')
    return
  }
  if (!isValidPassword(password)) {
    showError(card, `Password must be ${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters.`)
    return
  }

  const termsCheckbox = document.getElementById('terms')
  if (!termsCheckbox?.checked) {
    showError(card, 'Please agree to the Terms of Service to continue.')
    return
  }

  showLoading(signupBtn)
  track(EVENTS.SIGNUP_STARTED, { method: 'email' })

  const redirectParam = new URLSearchParams(window.location.search).get('redirect') ||
    sessionStorage.getItem(REDIRECT_STORAGE_KEY) ||
    ''
  const callbackUrl = redirectParam
    ? `${window.location.origin}/auth/callback/?redirect=${encodeURIComponent(redirectParam)}`
    : `${window.location.origin}/auth/callback/`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: callbackUrl,
    },
  })

  hideLoading(signupBtn)

  if (error) {
    track(EVENTS.SIGNUP_FAILED, { method: 'email' })
    showError(card, friendlyError(error))
    return
  }

  // Supabase returns a user with an empty identities array when the email
  // is already registered (instead of an error, for security reasons).
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    showError(card, 'An account with this email already exists. Try logging in instead.')
    return
  }

  // If Supabase returned a session, the user is auto-confirmed (go to dashboard).
  // If no session, email confirmation is required (show message).
  if (data.session) {
    track(EVENTS.SIGNUP_COMPLETED, { method: 'email' })
    // For desktop flow, switch to spinner so the paste-code fallback
    // appears on a spinner page rather than the signup form.
    if (isDesktopSource()) {
      card.innerHTML = `
        <div class="auth-loading">
          <div class="auth-spinner"></div>
          <p class="auth-loading-text">Signing you in...</p>
        </div>`
    }
    await handlePostAuthRedirect(supabase, card)
    return
  } else {
    form.hidden = true
    document.querySelector('.auth-divider').hidden = true
    googleBtn.hidden = true
    track(EVENTS.SIGNUP_COMPLETED, { method: 'email', needs_confirmation: true })
    showSuccess(card, 'Check your email for a confirmation link. Once confirmed, you can log in.')
  }
})

// Google OAuth signup
googleBtn.addEventListener('click', async () => {
  hideError(card)

  const termsCheckbox = document.getElementById('terms')
  if (!termsCheckbox?.checked) {
    showError(card, 'Please agree to the Terms of Service to continue.')
    return
  }

  track(EVENTS.SIGNUP_STARTED, { method: 'google' })
  sessionStorage.setItem('braindock_auth_flow', 'signup')

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback/`,
    },
  })

  if (error) {
    track(EVENTS.SIGNUP_FAILED, { method: 'google' })
    showError(card, friendlyError(error))
  }
})

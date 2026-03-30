import { supabase } from '../supabase.js'
import {
  captureDesktopSource,
  captureRedirect,
  hasStoredSession,
  clearStaleAuthTokens,
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
import { initDashboardI18n, t } from '../dashboard-i18n.js'
import { BASE_PATH } from '../base-path.js'
import '../auth.css'
import { initAnimatedGrid } from '../animated-grid.js'
initAnimatedGrid()
initDashboardI18n()

// Persist ?source=desktop and ?redirect= FIRST (synchronous, before any async work)
captureDesktopSource()
captureRedirect()

// DOM elements used by both the auto-login check and form handlers
const form = document.getElementById('signup-form')
const signupBtn = document.getElementById('signup-btn')
const googleBtn = document.getElementById('google-btn')
const card = document.querySelector('.auth-card')

// -- Helpers for the auto-login spinner state --
let spinnerWrap = null

/** Hide form elements and show the "Signing you in..." spinner. */
function showSigningInSpinner() {
  form.style.display = 'none'
  const divider = card.querySelector('.auth-divider')
  const footer = card.querySelector('.auth-footer')
  const title = card.querySelector('.auth-title')
  const subtitle = card.querySelector('.auth-subtitle')
  if (divider) divider.style.display = 'none'
  if (googleBtn) googleBtn.style.display = 'none'
  if (footer) footer.style.display = 'none'
  if (title) title.textContent = t('auth.signup.signingIn', 'Signing you in...')
  if (subtitle) subtitle.textContent = ''
  spinnerWrap = document.createElement('div')
  spinnerWrap.className = 'auth-loading'
  spinnerWrap.innerHTML = `<div class="auth-spinner"></div><p class="auth-loading-text">${t('auth.signup.signingIn', 'Signing you in...')}</p>`
  card.appendChild(spinnerWrap)
}

/** Restore the signup form after a failed auto-login attempt. */
function restoreSignupForm() {
  form.style.display = ''
  const divider = card.querySelector('.auth-divider')
  const footer = card.querySelector('.auth-footer')
  const title = card.querySelector('.auth-title')
  const subtitle = card.querySelector('.auth-subtitle')
  if (divider) divider.style.display = ''
  if (googleBtn) googleBtn.style.display = ''
  if (footer) footer.style.display = ''
  if (title) title.textContent = t('auth.signup.title', 'Create your account')
  if (subtitle) subtitle.textContent = t('auth.signup.subtitle', 'Own your attention with BrainDock')
  if (spinnerWrap) {
    spinnerWrap.remove()
    spinnerWrap = null
  }
}

// Show spinner immediately if a stored session exists (avoids form flash)
if (hasStoredSession()) {
  showSigningInSpinner()
}

// Validate session async and proceed with redirect or restore form
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
    if (!spinnerWrap) showSigningInSpinner()
    const handled = await handlePostAuthRedirect(supabase, card)
    // Restore the form on error (handled=falsy); for desktop deep-link flow handled=true
    if (!handled) restoreSignupForm()
  } else if (spinnerWrap) {
    // Stale/corrupt token - clean up and restore form (no redirect)
    try { await supabase.auth.signOut() } catch (_) { /* ignore */ }
    clearStaleAuthTokens()
    restoreSignupForm()
  }
})()

// Email + password signup
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError(card)

  const name = document.getElementById('name').value.trim()
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value

  if (!name || !email || !password) {
    showError(card, t('auth.signup.emptyFields', 'Please fill in all fields.'))
    return
  }
  if (!isValidName(name)) {
    showError(card, t('auth.signup.nameValidation', `Name must be 1-${LIMITS.NAME_MAX} characters and cannot contain < or >.`))
    return
  }
  if (!isValidEmail(email)) {
    showError(card, t('auth.signup.invalidEmail', 'Please enter a valid email address.'))
    return
  }
  if (!isValidPassword(password)) {
    showError(card, t('auth.common.passwordLength', `Password must be ${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters.`))
    return
  }

  const termsCheckbox = document.getElementById('terms')
  if (!termsCheckbox?.checked) {
    showError(card, t('auth.signup.termsRequired', 'Please agree to the Terms of Service to continue.'))
    return
  }

  showLoading(signupBtn)
  track(EVENTS.SIGNUP_STARTED, { method: 'email' })

  const redirectParam = new URLSearchParams(window.location.search).get('redirect') ||
    sessionStorage.getItem(REDIRECT_STORAGE_KEY) ||
    ''
  const callbackUrl = redirectParam
    ? `${window.location.origin}${BASE_PATH}/auth/callback/?redirect=${encodeURIComponent(redirectParam)}`
    : `${window.location.origin}${BASE_PATH}/auth/callback/`

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
    showError(card, t('auth.signup.alreadyExists', 'An account with this email already exists. Try logging in instead.'))
    return
  }

  // If Supabase returned a session, the user is auto-confirmed (go to dashboard).
  // If no session, email confirmation is required (show message).
  if (data.session) {
    track(EVENTS.SIGNUP_COMPLETED, { method: 'email' })
    // For desktop flow, switch to spinner so the paste-code fallback
    // appears on a spinner page rather than the signup form.
    if (isDesktopSource()) {
      showSigningInSpinner()
    }
    const handled = await handlePostAuthRedirect(supabase, card)
    if (!handled) {
      hideLoading(signupBtn)
      if (spinnerWrap) restoreSignupForm()
    }
    return
  } else {
    form.hidden = true
    document.querySelector('.auth-divider').hidden = true
    googleBtn.hidden = true
    track(EVENTS.SIGNUP_COMPLETED, { method: 'email', needs_confirmation: true })
    showSuccess(card, t('auth.signup.checkEmail', 'Check your email for a confirmation link. Once confirmed, you can log in.'))
  }
})

// Google OAuth signup
googleBtn.addEventListener('click', async () => {
  hideError(card)

  const termsCheckbox = document.getElementById('terms')
  if (!termsCheckbox?.checked) {
    showError(card, t('auth.signup.termsRequired', 'Please agree to the Terms of Service to continue.'))
    return
  }

  track(EVENTS.SIGNUP_STARTED, { method: 'google' })
  sessionStorage.setItem('braindock_auth_flow', 'signup')

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${BASE_PATH}/auth/callback/`,
    },
  })

  if (error) {
    track(EVENTS.SIGNUP_FAILED, { method: 'google' })
    showError(card, friendlyError(error))
  }
})

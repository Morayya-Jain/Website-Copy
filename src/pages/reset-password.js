import { supabase } from '../supabase.js'
import {
  showError,
  hideError,
  showSuccess,
  showLoading,
  hideLoading,
  friendlyError,
} from '../auth-helpers.js'
import { isValidPassword, LIMITS } from '../validators.js'
import { initDashboardI18n, t } from '../dashboard-i18n.js'
import '../auth.css'
import { initAnimatedGrid } from '../animated-grid.js'
initAnimatedGrid()
initDashboardI18n()

const form = document.getElementById('reset-form')
const updateBtn = document.getElementById('update-btn')
const card = document.querySelector('.auth-card')
const loadingState = document.getElementById('loading-state')

let recoveryReady = false

/**
 * Show the password form once the recovery session is confirmed.
 */
function showForm() {
  recoveryReady = true
  loadingState.hidden = true
  form.hidden = false
}

/**
 * Show an expired/invalid link error with a helpful redirect.
 */
function showExpiredError() {
  loadingState.hidden = true
  showError(card, t('auth.reset.expired', 'This reset link has expired or is invalid. Please request a new one.'))
  // Update the footer link to point to forgot-password for convenience
  const footer = card.querySelector('.auth-footer')
  if (footer) {
    footer.innerHTML = `<a href="/auth/forgot-password/">${t('auth.reset.requestNew', 'Request a new reset link')}</a>`
  }
}

// Listen for Supabase PASSWORD_RECOVERY event (fired when recovery token is parsed)
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session) {
    subscription.unsubscribe()
    showForm()
  }
})

// Fallback: if no PASSWORD_RECOVERY event fires within 4 seconds, check for a session
// (some browsers or Supabase versions may not emit the event reliably)
const fallbackTimer = setTimeout(async () => {
  if (recoveryReady) return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      subscription.unsubscribe()
      showForm()
    } else {
      subscription.unsubscribe()
      showExpiredError()
    }
  } catch (_) {
    subscription.unsubscribe()
    showExpiredError()
  }
}, 4000)

// Handle form submission — update the password
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError(card)

  const password = document.getElementById('password').value
  const confirmPassword = document.getElementById('confirm-password').value

  if (!password || !confirmPassword) {
    showError(card, t('auth.reset.emptyFields', 'Please fill in both password fields.'))
    return
  }
  if (!isValidPassword(password)) {
    showError(card, t('auth.common.passwordLength', `Password must be ${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters.`))
    return
  }
  if (password !== confirmPassword) {
    showError(card, t('auth.reset.mismatch', 'Passwords do not match.'))
    return
  }

  showLoading(updateBtn)

  try {
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      showError(card, friendlyError(error))
      return
    }
  } catch (err) {
    showError(card, t('auth.reset.networkError', 'Network error. Please check your connection and try again.'))
    return
  } finally {
    hideLoading(updateBtn)
  }

  // Success — sign out all sessions (invalidates old tokens), then redirect to login
  form.hidden = true
  showSuccess(card, t('auth.reset.success', 'Password updated successfully! Redirecting to login...'))

  try { await supabase.auth.signOut({ scope: 'global' }) } catch (_) { /* ignore */ }

  setTimeout(() => {
    window.location.href = '/auth/login/'
  }, 2000)
})

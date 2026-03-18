import { supabase } from '../supabase.js'
import { showError, isDesktopSource, handlePostAuthRedirect } from '../auth-helpers.js'
import { track, identify, EVENTS } from '../analytics.js'
import '../auth.css'

const card = document.querySelector('.auth-card')
const loadingState = document.getElementById('loading-state')
const fallbackLink = document.getElementById('fallback-link')

/**
 * Check the URL for OAuth error parameters.
 * When a user cancels Google sign-in, Supabase redirects back
 * with an error in the URL hash (e.g. #error=access_denied).
 */
function checkForOAuthError() {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)

  const error = params.get('error')
  const errorDescription = params.get('error_description')

  if (error) {
    return errorDescription
      ? errorDescription.replace(/\+/g, ' ')
      : 'Sign in was cancelled.'
  }

  // Also check query params (some providers use these instead)
  const query = new URLSearchParams(window.location.search)
  if (query.get('error')) {
    return query.get('error_description')?.replace(/\+/g, ' ') || 'Sign in was cancelled.'
  }

  return null
}

/** Show an error state with a back link. */
function showFailure(message) {
  loadingState.hidden = true
  showError(card, message)
  fallbackLink.hidden = false
}

// Check for errors immediately (user cancelled or something went wrong)
const oauthError = checkForOAuthError()
if (oauthError) {
  showFailure(oauthError)
} else {
  let handled = false
  let fallbackTimer = null
  let finalTimer = null
  const authFlow = sessionStorage.getItem('braindock_auth_flow') || 'login'
  sessionStorage.removeItem('braindock_auth_flow')

  async function completeAuth() {
    if (handled) return
    handled = true
    // Clear pending timers to prevent overlapping actions
    if (fallbackTimer) clearTimeout(fallbackTimer)
    if (finalTimer) clearTimeout(finalTimer)

    // For desktop flow, keep the spinner visible so the paste-code fallback
    // appears on a spinner page.  For web flow, hide it (redirect follows).
    if (!isDesktopSource()) {
      loadingState.hidden = true
    } else {
      const txt = loadingState.querySelector('.auth-loading-text')
      if (txt) txt.textContent = 'Connecting to app...'
    }

    await handlePostAuthRedirect(supabase, card)
  }

  // Listen for auth state changes (SIGNED_IN or INITIAL_SESSION with a session)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
      identify(session.user.id)
      const event_name = authFlow === 'signup' ? EVENTS.SIGNUP_COMPLETED : EVENTS.LOGIN_COMPLETED
      track(event_name, { method: 'google' })
      subscription.unsubscribe()
      await completeAuth()
    }
  })

  // Fallback: if no auth event fires within 3 seconds, check getSession() directly
  fallbackTimer = setTimeout(async () => {
    if (handled) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        identify(session.user.id)
        const evt = authFlow === 'signup' ? EVENTS.SIGNUP_COMPLETED : EVENTS.LOGIN_COMPLETED
        track(evt, { method: 'google' })
        subscription.unsubscribe()
        await completeAuth()
      } else {
        subscription.unsubscribe()
      }
    } catch (_) {
      // getSession failed (e.g. network error) - let the final timeout handle it
    }
  }, 3000)

  // Final fallback: if nothing worked after 8 seconds, show error
  finalTimer = setTimeout(() => {
    if (!handled && document.visibilityState !== 'hidden' && !loadingState.hidden) {
      subscription.unsubscribe()
      showFailure('Sign in could not be completed. Please try again.')
    }
  }, 8000)
}

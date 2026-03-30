import { supabase } from '../supabase.js'
import {
  showError,
  hideError,
  showSuccess,
  showLoading,
  hideLoading,
  friendlyError,
} from '../auth-helpers.js'
import { isValidEmail } from '../validators.js'
import { initDashboardI18n, t } from '../dashboard-i18n.js'
import { BASE_PATH } from '../base-path.js'
import '../auth.css'
import { initAnimatedGrid } from '../animated-grid.js'
initAnimatedGrid()
initDashboardI18n()

const form = document.getElementById('forgot-form')
const resetBtn = document.getElementById('reset-btn')
const card = document.querySelector('.auth-card')

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError(card)

  const email = document.getElementById('email').value.trim()

  if (!email) {
    showError(card, t('auth.forgot.emptyEmail', 'Please enter your email address.'))
    return
  }
  if (!isValidEmail(email)) {
    showError(card, t('auth.forgot.invalidEmail', 'Please enter a valid email address.'))
    return
  }

  showLoading(resetBtn)

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${BASE_PATH}/auth/reset-password/`,
    })

    if (error) {
      showError(card, friendlyError(error))
      return
    }
  } catch (err) {
    showError(card, t('auth.forgot.networkError', 'Network error. Please check your connection and try again.'))
    return
  } finally {
    hideLoading(resetBtn)
  }

  // Hide the form and show success message
  form.hidden = true
  showSuccess(card, t('auth.forgot.checkEmail', 'Check your email for a password reset link. It may take a minute to arrive.'))
})

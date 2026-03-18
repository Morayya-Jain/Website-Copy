/**
 * PostHog analytics utility.
 * Centralises custom event names and provides safe capture wrappers.
 * PostHog is loaded globally via public/js/posthog.js on every page.
 *
 * WARNING: This module must NOT import logger.js or any module that imports
 * logger.js. logger.js imports this module for error telemetry - adding
 * a reverse import would create a circular dependency.
 */

export const EVENTS = Object.freeze({
  // Auth (Tier 1 - Conversion)
  SIGNUP_COMPLETED: 'signup_completed',
  SIGNUP_FAILED: 'signup_failed',
  LOGIN_COMPLETED: 'login_completed',
  LOGIN_FAILED: 'login_failed',
  LOGIN_STARTED: 'login_started',
  SIGNUP_STARTED: 'signup_started',

  // Purchase funnel (Tier 1 - Revenue)
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_REDIRECTED: 'checkout_redirected',
  CHECKOUT_FAILED: 'checkout_failed',
  CHECKOUT_CANCELLED: 'checkout_cancelled',
  CHECKOUT_COMPLETED: 'checkout_completed',

  // Blocklist configuration (Tier 1 - Activation)
  BLOCKLIST_SITE_TOGGLED: 'blocklist_site_toggled',
  BLOCKLIST_ITEM_TOGGLED: 'blocklist_item_toggled',
  BLOCKLIST_CUSTOM_URL_ADDED: 'blocklist_custom_url_added',
  BLOCKLIST_CUSTOM_APP_ADDED: 'blocklist_custom_app_added',
  DISTRACTION_LEVEL_CHANGED: 'distraction_level_changed',

  // Engagement (Tier 2)
  DOWNLOAD_CLICKED: 'download_clicked',
  SESSION_DETAIL_VIEWED: 'session_detail_viewed',
  LANGUAGE_CHANGED: 'language_changed',

  // Operational
  ERROR_LOGGED: 'error_logged',
})

/**
 * Safely capture a PostHog event.
 * No-ops if PostHog is not loaded (e.g. ad-blocker).
 * @param {string} eventName - One of the EVENTS constants.
 * @param {Record<string, unknown>} [properties] - Optional event properties.
 */
export function track(eventName, properties) {
  try {
    if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(eventName, properties)
    }
  } catch (_) {
    // Silent - analytics must never crash the app
  }
}

/**
 * Identify the current user in PostHog.
 * Links anonymous pre-auth events to the authenticated user.
 * @param {string} userId - Supabase user ID.
 */
export function identify(userId) {
  try {
    if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.identify === 'function') {
      window.posthog.identify(userId)
    }
  } catch (_) {
    // Silent
  }
}

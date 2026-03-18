/**
 * Simple production-safe logger.
 * In development: logs full error details to console.
 * In production: logs only generic messages (hides internal details from DevTools).
 */

import { track, EVENTS } from './analytics.js'

const isDev = import.meta.env.DEV

/**
 * Log an error. In production, only a generic label is shown.
 * Also sends to PostHog in production for error monitoring.
 * SECURITY: `label` is sent to PostHog. It must be a static developer-defined
 * string, NEVER dynamic user data or error messages.
 * @param {string} label - Human-readable context (always shown).
 * @param {...unknown} details - Extra data (only shown in dev).
 */
export function logError(label, ...details) {
  if (isDev) {
    console.error(label, ...details)
  } else {
    console.error(label)
    track(EVENTS.ERROR_LOGGED, { label })
  }
}

/**
 * Log a warning. Same dev/prod split as logError.
 */
export function logWarn(label, ...details) {
  if (isDev) {
    console.warn(label, ...details)
  } else {
    console.warn(label)
  }
}

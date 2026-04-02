/**
 * Public pricing page: lists credit packages (hour packs) from credit_packages.
 * No auth required to view; auth required to checkout.
 */

import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase.js'
import { escapeHtml, showInlineError, formatPrice } from '../utils.js'
import { isValidUuid } from '../validators.js'
import '../auth.css'
import '../dashboard.css'
import { initAnimatedGrid } from '../animated-grid.js'
import { logError } from '../logger.js'
import { track, EVENTS } from '../analytics.js'
import { ctaSlideHtml } from '../icons.js'

initAnimatedGrid()

/** Simple translation helper for the pricing page (uses the landing page I18n global). */
function pt(key, fallback) {
  if (typeof I18n !== 'undefined' && I18n.getTranslation) {
    return I18n.getTranslation(key) || fallback
  }
  return fallback
}

async function fetchCreditPackages() {
  const { data, error } = await supabase
    .from('credit_packages')
    .select('id, name, display_name, hours, price_cents, currency, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

async function createCheckoutSession(packageId) {
  // Refresh to get a non-expired access token (getSession returns stale/cached tokens)
  const { data: refreshed } = await supabase.auth.refreshSession()
  const session = refreshed?.session
  if (!session) return { url: null, error: 'Not signed in' }
  const resp = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ package_id: packageId }),
  })
  const result = await resp.json().catch(() => ({}))
  if (!resp.ok) return { url: null, error: result?.error || result?.message || `HTTP ${resp.status}` }
  return { url: result?.url || null, error: result?.url ? null : 'No checkout URL returned' }
}

/** Calculate per-hour price in cents. Returns null if hours is invalid. */
function pricePerHourCents(cents, hours) {
  if (!hours || hours < 1) return null
  return Math.floor(cents / hours)
}

/** Tier label for display: 1 -> Pro, 10 -> Ultra, 30 -> Max */
function tierDisplayName(hours) {
  if (hours === 1) return 'Pro'
  if (hours === 10) return 'Ultra'
  if (hours === 30) return 'Max'
  return null
}

/** CTA button label per tier */
function tierButtonLabel(hours) {
  if (hours === 1) return 'Get Pro'
  if (hours === 10) return 'Get Ultra'
  if (hours === 30) return 'Get Max'
  return 'Buy Now'
}

/** Description fallback per tier */
function tierDescription(hours) {
  if (hours === 1) return 'Perfect for trying out BrainDock and seeing how AI-powered focus works for you.'
  if (hours === 10) return 'For the dedicated ones. Enough hours to build a real focus routine at a better rate.'
  if (hours === 30) return 'For those who want to go all out. The best bang for your buck to get ultimate AI-powered focus.'
  return `${hours} hours of BrainDock - camera, screen, or both.`
}

/** Fallback packages when Supabase is unreachable (e.g. GitHub Pages). */
const FALLBACK_PACKAGES = [
  { id: 'fallback-pro', name: 'pro', display_name: 'Pro', hours: 1, price_cents: 199, currency: 'aud' },
  { id: 'fallback-ultra', name: 'ultra', display_name: 'Ultra', hours: 10, price_cents: 1490, currency: 'aud' },
  { id: 'fallback-max', name: 'max', display_name: 'Max', hours: 30, price_cents: 3490, currency: 'aud' },
]

function render(root, packages, hasUser) {
  const defaultPackages = packages.length > 0 ? packages : FALLBACK_PACKAGES
  const packagesLoadFailed = false

  root.innerHTML = `
    <main class="pricing-main">
      <div class="container pricing-container">
        <div class="pricing-header">
          <h1 class="pricing-title" data-i18n="pricing.title">Pricing</h1>
          <p class="pricing-subtitle-free" data-i18n-html="pricing.subtitleFree"><strong>Every account starts with 30 free minutes.</strong></p>
          <p class="pricing-subtitle" data-i18n="pricing.subtitleDesc">Use camera or screen sessions - top up anytime.</p>
        </div>
        <div class="pricing-grid">
          ${packagesLoadFailed
            ? `<div class="dashboard-card pricing-card" style="grid-column: 1 / -1; text-align: center;">
                <p data-i18n="pricing.loadError">Could not load pricing packages. Please refresh the page or try again later.</p>
              </div>`
            : defaultPackages.map((pkg) => {
            const perHour = pricePerHourCents(pkg.price_cents, pkg.hours)
            const tierName = tierDisplayName(pkg.hours) || escapeHtml(pkg.display_name || pkg.name)
            const btnLabel = tierButtonLabel(pkg.hours)
            const desc = escapeHtml(tierDescription(pkg.hours))
            const hrLabel = pt('pricing.perHourSuffix', '/hr')
            const displayPrice = perHour !== null ? formatPrice(perHour, pkg.currency) : formatPrice(pkg.price_cents, pkg.currency)
            const hoursLabel = pkg.hours === 1
              ? pt('pricing.hourSingular', '1 hour')
              : pt('pricing.hourPlural', `${pkg.hours} hours`).replace('{n}', String(pkg.hours))
            return `
              <div class="dashboard-card pricing-card">
                <h3 class="pricing-card-title" data-i18n="pricing.tier.${pkg.hours}.name">${tierName}</h3>
                <p class="pricing-card-price">${displayPrice}${hrLabel}</p>
                <p class="pricing-card-total">${hoursLabel}</p>
                <p class="pricing-card-desc" data-i18n="pricing.tier.${pkg.hours}.desc">${desc}</p>
                <button type="button" class="btn btn-primary btn-cta" data-package-id="${escapeHtml(pkg.id)}"><span class="btn-cta-label"><span data-i18n="pricing.tier.${pkg.hours}.btn">${btnLabel}</span></span>${ctaSlideHtml()}</button>
              </div>
            `
          }).join('')}
        </div>

        <!-- Pricing Q&A -->
        <section class="pricing-faq">
          <h2 class="pricing-faq-title" data-i18n="pricing.faq.title">Questions & Answers</h2>
          <div class="faq-list">
            <div class="faq-item">
              <button class="faq-question" aria-expanded="false">
                <span data-i18n="pricing.faq.q0">Is there a free plan?</span>
                <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="faq-answer" role="region">
                <div class="faq-answer-inner">
                  <p data-i18n="pricing.faq.a0">Yes! Every new account gets 30 free minutes per month. Your free time resets automatically at the start of each month. Upgrade anytime for more hours and PDF reports.</p>
                </div>
              </div>
            </div>
            <div class="faq-item">
              <button class="faq-question" aria-expanded="false">
                <span data-i18n="pricing.faq.q1">Which plan should I choose?</span>
                <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="faq-answer" role="region">
                <div class="faq-answer-inner">
                  <p data-i18n="pricing.faq.a1">If you're just getting started, Pro (1 hour) lets you try BrainDock without a big commitment. For regular use, Ultra (10 hours) offers a better per-hour rate. Max (30 hours) is the best value if you plan to use BrainDock daily.</p>
                </div>
              </div>
            </div>
            <div class="faq-item">
              <button class="faq-question" aria-expanded="false">
                <span data-i18n="pricing.faq.q2">How does the credit system work?</span>
                <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="faq-answer" role="region">
                <div class="faq-answer-inner">
                  <p data-i18n="pricing.faq.a2">You purchase a pack of hours upfront. Each time you run a focus session - whether using your camera, screen monitoring, or both - time is deducted from your balance. You can top up anytime, and your hours never expire.</p>
                </div>
              </div>
            </div>
            <div class="faq-item">
              <button class="faq-question" aria-expanded="false">
                <span data-i18n="pricing.faq.q3">Can I switch between camera and screen sessions?</span>
                <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="faq-answer" role="region">
                <div class="faq-answer-inner">
                  <p data-i18n="pricing.faq.a3">Yes. Your hours work across all session types. Use camera-based focus tracking, screen monitoring, or both at the same time - it all draws from the same balance.</p>
                </div>
              </div>
            </div>
            <div class="faq-item">
              <button class="faq-question" aria-expanded="false">
                <span data-i18n="pricing.faq.q4">What happens when I run out of hours?</span>
                <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="faq-answer" role="region">
                <div class="faq-answer-inner">
                  <p data-i18n="pricing.faq.a4">Your session will end and you can top up with another pack right away. Any session data you've already recorded stays in your dashboard - nothing is lost.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  `

  // Re-apply translations to dynamically rendered pricing content
  // (I18n.init() already ran on DOMContentLoaded for the static nav/footer)
  if (typeof I18n !== 'undefined' && I18n.applyTranslations) {
    I18n.applyTranslations()
  }

  root.querySelectorAll('[data-package-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const currentLabel = btn.textContent
      const packageId = btn.dataset.packageId
      track(EVENTS.CHECKOUT_STARTED, { package_id: packageId })

      if (!hasUser) {
        // Not logged in: open signup in a new tab, then come back with auto_checkout
        const returnUrl = `/pricing/?auto_checkout=${encodeURIComponent(packageId)}`
        window.open(`/auth/signup/?redirect=${encodeURIComponent(returnUrl)}`, '_blank')
        return
      }

      // Logged in: go straight to Stripe checkout
      btn.disabled = true
      btn.textContent = pt('pricing.loading', 'Loading...')
      try {
        const { url, error } = await createCheckoutSession(packageId)
        if (error) {
          track(EVENTS.CHECKOUT_FAILED, { package_id: packageId })
          btn.disabled = false
          btn.textContent = currentLabel
          showInlineError(root, pt('pricing.checkoutError', 'Could not start checkout. Please try again.'))
          return
        }
        if (url) {
          track(EVENTS.CHECKOUT_REDIRECTED, { package_id: packageId })
          // Use location.href to avoid popup blockers (window.open after async is blocked)
          window.location.href = url
        }
        btn.disabled = false
        btn.textContent = currentLabel
      } catch (err) {
        track(EVENTS.CHECKOUT_FAILED, { package_id: packageId })
        btn.disabled = false
        btn.textContent = currentLabel
        showInlineError(root, pt('pricing.networkError', 'Network error. Please check your connection and try again.'))
      }
    })
  })

  // FAQ accordion toggle
  root.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item')
      const isOpen = item.classList.contains('active')
      // Close all others first
      root.querySelectorAll('.faq-item.active').forEach((el) => {
        el.classList.remove('active')
        el.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false')
      })
      // Toggle the clicked one
      if (!isOpen) {
        item.classList.add('active')
        btn.setAttribute('aria-expanded', 'true')
      }
    })
  })

}

async function main() {
  const root = document.getElementById('pricing-root')
  if (!root) return

  root.innerHTML = '<div class="auth-page"><div class="auth-container"><p>Loading pricing...</p></div></div>'

  const { data: { session } } = await supabase.auth.getSession()
  const hasUser = !!session

  let packages = []
  try {
    packages = await fetchCreditPackages()
  } catch (err) {
    logError('Pricing packages load failed:', err)
  }
  render(root, packages, hasUser)

  const params = new URLSearchParams(window.location.search)

  if (params.get('canceled') === 'true') {
    track(EVENTS.CHECKOUT_CANCELLED)
    window.history.replaceState({}, '', '/pricing/')
    const banner = document.createElement('div')
    banner.className = 'dashboard-banner dashboard-banner-info'
    banner.setAttribute('role', 'status')
    banner.textContent = pt('pricing.checkoutCancelled', 'Checkout was cancelled.')
    const container = root.querySelector('.pricing-container') || root
    const firstChild = container.firstElementChild
    if (firstChild) container.insertBefore(banner, firstChild)
    else container.prepend(banner)
  }

  // Auto-checkout: if user just signed up and was redirected back with a package ID
  const autoCheckoutId = params.get('auto_checkout')
  if (autoCheckoutId && isValidUuid(autoCheckoutId) && hasUser) {
    // Clean URL so refreshing doesn't re-trigger
    window.history.replaceState({}, '', '/pricing/')

    // Auto-trigger checkout for the package they originally clicked
    try {
      const { url, error } = await createCheckoutSession(autoCheckoutId)
      if (error) {
        showInlineError(root, pt('pricing.checkoutError', 'Could not start checkout. Please try again.'))
        return
      }
      if (url) window.location.href = url
    } catch (err) {
      showInlineError(root, pt('pricing.networkError', 'Network error. Please check your connection and try again.'))
    }
  }
}

main()

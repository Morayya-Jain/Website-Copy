/**
 * Public pricing page: lists credit packages (hour packs) from credit_packages.
 * No auth required to view; auth required to checkout.
 */

import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase.js'
import { escapeHtml, showInlineError, formatPrice } from '../utils.js'
import { isValidUuid } from '../validators.js'
import '../auth.css'
import '../dashboard.css'
import { logError } from '../logger.js'
import { track, EVENTS } from '../analytics.js'

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
  return Math.round(cents / hours)
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

function render(root, packages, hasUser) {
  // If packages failed to load from DB, show an error state instead of non-functional fallbacks
  const defaultPackages = packages.length > 0 ? packages : []
  const packagesLoadFailed = packages.length === 0

  const origin = window.location.origin

  root.innerHTML = `
    <!-- Header (same as main website) -->
    <nav class="nav">
      <div class="container nav-container">
        <a href="${origin}/" class="nav-logo" target="_blank" rel="noopener">
          <img src="/assets/logo_with_text.png" alt="BrainDock">
        </a>
        <div class="nav-center">
          <div class="nav-links">
            <a href="${origin}/#why-braindock" target="_blank" rel="noopener" data-i18n="nav.whyBrainDock">Why?</a>
            <a href="${origin}/#features" target="_blank" rel="noopener" data-i18n="nav.features">Features</a>
            <a href="/pricing/" data-i18n="nav.pricing">Pricing</a>
            <a href="${origin}/#faq" target="_blank" rel="noopener" data-i18n="nav.faqs">FAQs</a>
          </div>
        </div>
        <div class="nav-actions">
          <a href="/auth/signup/" class="btn btn-secondary nav-cta nav-cta-signup" target="_blank" rel="noopener" data-i18n="nav.signup">Sign Up</a>
          <a href="${origin}/#download" class="btn btn-primary nav-cta nav-cta-download" target="_blank" rel="noopener">
            <span data-i18n="nav.download">Download</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </a>
        </div>
        <button class="nav-toggle" id="pricing-nav-toggle" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="nav-mobile" id="pricing-nav-mobile">
        <a href="${origin}/#why-braindock" target="_blank" rel="noopener" data-i18n="nav.whyBrainDock">Why?</a>
        <a href="${origin}/#features" target="_blank" rel="noopener" data-i18n="nav.features">Features</a>
        <a href="/pricing/" data-i18n="nav.pricing">Pricing</a>
        <a href="${origin}/#faq" target="_blank" rel="noopener" data-i18n="nav.faqs">FAQs</a>
        <a href="/auth/signup/" target="_blank" rel="noopener" data-i18n="nav.signup">Sign Up</a>
        <a href="${origin}/#download" target="_blank" rel="noopener" data-i18n="nav.download">Download</a>
      </div>
    </nav>

    <!-- Pricing content -->
    <main class="pricing-main">
      <div class="container pricing-container">
        <div class="pricing-header">
          <h1 class="pricing-title" data-i18n="pricing.title">Pricing</h1>
          <p class="pricing-subtitle" data-i18n="pricing.subtitle">Use camera or screen sessions - time is deducted from your balance. Top up anytime.</p>
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
            return `
              <div class="dashboard-card pricing-card">
                <h3 class="pricing-card-title" data-i18n="pricing.tier.${pkg.hours}.name">${tierName}</h3>
                <p class="pricing-card-price">${formatPrice(pkg.price_cents, pkg.currency)}</p>
                ${perHour ? `<p class="pricing-card-per-hour" data-i18n="pricing.tier.${pkg.hours}.perHour">${formatPrice(perHour, pkg.currency)} per hour</p>` : '<p class="pricing-card-per-hour"></p>'}
                <p class="pricing-card-desc" data-i18n="pricing.tier.${pkg.hours}.desc">${pkg.hours} hour${pkg.hours === 1 ? '' : 's'} of BrainDock - camera, screen, or both.</p>
                <button type="button" class="btn btn-primary" data-package-id="${escapeHtml(pkg.id)}" data-i18n="pricing.tier.${pkg.hours}.btn">${btnLabel}</button>
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

    <!-- Footer (same as main website) -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-brand">
            <img src="/assets/logo_with_text.png" alt="BrainDock" loading="lazy">
            <p data-i18n="footer.brandDescription">AI-powered focus assistant that helps you build better habits.</p>
          </div>
          <div class="footer-links">
            <h4 data-i18n="footer.legalTitle">Legal</h4>
            <a href="${origin}/privacy.html" target="_blank" rel="noopener noreferrer" data-i18n="footer.privacyPolicy">Privacy Policy</a>
            <a href="${origin}/terms.html" target="_blank" rel="noopener noreferrer" data-i18n="footer.termsOfService">Terms and Conditions</a>
          </div>
          <div class="footer-contact" id="pricing-contact">
            <h4 data-i18n="footer.contactTitle">Contact</h4>
            <a href="mailto:morayya@thebraindock.com">morayya@thebraindock.com</a>
            <a href="mailto:help.thebraindock@gmail.com">help.thebraindock@gmail.com</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p data-i18n="footer.copyright">&copy; 2026 BrainDock. All rights reserved.</p>
          <div class="language-selector">
            <button class="language-toggle" id="pricing-footer-lang-toggle" aria-expanded="false" aria-haspopup="listbox" aria-label="Select language">
              <svg class="globe-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span class="language-current">English</span>
              <svg class="chevron-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <ul class="language-dropdown" id="pricing-footer-lang-dropdown" role="listbox">
              <li role="option" data-lang="en">English</li>
              <li role="option" data-lang="ja">日本語 (Japan)</li>
              <li role="option" data-lang="de">Deutsch (Germany)</li>
              <li role="option" data-lang="fr">Français (France)</li>
              <li role="option" data-lang="zh">中文 (China)</li>
              <li role="option" data-lang="hi">हिन्दी (India)</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  `

  // Initialize language so button labels are translated before we capture them for restore
  if (typeof I18n !== 'undefined' && I18n.init) {
    I18n.init()
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

  // Mobile nav toggle
  const navToggle = document.getElementById('pricing-nav-toggle')
  const navMobile = document.getElementById('pricing-nav-mobile')
  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true'
      navToggle.setAttribute('aria-expanded', !expanded)
      navMobile.classList.toggle('active')
    })
  }
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

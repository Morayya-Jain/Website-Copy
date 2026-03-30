/**
 * Billing & Usage: current balance from user_credits and purchase history from credit_purchases.
 */

import { supabase } from '../supabase.js'
import { initDashboardLayout } from '../dashboard-layout.js'
import { escapeHtml, formatDuration, formatPrice } from '../utils.js'
import { t, getLocale } from '../dashboard-i18n.js'

import { logError } from '../logger.js'
import { ctaSlideHtml } from '../icons.js'
import { track, EVENTS } from '../analytics.js'
import { BASE_PATH } from '../base-path.js'

function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', year: 'numeric' })
}

async function loadPurchaseHistory(userId) {
  const { data, error } = await supabase
    .from('credit_purchases')
    .select('id, seconds_added, amount_cents, purchased_at, credit_packages(display_name, hours)')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

// Inline SVG chevron for expandable rows
const CHEVRON_SVG = `<svg class="billing-expand-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`

function render(main, credits, purchases) {
  const base = BASE_PATH
  const remaining = credits?.remaining_seconds ?? 0

  main.innerHTML = `
    <h1 class="dashboard-page-title">${t('dashboard.billing.title', 'Billing & Usage')}</h1>
    <p class="dashboard-page-subtitle">
      ${t('dashboard.billing.subtitle', 'Your remaining hours and purchase history.')}
    </p>

    <div class="dashboard-card dashboard-credits-card">
      <div class="dashboard-credits-widget">
        <p class="dashboard-credits-widget-value">${credits?.is_free_tier ? `${t('dashboard.common.free', 'FREE')} | ` : ''}${formatDuration(remaining)} ${t('dashboard.common.remaining', 'remaining')}</p>
        ${credits?.is_free_tier && credits?.free_tier_reset_at ? `<p class="dashboard-meta">${t('dashboard.billing.resetsOn', 'Resets on')} ${formatDate(credits.free_tier_reset_at)}</p>` : ''}
        <a href="${base}/pricing/" target="_blank" rel="noopener" class="btn btn-secondary btn-cta"><span class="btn-cta-label">${credits?.is_free_tier ? t('dashboard.actions.upgradeNow', 'Upgrade Now') : t('dashboard.actions.getMoreHours', 'Get More Hours')}</span>${ctaSlideHtml()}</a>
      </div>
    </div>

    <div class="dashboard-card">
      <h2 class="dashboard-section-title">${t('dashboard.billing.purchaseHistory', 'Purchase history')}</h2>
      ${purchases.length === 0
    ? `
        <div class="dashboard-empty">
          <p class="dashboard-empty-title">${t('dashboard.billing.noPurchasesTitle', 'No purchases yet')}</p>
          <p>${t('dashboard.billing.noPurchasesBefore', 'Buy hour packs from the')} <a href="${base}/pricing/" target="_blank" rel="noopener">${t('dashboard.billing.pricingPage', 'pricing page')}</a> ${t('dashboard.billing.noPurchasesAfter', 'to get started.')}</p>
        </div>
      `
    : `
        <ul class="dashboard-list" id="purchase-history-list">
          ${purchases.map((p) => {
    const pkg = p.credit_packages
    const rawHours = p.seconds_added ? (p.seconds_added / 3600) : 0
    const hours = Math.round(rawHours * 10) / 10
    // Use translated hour text instead of DB display_name (which is English-only)
    const hoursLabel = hours === 1 ? t('dashboard.time.hour', 'hour') : t('dashboard.time.hours', 'hours')
    const name = `${hours} ${hoursLabel}`
    return `
            <li class="dashboard-list-item dashboard-list-item--clickable billing-purchase-row" tabindex="0" role="button" aria-expanded="false" data-purchase-id="${escapeHtml(p.id)}">
              <div class="flex-1">
                <div class="dashboard-credits-widget">
                  <strong>${escapeHtml(name)}</strong>
                  <span class="dashboard-meta">${formatPrice(p.amount_cents)}</span>
                </div>
                <span class="dashboard-meta-sub">${formatDate(p.purchased_at)}</span>
                <div class="billing-purchase-detail" id="detail-${escapeHtml(p.id)}" hidden>
                  <div class="billing-purchase-detail-grid">
                    <span class="billing-detail-label">${t('dashboard.billing.package', 'Package')}</span>
                    <span>${escapeHtml(name)}</span>
                    <span class="billing-detail-label">${t('dashboard.billing.hoursAdded', 'Hours added')}</span>
                    <span>${hours} ${hours === 1 ? t('dashboard.time.hour', 'hour') : t('dashboard.time.hours', 'hours')}</span>
                    <span class="billing-detail-label">${t('dashboard.billing.amount', 'Amount')}</span>
                    <span>${formatPrice(p.amount_cents)}</span>
                    <span class="billing-detail-label">${t('dashboard.billing.date', 'Date')}</span>
                    <span>${formatDate(p.purchased_at)}</span>
                    <span class="billing-detail-label">${t('dashboard.billing.receipt', 'Receipt')}</span>
                    <span>${t('dashboard.billing.sentToEmail', 'Sent to your email')}</span>
                  </div>
                </div>
              </div>
              ${CHEVRON_SVG}
            </li>
          `
  }).join('')}
        </ul>
      `}
    </div>

  `

  // Make purchase rows expandable on click and keyboard
  main.querySelectorAll('.billing-purchase-row').forEach((row) => {
    function toggleRow() {
      const id = row.dataset.purchaseId
      const detail = document.getElementById(`detail-${id}`)
      if (!detail) return
      const isOpen = !detail.hidden
      // Close all other open details first
      main.querySelectorAll('.billing-purchase-detail').forEach((d) => { d.hidden = true })
      main.querySelectorAll('.billing-purchase-row').forEach((r) => { r.setAttribute('aria-expanded', 'false') })
      detail.hidden = isOpen
      row.setAttribute('aria-expanded', String(!isOpen))
    }
    row.addEventListener('click', toggleRow)
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleRow()
      }
    })
  })
}

async function main() {
  const result = await initDashboardLayout()
  if (!result) return

  const mainEl = document.querySelector('.dashboard-main')
  if (!mainEl) return

  mainEl.innerHTML = `<div class="dashboard-loading"><div class="dashboard-spinner"></div><p>${t('dashboard.billing.loading', 'Loading billing...')}</p></div>`

  try {
    const results = await Promise.allSettled([result.creditsPromise, loadPurchaseHistory(result.user.id)])
    const credits = results[0].status === 'fulfilled' ? results[0].value : null
    const purchases = results[1].status === 'fulfilled' ? results[1].value : []
    if (results[0].status === 'rejected') logError('Credit fetch failed:', results[0].reason)
    if (results[1].status === 'rejected') logError('Purchase history fetch failed:', results[1].reason)
    render(mainEl, credits, purchases)

    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      if (!sessionStorage.getItem('braindock_checkout_tracked')) {
        track(EVENTS.CHECKOUT_COMPLETED)
        sessionStorage.setItem('braindock_checkout_tracked', '1')
      }
      window.history.replaceState({}, '', window.location.pathname)
      const banner = document.createElement('div')
      banner.className = 'dashboard-banner dashboard-banner-success'
      banner.setAttribute('role', 'status')
      banner.textContent = t('dashboard.billing.paymentSuccess', 'Payment successful. Your hours have been added.')
      mainEl.prepend(banner)
    }
  } catch (err) {
    logError('Billing page load failed:', err)
    mainEl.innerHTML = `
      <div class="dashboard-empty">
        <p class="dashboard-empty-title">${t('dashboard.billing.errorTitle', 'Could not load billing')}</p>
        <p>${t('dashboard.common.tryAgain', 'Please try again.')}</p>
      </div>
    `
  }
}

main()
